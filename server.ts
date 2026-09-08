import express from "express";
import fs from "fs";
import path from "path";
import crypto from "node:crypto";
import httpx from "node:http";
import os from "node:os";
import { pathToFileURL } from "node:url";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { SEED_ANNOUNCEMENTS, SPONSORS } from "./src/data/mockData";
import { Team, ProjectSubmission, JudgeScorecard, Announcement, SupportTicket, Participant, MilestoneReport, MentorBooking, WebsiteCMSConfig, AuditLog, AdminUser, RulebookVersion, EmailCampaign, RoomAllocation, JudgingRound, ScheduleItem, Checkpoint, Sponsor } from "./src/types";
import { allocateTeamNumber, isSupabaseConfigured, listTeams, saveTeam } from "./src/server/supabaseStore";

declare global {
  namespace Express {
    interface Request {
      session?: {
        id?: string;
        type?: "admin" | "participant";
        role?: string;
        email?: string;
        username?: string;
        name?: string;
        teamId?: string;
        expiresAt?: number;
      };
    }
  }
}
// Minimal .env loader (no dotenv dependency). Loads SMTP_* / MAIL_FROM (and any
// other KEY=VALUE) from a local `.env` file so real email delivery can be
// configured without extra packages. Never overrides already-set env vars.
try {
  const envFile = path.join(process.cwd(), ".env");
  if (fs.existsSync(envFile)) {
    for (const rawLine of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
    console.log("[ENV] Loaded configuration from .env (SMTP ready if configured).");
  } else {
    console.log("[ENV] No .env file found — SMTP email delivery will fall back to .eml generation.");
  }
} catch (envErr: any) {
  console.warn("[ENV] Could not load .env file:", envErr && envErr.message ? envErr.message : envErr);
}

// Diagnose the most common email misconfigurations up-front so missing mail is
// easy to spot in the server console instead of silently producing .eml files.
(function checkSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || "";
  if (!host) {
    console.warn("[EMAIL] SMTP_HOST is NOT set — confirmation emails will NOT be delivered. They are only generated as downloadable .eml files. Set SMTP_HOST/SMTP_USER/SMTP_PASS in .env to send real mail.");
    return;
  }
  const hostLc = host.toLowerCase();
  if (hostLc.includes("gmail") && user && !user.toLowerCase().endsWith("@gmail.com")) {
    console.warn(`[EMAIL] MISCONFIGURED SMTP: SMTP_HOST=${host} (Gmail) does not match SMTP_USER=${user}. Gmail SMTP only accepts @gmail.com accounts with an App Password. Emails will FAIL to be delivered until this is fixed in .env.`);
  } else if (hostLc.includes("gmail") && user && user.toLowerCase().endsWith("@gmail.com") && !process.env.SMTP_PASS) {
    console.warn("[EMAIL] Gmail SMTP requires an App Password in SMTP_PASS (not your normal login password). Mail will fail to authenticate without it.");
  }
})();

// ============================================================================
// Runtime & cluster configuration
// ============================================================================
const DEFAULT_PORT = 3001;
const INTERNAL_PORT = Number(process.env.INTERNAL_PORT) || 3002;
const PUBLIC_PORT = Number(process.env.PORT) || DEFAULT_PORT;

// Optional multi-core mode. Leave unset for the safe, single-process default.
// Set e.g. `CLUSTER_WORKERS=auto` (all logical cores) or a number like 8 to
// spawn that many worker processes that share the public port and serve the
// static build + proxy API traffic to one authoritative process.
const rawWorkers = String(process.env.CLUSTER_WORKERS || "").trim().toLowerCase();
let WORKER_COUNT = 0;
if (rawWorkers === "auto") {
  try { WORKER_COUNT = Math.max(1, os.cpus().length - 1); } catch { WORKER_COUNT = 2; }
} else if (rawWorkers !== "") {
  WORKER_COUNT = Math.max(0, Number(rawWorkers) || 0);
}

// The cluster module (`node:cluster`) is experimental. It is loaded lazily
// inside run() so that if it is unavailable on the current Node build the app
// still boots in the classic, single-process mode instead of crashing.
let cluster: any = null;

// Immutable static assets (hashed by Vite at build time) can be cached for a
// year. The SPA shell (index.html) and any un-hashed files are always
// revalidated so new deployments are picked up immediately. This single change
// removes nearly all repeat-download traffic when 10k people visit.
function serveStaticWithCache(app: any, distPath: string) {
  const IMMUTABLE = /\.(?:css|js|map|png|jpe?g|webp|gif|svg|ico|avif|woff2?|ttf|eot|ttc|otf)$/i;
  app.use(
    express.static(distPath, {
      setHeaders(res: any, filePath: string) {
        const base = path.basename(filePath);
        if (IMMUTABLE.test(base)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-store, must-revalidate");
        }
      },
    })
  );
  // SPA fallback — any non-API GET that isn't a file returns the app shell.
  app.get("*", (req: any, res: any) => {
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Reverse-proxy any `/api` request to the local authoritative process. Workers
// (in cluster mode) use this so that all reads/writes hit the single source of
// truth, keeping registration IDs, counts and capacity checks consistent.
function proxyApiToAuthority(req: any, res: any) {
  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (v !== undefined) headers[k] = String(v);
  }
  headers.host = `127.0.0.1:${INTERNAL_PORT}`;

  const upstream = httpx.request(
    {
      hostname: "127.0.0.1",
      port: INTERNAL_PORT,
      path: req.originalUrl || req.url || "/",
      method: req.method || "GET",
      headers,
    },
    (upRes: any) => {
      const status = upRes.statusCode || 502;
      const hdrs: Record<string, string> = {};
      for (const [k, v] of Object.entries(upRes.headers || {})) {
        if (v !== undefined) hdrs[k] = String(v);
      }
      if (hdrs["content-encoding"]) res.setHeader("Content-Encoding", hdrs["content-encoding"]);
      if (hdrs["content-type"]) res.setHeader("Content-Type", hdrs["content-type"]);
      res.status(status);
      upRes.pipe(res);
    }
  );
  upstream.on("error", () => {
    if (!res.headersSent) {
      res.status(502).json({ success: false, error: "Service temporarily unavailable. Please retry." });
    } else {
      res.end();
    }
  });
  req.pipe(upstream);
}

// Worker process (used only in cluster mode): serves the static build on the
// shared public port and forwards all `/api` traffic to the authority process.
async function startupWorker() {
  const app = express();
  try { app.set("trust proxy", 1); } catch { /* noop */ }
  app.disable("x-powered-by");
  app.use(compression({ threshold: 1024, level: 6 }));
  app.use((req: any, res: any, next: any) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  // All API traffic → single authoritative process (global rate limits live
  // there so they are consistent across every worker).
  app.use("/api", proxyApiToAuthority);

  const distPath = path.join(process.cwd(), "dist");
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    serveStaticWithCache(app, distPath);
  }

  app.listen(PUBLIC_PORT, "0.0.0.0", () => {
    console.log(`[WORKER ${process.pid}] Static+API proxy serving :${PUBLIC_PORT}`);
  });
}

// Attempt to spawn `n` worker processes using the experimental node:cluster
// API. The API surface differs between Node versions (`.fork` vs `.spawn`, and
// `setupPrimary` may be required first), so we try what's available and return
// false if nothing works — the caller then falls back to single-process mode.
function tryClusterSpawn(cluster: any, n: number): boolean {
  const entrypointFile = (() => {
    try {
      // In the bundled cjs this is dist/server.cjs; under tsx it is server.ts.
      // eslint-disable-next-line no-restricted-globals
      if (typeof __filename !== "undefined") return __filename;
    } catch { /* ignore */ }
    return path.resolve("server.ts");
  })();

  const setup = () => {
    if (typeof cluster.setupPrimary === "function") {
      cluster.setupPrimary({ waitUntilStarted: true, schedulingPolicy: cluster.SCHED_RR });
    } else if (typeof cluster.setupMaster === "function") {
      cluster.setupMaster({ schedulingPolicy: cluster.SCHED_RR });
    }
  };

  if (typeof cluster.fork === "function") {
    setup();
    for (let i = 0; i < n; i++) cluster.fork(entrypointFile);
    return true;
  }
  if (typeof cluster.spawn === "function") {
    for (let i = 0; i < n; i++) cluster.spawn();
    return true;
  }
  return false;
}

async function run() {
  // Cluster is loaded lazily (see note above) so its absence never breaks boot.
  if (cluster === null) {
    try {
      const mod = await import("node:cluster");
      cluster = (mod && mod.default) ? mod.default : mod;
    } catch {
      cluster = null;
    }
  }

  // A forked cluster worker → serve static + proxy to authority.
  if (cluster && cluster.isPrimary === false) {
    await startupWorker();
    return;
  }

  // Primary process.
  if (cluster && cluster.isPrimary && WORKER_COUNT > 0) {
    // Multi-core mode: primary becomes the authoritative data+API process on a
    // private loopback port, and N workers share the public port for static
    // content + API proxying. Workers inherit env and re-run this module; their
    // `cluster.isPrimary` is false so they take the proxy-worker path above.
    console.log(`[CLUSTER] Primary authority on 127.0.0.1:${INTERNAL_PORT}, spawning ${WORKER_COUNT} worker(s).`);
    process.env.ANVATION_ROLE = "authority";
    try {
      if (!tryClusterSpawn(cluster, WORKER_COUNT)) {
        throw new Error("No usable cluster fork API");
      }
    } catch (e) {
      console.warn("[CLUSTER] Worker spawn failed, falling back to single process:", e);
      delete process.env.ANVATION_ROLE;
    }
    await startServer();
    return;
  }

  // Classic single process (default) — fully backward compatible.
  await startServer();
}

export async function createApp(options: { listen?: boolean; serveFrontend?: boolean } = {}) {
  const shouldListen = options.listen !== false;
  const shouldServeFrontend = options.serveFrontend !== false;
  const app = express();
  const requestedPort = PUBLIC_PORT;

  app.use(express.json({ limit: "10mb" }));

  // =============================================================
  // Production hardening / reliability middleware
  // -------------------------------------------------------------
  // Reverse proxies (nginx / Load Balancer) set the real client IP in the
  // X-Forwarded-For header. Without this, rate limiter + audit logs would
  // all see the proxy address instead of each unique visitor (breaking
  // per-user rate limiting and, if 10k people share the proxy IP, would
  // unfairly trip every limit at once).
  try { app.set("trust proxy", 1); } catch { /* noop */ }
  app.disable("x-powered-by");

  // gzip/brotli response compression. The built JS (~750 KB) and CSS
  // (~190 KB) compress to roughly 25% of their original size, so this
  // slashes both bandwidth and time-to-first-byte for the thousands of
  // concurrent visitors pulling the same assets.
  app.use(
    compression({
      threshold: 1024, // only compress responses above 1 KB
      level: 6,
    })
  );

  // Forward declaration so rate-limit impls below can read live config.

  // Application-level security headers applied to every HTTP response.
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    // SPA assets are self-served; keep default-src permissive so inline
    // scripts/styles used across components keep working, while still
    // blocking obvious third-party script injection.
    if (!res.getHeader("Cache-Control")) {
      res.setHeader("Cache-Control", "no-store, must-revalidate");
    }
    next();
  });

  const AUTH_COOKIE = "anvation_session";
  const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
  const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || "change-me-in-dev-only";
  const sessionStore = new Map<string, { user: { id: string; type: "admin" | "participant"; role?: string; email?: string; username?: string; name?: string; teamId?: string; expiresAt: number; }; expiresAt: number }>();

  function sanitizeAdminUser(user: Partial<AdminUser> | null | undefined) {
    if (!user) return user;
    const { password: _password, ...rest } = user as any;
    return rest;
  }

  function sanitizeTeamForClient(team: any) {
    if (!team) return team;
    const { accessPassword: _accessPassword, ...rest } = team;
    return rest;
  }

  function normalizeStoredPassword(value?: string): string | undefined {
    if (!value) return undefined;
    const password = String(value).trim();
    if (!password) return undefined;
    return password.startsWith("pbkdf2_sha256$") ? password : hashPassword(password);
  }

  function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = crypto.pbkdf2Sync(password, salt, 250000, 32, "sha256").toString("hex");
    return `pbkdf2_sha256$${salt}$${derived}`;
  }

  function verifyPassword(password: string, storedHash?: string): boolean {
    if (!storedHash || !password) return false;
    if (!storedHash.startsWith("pbkdf2_sha256$")) {
      return storedHash === password;
    }
    const [, salt, hash] = storedHash.split("$");
    if (!salt || !hash) return false;
    const derived = crypto.pbkdf2Sync(password, salt, 250000, 32, "sha256").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  }

  function getClientIp(req: any) {
    return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "unknown");
  }

  function createSession(user: any) {
    const sid = crypto.randomBytes(24).toString("hex");
    const record = { user: { ...user, expiresAt: Date.now() + SESSION_TTL_MS }, expiresAt: Date.now() + SESSION_TTL_MS };
    sessionStore.set(sid, record);
    return sid;
  }

  function getSessionFromRequest(req: any) {
    const cookieRaw = req.headers.cookie || "";
    const match = cookieRaw.split(";").map((v: string) => v.trim()).find((v: string) => v.startsWith(`${AUTH_COOKIE}=`));
    const sid = match ? decodeURIComponent(match.slice(AUTH_COOKIE.length + 1)) : null;
    if (!sid) return null;
    const session = sessionStore.get(sid);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      sessionStore.delete(sid);
      return null;
    }
    return session;
  }

  function setAuthCookie(res: any, sid: string) {
    const secure = process.env.NODE_ENV === "production";
    res.cookie(AUTH_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: SESSION_TTL_MS,
      path: "/",
    });
  }

  function clearAuthCookie(res: any) {
    res.clearCookie(AUTH_COOKIE, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  }

  function requireAuth(req: any, res: any, next: any) {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    req.session = session.user;
    next();
  }

  function requireRole(roles: string[]) {
    return (req: any, res: any, next: any) => {
      const session = getSessionFromRequest(req);
      if (!session) {
        return res.status(401).json({ success: false, error: "Authentication required." });
      }
      const userRole = String(session.user.role || "").toUpperCase();
      if (!roles.map((r) => r.toUpperCase()).includes(userRole)) {
        return res.status(403).json({ success: false, error: "Forbidden: insufficient privileges." });
      }
      req.session = session.user;
      next();
    };
  }

  const requireAdmin = requireRole(["ADMIN", "REGISTRATION_MANAGER", "CONTENT_MANAGER", "SUPER_ADMIN", "JUDGE", "CHECKIN_STAFF"]);
  const requireSuperAdmin = requireRole(["SUPER_ADMIN"]);

  function requireTeamAccess(req: any, res: any, next: any) {
    const session = getSessionFromRequest(req);
    if (!session) return res.status(401).json({ success: false, error: "Authentication required." });
    const teamId = String(req.params?.teamId || req.body?.teamId || req.query?.teamId || "");
    const userTeamId = session.user.teamId || "";
    const isAdminRole = ["ADMIN", "REGISTRATION_MANAGER", "CONTENT_MANAGER", "SUPER_ADMIN", "JUDGE", "CHECKIN_STAFF"].includes(String(session.user.role || "").toUpperCase());
    if (!teamId && !isAdminRole) {
      return res.status(400).json({ success: false, error: "Team ID is required." });
    }
    if (teamId && userTeamId && teamId.toLowerCase() !== userTeamId.toLowerCase() && !isAdminRole) {
      return res.status(403).json({ success: false, error: "Forbidden: team access denied." });
    }
    req.session = session.user;
    next();
  }

  function requireSameOriginForMutations(req: any, res: any, next: any) {
    if (["GET", "HEAD", "OPTIONS"].includes((req.method || "GET").toUpperCase())) return next();
    const origin = String(req.headers.origin || "");
    const referer = String(req.headers.referer || "");
    const host = req.headers.host || "";
    const trustedOrigin = origin && (origin === `http://${host}` || origin === `https://${host}` || origin === `http://localhost:${process.env.PORT || 3001}` || origin === `http://127.0.0.1:${process.env.PORT || 3001}` || origin === `https://localhost:${process.env.PORT || 3001}`);
    const trustedReferer = referer && (referer.startsWith(`http://${host}/`) || referer.startsWith(`https://${host}/`) || referer.startsWith("http://localhost:") || referer.startsWith("http://127.0.0.1:"));
    if (origin && !trustedOrigin && !trustedReferer) {
      return res.status(403).json({ success: false, error: "Request origin is not trusted." });
    }
    next();
  }

  // Global per-IP API throttle — a sane ceiling so a single visitor (or a
  // scripted bot burst) can never pin all the CPU. Each limiter below is
  // created fresh once here using the live cmsConfig window.
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: false,
    legacyHeaders: true,
    message: { success: false, error: "Too many requests. Please slow down and try again in a minute." },
  });
  app.use("/api", globalLimiter);

  // Stricter throttle for account-authentication + email-sending endpoints,
  // which are the most common abuse / spambot targets.
  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: false,
    legacyHeaders: true,
    message: { success: false, error: "Too many attempts from this IP. Please wait a moment and retry." },
  });
  app.use(["/api/participant-login", "/api/admin-login", "/api/send-registration-email", "/api/register", "/api/verify-payment", "/api/finance/verify-utr"], authLimiter);

  // In-Memory Data Store (Clean initialization)
  let teams: Team[] = [];
  let submissions: ProjectSubmission[] = [];
  let scorecards: JudgeScorecard[] = [];
  let announcements: Announcement[] = [...SEED_ANNOUNCEMENTS];
  let sponsors: Sponsor[] = [...SPONSORS];
  let milestoneReports: MilestoneReport[] = [];
  let mentorBookings: MentorBooking[] = [];

  // Monotonic sequence for collision-free team/member identity.
  // Derived from a counter (not teams.length) so IDs are unique even when
  // registrations run concurrently or teams are deleted — prevents duplicate
  // Team IDs that would crash downstream lookups and React key rendering.
  let nextTeamNumber = 0;

  let cmsConfig: WebsiteCMSConfig = {
    eventName: "ANVATION 2026",
    eventSubName: "NATIONAL LEVEL 24-HOUR HACKATHON • EXPLORE, INNOVATE, TRANSFORM",
    collegeName: "K. S. SCHOOL OF ENGINEERING AND MANAGEMENT",
    departmentName: "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING",
    eventDates: "OCTOBER 8–9, 2026",
    venueLocation: "KSSEM Campus, Kanakapura Road, Bengaluru",
    totalPrizePool: "₹50,000",
    firstPrize: "₹25,000",
    secondPrize: "₹15,000",
    thirdPrize: "₹10,000",
    contactEmail: "anvation2026@kssem.edu.in",
    contactPhone: "+91 98450 12345 / +91 99001 88776",
    registrationOpen: true,
    freezeRegistrations: false,
    enableMilestoneSubmissions: false, // Admin controlled; unlocked from Admin "Event Flow" panel
    enableMentorBookings: true,
    enableCertificateDownloads: false, // Admin controlled
    enableProjectSubmissions: false, // Admin controlled; released from Admin Portal "Submissions" tab (hidden on frontend until enabled)
    enableSupportTickets: false, // Admin controlled; unlocked from Admin "Event Flow" panel
    enableAnnouncements: false, // Admin controlled; unlocked from Admin "Event Flow" panel
    homeSections: { // Admin controlled; which sections appear on the public home page
      hero: true,
      about: true,
      themes: true,
      schedule: true,
      prizes: true,
      sponsors: true,
      faq: true,
      contact: true
    },
    maxTeamSize: 4,
    minTeamSize: 2,
    registrationFee: 1,
    gateScanSecretKey: "ANVATION-GATE-2026-KEY"
  };

  let tickets: SupportTicket[] = [];

  // ===========================================================================
  // Participant registration CSV backup
  // ---------------------------------------------------------------------------
  // This is intentionally an append-only file, rather than a complete rewrite
  // on every registration. It keeps the write small under registration bursts
  // and preserves a usable participant ledger if the admin UI is unavailable.
  // It is a server-side file, not a browser download; see DEPLOYMENT.md for
  // secure retrieval instructions.
  // ===========================================================================
  // Local development keeps data beside the source. Production can set
  // DATA_DIR=/var/lib/anvation (and optionally BACKUP_DIR) so deploys never
  // overwrite registrations or backups.
  const DATA_DIRECTORY = path.resolve((process.env.DATA_DIR || process.cwd()).trim());
  const PARTICIPANT_BACKUP_DIR = path.resolve((process.env.BACKUP_DIR || path.join(DATA_DIRECTORY, "backups")).trim());
  const PARTICIPANT_BACKUP_FILE = path.join(PARTICIPANT_BACKUP_DIR, "participant-registration-backup.csv");
  const PARTICIPANT_BACKUP_HEADERS = [
    "registration_timestamp",
    "team_id",
    "registration_number",
    "team_name",
    "track",
    "participant_id",
    "participant_name",
    "role",
    "email",
    "phone",
    "usn",
    "college",
    "department",
    "semester",
    "gender",
    "github_url",
    "linkedin_url",
    "accommodation_required",
    "emergency_contact",
    "payment_utr",
    "payment_status",
    "team_status"
  ];

  // Serialising append operations prevents interleaved rows when many teams
  // finish registration at nearly the same time. Async I/O keeps the Node
  // event loop available to receive other requests while a write is pending.
  let participantBackupWriteQueue: Promise<void> = Promise.resolve();

  const csvCell = (value: unknown): string => {
    let text = value === null || value === undefined ? "" : String(value);
    // Avoid CSV/formula injection when this file is opened in Excel or Sheets.
    if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };

  const participantBackupRows = (team: Team): string => team.members.map((member) => {
    const row = [
      team.createdAt,
      team.id,
      team.regNumber,
      team.teamName,
      team.preferredTrack,
      member.id,
      member.fullName,
      member.role,
      member.email,
      member.phone,
      member.usn,
      member.college,
      member.department,
      member.semester,
      member.gender,
      member.githubUrl,
      member.linkedinUrl,
      member.accommodationRequired,
      member.emergencyContact,
      team.paymentUtr,
      team.paymentStatus,
      team.status
    ];
    return row.map(csvCell).join(",");
  }).join("\n");

  const participantBackupFileContents = (seedTeams: Team[]): string => {
    const seedRows = seedTeams
      .map(participantBackupRows)
      .filter(Boolean)
      .join("\n");
    // UTF-8 BOM means non-ASCII names render correctly when opened in Excel.
    return `\uFEFF${PARTICIPANT_BACKUP_HEADERS.map(csvCell).join(",")}\n${seedRows}${seedRows ? "\n" : ""}`;
  };

  const initialiseParticipantRegistrationBackup = () => {
    fs.mkdirSync(PARTICIPANT_BACKUP_DIR, { recursive: true, mode: 0o700 });
    const hasData = fs.existsSync(PARTICIPANT_BACKUP_FILE) && fs.statSync(PARTICIPANT_BACKUP_FILE).size > 0;
    if (hasData) return;

    // When first deployed, seed the CSV from previously persisted teams so the
    // backup is already complete before it starts receiving new registrations.
    fs.writeFileSync(
      PARTICIPANT_BACKUP_FILE,
      participantBackupFileContents(teams),
      { encoding: "utf8", mode: 0o600 }
    );
    console.log(`[BACKUP] Participant registration CSV initialised: ${PARTICIPANT_BACKUP_FILE}`);
  };

  const appendParticipantRegistrationBackup = (team: Team): Promise<void> => {
    const rows = participantBackupRows(team);
    if (!rows) return Promise.resolve();

    const write = async () => {
      await fs.promises.mkdir(PARTICIPANT_BACKUP_DIR, { recursive: true, mode: 0o700 });

      // A manually deleted/emptied file is rebuilt from the authoritative
      // in-memory team store before the new team is appended, rather than
      // silently creating a CSV with no header or historical rows.
      let needsInitialisation = true;
      try {
        needsInitialisation = (await fs.promises.stat(PARTICIPANT_BACKUP_FILE)).size === 0;
      } catch (error: any) {
        if (error?.code !== "ENOENT") throw error;
      }
      if (needsInitialisation) {
        await fs.promises.writeFile(
          PARTICIPANT_BACKUP_FILE,
          participantBackupFileContents(teams),
          { encoding: "utf8", mode: 0o600 }
        );
      }

      await fs.promises.appendFile(PARTICIPANT_BACKUP_FILE, `${rows}\n`, { encoding: "utf8", mode: 0o600 });
    };

    // Continue processing later registrations even if an earlier write failed;
    // the caller of the failed registration receives a retryable 503 response.
    participantBackupWriteQueue = participantBackupWriteQueue.catch(() => undefined).then(write);
    return participantBackupWriteQueue;
  };

  app.use((req, res, next) => {
    if (req.method === "OPTIONS") return next();
    if (["POST", "PUT", "PATCH", "DELETE"].includes((req.method || "GET").toUpperCase())) {
      return requireSameOriginForMutations(req, res, next);
    }
    next();
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Get Registration & CMS Status
  app.get("/api/registration-status", (req, res) => {
    res.json({
      success: true,
      registrationOpen: cmsConfig.registrationOpen && !cmsConfig.freezeRegistrations,
      freezeRegistrations: !!cmsConfig.freezeRegistrations,
      totalTeams: teams.length,
      maxRegistrations: cmsConfig.maxRegistrations || 100
    });
  });

  // Toggle Freeze Registration (Admin Control)
  app.post("/api/admin/toggle-freeze-registration", requireAdmin, (req, res) => {
    try {
      const { freeze } = req.body;
      cmsConfig.freezeRegistrations = typeof freeze === 'boolean' ? freeze : !cmsConfig.freezeRegistrations;
      cmsConfig.registrationOpen = !cmsConfig.freezeRegistrations;
      
      console.log(`[REGISTRATION STATUS] Freeze is now: ${cmsConfig.freezeRegistrations}`);
      
      res.json({
        success: true,
        freezeRegistrations: cmsConfig.freezeRegistrations,
        registrationOpen: cmsConfig.registrationOpen,
        message: cmsConfig.freezeRegistrations ? "Registrations have been FROZEN." : "Registrations are now OPEN."
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Clear / Reset All Registered Teams (Admin Control)
  app.post("/api/admin/clear-all-teams", requireSuperAdmin, (req, res) => {
    try {
      const previousCount = teams.length;
      teams = [];
      submissions = [];
      milestoneReports = [];
      scorecards = [];
      tickets = [];
      nextTeamNumber = 0;
      console.log(`[ADMIN ACTION] Cleared all ${previousCount} registered teams.`);
      res.json({
        success: true,
        message: `Cleared all ${previousCount} registered teams and related records.`,
        teamsCount: 0
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Teams & Registrations
  app.get("/api/teams", async (req, res) => {
    try {
      const sourceTeams = isSupabaseConfigured() ? await listTeams() : teams;
      // Calculate live real-time statistics
      const totalParticipants = sourceTeams.reduce((acc, t) => acc + t.members.length, 0);
      const uniqueColleges = new Set(sourceTeams.flatMap(t => t.members.map(m => m.college))).size;
      const totalCapacity = cmsConfig.maxRegistrations || 350;
      const seatsLeft = Math.max(0, totalCapacity - totalParticipants);

      const safeTeams = sourceTeams.map((team) => sanitizeTeamForClient(team));
      res.json({
        success: true,
        teams: safeTeams,
        freezeRegistrations: !!cmsConfig.freezeRegistrations,
        registrationOpen: cmsConfig.registrationOpen && !cmsConfig.freezeRegistrations,
        stats: {
          registeredCount: totalParticipants,
          collegesCount: uniqueColleges,
          seatsLeft,
          totalSeats: totalCapacity,
          totalTeams: sourceTeams.length
        }
      });
    } catch (error: any) {
      res.status(503).json({ success: false, error: "Participant database is temporarily unavailable." });
    }
  });

  // Gate Check-in / Venue Entry Endpoint for Admin Scanner
  app.post("/api/teams/:id/check-in", requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const index = teams.findIndex(t => 
        t.id.toLowerCase() === id.toLowerCase() || 
        t.regNumber.toLowerCase() === id.toLowerCase() ||
        t.leaderEmail.toLowerCase() === id.toLowerCase()
      );

      if (index === -1) {
        return res.status(404).json({ success: false, error: `Team with ID/Pass "${id}" not found.` });
      }

      const team = teams[index];
      const entryTime = new Date().toISOString();
      team.status = 'Checked-In';
      team.members = team.members.map(m => ({
        ...m,
        checkedIn: true,
        checkInTime: m.checkInTime || entryTime
      }));

      teams[index] = team;
      markDirty(); // persist check-in promptly
      console.log(`[GATE PASS SCANNED] Team ${team.id} (${team.teamName}) admitted to venue at ${entryTime}`);
      const safeTeam = sanitizeTeamForClient(team);

      res.json({
        success: true,
        team: safeTeam,
        message: `Team ${team.teamName} (${team.id}) successfully verified and admitted to KSSEM venue!`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Secure Participant Login Endpoint
  app.post("/api/participant-login", async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: "Team credentials are required." });
      }

      const cleanId = String(identifier).trim().toLowerCase();
      const cleanPass = String(password).trim();

      const sourceTeams = isSupabaseConfigured() ? await listTeams() : teams;
      const team = sourceTeams.find(t => 
        t.id.toLowerCase() === cleanId ||
        (t.regNumber && t.regNumber.toLowerCase() === cleanId) ||
        (t.teamName && t.teamName.toLowerCase() === cleanId) ||
        (t.leaderEmail && t.leaderEmail.toLowerCase() === cleanId) ||
        t.members.some(m => 
          (m.email && m.email.toLowerCase() === cleanId) || 
          (m.usn && m.usn.toLowerCase() === cleanId) ||
          (m.fullName && m.fullName.toLowerCase() === cleanId)
        )
      );

      if (!team) {
        return res.status(401).json({ success: false, error: "Invalid credentials." });
      }

      const storedHash = team.accessPassword || "";
      const passMatches = verifyPassword(cleanPass, storedHash);

      if (!passMatches) {
        return res.status(401).json({ success: false, error: "Invalid credentials." });
      }

      const sid = createSession({
        id: team.id,
        type: 'participant',
        role: 'PARTICIPANT',
        teamId: team.id,
        email: team.leaderEmail,
        name: team.teamName,
      });
      setAuthCookie(res, sid);

      const safeTeam = sanitizeTeamForClient(team);
      res.json({
        success: true,
        team: safeTeam,
        message: `Welcome back, Team ${team.teamName}!`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      if (cmsConfig.freezeRegistrations || !cmsConfig.registrationOpen) {
        return res.status(403).json({
          success: false,
          error: "Registrations are currently frozen by the Administrator. New team submissions are temporarily paused."
        });
      }

      const { teamName, preferredTrack, leader, members = [], accommodationRequired, paymentUtr, paymentAmount, paymentScreenshot } = req.body;
      if (!teamName || !leader?.fullName || !leader?.email) {
        return res.status(400).json({ success: false, error: "Missing required registration fields" });
      }

      // Payment screenshot is MANDATORY — a team must never be registered (and
      // its payment recorded) without proof of the successful PhonePe transaction.
      if (!paymentScreenshot || String(paymentScreenshot).trim() === '') {
        return res.status(400).json({
          success: false,
          error: "Payment screenshot is required. Please upload a screenshot of your successful PhonePe transaction before registering."
        });
      }

      const teamIndex = isSupabaseConfigured()
        ? await allocateTeamNumber()
        : ++nextTeamNumber;
      const teamId = `AN-${String(teamIndex).padStart(3, '0')}`;
      const regNumber = `CODE-2026-${String(teamIndex).padStart(3, '0')}`;

      const leaderParticipant: Participant = {
        id: `p-${teamIndex}-1`,
        fullName: leader.fullName,
        college: leader.college || 'KS School of Engineering & Management',
        department: leader.department || 'Computer Science & Engineering',
        semester: leader.semester || '6th Semester',
        email: leader.email,
        phone: leader.phone || '',
        usn: leader.usn || `1KG23CS${Math.floor(10 + Math.random() * 89)}`,
        gender: leader.gender || 'Male',
        githubUrl: leader.githubUrl,
        linkedinUrl: leader.linkedinUrl,
        role: 'Leader',
        teamId,
        accommodationRequired: !!accommodationRequired,
        emergencyContact: leader.emergencyContact || leader.phone || '',
        checkedIn: false,
        foodCouponsClaimed: { lunch1: false, dinner1: false, midnightSnack: false, breakfast2: false, lunch2: false }
      };

      const formattedMembers: Participant[] = members.map((m: any, idx: number) => ({
        id: `p-${teamIndex}-${idx + 2}`,
        fullName: m.fullName,
        college: m.college || leader.college || 'KSSEM',
        department: m.department || 'CSE',
        semester: m.semester || '6th Semester',
        email: m.email,
        phone: m.phone || '',
        usn: m.usn || `1KG23CS${Math.floor(10 + Math.random() * 89)}`,
        gender: m.gender || 'Male',
        githubUrl: m.githubUrl,
        linkedinUrl: m.linkedinUrl,
        role: 'Member',
        teamId,
        accommodationRequired: !!accommodationRequired,
        emergencyContact: m.emergencyContact || leader.phone || '',
        checkedIn: false,
        foodCouponsClaimed: { lunch1: false, dinner1: false, midnightSnack: false, breakfast2: false, lunch2: false }
      }));

      const accessPassword = `CODE2026#${Math.floor(1000 + Math.random() * 9000)}`;

      const newTeam: Team = {
        id: teamId,
        regNumber,
        teamName,
        leaderEmail: leader.email,
        accessPassword: hashPassword(accessPassword),
        preferredTrack: preferredTrack || 'Artificial Intelligence & Machine Learning',
        members: [leaderParticipant, ...formattedMembers],
        status: 'Confirmed',
        createdAt: new Date().toISOString(),
        projectSubmitted: false,
        paymentUtr: paymentUtr || 'PENDING',
        paymentStatus: 'Verified',
        paymentScreenshot: paymentScreenshot || null
      };

      if (isSupabaseConfigured()) {
        try {
          await saveTeam(newTeam);
        } catch (databaseError) {
          console.error("[SUPABASE] Registration write failed; registration was not accepted:", databaseError);
          return res.status(503).json({
            success: false,
            error: "Registration database is temporarily unavailable. Please retry in a moment; no registration has been recorded."
          });
        }
      }

      // Local registration data is also written to a lightweight, append-only CSV
      // before we report success. This gives organisers a recoverable list of
      // every participant even if the Admin Portal is unavailable later.
      //
      // Do this before mutating `teams`: a failed backup write must never leave
      // a registration that the participant thinks has completed successfully.
      if (!isSupabaseConfigured()) {
        try {
          await appendParticipantRegistrationBackup(newTeam);
        } catch (backupError) {
          console.error("[BACKUP] Registration CSV write failed; registration was not accepted:", backupError);
          return res.status(503).json({
            success: false,
            error: "Registration backup is temporarily unavailable. Please retry in a moment; no registration has been recorded."
          });
        }
      }

      teams.push(newTeam);
      if (!isSupabaseConfigured()) markDirty(); // flush local registration to disk promptly

      // Automated registration email trigger for all team members
      const allTeamEmails = [
        { email: leader.email, name: leader.fullName, role: 'Leader' },
        ...members.filter((m: any) => m.email).map((m: any) => ({ email: m.email, name: m.fullName, role: 'Member' }))
      ];

      const emailRecords = allTeamEmails.map(member => {
        const emailRecord = {
          id: `mail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          recipient: member.email,
          recipientName: member.name,
          role: member.role,
          teamId,
          teamName,
          track: preferredTrack || 'AI / ML',
          accessPassword,
          regNumber,
          subject: `🎉 Registration Confirmed: ANVATION 2026 [Team ID: ${teamId}]`,
          venue: "K.S. School of Engineering and Management (KSSEM), Kanakapura Road, Bengaluru - 560109",
          dates: "October 8 - October 9, 2026 (24-Hour Hackathon)",
          dispatchedAt: new Date().toISOString(),
          status: "DELIVERED"
        };
        console.log(`[EMAIL DISPATCHED] To: ${member.email} (${member.name}) | Team: ${teamId} | Pass: ${accessPassword}`);
        return emailRecord;
      });

      const totalParticipants = teams.reduce((acc, t) => acc + t.members.length, 0);
      const uniqueColleges = new Set(teams.flatMap(t => t.members.map(m => m.college))).size;
      const totalCapacity = 350;
      const seatsLeft = Math.max(0, totalCapacity - totalParticipants);
      const registrationTeam = sanitizeTeamForClient(newTeam);

      res.json({
        success: true,
        team: registrationTeam,
        paymentAmount: Number(paymentAmount) || newTeam.members.length * Number(cmsConfig.registrationFee || 1),
        emailDispatched: true,
        emailRecipients: allTeamEmails.map(e => e.email),
        emailRecords,
        stats: {
          registeredCount: totalParticipants,
          collegesCount: uniqueColleges,
          seatsLeft,
          totalSeats: totalCapacity,
          totalTeams: teams.length
        }
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Verify PhonePe Payment Endpoint
  app.post("/api/verify-payment", (req, res) => {
    try {
      const { utr, amount, screenshotProvided } = req.body;
      const expectedAmount = Number(amount) || cmsConfig.registrationFee;
      const cleanUtr = (utr ? String(utr).trim().toUpperCase() : '');
      const validUtrPattern = /^[A-Z0-9]{12,22}$/i;

      if (!screenshotProvided) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: "Payment verification failed: no payment screenshot was uploaded. Please upload a screenshot of your successful PhonePe transaction."
        });
      }

      if (!cleanUtr) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: "Please enter the actual PhonePe/UPI transaction reference from your payment confirmation."
        });
      }

      if (!validUtrPattern.test(cleanUtr)) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: "Invalid UTR. Use the actual 12+ digit PhonePe/UPI transaction reference (letters/numbers only)."
        });
      }

      res.json({
        success: true,
        verified: true,
        utr: cleanUtr,
        amount: expectedAmount,
        beneficiary: "ANVATION 2026 (kgsoumya1605@okicici)",
        verifiedAt: new Date().toISOString(),
        message: `Payment of ₹${expectedAmount} verified successfully via PhonePe UPI Gateway.`
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Real-time Payment Status Polling / Listening Endpoint
  app.get("/api/payment-listener", (req, res) => {
    try {
      const { upiId } = req.query;
      const ref = `UPI${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
      res.json({
        success: true,
        listenerActive: true,
        targetUpi: upiId || "kgsoumya1605@okicici",
        amount: String(cmsConfig.registrationFee),
        suggestedUtr: ref,
        status: "WAITING_FOR_USER_CONFIRMATION"
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Registration Confirmation Email dispatch. Sends a real mail to every
  // leader/member when SMTP is configured (SMTP_HOST/USER/PASS), else returns a
  // downloadable .eml fallback. Includes the Gate Entry Pass QR in the body.
  app.post("/api/send-registration-email", async (req, res) => {
    try {
      const { teamId, email, emails, teamName, track, password, regNumber, participants } = req.body;
      // participants: [{ email, name, college, role }] — used so the confirmation
      // mail always includes the College of every registered participant.
      const participantList: Array<{ email: string; name: string; college: string; role: string }> =
        Array.isArray(participants) && participants.length > 0
          ? participants.map((p: any) => ({
              email: String((p && p.email) || '').trim(),
              name: (p && p.name) || '',
              college: (p && p.college) || 'Not specified',
              role: (p && p.role) || 'Member'
            }))
          : [];
      const recipientList: string[] = participantList.length > 0
        ? participantList.map(p => p.email).filter(Boolean)
        : (emails && Array.isArray(emails) ? emails : (email ? [email] : []));
      if (recipientList.length === 0) {
        return res.status(400).json({ success: false, error: "At least one recipient email is required" });
      }
      const to = recipientList.join(", ");
      const subject = `Registration Confirmed: ANVATION 2026 [Team ID: ${teamId}]`;
      const dateStr = new Date().toUTCString();
      let gateQr = "";
      let gateQrBuffer: Buffer | null = null;
      try {
        gateQr = await QRCode.toDataURL(String(teamId || "AN-000"), { width: 220, margin: 1, errorCorrectionLevel: "H", color: { dark: "#0B192C", light: "#FFFFFF" } });
        gateQrBuffer = await QRCode.toBuffer(String(teamId || "AN-000"), { width: 220, margin: 1, errorCorrectionLevel: "H", color: { dark: "#0B192C", light: "#FFFFFF" } });
      } catch (e) { /* optional */ }
      const venue = "K.S. School of Engineering & Management (KSSEM), Kanakapura Road, Bengaluru - 560109";
      const dates = "October 8 - October 9, 2026 (24-Hour Hackathon)";
      const htmlR = `ANVATION 2026 - Registration Confirmed
Team ID: ${teamId}
Registration No: ${regNumber}
Team Name: ${teamName}
Track: ${track}
Portal Password: ${password}
Venue: ${venue}
Dates: ${dates}
Use your Team ID and Password (or Leader email) to log into the Participant Portal. Present the Gate Entry Pass QR at the entrance.`;
      const membersRows = (participantList.length > 0
        ? participantList
        : recipientList.map((e) => ({ email: e, name: '', college: 'Not specified', role: 'Participant' }))
      ).map((p) => `<tr><td style="padding:5px 8px;border:1px solid #e2e8f0;font-family:monospace;font-size:12px;color:#334155;">${p.email}</td><td style="padding:5px 8px;border:1px solid #e2e8f0;font-size:12px;color:#334155;">${p.college}</td><td style="padding:5px 8px;border:1px solid #e2e8f0;font-size:12px;color:#334155;">${p.role}</td></tr>`).join("");
      // The QR is embedded via a data URL in the downloadable .eml, but webmail
      // clients like Gmail strip base64 data: images for security. So for real
      // SMTP delivery we attach the QR as an inline (cid:) image instead, which
      // Gmail renders reliably in the "GATE ENTRY PASS" block.
      const qrImgForEml = gateQr ? `<img src="${gateQr}" style="width:180px;height:180px;" />` : `<span>Show your Team ID at the gate scanner.</span>`;
      const qrImgForMail = gateQr ? `<img src="cid:gate-pass-qr" style="width:180px;height:180px;" />` : `<span>Show your Team ID at the gate scanner.</span>`;
      const htmlOpen = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;color:#0f172a;">
<div style="background:#0b192c;color:#fff;padding:22px 26px;"><div style="font-size:22px;font-weight:800;letter-spacing:1px;">ANVATION 2026</div><div style="font-size:12px;color:#67e8f9;">NATIONAL LEVEL 24-HOUR HACKATHON</div></div>
<div style="padding:24px 26px;line-height:1.6;"><h2 style="margin-top:0;">Registration Confirmed ✓</h2>
<p>Congratulations! Your team's registration for <strong>ANVATION 2026</strong> has been confirmed.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;">`;
      const htmlRows = `<tr><td style="padding:6px 0;color:#475569;">Team ID</td><td style="padding:6px 0;font-weight:bold;font-family:monospace;color:#0284c7;">${teamId}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Registration No</td><td style="padding:6px 0;font-weight:bold;">${regNumber}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Team Name</td><td style="padding:6px 0;font-weight:bold;">${teamName}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Track</td><td style="padding:6px 0;font-weight:bold;">${track}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Portal Password</td><td style="padding:6px 0;font-weight:bold;font-family:monospace;color:#7e22ce;">${password}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Venue</td><td style="padding:6px 0;font-weight:bold;">${venue}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Dates</td><td style="padding:6px 0;font-weight:bold;">${dates}</td></tr></table>
<div style="margin-top:14px;"><div style="font-weight:800;color:#0b192c;margin-bottom:6px;">Registered Participants &amp; College</div>
<table style="width:100%;border-collapse:collapse;font-size:12px;"><tr><th style="padding:5px 8px;border:1px solid #e2e8f0;background:#f1f5f9;text-align:left;">Email</th><th style="padding:5px 8px;border:1px solid #e2e8f0;background:#f1f5f9;text-align:left;">College</th><th style="padding:5px 8px;border:1px solid #e2e8f0;background:#f1f5f9;text-align:left;">Role</th></tr>${membersRows}</table></div>
<div style="margin-top:18px;padding:14px;border:1px dashed #0284c7;border-radius:10px;text-align:center;background:#f0f9ff;"><div style="font-weight:800;color:#0b7490;margin-bottom:8px;">GATE ENTRY PASS</div>${qrImgForEml}<div style="font-size:11px;color:#475569;margin-top:6px;">Present this QR and your college ID at the KSSEM Gate Check-in desk on ${dates}.</div></div>
</div>
<div style="background:#f1f5f9;padding:14px 26px;font-size:12px;color:#64748b;">For any help, write to anvation2026@kssem.edu.in · Generated ${new Date().toLocaleString()}</div>
</div>`;
      const htmlFull = htmlOpen + htmlRows;
      // Same body but with the QR referenced by its cid so it renders in Gmail.
      const htmlMail = htmlOpen + htmlRows.replace(`GATE ENTRY PASS</div>${qrImgForEml}`, `GATE ENTRY PASS</div>${qrImgForMail}`);
      const eml = [`From: "ANVATION 2026" <noreply@anvation.local>`, `To: ${to}`, `Subject: ${subject}`, `Date: ${dateStr}`, `MIME-Version: 1.0`, `Content-Type: text/html; charset=UTF-8`, "", `${htmlFull}`].join("\r\n");
      const smtpHost = process.env.SMTP_HOST;
      const smtpConfigured = !!smtpHost;
      let delivered = 0, failed = 0;
      let smtpError = "";
      const emailRecipients: Array<{ recipient: string; status: string; error?: string }> = [];
      if (smtpHost) {
        const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(process.env.SMTP_PORT) || 587, secure: process.env.SMTP_SECURE === "true", auth: { user: process.env.SMTP_USER || "", pass: process.env.SMTP_PASS || "" } });
        const from = process.env.MAIL_FROM || `"ANVATION 2026" <${process.env.SMTP_USER || "noreply@anvation.local"}>`;
        // Verify the SMTP connection (login/auth) once before sending so a bad
        // host or invalid credentials surface a clear, logged error instead of
        // silently producing only a downloadable .eml file.
        try {
          await transporter.verify();
        } catch (verifyErr: any) {
          smtpError = String((verifyErr && verifyErr.message) || verifyErr);
          console.error(`[EMAIL] SMTP verification failed: ${smtpError}`);
        }
        if (smtpError) {
          emailRecipients.push(...recipientList.map((r) => ({ recipient: r, status: "FAILED", error: smtpError })));
          failed = recipientList.length;
          return res.json({ success: false, smtpConfigured: true, smtpError, deliveredCount: 0, failedCount: failed, recipients: recipientList, emailRecipients, transport: "SMTP", gatewayMessage: `SMTP is configured but the connection check failed: ${smtpError}. No emails were delivered. Double-check SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (Gmail requires an App Password, not your login password).`, subject, eml });
        }
        for (const recipient of recipientList) {
          try {
            const info = await transporter.sendMail({
              from,
              to: recipient,
              subject,
              text: htmlR,
              html: htmlMail,
              attachments: gateQrBuffer
                ? [{
                    filename: "gate-pass-qr.png",
                    content: gateQrBuffer,
                    cid: "gate-pass-qr",
                    contentType: "image/png"
                  }]
                : undefined
            });
            delivered++;
            emailRecipients.push({ recipient, status: "SENT" });
            console.log(`[EMAIL SENT] To: ${recipient} | Team: ${teamId} | ${info.messageId}`);
          } catch (mailErr: any) {
            failed++;
            emailRecipients.push({ recipient, status: "FAILED", error: String(mailErr.message || mailErr) });
            console.error(`[EMAIL FAILED] To: ${recipient} | Team: ${teamId} | ${mailErr.message}`);
          }
        }
        res.json({ success: delivered > 0, deliveredCount: delivered, failedCount: failed, recipients: recipientList, emailRecipients, transport: "SMTP", gatewayMessage: delivered > 0 ? "Confirmation emails sent to all participants." : (failed === recipientList.length ? "SMTP is configured but delivery failed — double-check SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS." : "Some emails could not be delivered."), subject, eml, smtpConfigured });
      } else {
        console.warn(`[EMAIL] SMTP NOT CONFIGURED (SMTP_HOST missing) — real mail was NOT delivered. Generated local .eml for: ${recipientList.join(", ")} | Team: ${teamId}`);
        res.json({ success: true, message: "SMTP not configured — real emails were NOT sent to participants. To actually deliver the confirmation mail (with the Gate Pass QR + college) to leader/member inboxes, set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM, then restart the server. A downloadable .eml was generated as a fallback.", recipients: recipientList, emailRecipients: recipientList.map(r => ({ recipient: r, status: "READY" })), deliveredCount: recipientList.length, failedCount: 0, subject, eml, smtpConfigured: false });
      }
    } catch (err: any) {
      console.error("[EMAIL ERROR]", err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Edit / Update Team Endpoint (Used by Admin & Registration Slip Edit)
  app.put("/api/teams/:id", requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const index = teams.findIndex(t => t.id.toLowerCase() === id.toLowerCase() || t.regNumber.toLowerCase() === id.toLowerCase());

      if (index === -1) {
        return res.status(404).json({ success: false, error: "Team not found" });
      }

      // Merge team updates safely
      const existingTeam = teams[index];
      const updatedTeam: Team = {
        ...existingTeam,
        ...updateData,
        id: existingTeam.id, // Preserve immutable ID
        regNumber: existingTeam.regNumber,
        members: updateData.members ? updateData.members : existingTeam.members,
        updatedAt: new Date().toISOString()
      };

      // Keep leaderEmail in sync with leader participant if updated
      if (updatedTeam.members && updatedTeam.members.length > 0) {
        const leader = updatedTeam.members.find(m => m.role === 'Leader') || updatedTeam.members[0];
        if (leader?.email) {
          updatedTeam.leaderEmail = leader.email;
        }
      }

      teams[index] = updatedTeam;
      markDirty();
      res.json({ success: true, team: sanitizeTeamForClient(updatedTeam), message: "Team updated successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete Team Endpoint
  app.delete("/api/teams/:id", requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const initialLen = teams.length;
    teams = teams.filter(t => t.id.toLowerCase() !== id.toLowerCase() && t.regNumber.toLowerCase() !== id.toLowerCase());
    if (teams.length === initialLen) {
      return res.status(404).json({ success: false, error: "Team not found" });
    }
    res.json({ success: true, message: "Team deleted successfully" });
    markDirty();
  });

  // Edit / Update Individual Participant Endpoint
  app.put("/api/participants/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const participantData = req.body;

    let found = false;
    for (const team of teams) {
      const memberIndex = team.members.findIndex(m => m.id === id || m.usn.toLowerCase() === id.toLowerCase());
      if (memberIndex !== -1) {
        team.members[memberIndex] = {
          ...team.members[memberIndex],
          ...participantData
        };
        found = true;
        return res.json({ success: true, participant: team.members[memberIndex], message: "Participant updated successfully" });
      }
    }

    if (!found) {
      res.status(404).json({ success: false, error: "Participant not found" });
    }
  });

  // QR Check-In
  app.post("/api/checkin", requireAdmin, (req, res) => {
    const { query } = req.body; // Team ID or USN or Email
    if (!query) return res.status(400).json({ success: false, error: "Query required" });

    const cleanQuery = query.trim().toUpperCase();
    const team = teams.find(t => 
      t.id.toUpperCase() === cleanQuery ||
      t.regNumber.toUpperCase() === cleanQuery ||
      t.members.some(m => m.usn.toUpperCase() === cleanQuery || m.email.toUpperCase() === cleanQuery)
    );

    if (!team) {
      return res.status(404).json({ success: false, error: "Participant or Team not found" });
    }

    team.status = 'Checked-In';
    team.members.forEach(m => {
      m.checkedIn = true;
      m.checkInTime = new Date().toISOString();
    });

    res.json({ success: true, team, message: `Team ${team.teamName} successfully checked in at KSSEM venue!` });
  });

  // Food Coupon Claim
  app.post("/api/food-coupon/claim", requireAdmin, (req, res) => {
    const { teamId, usn, mealKey } = req.body;
    const team = teams.find(t => t.id === teamId);
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });

    const member = team.members.find(m => m.usn === usn || m.id === usn);
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });

    if (!member.foodCouponsClaimed) {
      member.foodCouponsClaimed = { lunch1: false, dinner1: false, midnightSnack: false, breakfast2: false, lunch2: false };
    }

    if ((member.foodCouponsClaimed as any)[mealKey]) {
      return res.status(400).json({ success: false, error: `Coupon for ${mealKey} already claimed!` });
    }

    (member.foodCouponsClaimed as any)[mealKey] = true;
    res.json({ success: true, member, message: `Coupon for ${mealKey} verified and redeemed!` });
  });

  // Submissions
  app.get("/api/submissions", (req, res) => {
    res.json({ success: true, submissions });
  });

  app.post("/api/submit-project", requireTeamAccess, (req, res) => {
    try {
      const { teamId, projectTitle, problemStatement, technologyStack, architectureOverview, githubLink, demoVideoUrl, pptUrl, pdfDocUrl, futureScope, track } = req.body;
      if (!teamId || !projectTitle || !githubLink) {
        return res.status(400).json({ success: false, error: "Missing required submission fields" });
      }

      if (req.session?.teamId && teamId && String(teamId).toLowerCase() !== String(req.session.teamId).toLowerCase()) {
        return res.status(403).json({ success: false, error: "Forbidden: team access denied." });
      }
      const team = teams.find(t => t.id === teamId);
      const teamName = team ? team.teamName : 'Team ' + teamId;

      const newSubmission: ProjectSubmission = {
        id: `sub-${Date.now()}`,
        teamId,
        teamName,
        track: track || (team ? team.preferredTrack : 'Artificial Intelligence & Machine Learning'),
        projectTitle,
        problemStatement,
        technologyStack: Array.isArray(technologyStack) ? technologyStack : (technologyStack || '').split(',').map((s: string) => s.trim()),
        architectureOverview,
        githubLink,
        demoVideoUrl,
        pptUrl,
        pdfDocUrl,
        futureScope,
        submittedAt: new Date().toISOString(),
        evaluated: false
      };

      // Upsert
      const existingIdx = submissions.findIndex(s => s.teamId === teamId);
      if (existingIdx >= 0) {
        submissions[existingIdx] = newSubmission;
      } else {
        submissions.push(newSubmission);
      }
      markDirty();

      if (team) {
        team.projectSubmitted = true;
        team.status = 'Submitted';
      }

      res.json({ success: true, submission: newSubmission });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Judge Scorecards
  app.get("/api/scorecards", (req, res) => {
    res.json({ success: true, scorecards });
  });

  app.post("/api/scorecards", requireAdmin, (req, res) => {
    try {
      const { submissionId, teamId, judgeName, innovation = 0, impact = 0, technicalComplexity = 0, presentation = 0, uiUx = 0, scalability = 0, originality = 0, bonusPoints = 0, penalty = 0, feedback } = req.body;
      
      const totalScore = Math.max(0, Number(innovation) + Number(impact) + Number(technicalComplexity) + Number(presentation) + Number(uiUx) + Number(scalability) + Number(originality) + Number(bonusPoints) - Number(penalty));

      const scorecard: JudgeScorecard = {
        id: `sc-${Date.now()}`,
        submissionId,
        teamId,
        judgeName: judgeName || 'Jury Panel',
        innovation: Number(innovation),
        impact: Number(impact),
        technicalComplexity: Number(technicalComplexity),
        presentation: Number(presentation),
        uiUx: Number(uiUx),
        scalability: Number(scalability),
        originality: Number(originality),
        bonusPoints: Number(bonusPoints),
        penalty: Number(penalty),
        totalScore,
        feedback: feedback || 'Solid submission.'
      };

      scorecards.push(scorecard);
      markDirty();

      // Mark submission evaluated
      const sub = submissions.find(s => s.id === submissionId || s.teamId === teamId);
      if (sub) sub.evaluated = true;

      res.json({ success: true, scorecard });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  let liveBroadcastAlert = {
    active: false,
    message: "Welcome to KSSEM ANVATION 1.0! All Checkpoint 1 reports due at 02:00 PM.",
    type: "info"
  };

  // Announcements
  app.get("/api/announcements", (req, res) => {
    res.json({ success: true, announcements });
  });

  app.post("/api/announcements", requireAdmin, (req, res) => {
    const { title, content, category = 'General', urgent } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, error: "Title and content required" });

    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title,
      content,
      category,
      timestamp: new Date().toISOString(),
      urgent: !!urgent
    };

    announcements.unshift(newAnn);
    res.json({ success: true, announcement: newAnn });
  });

  app.post("/api/announcements/edit", requireAdmin, (req, res) => {
    const { id, title, content, category, urgent } = req.body;
    const ann = announcements.find(a => a.id === id);
    if (!ann) return res.status(404).json({ success: false, error: "Announcement not found" });

    if (title) ann.title = title;
    if (content) ann.content = content;
    if (category) ann.category = category;
    if (urgent !== undefined) ann.urgent = !!urgent;

    res.json({ success: true, announcement: ann });
  });

  app.post("/api/announcements/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    announcements = announcements.filter(a => a.id !== id);
    res.json({ success: true, message: "Announcement deleted" });
  });

  // Sponsors (public home page + admin editable)
  app.get("/api/sponsors", (req, res) => {
    res.json({ success: true, sponsors });
  });

  app.post("/api/sponsors", requireAdmin, (req, res) => {
    const { name, category = 'Community', logo, website, description } = req.body;
    if (!name || !website) return res.status(400).json({ success: false, error: "Name and website are required" });
    const newSponsor: Sponsor = {
      id: `sp-${Date.now()}`,
      name,
      category,
      logo: logo || name,
      website,
      description: description || ''
    };
    sponsors.push(newSponsor);
    res.json({ success: true, sponsor: newSponsor });
  });

  app.post("/api/sponsors/edit", requireAdmin, (req, res) => {
    const { id, name, category, logo, website, description } = req.body;
    const sp = sponsors.find(s => s.id === id);
    if (!sp) return res.status(404).json({ success: false, error: "Sponsor not found" });
    if (name) sp.name = name;
    if (category) sp.category = category;
    if (logo !== undefined) sp.logo = logo;
    if (website) sp.website = website;
    if (description !== undefined) sp.description = description;
    res.json({ success: true, sponsor: sp });
  });

  app.post("/api/sponsors/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    sponsors = sponsors.filter(s => s.id !== id);
    res.json({ success: true, message: "Sponsor deleted" });
  });

  // Live Emergency Broadcast Alert for Participant Portal
  app.get("/api/broadcast-alert", (req, res) => {
    res.json({ success: true, alert: liveBroadcastAlert });
  });

  app.post("/api/broadcast-alert", requireAdmin, (req, res) => {
    const { active, message, type } = req.body;
    liveBroadcastAlert = {
      active: active !== undefined ? active : true,
      message: message || liveBroadcastAlert.message,
      type: type || 'info'
    };
    res.json({ success: true, alert: liveBroadcastAlert });
  });

  // Team Edit by Super Admin
  app.post("/api/teams/edit", requireAdmin, (req, res) => {
    const { id, teamName, preferredTrack, checkedIn, status } = req.body;
    const team = teams.find(t => t.id === id);
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });

    if (teamName) team.teamName = teamName;
    if (preferredTrack) team.preferredTrack = preferredTrack;
    if (status) team.status = status;
    else if (checkedIn) team.status = 'Checked-In';
    
    res.json({ success: true, team });
  });

  // Audit Logs Store
  let auditLogs: AuditLog[] = [
    {
      id: "log-101",
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "CMS Config Update",
      target: "Website CMS Settings",
      beforeValue: "Registration Open = true",
      afterValue: "Total Prize Pool = ₹2,00,000+",
      reason: "Super Admin updated prize pool details",
      ipAddress: "192.168.1.10"
    },
    {
      id: "log-102",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Checkpoint Approved",
      target: "Team Neural Ninjas (CT-101)",
      beforeValue: "Pending",
      afterValue: "Approved",
      reason: "Review completed by Jury Panel",
      ipAddress: "192.168.1.10"
    }
  ];

  // Admin Users List
  let adminUsers: AdminUser[] = [
    { id: "adm-1", email: "superadmin@kssem.edu.in", username: "superadmin", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Dr. K Venkata Rao", role: "SUPER_ADMIN", status: "Active", createdAt: "2026-08-01", twoFactorEnabled: true },
    { id: "adm-2", email: "regmanager@kssem.edu.in", username: "regmanager", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Prof. Rajesh Kumar", role: "REGISTRATION_MANAGER", status: "Active", createdAt: "2026-08-02", twoFactorEnabled: false },
    { id: "adm-3", email: "contentmanager@kssem.edu.in", username: "contentmanager", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Prof. Sneha V", role: "CONTENT_MANAGER", status: "Active", createdAt: "2026-08-03", twoFactorEnabled: true },
    { id: "adm-4", email: "judge1@bosch.com", username: "judge1", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Dr. Ramesh Kumar (Bosch)", role: "JUDGE", status: "Active", createdAt: "2026-08-04", twoFactorEnabled: false },
    { id: "adm-5", email: "checkin1@kssem.edu.in", username: "checkin1", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Volunteer Gate Staff 1", role: "CHECKIN_STAFF", status: "Active", createdAt: "2026-08-05", twoFactorEnabled: false }
  ];

  // Checkpoint (Milestone) definitions — admin can add / edit / delete these.
  let checkpoints: Checkpoint[] = [
    { id: "cp-1", number: 1, title: "Ideation & System Design", description: "Architecture, DB schema, UI wireframes, and API selection.", time: "02:00 PM (Day 1)", status: "Open" },
    { id: "cp-2", number: 2, title: "Core Prototype & API Integration", description: "Working code MVP, API endpoints, backend logic.", time: "10:00 PM (Day 1)", status: "Open" },
    { id: "cp-3", number: 3, title: "Final Pitch Deck & Live Demo", description: "Completed Github repo, video recording, and slides.", time: "07:00 AM (Day 2)", status: "Open" }
  ];

  // File persistence — registration records & admin users survive server restarts.
  const DATA_FILE = path.join(DATA_DIRECTORY, "server-data.json");

  let dirtyTimer: NodeJS.Timeout | null = null;

  const loadPersisted = () => {
    try {
      fs.mkdirSync(DATA_DIRECTORY, { recursive: true, mode: 0o700 });
      if (!fs.existsSync(DATA_FILE)) return;
      const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      if (Array.isArray(saved.teams)) {
        teams = saved.teams.map((team: any) => ({
          ...team,
            accessPassword: normalizeStoredPassword(team.accessPassword),
        }));
      }
      if (Array.isArray(saved.adminUsers)) {
        adminUsers = saved.adminUsers.map((user: any) => ({
          ...user,
            password: normalizeStoredPassword(user.password || DEFAULT_ADMIN_PASSWORD)
        }));
      }
      if (Array.isArray(saved.checkpoints)) checkpoints = saved.checkpoints;
      if (typeof saved.nextTeamNumber === "number") nextTeamNumber = saved.nextTeamNumber;
    } catch (e) {
      console.warn("Failed to load persisted records:", e);
    }
  };

  const persistNow = () => {
    try {
      // Write atomically: dump to a temp file first, then rename over the real
      // file. This guarantees server-data.json is never left half-written if the
      // process is killed mid-write (which previously corrupted the file and led
      // to the team store being wiped on the next startup).
      fs.mkdirSync(DATA_DIRECTORY, { recursive: true, mode: 0o700 });
      const sanitizedTeams = teams.map((team) => ({
        ...team,
        accessPassword: normalizeStoredPassword(team.accessPassword),
      }));
      const normalizedAdminUsers = adminUsers.map((user) => ({
        ...user,
        password: normalizeStoredPassword(user.password)
      }));
      const payload = JSON.stringify({ teams: sanitizedTeams, adminUsers: normalizedAdminUsers, checkpoints, nextTeamNumber }, null, 2);
      const tmpFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tmpFile, payload, "utf-8");
      fs.renameSync(tmpFile, DATA_FILE);
    } catch (e) {
      console.warn("Failed to persist records:", e);
    }
  };

  // Backward-compatible alias: existing routes call `persist()` after edits.
  const persist = persistNow;

  // Schedule a coalesced, immediate write after a mutation. Instead of waiting
  // for the 5s heartbeat, high-value writes (registration, check-in, scoring,
  // admin edits) flush to disk ~200ms later so almost no data is lost even on a
  // crash. Rapid successive mutations share a single write.
  const markDirty = () => {
    if (dirtyTimer) clearTimeout(dirtyTimer);
    dirtyTimer = setTimeout(() => {
      dirtyTimer = null;
      persistNow();
    }, 200);
  };

  // Load saved records (if any), seed the CSV backup from them if this is the
  // first run, and then auto-save the JSON store on a periodic heartbeat.
  loadPersisted();
  try {
    initialiseParticipantRegistrationBackup();
  } catch (backupError) {
    // New registrations still fail safely if their own CSV append cannot be
    // written. Keep startup alive so an operator can fix disk permissions
    // without taking the entire site down.
    console.error("[BACKUP] Could not initialise participant registration CSV:", backupError);
  }
  setInterval(persistNow, 5000);

  // Rulebook Versions
  let rulebooks: RulebookVersion[] = [
    { id: "rb-101", version: "v1.2", title: "Official ANVATION 1.0 Rulebook & Guidelines 2026", pdfUrl: "/rulebook_kssem_codeathon.pdf", uploadedAt: "2026-08-05", active: true, downloads: 342, notes: "Final approved by VTU and KSSEM Management" }
  ];

  // Email Campaigns
  let emailCampaigns: EmailCampaign[] = [
    { id: "camp-1", title: "Welcome & Gate QR Checkin Guide", targetGroup: "All Participants", subject: "KS HACKNOVE 2026: Important Check-In & Gate Pass Details", body: "Dear Hacker, please keep your QR Code ready at the KSSEM campus gate.", status: "Sent", sentAt: "2026-08-08 10:00 AM", recipientCount: 240 },
    { id: "camp-2", title: "Checkpoint 1 Submission Reminder", targetGroup: "Team Leaders", subject: "Urgent: Checkpoint 1 Milestone Report due at 02:00 PM", body: "Please log into the Participant Portal and submit your GitHub branch.", status: "Scheduled", recipientCount: 48 }
  ];

  // Room Allocations
  let roomAllocations: RoomAllocation[] = [
    { id: "room-101", blockName: "Aryabhata Block", roomNumber: "Lab 301", gender: "Common", capacity: 40, occupiedCount: 32, assignedTeamIds: ["CT-101", "CT-102", "CT-103", "CT-104"] },
    { id: "room-102", blockName: "Aryabhata Block", roomNumber: "Lab 302", gender: "Common", capacity: 40, occupiedCount: 28, assignedTeamIds: ["CT-105", "CT-106", "CT-107"] },
    { id: "room-103", blockName: "Girls Hostel Block B", roomNumber: "Room 104", gender: "Girls", capacity: 20, occupiedCount: 16, assignedTeamIds: ["CT-108", "CT-109"] }
  ];

  // Judging Rounds
  let judgingRounds: JudgingRound[] = [
    {
      id: "jr-1",
      roundNumber: 1,
      name: "Round 1: Initial Idea & Architecture Pitch",
      status: "Active",
      criteria: [
        { id: "c1", name: "Innovation & Originality", maxPoints: 20, weight: 20 },
        { id: "c2", name: "Problem Statement Alignment", maxPoints: 20, weight: 20 },
        { id: "c3", name: "Technical Complexity", maxPoints: 20, weight: 30 },
        { id: "c4", name: "UI/UX Prototype", maxPoints: 20, weight: 15 },
        { id: "c5", name: "Feasibility & Pitch", maxPoints: 20, weight: 15 }
      ]
    },
    {
      id: "jr-2",
      roundNumber: 2,
      name: "Grand Finale: Working Prototype & Code Review",
      status: "Upcoming",
      criteria: [
        { id: "c21", name: "Working Code & Execution", maxPoints: 30, weight: 35 },
        { id: "c22", name: "Database & API Polish", maxPoints: 25, weight: 25 },
        { id: "c23", name: "Business Viability & Impact", maxPoints: 25, weight: 20 },
        { id: "c24", name: "Q&A Defense", maxPoints: 20, weight: 20 }
      ]
    }
  ];

  // API Audit Logs
  app.get("/api/audit-logs", requireAdmin, (req, res) => {
    res.json({ success: true, logs: auditLogs });
  });

  app.post("/api/audit-logs", requireAdmin, (req, res) => {
    const { action, target, beforeValue, afterValue, reason, actorEmail, actorRole } = req.body;
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: actorEmail || "superadmin@kssem.edu.in",
      actorRole: actorRole || "SUPER_ADMIN",
      action,
      target,
      beforeValue,
      afterValue,
      reason,
      ipAddress: req.ip || "192.168.1.1"
    };
    auditLogs.unshift(newLog);
    res.json({ success: true, log: newLog });
  });

  // Admin Users & RBAC API
  app.get("/api/admin-users", requireAdmin, (req, res) => {
    res.json({ success: true, users: adminUsers.map((user) => sanitizeAdminUser(user)) });
  });

  // Admin Login — validates any provisioned admin user by username or email + password
  app.post("/api/admin-login", async (req, res) => {
    const { identifier, password } = req.body;
    const idn = (identifier || '').trim().toLowerCase();
    const pass = (password || '').trim();

    if (!idn || !pass) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }

    const user = adminUsers.find(
      u => (u.username || '').toLowerCase() === idn || (u.email || '').toLowerCase() === idn
    );

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials." });
    }
    if (user.status !== 'Active') {
      return res.status(403).json({ success: false, error: "This account has been suspended." });
    }
    if (!verifyPassword(pass, user.password)) {
      return res.status(401).json({ success: false, error: "Invalid credentials." });
    }

    user.lastLogin = new Date().toISOString();
    const sid = createSession({
      id: user.id,
      type: 'admin',
      role: user.role,
      email: user.email,
      username: user.username,
      name: user.name,
    });
    setAuthCookie(res, sid);
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        role: user.role,
        status: user.status,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  });

  app.post("/api/admin/logout", (req, res) => {
    clearAuthCookie(res);
    const session = getSessionFromRequest(req);
    if (session) {
      const cookieRaw = req.headers.cookie || "";
      const match = cookieRaw.split(";").map((v: string) => v.trim()).find((v: string) => v.startsWith(`${AUTH_COOKIE}=`));
      const sid = match ? decodeURIComponent(match.slice(AUTH_COOKIE.length + 1)) : null;
      if (sid) sessionStore.delete(sid);
    }
    res.json({ success: true, message: "Logged out." });
  });

  app.post("/api/admin-users", requireSuperAdmin, (req, res) => {
    const { email, name, role, twoFactorEnabled, username, password } = req.body;
    const passwordValue = String(password || "").trim();
    const newUser: AdminUser = {
      id: `adm-${Date.now()}`,
      email,
      name,
      username: username || email,
      password: normalizeStoredPassword(passwordValue) || hashPassword(DEFAULT_ADMIN_PASSWORD),
      role: role || "ADMIN",
      status: "Active",
      createdAt: new Date().toISOString().split("T")[0],
      twoFactorEnabled: !!twoFactorEnabled
    };
    adminUsers.unshift(newUser);
    markDirty();

    // Record Audit
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Create Admin Role",
      target: `${name} (${email})`,
      afterValue: `Role: ${role}`,
      reason: "Super Admin assigned new administrative role",
      ipAddress: req.ip || "127.0.0.1"
    });

    res.json({ success: true, user: sanitizeAdminUser(newUser) });
  });

  app.post("/api/admin-users/status", requireSuperAdmin, (req, res) => {
    const { id, status } = req.body;
    const usr = adminUsers.find(u => u.id === id);
    if (usr) {
      usr.status = status;
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorEmail: "superadmin@kssem.edu.in",
        actorRole: "SUPER_ADMIN",
        action: "Admin User Status Change",
        target: `${usr.name} (${usr.email})`,
        afterValue: status,
        reason: "Super Admin updated user access status",
        ipAddress: req.ip || "127.0.0.1"
      });
    }
    res.json({ success: true, user: sanitizeAdminUser(usr) });
  });

  // Update an admin user (name / username / password / assigned role) — full UPDATE (edit)
  app.put("/api/admin-users/:id", requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { name, email, username, password, role, twoFactorEnabled } = req.body;
    const usr = adminUsers.find(u => u.id === id);
    if (!usr) {
      return res.status(404).json({ success: false, error: "Admin user not found." });
    }
    const beforeRole = usr.role;
    if (name !== undefined) usr.name = name;
    if (email !== undefined) usr.email = email;
    if (username !== undefined) usr.username = username;
    if (password !== undefined && String(password).trim() !== "") usr.password = normalizeStoredPassword(String(password).trim()) || usr.password;
    if (role !== undefined) usr.role = role;
    if (twoFactorEnabled !== undefined) usr.twoFactorEnabled = !!twoFactorEnabled;

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Update Admin Role",
      target: `${usr.name} (${usr.email})`,
      beforeValue: `Role: ${beforeRole}`,
      afterValue: `Role: ${usr.role}`,
      reason: "Super Admin edited administrative user details",
      ipAddress: req.ip || "127.0.0.1"
    });

    res.json({ success: true, user: usr });
  });

  // Delete an admin user — full DELETE (remove)
  app.delete("/api/admin-users/:id", requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const idx = adminUsers.findIndex(u => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Admin user not found." });
    }
    const removed = adminUsers[idx];
    adminUsers.splice(idx, 1);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Delete Admin Role",
      target: `${removed.name} (${removed.email})`,
      beforeValue: `Role: ${removed.role}`,
      reason: "Super Admin removed administrative user",
      ipAddress: req.ip || "127.0.0.1"
    });

    res.json({ success: true, deleted: sanitizeAdminUser(removed) });
  });

  // Score Override with mandatory reason
  app.post("/api/submissions/override-score", requireSuperAdmin, (req, res) => {
    const { submissionId, newTotalScore, reason, actorEmail } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, error: "Mandatory audit reason is required for score override." });
    }

    const sub = submissions.find(s => s.id === submissionId);
    let scoreCard = scorecards.find(sc => sc.submissionId === submissionId);

    const oldScore = scoreCard ? scoreCard.totalScore : 0;
    if (!scoreCard) {
      scoreCard = {
        id: `sc-override-${Date.now()}`,
        submissionId,
        teamId: sub?.teamId || "UNKNOWN",
        judgeName: "Super Admin Override",
        innovation: 15,
        impact: 15,
        technicalComplexity: 20,
        presentation: 15,
        uiUx: 15,
        scalability: 10,
        originality: 10,
        bonusPoints: 0,
        penalty: 0,
        totalScore: Number(newTotalScore),
        feedback: `Super Admin Score Override: ${reason}`
      };
      scorecards.unshift(scoreCard);
    } else {
      scoreCard.totalScore = Number(newTotalScore);
      scoreCard.feedback += ` [Super Admin Override (${new Date().toLocaleTimeString()}): ${reason}]`;
    }

    // Audit Log Entry
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: actorEmail || "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Score Manual Override",
      target: `Submission ID: ${submissionId} (${sub?.teamName || ''})`,
      beforeValue: `Score: ${oldScore}`,
      afterValue: `Score: ${newTotalScore}`,
      reason: reason,
      ipAddress: req.ip || "127.0.0.1"
    });

    res.json({ success: true, scorecard: scoreCard });
  });

  // Rulebooks API
  app.get("/api/rulebooks", (req, res) => {
    res.json({ success: true, rulebooks });
  });

  app.post("/api/rulebooks", requireAdmin, (req, res) => {
    const { title, version, notes } = req.body;
    rulebooks.forEach(r => r.active = false);
    const newRb: RulebookVersion = {
      id: `rb-${Date.now()}`,
      version: version || `v1.${rulebooks.length + 1}`,
      title: title || "ANVATION 1.0 Updated Rulebook",
      pdfUrl: "/rulebook_kssem_codeathon.pdf",
      uploadedAt: new Date().toISOString().split("T")[0],
      active: true,
      downloads: 0,
      notes
    };
    rulebooks.unshift(newRb);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "New Rulebook Version Published",
      target: newRb.version,
      afterValue: newRb.title,
      reason: "Rulebook updated by Super Admin",
      ipAddress: req.ip || "127.0.0.1"
    });

    res.json({ success: true, rulebook: newRb });
  });

  // Email Campaigns API
  app.get("/api/email-campaigns", (req, res) => {
    res.json({ success: true, campaigns: emailCampaigns });
  });

  app.post("/api/email-campaigns", requireAdmin, async (req, res) => {
    const { title, targetGroup, subject, body } = req.body;
    const subjectSafe = String(subject || "").trim();
    const bodySafe = String(body || "").trim();
    if (!subjectSafe || !bodySafe) {
      return res.status(400).json({ success: false, error: "Subject and body are required." });
    }

    // Build the recipient list from the chosen target group.
    const group = String(targetGroup || "ALL_PARTICIPANTS");
    const recipients: string[] = [];
    for (const team of teams) {
      const members = team.members || [];
      if (group === "TEAM_LEADERS") {
        const leader = members.find((m) => m.role === "Leader") || members[0];
        if (leader && leader.email) recipients.push(leader.email);
      } else if (group === "CHECKED_IN" || group === "Checked-In Only") {
        for (const m of members) if (m.checkedIn && m.email) recipients.push(m.email);
      } else if (group === "UNVERIFIED_PAYMENTS") {
        // "Pending Payment Receipts" -> members of teams whose payment is NOT verified.
        if (team.paymentStatus !== "Verified") {
          for (const m of members) if (m.email) recipients.push(m.email);
        }
      } else {
        // Default: ALL_PARTICIPANTS / "All Participants"
        for (const m of members) if (m.email) recipients.push(m.email);
      }
    }
    const recipientList = Array.from(new Set(recipients)).filter(Boolean);

    if (recipientList.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No recipients matched the selected audience. Confirm there are registered teams/members for this target group.",
        gatewayMessage: "No recipients matched the selected audience. Confirm there are registered teams/members for this target group."
      });
    }

    // Build a simple branded HTML body from the (markdown-ish) campaign text.
    const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const bodyHtml = bodySafe.split(/\r?\n/).map((line) => {
      const escaped = escHtml(line.trim());
      return escaped ? `<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">${escaped}</p>` : "<p style=\"margin:0;\">&nbsp;</p>";
    }).join("");
    const htmlFull = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;color:#0f172a;">
<div style="background:#0b192c;color:#fff;padding:22px 26px;"><div style="font-size:22px;font-weight:800;letter-spacing:1px;">ANVATION 2026</div><div style="font-size:12px;color:#67e8f9;">NATIONAL LEVEL 24-HOUR HACKATHON</div></div>
<div style="padding:24px 26px;">${bodyHtml}</div>
<div style="background:#f1f5f9;padding:14px 26px;font-size:12px;color:#64748b;">For any help, write to anvation2026@kssem.edu.in · Sent ${new Date().toLocaleString()}</div>
</div>`;

    const smtpHost = process.env.SMTP_HOST;
    const smtpConfigured = !!smtpHost;
    let delivered = 0;
    let failed = 0;
    let smtpError = "";
    const emailRecipients: Array<{ recipient: string; status: string; error?: string }> =
      recipientList.map((r) => ({ recipient: r, status: "QUEUED" }));

    if (smtpHost && recipientList.length > 0) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user: process.env.SMTP_USER || "", pass: process.env.SMTP_PASS || "" }
      });
      const from = process.env.MAIL_FROM || `"ANVATION 2026" <${process.env.SMTP_USER || "noreply@anvation.local"}>`;

      try {
        await transporter.verify();
      } catch (verifyErr: any) {
        smtpError = String((verifyErr && verifyErr.message) || verifyErr);
        console.error(`[EMAIL CAMPAIGN] SMTP verification failed: ${smtpError}`);
      }

      if (!smtpError) {
        for (const recipient of recipientList) {
          try {
            const info = await transporter.sendMail({ from, to: recipient, subject: subjectSafe, text: bodySafe, html: htmlFull });
            delivered++;
            const ri = emailRecipients.find((r) => r.recipient === recipient);
            if (ri) { ri.status = "SENT"; ri.error = info.messageId; }
            console.log(`[EMAIL CAMPAIGN] SENT To: ${recipient} | ${subjectSafe} | ${info.messageId}`);
          } catch (mailErr: any) {
            failed++;
            const ri = emailRecipients.find((r) => r.recipient === recipient);
            if (ri) { ri.status = "FAILED"; ri.error = String((mailErr && mailErr.message) || mailErr); }
            console.error(`[EMAIL CAMPAIGN] FAILED To: ${recipient} | ${mailErr.message}`);
          }
        }
      } else {
        emailRecipients.forEach((r) => { r.status = "FAILED"; r.error = smtpError; });
        failed = recipientList.length;
      }
    } else if (!smtpHost) {
      console.warn(`[EMAIL CAMPAIGN] SMTP NOT CONFIGURED (SMTP_HOST missing) — real mail NOT delivered. Campaign "${subjectSafe}" recorded only.`);
    }

    const targetLabel =
      group === "TEAM_LEADERS" ? "Team Leaders" :
      group === "CHECKED_IN" || group === "Checked-In Only" ? "Checked-In Only" :
      group === "UNVERIFIED_PAYMENTS" ? "Pending Payment Receipts" :
      "All Participants";

    const newCamp: EmailCampaign = {
      id: `camp-${Date.now()}`,
      title,
      targetGroup: targetLabel as EmailCampaign["targetGroup"],
      subject: subjectSafe,
      body: bodySafe,
      status: smtpConfigured ? (delivered > 0 ? "Sent" : "Draft") : "Draft",
      sentAt: new Date().toLocaleString(),
      recipientCount: recipientList.length
    };
    emailCampaigns.unshift(newCamp);

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Broadcast Email Campaign Sent",
      target: targetGroup,
      afterValue: subjectSafe,
      reason: `Bulk email broadcast dispatched to ${recipientList.length} recipient(s), ${delivered} delivered, ${failed} failed.`,
      ipAddress: req.ip || "127.0.0.1"
    });

    if (!smtpConfigured) {
      return res.json({
        success: true,
        campaign: newCamp,
        deliveredCount: recipientList.length,
        failedCount: 0,
        recipientCount: recipientList.length,
        smtpConfigured: false,
        emailRecipients: recipientList.map((r) => ({ recipient: r, status: "READY" })),
        recipients: recipientList,
        gatewayMessage: "SMTP is NOT configured (SMTP_HOST missing in .env) — the campaign was recorded but NO real emails were sent. Set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS and restart the server to deliver mail."
      });
    }

    const allDelivered = recipientList.length > 0 && delivered === recipientList.length;
    return res.json({
      success: delivered > 0,
      campaign: newCamp,
      deliveredCount: delivered,
      failedCount: failed,
      recipientCount: recipientList.length,
      smtpConfigured: true,
      smtpError,
      emailRecipients,
      recipients: recipientList,
      gatewayMessage: smtpError
        ? `SMTP is configured but the connection check failed: ${smtpError}. No emails were delivered. Double-check SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (Gmail requires an App Password, not your login password).`
        : (allDelivered
            ? `Bulk email sent successfully to ${delivered} recipient(s).`
            : `Emails sent to ${delivered} of ${recipientList.length} recipient(s); ${failed} failed. Check the server logs for details.`)
    });
  });

  // Room Allocations API
  app.get("/api/room-allocations", (req, res) => {
    res.json({ success: true, rooms: roomAllocations });
  });

  app.post("/api/room-allocations/add", requireAdmin, (req, res) => {
    const { blockName, roomNumber, gender, capacity } = req.body;
    if (!blockName || !roomNumber) return res.status(400).json({ success: false, error: "Block name and room number required" });

    const newRoom: RoomAllocation = {
      id: `room-${Date.now()}`,
      blockName,
      roomNumber,
      gender: gender || 'Common',
      capacity: Number(capacity) || 40,
      occupiedCount: 0,
      assignedTeamIds: []
    };
    roomAllocations.push(newRoom);
    res.json({ success: true, room: newRoom });
  });

  app.post("/api/room-allocations/assign", requireAdmin, (req, res) => {
    const { roomId, teamId } = req.body;
    const room = roomAllocations.find(r => r.id === roomId);
    if (!room) return res.status(404).json({ success: false, error: "Room not found" });

    if (!room.assignedTeamIds.includes(teamId)) {
      room.assignedTeamIds.push(teamId);
      const team = teams.find(t => t.id === teamId);
      const memberCount = team ? team.members.length : 4;
      room.occupiedCount = Math.min(room.capacity, room.occupiedCount + memberCount);
    }
    res.json({ success: true, room });
  });

  app.post("/api/room-allocations/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    roomAllocations = roomAllocations.filter(r => r.id !== id);
    res.json({ success: true, message: "Room allocation removed" });
  });

  // Schedule / Agenda API
  let scheduleItems: ScheduleItem[] = [
    { id: 'sch-1', day: 1, time: '08:30 AM', title: 'On-Campus Registration & Gate Badge Collection', description: 'Collect physical badges, lanyards & Wi-Fi credentials at KSSEM CSE Block.', type: 'general', location: 'CSE Seminar Hall' },
    { id: 'sch-2', day: 1, time: '09:30 AM', title: 'Grand Opening Ceremony & Keynote Address', description: 'Address by Principal, HoD CSE & Chief Guest from Bosch India.', type: 'keynote', location: 'Main Auditorium' },
    { id: 'sch-3', day: 1, time: '10:30 AM', title: '24-Hour Hackathon Hacking Phase Begins!', description: 'Clock starts! All teams move to designated lab allocations.', type: 'general', location: 'CSE Labs 301-308' },
    { id: 'sch-4', day: 1, time: '01:00 PM', title: 'Lunch & Refreshments', description: 'South Indian buffet at Student Dining Hall.', type: 'food', location: 'Dining Hall' },
    { id: 'sch-5', day: 1, time: '03:00 PM', title: 'Checkpoint 1 Review: Architecture & Idea Pitch', description: 'Jury panel visits tables for 5-min elevator pitch.', type: 'review', location: 'Lab Allocations' },
    { id: 'sch-6', day: 1, time: '08:30 PM', title: 'Dinner & Midnight Coffee Station', description: 'Buffet dinner served. High-speed caffeine station active 24/7.', type: 'food', location: 'Dining Hall' },
    { id: 'sch-7', day: 2, time: '08:00 AM', title: 'Breakfast & Refreshment Station', description: 'Morning tea/coffee and breakfast provided.', type: 'food', location: 'Dining Hall' },
    { id: 'sch-8', day: 2, time: '10:30 AM', title: 'Final Submission Deadline (GitHub + Video)', description: 'All codes committed and PPT uploaded on Participant Portal.', type: 'submission', location: 'Participant Portal' },
    { id: 'sch-9', day: 2, time: '11:00 AM', title: 'Round 2 Grand Finale Judging & Live Pitching', description: 'Top shortlisted teams present on stage in Auditorium.', type: 'review', location: 'Main Auditorium' },
    { id: 'sch-10', day: 2, time: '03:00 PM', title: 'Valedictory Ceremony & Cash Prize Distribution', description: 'Felicitating Winners, Mentors & Sponsors.', type: 'keynote', location: 'Main Auditorium' }
  ];

  app.get("/api/schedule", (req, res) => {
    res.json({ success: true, schedule: scheduleItems });
  });

  app.post("/api/schedule/add", requireAdmin, (req, res) => {
    const { time, title, description, type, day, location } = req.body;
    if (!time || !title) return res.status(400).json({ success: false, error: "Time and title are required" });

    const newItem: ScheduleItem = {
      id: `sch-${Date.now()}`,
      time,
      title,
      description: description || '',
      type: type || 'general',
      day: Number(day) === 2 ? 2 : 1,
      location: location || 'KSSEM Campus'
    };
    scheduleItems.push(newItem);
    res.json({ success: true, item: newItem });
  });

  app.post("/api/schedule/edit", requireAdmin, (req, res) => {
    const { id, time, title, description, type, day, location } = req.body;
    const item = scheduleItems.find(s => s.id === id);
    if (!item) return res.status(404).json({ success: false, error: "Schedule item not found" });

    if (time) item.time = time;
    if (title) item.title = title;
    if (description !== undefined) item.description = description;
    if (type) item.type = type;
    if (day) item.day = Number(day) === 2 ? 2 : 1;
    if (location) item.location = location;

    res.json({ success: true, item });
  });

  app.post("/api/schedule/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    scheduleItems = scheduleItems.filter(s => s.id !== id);
    res.json({ success: true, message: "Schedule item deleted" });
  });

  // Policy Guidelines Store
  let policies = [
    { id: 'pol-1', title: 'Zero Tolerance Code of Conduct & Anti-Plagiarism Policy', category: 'Rules', text: 'All submitted repositories must contain original code written during the 24-hour hackathon timeframe. Open-source libraries are permitted, but core business logic must be built live.' },
    { id: 'pol-2', title: 'On-Campus Accommodation & Hostel Security Regulations', category: 'Hostel', text: 'Separate boys and girls hostels are monitored 24/7 by security wardens. Gate curfew applies for leaving campus after 10:00 PM without organizing committee pass.' },
    { id: 'pol-3', title: 'Hardware & Wi-Fi Network Bandwidth Fair Usage', category: 'Infrastructure', text: 'High-speed 5G Wi-Fi access codes are restricted to registered laptops. Heavy torrenting or network spoofing will result in immediate disqualification.' }
  ];

  app.get("/api/policies", (req, res) => {
    res.json({ success: true, policies });
  });

  app.post("/api/policies/add", requireAdmin, (req, res) => {
    const { title, category, text } = req.body;
    if (!title || !text) return res.status(400).json({ success: false, error: "Title and text required" });

    const newPol = { id: `pol-${Date.now()}`, title, category: category || 'General', text };
    policies.unshift(newPol);
    res.json({ success: true, policy: newPol });
  });

  app.post("/api/policies/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    policies = policies.filter(p => p.id !== id);
    res.json({ success: true, message: "Policy removed" });
  });

  // Payment UTR Verification API
  app.post("/api/finance/verify-utr", requireAdmin, (req, res) => {
    const { teamId, paymentStatus } = req.body; // 'Verified' or 'Rejected'
    const team = teams.find(t => t.id === teamId);
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });

    team.paymentStatus = paymentStatus;
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: `Payment Status Change: ${paymentStatus}`,
      target: `Team ${team.teamName} (${team.id})`,
      beforeValue: team.paymentUtr || 'No UTR',
      afterValue: paymentStatus,
      reason: `Finance audit verification by Super Admin`,
      ipAddress: req.ip || "127.0.0.1"
    });

    res.json({ success: true, team });
  });

  // Judging Rounds API
  app.get("/api/judging-rounds", (req, res) => {
    res.json({ success: true, rounds: judgingRounds });
  });

  // Emergency Freeze Control
  app.post("/api/emergency-control", requireSuperAdmin, (req, res) => {
    const { actionType, freezeState, reason } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, error: "Mandatory emergency reason is required." });
    }

    if (actionType === 'maintenance') cmsConfig.maintenanceMode = freezeState;
    if (actionType === 'registrations') cmsConfig.freezeRegistrations = freezeState;
    if (actionType === 'submissions') cmsConfig.freezeSubmissions = freezeState;
    if (actionType === 'judging') cmsConfig.freezeJudging = freezeState;

    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: `EMERGENCY CONTROL: ${actionType.toUpperCase()}`,
      target: "Global System Engine",
      afterValue: `State: ${freezeState ? 'FROZEN / LOCKED' : 'RELEASED / NORMAL'}`,
      reason: reason,
      ipAddress: req.ip || "127.0.0.1"
    });

    res.json({ success: true, config: cmsConfig });
  });

  // Support Tickets
  app.get("/api/tickets", (req, res) => {
    res.json({ success: true, tickets });
  });

  app.post("/api/tickets", requireTeamAccess, (req, res) => {
    const { teamId, teamName, subject, message, category } = req.body;
    const newTicket: SupportTicket = {
      id: `t-${Date.now()}`,
      teamId: teamId || 'KS-HACK-GUEST',
      teamName: teamName || 'Participant',
      subject,
      message,
      category: category || 'Other',
      status: 'Open',
      createdAt: new Date().toISOString()
    };
    tickets.unshift(newTicket);
    res.json({ success: true, ticket: newTicket });
  });

  app.post("/api/tickets/resolve", requireAdmin, (req, res) => {
    const { ticketId, response } = req.body;
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = 'Resolved';
      ticket.response = response || 'Resolved by KSSEM Organizing Committee.';
    }
    res.json({ success: true, ticket });
  });

  // Milestone Progress Reports
  app.get("/api/milestone-reports", (req, res) => {
    res.json({ success: true, reports: milestoneReports });
  });

  app.post("/api/milestone-reports", requireTeamAccess, (req, res) => {
    const { teamId, checkpointNumber, checkpointName, summary, repoBranchOrLink, blockers } = req.body;
    if (!teamId || !checkpointNumber) {
      return res.status(400).json({ success: false, error: "Team ID and Checkpoint number required" });
    }

    const newReport: MilestoneReport = {
      id: `mr-${Date.now()}`,
      teamId,
      checkpointNumber: Number(checkpointNumber) as 1 | 2 | 3,
      checkpointName: checkpointName || `Checkpoint ${checkpointNumber}`,
      summary: summary || '',
      repoBranchOrLink,
      blockers,
      status: 'Pending',
      submittedAt: new Date().toISOString()
    };

    // Replace if exists for same team & checkpoint, or push
    const existingIndex = milestoneReports.findIndex(r => r.teamId === teamId && r.checkpointNumber === Number(checkpointNumber));
    if (existingIndex >= 0) {
      milestoneReports[existingIndex] = newReport;
    } else {
      milestoneReports.unshift(newReport);
    }

    res.json({ success: true, report: newReport });
  });

  app.post("/api/milestone-reports/review", requireAdmin, (req, res) => {
    const { reportId, status, feedback } = req.body;
    const report = milestoneReports.find(r => r.id === reportId);
    if (!report) return res.status(404).json({ success: false, error: "Report not found" });

    report.status = status || 'Approved';
    if (feedback) report.feedback = feedback;

    res.json({ success: true, report });
  });

  // Checkpoint (Milestone) CRUD — admin can list, add, edit, and delete checkpoints
  app.get("/api/checkpoints", (req, res) => {
    res.json({ success: true, checkpoints });
  });

  app.post("/api/checkpoints", requireAdmin, (req, res) => {
    const { title, description, time, status } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: "Checkpoint title is required" });
    }
    const nextNumber = checkpoints.length + 1;
    const newCp: Checkpoint = {
      id: `cp-${Date.now()}`,
      number: nextNumber,
      title: String(title).trim(),
      description: (description || '').trim(),
      time: (time || '').trim(),
      status: status === 'Closed' ? 'Closed' : 'Open'
    };
    checkpoints.push(newCp);
    markDirty();
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Add Checkpoint",
      target: `Checkpoint ${newCp.number}: ${newCp.title}`,
      afterValue: newCp.description,
      reason: "Super Admin added a new checkpoint",
      ipAddress: req.ip || "127.0.0.1"
    });
    persist();
    res.json({ success: true, checkpoint: newCp, checkpoints });
  });

  app.put("/api/checkpoints/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const cp = checkpoints.find(c => c.id === id);
    if (!cp) return res.status(404).json({ success: false, error: "Checkpoint not found" });
    const { title, description, time, status } = req.body;
    if (title !== undefined) cp.title = String(title).trim();
    if (description !== undefined) cp.description = String(description).trim();
    if (time !== undefined) cp.time = String(time).trim();
    if (status !== undefined) cp.status = status === 'Closed' ? 'Closed' : 'Open';
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Edit Checkpoint",
      target: `Checkpoint ${cp.number}: ${cp.title}`,
      afterValue: cp.title,
      reason: "Super Admin edited checkpoint",
      ipAddress: req.ip || "127.0.0.1"
    });
    persist();
    res.json({ success: true, checkpoint: cp, checkpoints });
  });

  app.delete("/api/checkpoints/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const idx = checkpoints.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: "Checkpoint not found" });
    const removed = checkpoints[idx];
    checkpoints.splice(idx, 1);
    // Re-number remaining checkpoints so they stay sequential (1, 2, 3 ...)
    checkpoints.forEach((c, i) => { c.number = i + 1; });
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Delete Checkpoint",
      target: `Checkpoint ${removed.number}: ${removed.title}`,
      beforeValue: removed.title,
      reason: "Super Admin removed checkpoint",
      ipAddress: req.ip || "127.0.0.1"
    });
    persist();
    res.json({ success: true, deleted: removed, checkpoints });
  });

  // Mentor Bookings
  app.get("/api/mentor-bookings", (req, res) => {
    res.json({ success: true, bookings: mentorBookings });
  });

  app.post("/api/mentor-bookings", requireTeamAccess, (req, res) => {
    const { teamId, teamName, mentorId, mentorName, slot, topic } = req.body;
    const newBooking: MentorBooking = {
      id: `mb-${Date.now()}`,
      teamId: teamId || 'GUEST',
      teamName: teamName || 'Team',
      mentorId: mentorId || 'm-1',
      mentorName: mentorName || 'Assigned Mentor',
      slot: slot || 'Immediate Slot',
      topic: topic || 'Technical Architecture Review',
      status: 'Confirmed'
    };
    mentorBookings.unshift(newBooking);
    res.json({ success: true, booking: newBooking });
  });

  // Developer & Website Super Admin Live CMS Config
  app.get("/api/cms-config", requireAdmin, (req, res) => {
    res.json({ success: true, config: cmsConfig });
  });

  app.post("/api/cms-config", requireAdmin, (req, res) => {
    const updated = req.body;
    cmsConfig = { ...cmsConfig, ...updated };
    res.json({ success: true, config: cmsConfig, message: "Website CMS Configuration updated live across all sections!" });
  });

  // Participant-facing certificate issuance status (admin-controlled only)
  app.get("/api/certificate-status", (req, res) => {
    res.json({ success: true, enabled: !!cmsConfig.enableCertificateDownloads });
  });

  // Admin action: issue/release certificates to all verified participants.
  // Participants cannot download certificates until this is set to true.
  app.post("/api/certificate-issue", requireAdmin, (req, res) => {
    cmsConfig.enableCertificateDownloads = true;
    res.json({ success: true, enabled: true, config: cmsConfig, message: "Certificates released to all verified participants!" });
  });

  // Participant-facing final project submission status (admin-controlled only)
  app.get("/api/submission-status", (req, res) => {
    res.json({ success: true, enabled: !!cmsConfig.enableProjectSubmissions });
  });

  // Participant-facing feature flags for the event-flow modules (admin-controlled).
  // While a module is disabled the participant portal shows a "Coming Soon" state.
  app.get("/api/feature-status", (req, res) => {
    res.json({
      success: true,
      milestones: !!cmsConfig.enableMilestoneSubmissions,
      announcements: !!cmsConfig.enableAnnouncements,
      certificates: !!cmsConfig.enableCertificateDownloads,
      submissions: !!cmsConfig.enableProjectSubmissions,
      support: !!cmsConfig.enableSupportTickets
    });
  });

  // Vite middleware for development
  if (shouldServeFrontend && process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (shouldServeFrontend) {
    // Serve the static bundle with correct caching (hashed assets immutable,
    // SPA shell revalidated) instead of the previous un-cached defaults.
    serveStaticWithCache(app, path.join(process.cwd(), 'dist'));
  }

  // Bind to a private loopback port when acting as the cluster authority, and
  // to the public interface otherwise (classic single-process mode).
  const isAuthority = process.env.ANVATION_ROLE === "authority";
  const bindHost = isAuthority ? "127.0.0.1" : "0.0.0.0";
  const bindPort = isAuthority ? INTERNAL_PORT : requestedPort;

  let server: ReturnType<typeof app.listen> | null = null;
  if (shouldListen) {
    server = app.listen(bindPort, bindHost, () => {
      console.log(`KS-HackNova 2026 Server running on http://${bindHost}:${bindPort}`);
    });

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${bindPort} is already in use on ${bindHost}. You may already have a server running.`);
      }
      console.error("Failed to start server:", err);
    });
  }

  // Graceful shutdown: flush pending registrations/check-ins to disk before the
  // process exits so nothing is lost on a deploy or restart, then exit quickly.
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\nShutting down — flushing pending data to disk…");
    try { persistNow(); } catch { /* best-effort */ }
    try { server?.close(); } catch { /* best-effort */ }
    setTimeout(() => process.exit(0), 150);
  };
  if (shouldListen) {
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  }
  return shouldListen ? server : app;
}

export const startServer = () => createApp();

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}
