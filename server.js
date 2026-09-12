// server.ts
import express from "express";
import fs from "fs";
import path from "path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import httpx from "node:http";
import os from "node:os";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import nodemailer from "nodemailer";
import QRCode from "qrcode";
import sharp from "sharp";
import compression from "compression";
import { createWorker } from "tesseract.js";
import { createServer as createViteServer } from "vite";

// src/data/mockData.ts
var HACKATHON_TRACKS = [
  {
    id: "ai-ml",
    title: "Artificial Intelligence & Machine Learning",
    iconName: "Brain",
    description: "Empower intelligent systems with deep neural architectures, LLMs, computer vision, autonomous agents, and predictive models.",
    problemExamples: [
      "Multimodal AI assistant for low-resource regional language transcription and analysis",
      "Real-time traffic and crowd anomaly detection using lightweight computer vision models",
      "Autonomous defect classification for industrial fabrication on edge compute"
    ],
    expectedSolutions: "Deployable AI pipelines, REST/gRPC API microservices, or interactive edge models with benchmarked accuracy.",
    tags: ["GenAI & LLMs", "Computer Vision", "Autonomous Agents", "Deep Learning"],
    color: "from-cyan-500 via-sky-600 to-indigo-600"
  },
  {
    id: "fintech",
    title: "FinTech & Digital Finance",
    iconName: "Coins",
    description: "Build modern payment rails, fraud detection engines, micro-lending platforms, and decentralized transaction audit trails.",
    problemExamples: [
      "Real-time UPI payment anomaly & fraudulent transaction detection engine",
      "Micro-lending credit scoring using alternative digital footprints for rural artisans",
      "Automated tax compliance & invoicing reconciliation tool for Indian SMBs"
    ],
    expectedSolutions: "Secure payment APIs, cryptographic ledgers, or algorithmic credit scoring interfaces.",
    tags: ["UPI & Payments", "Fraud Shield", "Micro-Credit", "DeFi"],
    color: "from-purple-500 via-indigo-600 to-violet-600"
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity & Privacy",
    iconName: "ShieldAlert",
    description: "Safeguard critical infrastructure, build zero-trust security postures, detect deepfakes, and engineer privacy-first systems.",
    problemExamples: [
      "Zero-trust API authentication shield against credential stuffing & botnets",
      "Real-time deepfake audio and video stream detection for digital identity verification",
      "Lightweight privacy-preserving cryptographic vault with biometric authorization"
    ],
    expectedSolutions: "Security analyzers, browser security shields, SIEM log parsers, or cryptographic privacy engines.",
    tags: ["Zero-Trust", "Deepfake Detection", "SIEM / Threat Intel", "Cryptography"],
    color: "from-blue-600 via-cyan-600 to-teal-600"
  },
  {
    id: "smartcities",
    title: "Smart Cities & CivicTech",
    iconName: "Building2",
    description: "Transform municipal governance, urban waste management, smart parking, public transit tracking, and citizen grievance redressal.",
    problemExamples: [
      "AI-powered pothole mapping and civic grievance dispatch system using smartphone cameras",
      "Real-time smart parking grid with ultrasonic sensors and dynamic pricing",
      "Public transit crowd density tracking and optimized bus arrival prediction"
    ],
    expectedSolutions: "Civic web/mobile portals, GIS mapping systems, or automated municipal dispatch dashboards.",
    tags: ["Urban IoT", "Civic Portals", "GIS Mapping", "Smart Mobility"],
    color: "from-sky-500 via-blue-600 to-indigo-600"
  },
  {
    id: "sustainability",
    title: "Sustainability & ClimateTech",
    iconName: "Leaf",
    description: "Combat climate change through real-time carbon footprint calculators, renewable energy grids, and circular economy tools.",
    problemExamples: [
      "Campus energy monitoring ledger optimizing HVAC and lighting based on occupancy",
      "AI plastic waste sorting classifier for automated municipal recycling conveyor belts",
      "Urban air quality monitoring grid with hyper-local particulate forecast alerts"
    ],
    expectedSolutions: "Carbon tracking dashboards, IoT energy telemetry networks, or circular economy resource exchanges.",
    tags: ["Carbon Footprint", "Circular Economy", "Renewable Grid", "AQI Forecaster"],
    color: "from-teal-500 via-emerald-600 to-green-600"
  }
];
var SCHEDULE_DAY1 = [
  { id: "s1", time: "08:30 AM - 09:30 AM", title: "Participant Check-in & Breakfast", description: "Badge verification, swag bag collection, and continental breakfast at KSSEM cafeteria.", type: "food", day: 1, location: "KSSEM Main Quadrangle" },
  { id: "s2", time: "09:30 AM - 10:30 AM", title: "Grand Inauguration Ceremony", description: "Welcome address by Management & Principal, Keynote by Chief Guest from Tech Industry.", type: "keynote", day: 1, location: "KSSEM Auditorium" },
  { id: "s3", time: "10:30 AM - 11:00 AM", title: "Problem Statements & Rules Briefing", description: "Announcement of track sponsors, judging criteria, and lab allocation.", type: "general", day: 1, location: "Auditorium" },
  { id: "s4", time: "11:00 AM", title: "HACKATHON CLOCK STARTS (24-Hour Timer)", description: "Teams move to assigned CSE computing labs and initiate development.", type: "general", day: 1, location: "CSE Labs (3rd & 4th Floor)" },
  { id: "s5", time: "01:30 PM - 02:30 PM", title: "Networking Lunch", description: "Buffet lunch served in college dining hall.", type: "food", day: 1, location: "KSSEM Dining Hall" },
  { id: "s6", time: "03:30 PM - 05:00 PM", title: "Mentoring Session Round 1 (Architecture Review)", description: "Domain experts and industry mentors review team tech stacks and database schemas.", type: "review", day: 1, location: "Respective Team Stations" },
  { id: "s7", time: "05:30 PM - 06:00 PM", title: "High-Tea & Snacks Break", description: "Coffee, tea, and evening refreshments.", type: "food", day: 1, location: "Lab Foyers" },
  { id: "s8", time: "07:30 PM - 08:30 PM", title: "Checkpoint 1: Progress Sync", description: "First code push check on GitHub repositories.", type: "review", day: 1, location: "Online Dashboard" },
  { id: "s9", time: "08:30 PM - 09:30 PM", title: "Dinner Break", description: "Hot dinner served for all participants.", type: "food", day: 1, location: "Dining Hall" },
  { id: "s10", time: "11:00 PM - 12:00 AM", title: "Midnight Review & Fun Stunts", description: "Stand-up comedy, gaming arena, and midnight pizza snacks!", type: "keynote", day: 1, location: "Seminar Hall 2" }
];
var SCHEDULE_DAY2 = [
  { id: "s11", time: "02:00 AM - 03:00 AM", title: "Late Night Mentoring & Debugging Session", description: "On-demand technical mentors assist with API integration & deployment issues.", type: "review", day: 2, location: "CSE Computing Labs" },
  { id: "s12", time: "07:30 AM - 08:30 AM", title: "Fresh Morning Breakfast", description: "Healthy breakfast and South Indian filter coffee.", type: "food", day: 2, location: "Dining Hall" },
  { id: "s13", time: "09:30 AM - 10:30 AM", title: "Final Code Freeze & Project Submission", description: "Submit GitHub links, PPTs, video demos, and project details via Participant Dashboard.", type: "submission", day: 2, location: "Participant Portal" },
  { id: "s14", time: "11:00 AM - 01:30 PM", title: "Judging & Demo Round (Exhibition)", description: "Jury panel conducts 7-minute presentation + 3-minute Q&A at each team booth.", type: "review", day: 2, location: "Exhibition Hall & Labs" },
  { id: "s15", time: "01:30 PM - 02:30 PM", title: "Grand Lunch", description: "Lunch break while judges tabulate scores.", type: "food", day: 2, location: "Dining Hall" },
  { id: "s16", time: "03:00 PM - 05:00 PM", title: "Valedictory Ceremony & Prize Distribution", description: "Keynote speech, distribution of cash prizes, trophies, certificates, and swags.", type: "keynote", day: 2, location: "KSSEM Auditorium" }
];
var HACKATHON_SCHEDULE = [...SCHEDULE_DAY1, ...SCHEDULE_DAY2];
var SPONSORS = [
  { id: "sp1", name: "Kammavari Sangham Trust", category: "Title", logo: "KSSEM", website: "https://kssem.edu.in", description: "Primary Management & Patron" },
  { id: "sp2", name: "Google Cloud Platform", category: "Title", logo: "Google Cloud", website: "https://cloud.google.com", description: "$10,000 in AI & Compute Credits" },
  { id: "sp3", name: "GitHub", category: "Gold", logo: "GitHub", website: "https://github.com", description: "Official Student Developer Pack Partner" },
  { id: "sp4", name: "Postman", category: "Gold", logo: "Postman", website: "https://postman.com", description: "API Development & Testing Partner" },
  { id: "sp5", name: "PhonePe Tech", category: "Silver", logo: "PhonePe", website: "https://phonepe.com", description: "FinTech Track Sponsor" },
  { id: "sp6", name: "MongoDB", category: "Silver", logo: "MongoDB", website: "https://mongodb.com", description: "Database Atlas Credits" },
  { id: "sp7", name: "Devfolio", category: "Community", logo: "Devfolio", website: "https://devfolio.co", description: "Platform & Hackathon Partner" },
  { id: "sp8", name: "Major League Hacking (MLH)", category: "Community", logo: "MLH", website: "https://mlh.io", description: "Global Student Hackathon Network" },
  { id: "sp9", name: "Namma Bengaluru Tech Media", category: "Media", logo: "Bengaluru Tech", website: "https://kssem.edu.in", description: "Media Coverage Partner" },
  { id: "sp10", name: "Bosch Hiring Cell", category: "Hiring", logo: "Bosch", website: "https://bosch.in", description: "Direct Internship & FTE Interview Fast-Track" }
];
var SEED_ANNOUNCEMENTS = [
  {
    id: "ann-1",
    title: "\u{1F680} Anvation 2026 Inauguration at 09:30 AM in Auditorium",
    content: "All registered participants are requested to assemble in the main KSSEM Auditorium for the keynote address by Bosch & Google Cloud leaders.",
    category: "Schedule",
    timestamp: "2026-10-16T09:00:00Z",
    urgent: true
  },
  {
    id: "ann-2",
    title: "\u{1F355} Midnight Snacks & Fun Stunts at Seminar Hall 2 (11:30 PM)",
    content: "Take a break from coding! Head over to Seminar Hall 2 for piping hot pizzas, gaming arena, and stand-up comedy.",
    category: "General",
    timestamp: "2026-10-16T23:00:00Z"
  },
  {
    id: "ann-3",
    title: "\u23F0 Final Code Freeze at 09:30 AM sharp tomorrow",
    content: "Please ensure your GitHub repository is updated with your latest commit and project details are submitted on your dashboard.",
    category: "Important",
    timestamp: "2026-10-17T07:00:00Z",
    urgent: true
  }
];

// src/utils/upiVerification.ts
var PAYMENT_UPI_ID = typeof process !== "undefined" && process.env.PAYMENT_UPI_ID || import.meta.env?.VITE_PAYMENT_UPI_ID || "fcbizdgbveu@freecharge";
var TRANSACTION_ID_PATTERN = /(?<!\d)\d{12}(?!\d)/g;
var EXPLICIT_UTR_PATTERN = /(?:^|\n)\s*utr\s*[:#-]?\s*(\d{12})(?!\d)/gim;
var EXPLICIT_UPI_TRANSACTION_PATTERN = /(?:^|\n)\s*upi\s+transaction\s+id\s*[:#-]?\s*(\d{12})(?!\d)/gim;
var EXCLUDED_TRANSACTION_LABEL_PATTERN = /google\s+transaction\s+id|transaction\s+id\s*\(google\)|bank\s+(?:reference|transaction)\s+number/i;
function extractTransactionIds(ocrText) {
  const explicitUtr = Array.from(ocrText.matchAll(EXPLICIT_UTR_PATTERN), (match) => match[1]);
  if (explicitUtr.length) return Array.from(new Set(explicitUtr));
  const explicitUpiTransaction = Array.from(ocrText.matchAll(EXPLICIT_UPI_TRANSACTION_PATTERN), (match) => match[1]);
  if (explicitUpiTransaction.length) return Array.from(new Set(explicitUpiTransaction));
  const lines = ocrText.split(/\r?\n/);
  return Array.from(new Set(lines.filter((line) => !EXCLUDED_TRANSACTION_LABEL_PATTERN.test(line)).flatMap((line) => line.match(TRANSACTION_ID_PATTERN) || [])));
}
function ocrContainsTransactionId(ocrText, transactionId) {
  return extractTransactionIds(ocrText).some((candidate) => candidate === transactionId);
}

// src/server/productionStore.ts
import { neon } from "@neondatabase/serverless";
var databaseUrl = String(process.env.DATABASE_URL || "").trim();
if (process.env.VERCEL && !databaseUrl) {
  throw new Error("DATABASE_URL must be configured for Vercel production deployments.");
}
var sql = databaseUrl ? neon(databaseUrl) : null;
var productionStoreEnabled = Boolean(sql);
async function ensureProductionSchema() {
  if (!sql) return;
  await sql`
    CREATE TABLE IF NOT EXISTS registrations (
      team_id TEXT PRIMARY KEY,
      team_name TEXT NOT NULL,
      team_name_key TEXT NOT NULL UNIQUE,
      leader_email TEXT NOT NULL,
      preferred_track TEXT NOT NULL,
      team_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS registration_participants (
      participant_id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL REFERENCES registrations(team_id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      usn TEXT NOT NULL,
      phone TEXT NOT NULL,
      participant_json JSONB NOT NULL,
      UNIQUE(email),
      UNIQUE(usn),
      UNIQUE(phone)
    )
  `;
}
async function loadProductionTeams() {
  if (!sql) return [];
  await ensureProductionSchema();
  const rows = await sql`SELECT team_json FROM registrations ORDER BY created_at ASC`;
  return rows.map((row) => row.team_json);
}
async function findProductionDuplicate(conflict) {
  if (!sql) return null;
  await ensureProductionSchema();
  const teamNameKey = conflict.teamName?.trim().replace(/\s+/g, " ").toLowerCase();
  if (teamNameKey) {
    const rows = await sql`SELECT team_id FROM registrations WHERE team_name_key = ${teamNameKey} LIMIT 1`;
    if (rows.length) return { code: "TEAM_NAME_EXISTS", value: conflict.teamName.trim() };
  }
  for (const participant of conflict.participants || []) {
    const email = String(participant.email || "").trim().toLowerCase();
    const usn = String(participant.usn || "").trim().toUpperCase();
    const phone = String(participant.phone || "").replace(/[^0-9]/g, "");
    if (email) {
      const rows = await sql`SELECT participant_id FROM registration_participants WHERE email = ${email} LIMIT 1`;
      if (rows.length) return { code: "EMAIL_EXISTS", value: email };
    }
    if (usn) {
      const rows = await sql`SELECT participant_id FROM registration_participants WHERE usn = ${usn} LIMIT 1`;
      if (rows.length) return { code: "USN_EXISTS", value: usn };
    }
    if (phone) {
      const rows = await sql`SELECT participant_id FROM registration_participants WHERE phone = ${phone} LIMIT 1`;
      if (rows.length) return { code: "PHONE_EXISTS", value: phone };
    }
  }
  return null;
}
async function saveProductionTeam(team) {
  if (!sql) throw new Error("DATABASE_URL is required for production registration storage.");
  await ensureProductionSchema();
  const statements = [sql`
    INSERT INTO registrations (team_id, team_name, team_name_key, leader_email, preferred_track, team_json)
    VALUES (${team.id}, ${team.teamName}, ${team.teamName.trim().replace(/\s+/g, " ").toLowerCase()}, ${team.leaderEmail}, ${team.preferredTrack}, ${JSON.stringify(team)}::jsonb)
  `];
  for (const participant of team.members) {
    statements.push(sql`
      INSERT INTO registration_participants (participant_id, team_id, email, usn, phone, participant_json)
      VALUES (${participant.id}, ${team.id}, ${participant.email.trim().toLowerCase()}, ${participant.usn.trim().toUpperCase()}, ${participant.phone.replace(/[^0-9]/g, "")}, ${JSON.stringify(participant)}::jsonb)
    `);
  }
  await sql.transaction(statements);
}
async function updateProductionTeam(team) {
  if (!sql) throw new Error("DATABASE_URL is required for production registration storage.");
  await ensureProductionSchema();
  const teamJson = JSON.stringify(team);
  const teamNameKey = team.teamName.trim().replace(/\s+/g, " ").toLowerCase();
  await sql.transaction([
    sql`
      UPDATE registrations
      SET team_name = ${team.teamName},
          team_name_key = ${teamNameKey},
          leader_email = ${team.leaderEmail},
          preferred_track = ${team.preferredTrack},
          team_json = ${teamJson}::jsonb
      WHERE team_id = ${team.id}
    `,
    sql`DELETE FROM registration_participants WHERE team_id = ${team.id}`,
    ...team.members.map((participant) => sql`
      INSERT INTO registration_participants (participant_id, team_id, email, usn, phone, participant_json)
      VALUES (${participant.id}, ${team.id}, ${participant.email.trim().toLowerCase()}, ${participant.usn.trim().toUpperCase()}, ${participant.phone.replace(/[^0-9]/g, "")}, ${JSON.stringify(participant)}::jsonb)
    `)
  ]);
}
async function deleteProductionTeam(teamId) {
  if (!sql) throw new Error("DATABASE_URL is required for production registration storage.");
  await ensureProductionSchema();
  await sql.transaction([
    sql`DELETE FROM registration_participants WHERE team_id = ${teamId}`,
    sql`DELETE FROM registrations WHERE team_id = ${teamId}`
  ]);
}

// server.ts
var execFileAsync = promisify(execFile);
var paymentOcrWorkerPromise = null;
async function readPaymentProofText(imageBytes) {
  if (!paymentOcrWorkerPromise) {
    paymentOcrWorkerPromise = createWorker("eng").catch((error) => {
      paymentOcrWorkerPromise = null;
      throw error;
    });
  }
  const worker = await paymentOcrWorkerPromise;
  const normalized = sharp(imageBytes, { failOn: "none" });
  const metadata = await normalized.metadata();
  const width = Math.max(metadata.width || 0, 1600);
  const height = metadata.height ? Math.round(metadata.height * width / (metadata.width || width)) : width;
  const baseVariants = await Promise.all([
    normalized.clone().resize({ width }).png().toBuffer(),
    normalized.clone().resize({ width }).grayscale().normalize().sharpen().png().toBuffer(),
    normalized.clone().resize({ width }).grayscale().normalize().threshold(180).png().toBuffer()
  ]);
  const regions = [
    { left: 0, top: 0, width, height },
    { left: 0, top: 0, width, height: Math.max(1, Math.round(height * 0.45)) },
    { left: 0, top: Math.round(height * 0.28), width, height: Math.max(1, Math.round(height * 0.45)) },
    { left: 0, top: Math.round(height * 0.55), width, height: Math.max(1, height - Math.round(height * 0.55)) }
  ];
  const texts = [];
  for (const variant of baseVariants) {
    for (const [regionIndex, region] of regions.entries()) {
      const regionImage = regionIndex === 0 ? variant : await sharp(variant).extract(region).png().toBuffer();
      const pageSegmentationMode = regionIndex === 0 ? "6" : "11";
      const result = await worker.recognize(regionImage, {
        tessedit_pageseg_mode: pageSegmentationMode
      });
      const text = String(result?.data?.text || "").trim();
      if (text) texts.push(text);
    }
  }
  return texts.join("\n");
}
try {
  const envFile = path.join(process.cwd(), ".env");
  if (!process.env.VERCEL && fs.existsSync(envFile)) {
    for (const rawLine of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (!key || process.env[key] !== void 0) continue;
      let val = line.slice(eq + 1).trim();
      if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
    console.log("[ENV] Loaded configuration from .env (SMTP ready if configured).");
  } else {
    console.log("[ENV] No .env file found \u2014 SMTP email delivery will fall back to .eml generation.");
  }
} catch (envErr) {
  console.warn("[ENV] Could not load .env file:", envErr && envErr.message ? envErr.message : envErr);
}
function getSmtpConfig() {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM"];
  const missing = required.filter((key) => !String(process.env[key] || "").trim());
  return { configured: missing.length === 0, missing };
}
(function checkSmtpConfig() {
  const smtp = getSmtpConfig();
  if (!smtp.configured) {
    console.warn(`[EMAIL] SMTP is not fully configured. Missing: ${smtp.missing.join(", ")}. Real mail will not be sent; .eml fallback remains available.`);
    return;
  }
  const host = String(process.env.SMTP_HOST).toLowerCase();
  const user = String(process.env.SMTP_USER).toLowerCase();
  if (host.includes("gmail") && !user.endsWith("@gmail.com")) {
    console.warn("[EMAIL] Gmail SMTP requires SMTP_USER to be a Gmail address and SMTP_PASS to be a Gmail App Password.");
  }
})();
var DEFAULT_PORT = Number(process.env.PORT) || 3001;
var INTERNAL_PORT = Number(process.env.INTERNAL_PORT) || 3002;
var PUBLIC_PORT = DEFAULT_PORT;
var rawWorkers = String(process.env.CLUSTER_WORKERS || "").trim().toLowerCase();
var WORKER_COUNT = 0;
if (rawWorkers === "auto") {
  try {
    WORKER_COUNT = Math.max(1, os.cpus().length - 1);
  } catch {
    WORKER_COUNT = 2;
  }
} else if (rawWorkers !== "") {
  WORKER_COUNT = Math.max(0, Number(rawWorkers) || 0);
}
var cluster = null;
function serveStaticWithCache(app, distPath) {
  const IMMUTABLE = /\.(?:css|js|map|png|jpe?g|webp|gif|svg|ico|avif|woff2?|ttf|eot|ttc|otf)$/i;
  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        const base = path.basename(filePath);
        if (IMMUTABLE.test(base)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        } else {
          res.setHeader("Cache-Control", "no-store, must-revalidate");
        }
      }
    })
  );
  app.get("*", (req, res) => {
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.sendFile(path.join(distPath, "index.html"));
  });
}
function proxyApiToAuthority(req, res) {
  const headers = {};
  for (const [k, v] of Object.entries(req.headers || {})) {
    if (v !== void 0) headers[k] = String(v);
  }
  headers.host = `0.0.0.0:${INTERNAL_PORT}`;
  const upstream = httpx.request(
    {
      hostname: "0.0.0.0",
      port: INTERNAL_PORT,
      path: req.originalUrl || req.url || "/",
      method: req.method || "GET",
      headers
    },
    (upRes) => {
      const status = upRes.statusCode || 502;
      const hdrs = {};
      for (const [k, v] of Object.entries(upRes.headers || {})) {
        if (v !== void 0) hdrs[k] = String(v);
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
async function startupWorker() {
  const app = express();
  try {
    app.set("trust proxy", 1);
  } catch {
  }
  app.disable("x-powered-by");
  app.use(compression({ threshold: 1024, level: 6 }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });
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
function tryClusterSpawn(cluster2, n) {
  const entrypointFile = (() => {
    try {
      if (typeof __filename !== "undefined") return __filename;
    } catch {
    }
    return path.resolve("server.ts");
  })();
  const setup = () => {
    if (typeof cluster2.setupPrimary === "function") {
      cluster2.setupPrimary({ waitUntilStarted: true, schedulingPolicy: cluster2.SCHED_RR });
    } else if (typeof cluster2.setupMaster === "function") {
      cluster2.setupMaster({ schedulingPolicy: cluster2.SCHED_RR });
    }
  };
  if (typeof cluster2.fork === "function") {
    setup();
    for (let i = 0; i < n; i++) cluster2.fork(entrypointFile);
    return true;
  }
  if (typeof cluster2.spawn === "function") {
    for (let i = 0; i < n; i++) cluster2.spawn();
    return true;
  }
  return false;
}
async function run() {
  if (cluster === null) {
    try {
      const mod = await import("node:cluster");
      cluster = mod && mod.default ? mod.default : mod;
    } catch {
      cluster = null;
    }
  }
  if (cluster && cluster.isPrimary === false) {
    await startupWorker();
    return;
  }
  if (cluster && cluster.isPrimary && WORKER_COUNT > 0) {
    console.log(`[CLUSTER] Primary authority on internal port ${INTERNAL_PORT}, spawning ${WORKER_COUNT} worker(s).`);
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
  await startServer();
}
async function startServer(options = {}) {
  const app = express();
  const requestedPort = PUBLIC_PORT;
  const shouldListen = options.listen !== false && !process.env.VERCEL;
  app.use(express.json({ limit: "16mb" }));
  try {
    app.set("trust proxy", 1);
  } catch {
  }
  app.disable("x-powered-by");
  app.use(
    compression({
      threshold: 1024,
      // only compress responses above 1 KB
      level: 6
    })
  );
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (!res.getHeader("Cache-Control")) {
      res.setHeader("Cache-Control", "no-store, must-revalidate");
    }
    next();
  });
  function sanitizeObjectKeys(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        obj[i] = sanitizeObjectKeys(obj[i]);
      }
      return obj;
    }
    for (const key of Object.keys(obj)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") {
        delete obj[key];
      } else {
        obj[key] = sanitizeObjectKeys(obj[key]);
      }
    }
    return obj;
  }
  app.use((req, res, next) => {
    if (req.body && typeof req.body === "object") sanitizeObjectKeys(req.body);
    if (req.query && typeof req.query === "object") sanitizeObjectKeys(req.query);
    if (req.params && typeof req.params === "object") sanitizeObjectKeys(req.params);
    next();
  });
  function isValidSafeUrl(urlString) {
    if (!urlString || typeof urlString !== "string") return true;
    const trimmed = urlString.trim();
    if (!trimmed) return true;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return false;
      }
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname === "127.0.0.1" || hostname === "0.0.0.0" || hostname === "::1" || hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
        return false;
      }
      const ipMatch = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
      if (ipMatch) {
        const b0 = parseInt(ipMatch[1], 10);
        const b1 = parseInt(ipMatch[2], 10);
        if (b0 === 10) return false;
        if (b0 === 172 && b1 >= 16 && b1 <= 31) return false;
        if (b0 === 192 && b1 === 168) return false;
        if (b0 === 127 || b0 === 0) return false;
        if (b0 === 169 && b1 === 254) return false;
      }
      return true;
    } catch {
      return false;
    }
  }
  function sanitizeInputString(str) {
    if (typeof str !== "string") return "";
    return str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").replace(/javascript:/gi, "").trim();
  }
  const participantLoginAttempts = /* @__PURE__ */ new Map();
  function checkParticipantLoginThrottle(identifier, ip) {
    const now = Date.now();
    const keys = [`id:${identifier.toLowerCase()}`, `ip:${ip}`];
    for (const key of keys) {
      const record = participantLoginAttempts.get(key);
      if (record && record.throttledUntil > now) {
        return { throttled: true, waitSeconds: Math.ceil((record.throttledUntil - now) / 1e3) };
      }
    }
    return { throttled: false };
  }
  function recordParticipantLoginFailure(identifier, ip) {
    const now = Date.now();
    const keys = [`id:${identifier.toLowerCase()}`, `ip:${ip}`];
    const currentCount = Math.max(...keys.map((key) => participantLoginAttempts.get(key)?.count || 0));
    const nextCount = currentCount + 1;
    const delaySeconds = nextCount >= 5 ? Math.min((nextCount - 4) * 5, 30) : 0;
    const throttledUntil = delaySeconds > 0 ? now + delaySeconds * 1e3 : 0;
    for (const key of keys) {
      participantLoginAttempts.set(key, { count: nextCount, throttledUntil });
    }
    return delaySeconds;
  }
  function clearParticipantLoginFailure(identifier, ip) {
    const keys = [`id:${identifier.toLowerCase()}`, `ip:${ip}`];
    for (const key of keys) {
      participantLoginAttempts.delete(key);
    }
  }
  const AUTH_COOKIE = "anvation_session";
  const SESSION_TTL_MS = 12 * 60 * 60 * 1e3;
  const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD || "change-me-in-dev-only";
  if (process.env.VERCEL && !process.env.ADMIN_BOOTSTRAP_PASSWORD) {
    throw new Error("ADMIN_BOOTSTRAP_PASSWORD must be configured for Vercel production deployments.");
  }
  const sessionStore = /* @__PURE__ */ new Map();
  const passwordResetTokens = /* @__PURE__ */ new Map();
  const PASSWORD_RESET_TTL_MS = 15 * 60 * 1e3;
  function sanitizeAdminUser(user) {
    if (!user) return user;
    const { password: _password, ...rest } = user;
    return rest;
  }
  function sanitizeTeamForClient(team) {
    if (!team) return team;
    const { accessPassword: _accessPassword, portalPasswordPlain: _portalPasswordPlain, ...rest } = team;
    return rest;
  }
  function normalizeStoredPassword(value) {
    if (!value) return void 0;
    const password = String(value).trim();
    if (!password) return void 0;
    return password.startsWith("pbkdf2_sha256$") ? password : hashPassword(password);
  }
  function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const derived = crypto.pbkdf2Sync(password, salt, 25e4, 32, "sha256").toString("hex");
    return `pbkdf2_sha256$${salt}$${derived}`;
  }
  function generatePortalPassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const groups = Array.from(
      { length: 3 },
      () => Array.from({ length: 4 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join("")
    );
    return groups.join("-");
  }
  function generatePasswordResetToken() {
    const rawToken = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    return { rawToken, tokenHash };
  }
  function verifyPassword(password, storedHash) {
    if (!storedHash || !password) return false;
    if (!storedHash.startsWith("pbkdf2_sha256$")) return false;
    const [, salt, hash] = storedHash.split("$");
    if (!salt || !hash) return false;
    const derived = crypto.pbkdf2Sync(password, salt, 25e4, 32, "sha256").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  }
  function getClientIp(req) {
    return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "unknown");
  }
  function createSession(user) {
    const sid = crypto.randomBytes(24).toString("hex");
    const record = { user: { ...user, expiresAt: Date.now() + SESSION_TTL_MS }, expiresAt: Date.now() + SESSION_TTL_MS };
    sessionStore.set(sid, record);
    return sid;
  }
  function getSessionFromRequest(req) {
    const cookieRaw = req.headers.cookie || "";
    const match = cookieRaw.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${AUTH_COOKIE}=`));
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
  function setAuthCookie(res, sid) {
    const secure = process.env.NODE_ENV === "production";
    res.cookie(AUTH_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      maxAge: SESSION_TTL_MS,
      path: "/"
    });
  }
  function clearAuthCookie(res) {
    res.clearCookie(AUTH_COOKIE, { path: "/", httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  }
  function requireAuth(req, res, next) {
    const session = getSessionFromRequest(req);
    if (!session) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }
    req.session = session.user;
    next();
  }
  function requireRole(roles) {
    return (req, res, next) => {
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
  function requireTeamAccess(req, res, next) {
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
  function requireSameOriginForMutations(req, res, next) {
    if (["GET", "HEAD", "OPTIONS"].includes((req.method || "GET").toUpperCase())) return next();
    const origin = String(req.headers.origin || "");
    const referer = String(req.headers.referer || "");
    const host = req.headers.host || "";
    const trustedOrigin = origin && (origin === `http://${host}` || origin === `https://${host}`);
    const trustedReferer = referer && (referer.startsWith(`http://${host}/`) || referer.startsWith(`https://${host}/`));
    if (origin && !trustedOrigin && !trustedReferer) {
      return res.status(403).json({ success: false, error: "Request origin is not trusted." });
    }
    next();
  }
  let teams = [];
  let submissions = [];
  let scorecards = [];
  let announcements = [...SEED_ANNOUNCEMENTS];
  let sponsors = [...SPONSORS];
  let milestoneReports = [];
  let mentorBookings = [];
  if (productionStoreEnabled) {
    await ensureProductionSchema();
  }
  let nextTeamNumber = 0;
  let cmsConfig = {
    eventName: "ANVATION 2026",
    eventSubName: "NATIONAL LEVEL 24-HOUR HACKATHON \u2022 EXPLORE, INNOVATE, TRANSFORM",
    collegeName: "K. S. SCHOOL OF ENGINEERING AND MANAGEMENT",
    departmentName: "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING",
    eventDates: "OCTOBER 8\u20139, 2026",
    venueLocation: "KSSEM Campus, Kanakapura Road, Bengaluru",
    totalPrizePool: "\u20B950,000",
    firstPrize: "\u20B925,000",
    secondPrize: "\u20B915,000",
    thirdPrize: "\u20B910,000",
    contactEmail: "anvation2026@kssem.edu.in",
    contactPhone: "+91 98450 12345 / +91 99001 88776",
    registrationOpen: true,
    freezeRegistrations: false,
    enableMilestoneSubmissions: false,
    // Admin controlled; unlocked from Admin "Event Flow" panel
    enableMentorBookings: true,
    enableCertificateDownloads: false,
    // Admin controlled
    enableProjectSubmissions: false,
    // Admin controlled; released from Admin Portal "Submissions" tab (hidden on frontend until enabled)
    enableSupportTickets: false,
    // Admin controlled; unlocked from Admin "Event Flow" panel
    enableAnnouncements: false,
    // Admin controlled; unlocked from Admin "Event Flow" panel
    homeSections: {
      // Admin controlled; which sections appear on the public home page
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
    gateScanSecretKey: process.env.GATE_SCAN_SECRET_KEY || ""
  };
  let tickets = [];
  const DATA_DIRECTORY = path.resolve((process.env.DATA_DIR || process.cwd()).trim());
  const PARTICIPANT_BACKUP_DIR = path.resolve((process.env.BACKUP_DIR || path.join(DATA_DIRECTORY, "backups")).trim());
  const PARTICIPANT_BACKUP_FILE = path.join(PARTICIPANT_BACKUP_DIR, "participant-registration-backup.csv");
  const PARTICIPANT_BACKUP_HEADERS = [
    "registration_timestamp",
    "team_id",
    "team_name",
    "domain",
    "participant_name",
    "role",
    "email",
    "phone",
    "usn",
    "college",
    "state",
    "gender",
    "accommodation_required",
    "payment_utr",
    "payment_status",
    "payment_amount_detail",
    "team_status"
  ];
  let participantBackupWriteQueue = Promise.resolve();
  let githubBackupSyncQueue = Promise.resolve();
  const githubBackupSyncEnabled = /^(1|true|yes)$/i.test(String(process.env.GITHUB_BACKUP_SYNC || ""));
  const githubBackupRepoDir = path.resolve((process.env.GITHUB_BACKUP_REPO_DIR || process.cwd()).trim());
  const githubBackupRelativePath = String(process.env.GITHUB_BACKUP_RELATIVE_PATH || "backups/participant-registration-backup.csv").trim().replace(/\\/g, "/");
  const githubBackupTrackedFile = path.resolve(githubBackupRepoDir, githubBackupRelativePath);
  const githubBackupRepoPrefix = `${githubBackupRepoDir}${path.sep}`;
  if (githubBackupSyncEnabled && !githubBackupTrackedFile.startsWith(githubBackupRepoPrefix)) {
    throw new Error("GITHUB_BACKUP_RELATIVE_PATH must stay inside GITHUB_BACKUP_REPO_DIR.");
  }
  const csvCell = (value) => {
    let text = value === null || value === void 0 ? "" : String(value);
    if (/^[\s\t\r\n]*[=+\-@\t\r]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
  };
  const participantBackupRows = (team) => team.members.map((member) => {
    const row = [
      team.createdAt,
      team.id,
      team.teamName,
      team.preferredTrack,
      member.fullName,
      member.role,
      member.email,
      member.phone,
      member.usn,
      member.college,
      member.state,
      member.gender || "",
      member.accommodationRequired,
      team.paymentUtr,
      team.paymentStatus,
      team.paymentAmountDetail,
      team.status
    ];
    return row.map(csvCell).join(",");
  }).join("\n");
  const participantBackupFileContents = (seedTeams) => {
    const seedRows = seedTeams.map(participantBackupRows).filter(Boolean).join("\n");
    return `\uFEFF${PARTICIPANT_BACKUP_HEADERS.map(csvCell).join(",")}
${seedRows}${seedRows ? "\n" : ""}`;
  };
  const parseCsvLine = (line) => {
    const values = [];
    let value = "";
    let quoted = false;
    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          value += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === "," && !quoted) {
        values.push(value);
        value = "";
      } else {
        value += character;
      }
    }
    values.push(value);
    return values;
  };
  const migrateParticipantRegistrationBackup = (contents) => {
    const lines = contents.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.length > 0);
    if (lines.length === 0) return participantBackupFileContents(teams);
    const oldHeaders = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());
    const oldRows = lines.slice(1).map(parseCsvLine);
    const valueFor = (row, aliases) => {
      const index = aliases.map((alias) => oldHeaders.indexOf(alias)).find((candidate) => candidate >= 0);
      return index === void 0 ? "" : row[index] || "";
    };
    const migratedRows = oldRows.map((row) => {
      const migrated = [
        valueFor(row, ["registration_timestamp"]),
        valueFor(row, ["team_id"]),
        valueFor(row, ["team_name"]),
        valueFor(row, ["domain", "track"]),
        valueFor(row, ["participant_name"]),
        valueFor(row, ["role"]),
        valueFor(row, ["email"]),
        valueFor(row, ["phone"]),
        valueFor(row, ["usn"]),
        valueFor(row, ["college"]),
        valueFor(row, ["state"]),
        valueFor(row, ["gender"]),
        valueFor(row, ["accommodation_required"]),
        valueFor(row, ["payment_utr"]),
        valueFor(row, ["payment_status"]),
        valueFor(row, ["payment_amount_detail"]),
        valueFor(row, ["team_status"])
      ];
      return migrated.map(csvCell).join(",");
    }).filter(Boolean);
    return `\uFEFF${PARTICIPANT_BACKUP_HEADERS.map(csvCell).join(",")}
${migratedRows.join("\n")}${migratedRows.length ? "\n" : ""}`;
  };
  const initialiseParticipantRegistrationBackup = () => {
    fs.mkdirSync(PARTICIPANT_BACKUP_DIR, { recursive: true, mode: 448 });
    const hasData = fs.existsSync(PARTICIPANT_BACKUP_FILE) && fs.statSync(PARTICIPANT_BACKUP_FILE).size > 0;
    if (hasData) {
      const contents = fs.readFileSync(PARTICIPANT_BACKUP_FILE, "utf8");
      const currentHeader = parseCsvLine(contents.replace(/^\uFEFF/, "").split(/\r?\n/, 1)[0]);
      if (currentHeader.join(",") !== PARTICIPANT_BACKUP_HEADERS.join(",")) {
        fs.writeFileSync(
          PARTICIPANT_BACKUP_FILE,
          migrateParticipantRegistrationBackup(contents),
          { encoding: "utf8", mode: 384 }
        );
      }
      return;
    }
    fs.writeFileSync(
      PARTICIPANT_BACKUP_FILE,
      participantBackupFileContents(teams),
      { encoding: "utf8", mode: 384 }
    );
    console.log(`[BACKUP] Participant registration CSV initialised: ${PARTICIPANT_BACKUP_FILE}`);
  };
  const appendParticipantRegistrationBackup = (team) => {
    const rows = participantBackupRows(team);
    if (!rows) return Promise.resolve();
    const write = async () => {
      await fs.promises.mkdir(PARTICIPANT_BACKUP_DIR, { recursive: true, mode: 448 });
      let needsInitialisation = true;
      try {
        needsInitialisation = (await fs.promises.stat(PARTICIPANT_BACKUP_FILE)).size === 0;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      if (needsInitialisation) {
        await fs.promises.writeFile(
          PARTICIPANT_BACKUP_FILE,
          participantBackupFileContents(teams),
          { encoding: "utf8", mode: 384 }
        );
      }
      await fs.promises.appendFile(PARTICIPANT_BACKUP_FILE, `${rows}
`, { encoding: "utf8", mode: 384 });
    };
    participantBackupWriteQueue = participantBackupWriteQueue.catch(() => void 0).then(write);
    return participantBackupWriteQueue;
  };
  const syncParticipantBackupToGitHub = (team) => {
    if (!githubBackupSyncEnabled) return Promise.resolve();
    const sync = async () => {
      await fs.promises.mkdir(path.dirname(githubBackupTrackedFile), { recursive: true });
      if (path.resolve(PARTICIPANT_BACKUP_FILE) !== githubBackupTrackedFile) {
        await fs.promises.copyFile(PARTICIPANT_BACKUP_FILE, githubBackupTrackedFile);
      }
      const git = (args) => execFileAsync("git", ["-C", githubBackupRepoDir, ...args], {
        maxBuffer: 1024 * 1024,
        windowsHide: true
      });
      const remote = String(process.env.GITHUB_BACKUP_REMOTE || "origin").trim();
      const branch = String(process.env.GITHUB_BACKUP_BRANCH || "main").trim();
      const relativePath = path.relative(githubBackupRepoDir, githubBackupTrackedFile).replace(/\\/g, "/");
      await git(["config", "user.name", process.env.GITHUB_BACKUP_AUTHOR_NAME || "ANVATION Backup Bot"]);
      await git(["config", "user.email", process.env.GITHUB_BACKUP_AUTHOR_EMAIL || "anvation-backup@users.noreply.github.com"]);
      await git(["add", "--", relativePath]);
      const status = await git(["status", "--porcelain", "--", relativePath]);
      if (status.stdout.trim()) {
        await git(["commit", "-m", `Update participant backup after ${team.id}`]);
      }
      await git(["push", remote, `HEAD:${branch}`]);
      console.log(`[BACKUP] Pushed participant CSV update for ${team.id} to ${remote}/${branch}.`);
    };
    githubBackupSyncQueue = githubBackupSyncQueue.catch(() => void 0).then(sync);
    return githubBackupSyncQueue;
  };
  app.use((req, res, next) => {
    if (req.method === "OPTIONS") return next();
    if (["POST", "PUT", "PATCH", "DELETE"].includes((req.method || "GET").toUpperCase())) {
      return requireSameOriginForMutations(req, res, next);
    }
    next();
  });
  const registeredEmails = /* @__PURE__ */ new Set();
  const registeredPhones = /* @__PURE__ */ new Set();
  const registeredUsns = /* @__PURE__ */ new Set();
  const registeredUtrs = /* @__PURE__ */ new Set();
  const registeredTeamNames = /* @__PURE__ */ new Set();
  function normalizeTeamName(value) {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
  }
  function rebuildUniquenessIndexes() {
    registeredEmails.clear();
    registeredPhones.clear();
    registeredUsns.clear();
    registeredUtrs.clear();
    registeredTeamNames.clear();
    for (const t of teams) {
      if (t.teamName) registeredTeamNames.add(normalizeTeamName(String(t.teamName)));
      if (t.paymentUtr && t.paymentUtr !== "PENDING" && t.paymentUtr !== "SUBMITTED") {
        registeredUtrs.add(String(t.paymentUtr).trim().toUpperCase());
      }
      if (t.leaderEmail) {
        registeredEmails.add(String(t.leaderEmail).trim().toLowerCase());
      }
      for (const m of t.members || []) {
        if (m.email) registeredEmails.add(String(m.email).trim().toLowerCase());
        if (m.usn) registeredUsns.add(String(m.usn).trim().toUpperCase());
        if (m.phone) {
          const cleanPhone = String(m.phone).replace(/[^0-9]/g, "");
          if (cleanPhone) registeredPhones.add(cleanPhone);
        }
      }
    }
  }
  const idempotencyStore = /* @__PURE__ */ new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of idempotencyStore.entries()) {
      if (now > val.expiresAt) idempotencyStore.delete(key);
    }
  }, 6e4);
  let registrationMutex = Promise.resolve();
  function withRegistrationLock(fn) {
    const next = registrationMutex.catch(() => {
    }).then(() => fn());
    registrationMutex = next.catch(() => {
    });
    return next;
  }
  function checkRegistrationDuplicates(body, excludeTeamId) {
    const conflicts = [];
    const teamName = typeof body?.teamName === "string" ? body.teamName.trim() : "";
    const normalizedTeamName = teamName ? normalizeTeamName(teamName) : "";
    const participants = [body?.leader, ...Array.isArray(body?.members) ? body.members : []].filter((participant) => participant && typeof participant === "object");
    const seenEmails = /* @__PURE__ */ new Set();
    const seenUsns = /* @__PURE__ */ new Set();
    const seenPhones = /* @__PURE__ */ new Set();
    if (normalizedTeamName && registeredTeamNames.has(normalizedTeamName)) {
      const existingTeam = teams.find(
        (team) => team.id !== excludeTeamId && normalizeTeamName(String(team.teamName || "")) === normalizedTeamName
      );
      if (existingTeam) {
        conflicts.push({
          code: "TEAM_NAME_EXISTS",
          field: "teamName",
          message: `The team name "${teamName}" is already registered.`
        });
      }
    }
    participants.forEach((participant, index) => {
      const email = typeof participant.email === "string" ? participant.email.trim().toLowerCase() : "";
      const usn = typeof participant.usn === "string" ? participant.usn.trim().toUpperCase() : "";
      const phone = String(participant.phone || "").replace(/[^0-9]/g, "");
      if (email && (seenEmails.has(email) || registeredEmails.has(email))) {
        conflicts.push({
          code: "EMAIL_EXISTS",
          field: index === 0 ? "leader.email" : `members.${index - 1}.email`,
          participantIndex: index,
          message: `The email "${participant.email}" is already used by another participant.`
        });
      }
      if (usn && (seenUsns.has(usn) || registeredUsns.has(usn))) {
        conflicts.push({
          code: "USN_EXISTS",
          field: index === 0 ? "leader.usn" : `members.${index - 1}.usn`,
          participantIndex: index,
          message: `The USN/ID "${participant.usn}" is already used by another participant.`
        });
      }
      if (phone && (seenPhones.has(phone) || registeredPhones.has(phone))) {
        conflicts.push({
          code: "PHONE_EXISTS",
          field: index === 0 ? "leader.phone" : `members.${index - 1}.phone`,
          participantIndex: index,
          message: `The phone number "${participant.phone}" is already used by another participant.`
        });
      }
      if (email) seenEmails.add(email);
      if (usn) seenUsns.add(usn);
      if (phone) seenPhones.add(phone);
    });
    return conflicts;
  }
  app.post("/api/registration/check-duplicates", (req, res) => {
    const check = async () => {
      const conflicts = checkRegistrationDuplicates(req.body);
      const productionConflict = await findProductionDuplicate({
        teamName: req.body?.teamName,
        participants: [req.body?.leader, ...Array.isArray(req.body?.members) ? req.body.members : []]
      });
      if (productionConflict && !conflicts.some((conflict) => conflict.code === productionConflict.code)) {
        conflicts.push({
          code: productionConflict.code,
          field: productionConflict.code === "TEAM_NAME_EXISTS" ? "teamName" : productionConflict.code === "EMAIL_EXISTS" ? "leader.email" : productionConflict.code === "USN_EXISTS" ? "leader.usn" : "leader.phone",
          message: `The ${productionConflict.code.replace("_EXISTS", "").toLowerCase()} is already registered.`
        });
      }
      return res.json({ success: conflicts.length === 0, conflicts });
    };
    return check().catch(() => res.status(503).json({ success: false, error: "Production registration storage is unavailable." }));
  });
  const validRegistrationDomains = new Set(HACKATHON_TRACKS.map((track) => track.title));
  function validateTeamRegistration(body) {
    if (!body || typeof body !== "object") {
      return { valid: false, error: "Invalid registration payload." };
    }
    const { teamName, domain, preferredTrack, leader, members = [] } = body;
    const selectedDomain = typeof domain === "string" && domain.trim() ? domain.trim() : typeof preferredTrack === "string" ? preferredTrack.trim() : "";
    if (!validRegistrationDomains.has(selectedDomain)) {
      return { valid: false, error: "A valid registration domain is required." };
    }
    if (!teamName || typeof teamName !== "string" || !teamName.trim()) {
      return { valid: false, error: "Team name is required." };
    }
    const cleanTeamName = teamName.trim();
    if (cleanTeamName.length < 2 || cleanTeamName.length > 50) {
      return { valid: false, error: "Team name must be between 2 and 50 characters." };
    }
    const teamNameConflict = checkRegistrationDuplicates({ teamName: cleanTeamName }).find((conflict) => conflict.code === "TEAM_NAME_EXISTS");
    if (teamNameConflict) {
      return {
        valid: false,
        isDuplicate: true,
        field: "teamName",
        fields: ["teamName"],
        message: teamNameConflict.message,
        error: teamNameConflict.code
      };
    }
    if (!leader || typeof leader !== "object") {
      return { valid: false, error: "Team leader details are strictly required." };
    }
    if (!leader.fullName?.trim()) {
      return { valid: false, error: "Leader full name is required." };
    }
    if (!leader.email?.trim() || !/^[^\s@]+@gmail\.com$/i.test(leader.email.trim())) {
      return { valid: false, error: "Leader email must be a valid @gmail.com address." };
    }
    if (!leader.usn?.trim()) {
      return { valid: false, error: "Leader USN / roll number is required." };
    }
    const leaderPhone = String(leader.phone || "").replace(/[^0-9]/g, "");
    if (leaderPhone.length !== 10 || !/^\d{10}$/.test(leaderPhone)) {
      return { valid: false, error: "Leader phone number must contain exactly 10 digits." };
    }
    if (!leader.college?.trim()) {
      return { valid: false, error: "Leader college name is required." };
    }
    if (!leader.state?.trim()) {
      return { valid: false, error: "Leader state is required." };
    }
    if (!Array.isArray(members) || members.length < 1 || members.length > 3) {
      return {
        valid: false,
        error: `Invalid team size: Teams must have between 2 and 4 participants (1 leader + 1 to 3 additional members). Received ${1 + (Array.isArray(members) ? members.length : 0)} participant(s).`
      };
    }
    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m || typeof m !== "object") {
        return { valid: false, error: `Member #${i + 2} details are missing or invalid.` };
      }
      if (!m.fullName?.trim()) {
        return { valid: false, error: `Member #${i + 2} full name is required.` };
      }
      if (!m.email?.trim() || !/^[^\s@]+@gmail\.com$/i.test(m.email.trim())) {
        return { valid: false, error: `Member #${i + 2} email must be a valid @gmail.com address.` };
      }
      if (!m.usn?.trim()) {
        return { valid: false, error: `Member #${i + 2} USN / roll number is required.` };
      }
      const memberPhone = String(m.phone || "").replace(/[^0-9]/g, "");
      if (memberPhone.length !== 10 || !/^\d{10}$/.test(memberPhone)) {
        return { valid: false, error: `Member #${i + 2} phone number must contain exactly 10 digits.` };
      }
      if (!m.college?.trim()) {
        return { valid: false, error: `Member #${i + 2} college name is required.` };
      }
      if (!m.state?.trim()) {
        return { valid: false, error: `Member #${i + 2} state is required.` };
      }
    }
    const duplicateConflicts = checkRegistrationDuplicates({ teamName: cleanTeamName, leader, members });
    if (duplicateConflicts.length > 0) {
      const conflict = duplicateConflicts[0];
      return {
        valid: false,
        isDuplicate: true,
        field: conflict.field,
        fields: [conflict.field],
        message: conflict.message,
        error: conflict.code
      };
    }
    return { valid: true };
  }
  function validatePaymentUtr(paymentUtr, paymentUtrConfirm) {
    if (!paymentUtr || typeof paymentUtr !== "string" || !paymentUtr.trim()) {
      return { valid: false, error: "Payment UTR / transaction reference number is required." };
    }
    const cleanUtr = paymentUtr.trim().toUpperCase();
    if (!/^\d{12}$/.test(cleanUtr)) {
      return { valid: false, error: "Invalid UTR format. Enter exactly 12 digits." };
    }
    if (paymentUtrConfirm && typeof paymentUtrConfirm === "string" && paymentUtrConfirm.trim()) {
      const cleanConfirm = paymentUtrConfirm.trim().toUpperCase();
      if (cleanUtr !== cleanConfirm) {
        return { valid: false, error: "The entered UTR numbers do not match. Please verify your payment confirmation reference." };
      }
    }
    if (registeredUtrs.has(cleanUtr)) {
      return { valid: false, error: `This payment transaction reference (${cleanUtr}) has already been registered with another team.` };
    }
    return { valid: true, cleanUtr };
  }
  async function deliverCredentialsForTeam(team, rawAccessPassword) {
    const participantList = (team.members || []).map((m) => ({
      email: m.email,
      name: m.fullName,
      college: m.college || "KSSEM",
      role: m.role || "Member"
    }));
    const subject = `\u{1F389} Registration Confirmed: ANVATION 2026 [Team ID: ${team.id}]`;
    const dates = "October 8 - October 9, 2026 (24-Hour Hackathon)";
    const venue = "K.S. School of Engineering and Management (KSSEM), Kanakapura Road, Bengaluru - 560109";
    let gateQrBuffer = null;
    let gateQrDataUrl = "";
    try {
      gateQrDataUrl = await QRCode.toDataURL(
        `https://anvation.live/checkin?teamId=${team.id}`,
        { width: 200, margin: 2 }
      );
      gateQrBuffer = Buffer.from(gateQrDataUrl.split(",")[1], "base64");
    } catch (qrErr) {
      console.warn(`[QR ERROR] Could not generate QR code for team ${team.id}:`, qrErr);
    }
    const recipientResults = [];
    let deliveredCount = 0;
    let failedCount = 0;
    const smtp = getSmtpConfig();
    const smtpHost = process.env.SMTP_HOST;
    if (smtp.configured && smtpHost) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || ""
        }
      });
      const from = String(process.env.MAIL_FROM);
      for (const p of participantList) {
        try {
          const info = await transporter.sendMail({
            from,
            to: p.email,
            subject,
            text: `ANVATION 2026 - Registration Confirmed
Hello ${p.name},
Team ID: ${team.id}
Team Name: ${team.teamName}
Domain: ${team.domain || team.preferredTrack}
${rawAccessPassword ? `Password: ${rawAccessPassword}
` : ""}Payment UTR: ${team.paymentUtr || "SUBMITTED"}
Venue: ${venue}
Dates: ${dates}`,
            html: `<div style="font-family:sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
              <div style="background:#0b192c;color:#fff;padding:20px 24px;">
                <h1 style="margin:0;font-size:20px;">ANVATION 2026</h1>
                <p style="margin:4px 0 0;font-size:12px;color:#67e8f9;">NATIONAL LEVEL 24-HOUR HACKATHON</p>
              </div>
              <div style="padding:24px;">
                <h2 style="color:#0f172a;margin-top:0;">Registration Confirmed \u2713</h2>
                <p>Dear <strong>${p.name}</strong>,</p>
                <p>Congratulations! Your team's registration for <strong>ANVATION 2026</strong> has been confirmed.</p>
                <p><strong>Team ID:</strong> ${team.id}<br/><strong>Team Name:</strong> ${team.teamName}<br/><strong>Domain:</strong> ${team.domain || team.preferredTrack}${rawAccessPassword ? `<br/><strong>Password:</strong> ${rawAccessPassword}` : ""}<br/><strong>UTR:</strong> ${team.paymentUtr || "SUBMITTED"}</p>
                ${gateQrDataUrl ? `<div style="text-align:center;margin:20px 0;"><img src="${gateQrDataUrl}" width="160" alt="Gate QR Pass"/><p style="font-size:12px;color:#64748b;">Gate Entry Pass QR</p></div>` : ""}
              </div>
            </div>`,
            attachments: gateQrBuffer ? [{
              filename: `gate-pass-${team.id}.png`,
              content: gateQrBuffer,
              cid: "gate-pass-qr",
              contentType: "image/png"
            }] : void 0
          });
          deliveredCount++;
          recipientResults.push({ recipient: p.email, status: "SENT" });
          console.log(`[EMAIL SENT] To: ${p.email} | Team: ${team.id} | MsgId: ${info.messageId}`);
        } catch (mailErr) {
          failedCount++;
          recipientResults.push({ recipient: p.email, status: "FAILED", error: String(mailErr.message || mailErr) });
          console.error(`[EMAIL FAILED] To: ${p.email} | Team: ${team.id} | ${mailErr.message}`);
        }
      }
      team.credentialDeliveryStatus = failedCount === 0 ? "delivered" : deliveredCount > 0 ? "delivered" : "failed";
      markDirty();
      return { success: deliveredCount > 0, deliveredCount, failedCount, results: recipientResults };
    } else {
      for (const p of participantList) {
        recipientResults.push({ recipient: p.email, status: "READY_LOCAL" });
        deliveredCount++;
      }
      console.log(`[EMAIL LOG] SMTP not configured. Generated confirmation records for: ${participantList.map((p) => p.email).join(", ")} | Team: ${team.id}`);
      team.credentialDeliveryStatus = "delivered";
      markDirty();
      return { success: true, deliveredCount, failedCount: 0, results: recipientResults };
    }
  }
  async function sendPortalResetEmail(team, resetUrl) {
    const smtp = getSmtpConfig();
    if (!smtp.configured) throw new Error("SMTP is not fully configured.");
    const transporter = nodemailer.createTransport({
      host: String(process.env.SMTP_HOST),
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: String(process.env.SMTP_USER), pass: String(process.env.SMTP_PASS) }
    });
    await transporter.sendMail({
      from: String(process.env.MAIL_FROM),
      to: team.leaderEmail,
      subject: `ANVATION 2026 portal password reset - ${team.id}`,
      text: `A password reset was requested for your ANVATION 2026 team portal.

Team ID: ${team.id}

Use this link within 15 minutes to choose a new password:
${resetUrl}

If you did not request this reset, contact the event administrators immediately.`,
      html: `<p>A password reset was requested for your ANVATION 2026 team portal.</p><p><strong>Team ID:</strong> ${team.id}</p><p><a href="${resetUrl}">Choose a new portal password</a></p><p>This link expires in 15 minutes. If you did not request this reset, contact the event administrators immediately.</p>`
    });
  }
  async function sendApprovalEmail(team) {
    const smtp = getSmtpConfig();
    if (!smtp.configured) {
      throw new Error("SMTP is not fully configured for approval delivery.");
    }
    if (team.approvalEmailStatus === "SENT") {
      return;
    }
    const senderHost = String(process.env.SMTP_HOST || "").trim();
    const senderPort = Number(process.env.SMTP_PORT) || 587;
    const senderUser = String(process.env.SMTP_USER || "").trim();
    const senderPass = String(process.env.SMTP_PASS || "").trim();
    const from = String(process.env.MAIL_FROM || senderUser);
    const recipients = Array.from(new Set(
      team.members.map((member) => String(member?.email || "").trim().toLowerCase()).filter((email) => email && /^[^\s@]+@gmail\.com$/i.test(email))
    ));
    if (recipients.length === 0) {
      throw new Error(`No valid Gmail participant email addresses found for team ${team.id}.`);
    }
    console.log(`[EMAIL APPROVAL] Team ${team.id} recipients: ${recipients.length}`);
    const transporter = nodemailer.createTransport({
      host: senderHost,
      port: senderPort,
      secure: false,
      requireTLS: true,
      ignoreTLS: false,
      auth: { user: senderUser, pass: senderPass }
    });
    try {
      await transporter.verify();
    } catch (verifyErr) {
      console.error(`[EMAIL APPROVAL] SMTP verify failed for team ${team.id}: ${verifyErr?.message || String(verifyErr)}`);
      throw verifyErr;
    }
    const password = String(team.portalPasswordPlain || team.accessPassword || "");
    const subject = `ANVATION 2026 Registration Approved \u2014 Team ${team.id}`;
    const text = `Hello participants,

Your team ${team.teamName} (${team.id}) has been approved by the admin.

Payment of \u20B9${cmsConfig.registrationFee || 0} has been verified. Registration approved.

Portal password: ${password}

Use Team ID ${team.id} and this password to log in to the participant portal.

Team details:
${team.members.map((m) => `${m.fullName} (${m.role})`).join(", ")}`;
    const html = `<p>Hello participants,</p><p>Your team <b>${team.teamName}</b> (<b>${team.id}</b>) has been approved by the admin.</p><p><b>Payment of \u20B9${cmsConfig.registrationFee || 0} has been verified. Registration approved.</b></p><p><b>Portal password:</b> ${password}</p><p>Use Team ID <b>${team.id}</b> and this password to log in to the participant portal.</p><p>${team.members.map((m) => `${m.fullName} (${m.role})`).join(", ")}</p>`;
    try {
      await Promise.all(recipients.map((recipient) => transporter.sendMail({ from, to: recipient, subject, text, html })));
    } catch (mailErr) {
      console.error(`[EMAIL APPROVAL] SMTP send failed for team ${team.id}: ${mailErr?.message || String(mailErr)}`);
      throw mailErr;
    }
  }
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.get("/api/registration-status", (req, res) => {
    res.json({
      success: true,
      registrationOpen: cmsConfig.registrationOpen && !cmsConfig.freezeRegistrations,
      freezeRegistrations: !!cmsConfig.freezeRegistrations,
      totalTeams: teams.length,
      maxRegistrations: cmsConfig.maxRegistrations || 100,
      registrationFee: cmsConfig.registrationFee || 0
    });
  });
  app.post("/api/admin/toggle-freeze-registration", requireAdmin, (req, res) => {
    try {
      const { freeze } = req.body;
      cmsConfig.freezeRegistrations = typeof freeze === "boolean" ? freeze : !cmsConfig.freezeRegistrations;
      cmsConfig.registrationOpen = !cmsConfig.freezeRegistrations;
      console.log(`[REGISTRATION STATUS] Freeze is now: ${cmsConfig.freezeRegistrations}`);
      res.json({
        success: true,
        freezeRegistrations: cmsConfig.freezeRegistrations,
        registrationOpen: cmsConfig.registrationOpen,
        message: cmsConfig.freezeRegistrations ? "Registrations have been FROZEN." : "Registrations are now OPEN."
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/admin/clear-all-teams", requireSuperAdmin, (req, res) => {
    try {
      const previousCount = teams.length;
      teams = [];
      submissions = [];
      milestoneReports = [];
      scorecards = [];
      tickets = [];
      nextTeamNumber = 0;
      rebuildUniquenessIndexes();
      console.log(`[ADMIN ACTION] Cleared all ${previousCount} registered teams.`);
      res.json({
        success: true,
        message: `Cleared all ${previousCount} registered teams and related records.`,
        teamsCount: 0
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/teams", (req, res) => {
    const totalParticipants = teams.reduce((acc, t) => acc + t.members.length, 0);
    const uniqueColleges = new Set(teams.flatMap((t) => t.members.map((m) => m.college))).size;
    const totalCapacity = cmsConfig.maxRegistrations || 350;
    const seatsLeft = Math.max(0, totalCapacity - totalParticipants);
    const safeTeams = teams.map((team) => sanitizeTeamForClient(team));
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
        totalTeams: teams.length
      }
    });
  });
  app.get("/api/session", (req, res) => {
    const session = getSessionFromRequest(req);
    if (!session) return res.json({ authenticated: false });
    const { id, type, role, teamId, email, username, name } = session.user;
    res.json({ authenticated: true, user: { id, type, role, teamId, email, username, name } });
  });
  app.post("/api/teams/:id/check-in", requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const index = teams.findIndex(
        (t) => t.id.toLowerCase() === id.toLowerCase() || (t.regNumber || "").toLowerCase() === id.toLowerCase() || t.leaderEmail.toLowerCase() === id.toLowerCase()
      );
      if (index === -1) {
        return res.status(404).json({ success: false, error: `Team with ID/Pass "${id}" not found.` });
      }
      const team = teams[index];
      const entryTime = (/* @__PURE__ */ new Date()).toISOString();
      team.status = "Checked-In";
      team.members = team.members.map((m) => ({
        ...m,
        checkedIn: true,
        checkInTime: m.checkInTime || entryTime
      }));
      teams[index] = team;
      markDirty();
      console.log(`[GATE PASS SCANNED] Team ${team.id} (${team.teamName}) admitted to venue at ${entryTime}`);
      const safeTeam = sanitizeTeamForClient(team);
      res.json({
        success: true,
        team: safeTeam,
        message: `Team ${team.teamName} (${team.id}) successfully verified and admitted to KSSEM venue!`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/participant-login", (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ success: false, error: "Team credentials are required." });
      }
      const ip = getClientIp(req);
      const cleanId = String(identifier).trim().toLowerCase();
      const cleanPass = String(password).trim();
      const throttleCheck = checkParticipantLoginThrottle(cleanId, ip);
      if (throttleCheck.throttled) {
        return res.status(429).json({
          success: false,
          error: `Too many failed login attempts. Please try again in ${throttleCheck.waitSeconds} seconds.`
        });
      }
      const team = teams.find(
        (t) => t.id.toLowerCase() === cleanId || t.regNumber && t.regNumber.toLowerCase() === cleanId || t.teamName && t.teamName.toLowerCase() === cleanId || t.leaderEmail && t.leaderEmail.toLowerCase() === cleanId || t.members.some(
          (m) => m.email && m.email.toLowerCase() === cleanId || m.usn && m.usn.toLowerCase() === cleanId || m.fullName && m.fullName.toLowerCase() === cleanId
        )
      );
      if (!team) {
        const delaySeconds = recordParticipantLoginFailure(cleanId, ip);
        if (delaySeconds > 0) {
          return res.status(429).json({
            success: false,
            error: `Too many failed login attempts. Please try again in ${delaySeconds} seconds.`
          });
        }
        return res.status(401).json({ success: false, error: "Invalid credentials." });
      }
      const storedHash = team.accessPassword || "";
      const passMatches = verifyPassword(cleanPass, storedHash);
      if (!passMatches) {
        const delaySeconds = recordParticipantLoginFailure(cleanId, ip);
        if (delaySeconds > 0) {
          return res.status(429).json({
            success: false,
            error: `Too many failed login attempts. Please try again in ${delaySeconds} seconds.`
          });
        }
        return res.status(401).json({ success: false, error: "Invalid credentials." });
      }
      clearParticipantLoginFailure(cleanId, ip);
      const sid = createSession({
        id: team.id,
        type: "participant",
        role: "PARTICIPANT",
        teamId: team.id,
        email: team.leaderEmail,
        name: team.teamName
      });
      setAuthCookie(res, sid);
      const safeTeam = sanitizeTeamForClient(team);
      res.json({
        success: true,
        team: safeTeam,
        message: `Welcome back, Team ${team.teamName}!`
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/participant/request-password-reset", async (req, res) => {
    const genericMessage = "If the team exists and its leader email is eligible, a password reset message has been sent.";
    const identifier = String(req.body?.identifier || "").trim().toLowerCase();
    if (!identifier) return res.json({ success: true, message: genericMessage });
    const team = teams.find(
      (candidate) => candidate.id.toLowerCase() === identifier || (candidate.regNumber || "").toLowerCase() === identifier
    );
    if (!team || !team.leaderEmail) return res.json({ success: true, message: genericMessage });
    try {
      if (!getSmtpConfig().configured) return res.json({ success: true, message: genericMessage });
      for (const [hash, record] of passwordResetTokens.entries()) {
        if (record.expiresAt <= Date.now()) passwordResetTokens.delete(hash);
      }
      const { rawToken, tokenHash } = generatePasswordResetToken();
      const resetUrl = new URL("/participant", `${req.protocol}://${req.get("host")}`);
      resetUrl.searchParams.set("resetToken", rawToken);
      await sendPortalResetEmail(team, resetUrl.toString());
      passwordResetTokens.set(tokenHash, { teamId: team.id, expiresAt: Date.now() + PASSWORD_RESET_TTL_MS });
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actorEmail: "participant-password-reset",
        actorRole: "ADMIN",
        action: "participant_password_reset_requested",
        target: team.id,
        reason: "Password reset requested through the participant portal.",
        ipAddress: getClientIp(req)
      });
      return res.json({ success: true, message: genericMessage });
    } catch (error) {
      console.error(`[PASSWORD RESET EMAIL] Delivery failed for team ${team.id}.`);
      return res.json({ success: true, message: genericMessage });
    }
  });
  app.post("/api/participant/reset-password", (req, res) => {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");
    if (!token || newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, error: "The reset link is invalid or the new password is not acceptable." });
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const tokenRecord = passwordResetTokens.get(tokenHash);
    if (!tokenRecord || tokenRecord.expiresAt <= Date.now()) {
      passwordResetTokens.delete(tokenHash);
      return res.status(400).json({ success: false, error: "The reset link is invalid or expired." });
    }
    const team = teams.find((candidate) => candidate.id === tokenRecord.teamId);
    if (!team) {
      passwordResetTokens.delete(tokenHash);
      return res.status(400).json({ success: false, error: "The reset link is invalid or expired." });
    }
    const previousHash = team.accessPassword;
    team.accessPassword = hashPassword(newPassword);
    try {
      if (!persistNow()) {
        team.accessPassword = previousHash;
        return res.status(500).json({ success: false, error: "The password could not be reset right now." });
      }
      passwordResetTokens.delete(tokenHash);
      for (const [sessionId, session] of sessionStore.entries()) {
        if (session.user.type === "participant" && session.user.teamId === team.id) sessionStore.delete(sessionId);
      }
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actorEmail: "participant-password-reset",
        actorRole: "ADMIN",
        action: "participant_password_reset_completed",
        target: team.id,
        reason: "Password reset completed through a single-use leader email token.",
        ipAddress: getClientIp(req)
      });
      persistNow();
      return res.json({ success: true, message: "Your team portal password has been reset. You can now sign in." });
    } catch (error) {
      team.accessPassword = previousHash;
      persistNow();
      return res.status(500).json({ success: false, error: "The password could not be reset right now." });
    }
  });
  app.post("/api/register", async (req, res) => {
    const idempotencyKey = req.headers["idempotency-key"] ? String(req.headers["idempotency-key"]).trim() : null;
    if (idempotencyKey) {
      const cached = idempotencyStore.get(idempotencyKey);
      if (cached && Date.now() < cached.expiresAt) {
        return res.status(cached.status).json(cached.body);
      }
    }
    try {
      if (cmsConfig.freezeRegistrations || !cmsConfig.registrationOpen) {
        return res.status(403).json({
          success: false,
          error: "Registrations are currently frozen by the Administrator. New team submissions are temporarily paused."
        });
      }
      const result = await withRegistrationLock(async () => {
        const productionConflict = await findProductionDuplicate({
          teamName: req.body?.teamName,
          participants: [req.body?.leader, ...Array.isArray(req.body?.members) ? req.body.members : []]
        });
        if (productionConflict) {
          return {
            status: 409,
            body: {
              success: false,
              error: productionConflict.code,
              field: productionConflict.code === "TEAM_NAME_EXISTS" ? "teamName" : productionConflict.code,
              message: `The ${productionConflict.code.replace("_EXISTS", "").toLowerCase()} is already registered.`
            }
          };
        }
        const teamValidation = validateTeamRegistration(req.body);
        if (!teamValidation.valid) {
          if (teamValidation.isDuplicate) {
            const body = {
              success: false,
              error: "duplicate_registration",
              message: teamValidation.message || "This detail is already registered."
            };
            if (teamValidation.field) {
              body.field = teamValidation.field;
            }
            if (teamValidation.fields) {
              body.fields = teamValidation.fields;
            }
            return { status: 409, body };
          }
          return { status: 400, body: { success: false, error: teamValidation.error } };
        }
        const { teamName, domain, preferredTrack, leader, members = [], paymentUtr, paymentUtrConfirm, paymentScreenshot } = req.body;
        const selectedDomain = typeof domain === "string" && domain.trim() ? domain.trim() : preferredTrack;
        const utrValidation = validatePaymentUtr(paymentUtr, paymentUtrConfirm);
        if (!utrValidation.valid) {
          return { status: 400, body: { success: false, error: utrValidation.error } };
        }
        const cleanUtr = utrValidation.cleanUtr;
        if (!paymentScreenshot || String(paymentScreenshot).trim() === "") {
          return {
            status: 400,
            body: {
              success: false,
              error: "Payment screenshot is required. Please upload a screenshot of your successful PhonePe transaction before registering."
            }
          };
        }
        const teamIndex = ++nextTeamNumber;
        const teamId = `AN-${String(teamIndex).padStart(3, "0")}`;
        const genderAllowed = /* @__PURE__ */ new Set(["Male", "Female", "Other", "Prefer not to say"]);
        const leaderGender = typeof leader.gender === "string" && genderAllowed.has(leader.gender) ? leader.gender : "";
        if (!leaderGender) {
          return { status: 400, body: { success: false, error: "Lead participant gender is required." } };
        }
        const leaderParticipant = {
          id: `p-${teamIndex}-1`,
          fullName: sanitizeInputString(leader.fullName),
          college: sanitizeInputString(leader.college || ""),
          state: sanitizeInputString(leader.state || ""),
          email: sanitizeInputString(leader.email.trim().toLowerCase()),
          phone: sanitizeInputString(leader.phone || ""),
          usn: sanitizeInputString(leader.usn.trim().toUpperCase()),
          gender: leaderGender,
          role: "Leader",
          teamId,
          accommodationRequired: !!leader.accommodationRequired,
          checkedIn: false,
          foodCouponsClaimed: { lunch1: false, dinner1: false, midnightSnack: false, breakfast2: false, lunch2: false }
        };
        const formattedMembers = members.map((m, idx) => {
          const memberGender = typeof m.gender === "string" && genderAllowed.has(m.gender) ? m.gender : "";
          if (!memberGender) {
            throw new Error(`Member #${idx + 2} gender is required.`);
          }
          return {
            id: `p-${teamIndex}-${idx + 2}`,
            fullName: sanitizeInputString(m.fullName),
            college: sanitizeInputString(m.college || ""),
            state: sanitizeInputString(m.state || ""),
            email: sanitizeInputString(m.email.trim().toLowerCase()),
            phone: sanitizeInputString(m.phone || ""),
            usn: sanitizeInputString(m.usn.trim().toUpperCase()),
            gender: memberGender,
            role: "Member",
            teamId,
            accommodationRequired: !!m.accommodationRequired,
            checkedIn: false,
            foodCouponsClaimed: { lunch1: false, dinner1: false, midnightSnack: false, breakfast2: false, lunch2: false }
          };
        });
        const accessPassword = generatePortalPassword();
        const newTeam = {
          id: teamId,
          teamName: sanitizeInputString(teamName),
          leaderEmail: sanitizeInputString(leader.email.trim().toLowerCase()),
          accessPassword: hashPassword(accessPassword),
          portalPasswordPlain: accessPassword,
          domain: sanitizeInputString(selectedDomain),
          preferredTrack: sanitizeInputString(selectedDomain),
          members: [leaderParticipant, ...formattedMembers],
          status: "PENDING_PAYMENT_AUDIT",
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          projectSubmitted: false,
          paymentUtr: cleanUtr,
          paymentStatus: "PENDING_PAYMENT_AUDIT",
          paymentAmountDetail: `Pending admin payment audit for ${cmsConfig.registrationFee || 0} INR`,
          paymentScreenshot: paymentScreenshot || null,
          credentialDeliveryStatus: "queued",
          approvalStatus: "PENDING",
          approvalTimestamp: "",
          approvalEmailStatus: "PENDING",
          approvalEmailSentAt: ""
        };
        if (productionStoreEnabled) {
          try {
            await saveProductionTeam(newTeam);
          } catch (storageError) {
            console.error("[DATABASE] Production registration write failed:", storageError?.message || storageError);
            if (storageError?.code === "23505") {
              const constraint = String(storageError?.constraint || "");
              const code = constraint.includes("team_name") ? "TEAM_NAME_EXISTS" : constraint.includes("email") ? "EMAIL_EXISTS" : constraint.includes("usn") ? "USN_EXISTS" : "PHONE_EXISTS";
              return {
                status: 409,
                body: {
                  success: false,
                  error: code,
                  field: code === "TEAM_NAME_EXISTS" ? "teamName" : code,
                  message: `The ${code.replace("_EXISTS", "").toLowerCase()} is already registered.`
                }
              };
            }
            return {
              status: 503,
              body: {
                success: false,
                error: "Production registration storage is temporarily unavailable. Please retry."
              }
            };
          }
        }
        teams.push(newTeam);
        rebuildUniquenessIndexes();
        markDirty();
        try {
          await appendParticipantRegistrationBackup(newTeam);
          await syncParticipantBackupToGitHub(newTeam);
        } catch (backupError) {
          console.error(`[BACKUP] Team ${newTeam.id} was registered, but CSV backup update failed:`, backupError);
        }
        const allTeamEmails = [
          { email: leader.email, name: leader.fullName, role: "Leader" },
          ...members.filter((m) => m.email).map((m) => ({ email: m.email, name: m.fullName, role: "Member" }))
        ];
        const totalParticipants = teams.reduce((acc, t) => acc + t.members.length, 0);
        const uniqueColleges = new Set(teams.flatMap((t) => t.members.map((m) => m.college))).size;
        const totalCapacity = cmsConfig.maxRegistrations || 350;
        const seatsLeft = Math.max(0, totalCapacity - totalParticipants);
        const registrationTeam = sanitizeTeamForClient(newTeam);
        const responseBody = {
          success: true,
          team: registrationTeam,
          message: "Please wait for the admin's approval. Keep yourself updated by regularly checking your Gmail for further updates.",
          emailDispatched: false,
          emailRecipients: allTeamEmails.map((e) => e.email),
          stats: {
            registeredCount: totalParticipants,
            collegesCount: uniqueColleges,
            seatsLeft,
            totalSeats: totalCapacity,
            totalTeams: teams.length
          }
        };
        return { status: 201, body: responseBody };
      });
      if (idempotencyKey) {
        idempotencyStore.set(idempotencyKey, {
          status: result.status,
          body: result.body,
          expiresAt: Date.now() + 5 * 60 * 1e3
        });
      }
      res.status(result.status).json(result.body);
    } catch (err) {
      console.error("[REGISTRATION ERROR]", err);
      res.status(500).json({ success: false, error: err.message || "An unexpected error occurred during registration." });
    }
  });
  app.post("/api/registration/:teamId/deliver-credentials", requireAdmin, async (req, res) => {
    try {
      const { teamId } = req.params;
      const team = teams.find((t) => t.id.toLowerCase() === teamId.toLowerCase() || (t.regNumber || "").toLowerCase() === teamId.toLowerCase());
      if (!team) {
        return res.status(404).json({ success: false, error: `Team ${teamId} not found.` });
      }
      const report = await deliverCredentialsForTeam(team);
      res.json({
        success: report.success,
        deliveredCount: report.deliveredCount,
        failedCount: report.failedCount,
        recipients: report.results.map((r) => r.recipient),
        emailRecipients: report.results,
        transport: getSmtpConfig().configured ? "SMTP" : "LOCAL",
        smtpConfigured: getSmtpConfig().configured
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/registration/:teamId/deliver-credentials/retry", requireAdmin, async (req, res) => {
    try {
      const { teamId } = req.params;
      const team = teams.find((t) => t.id.toLowerCase() === teamId.toLowerCase() || (t.regNumber || "").toLowerCase() === teamId.toLowerCase());
      if (!team) {
        return res.status(404).json({ success: false, error: `Team ${teamId} not found.` });
      }
      const report = await deliverCredentialsForTeam(team);
      res.json({
        success: report.success,
        deliveredCount: report.deliveredCount,
        failedCount: report.failedCount,
        recipients: report.results.map((r) => r.recipient),
        emailRecipients: report.results,
        transport: getSmtpConfig().configured ? "SMTP" : "LOCAL",
        smtpConfigured: getSmtpConfig().configured
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/verify-payment", async (req, res) => {
    try {
      const { utr, paymentScreenshot } = req.body;
      const cleanUtr = utr ? String(utr).trim() : "";
      const validUtrPattern = /^[0-9]{12}$/;
      const screenshotMatch = typeof paymentScreenshot === "string" ? paymentScreenshot.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/i) : null;
      if (!screenshotMatch) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: "Payment verification failed: the uploaded proof is missing or is not a supported PNG, JPG, GIF, or WebP image."
        });
      }
      const screenshotBytes = Buffer.from(screenshotMatch[2], "base64");
      if (screenshotBytes.length === 0 || screenshotBytes.length > 8 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: "Payment verification failed: the screenshot must be under 8 MB and contain image data."
        });
      }
      const isPng = screenshotBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpeg = screenshotBytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
      const isGif = screenshotBytes.subarray(0, 3).toString("ascii") === "GIF";
      const isWebp = screenshotBytes.subarray(0, 4).toString("ascii") === "RIFF" && screenshotBytes.subarray(8, 12).toString("ascii") === "WEBP";
      if (!isPng && !isJpeg && !isGif && !isWebp) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: "Payment verification failed: the uploaded file does not contain valid image data."
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
          error: "Invalid transaction ID. Enter exactly 12 digits with no spaces or letters."
        });
      }
      let proofText = "";
      try {
        proofText = await readPaymentProofText(screenshotBytes);
        console.log("[PAYMENT OCR DEBUG] Extracted text:", JSON.stringify(proofText));
      } catch (ocrError) {
        console.error("[PAYMENT OCR] Could not read payment screenshot:", ocrError?.message || ocrError);
        return res.status(503).json({
          success: false,
          verified: false,
          error: "Payment proof could not be read right now. Please retry once the verification service is available."
        });
      }
      if (!ocrContainsTransactionId(proofText, cleanUtr)) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: "The uploaded payment screenshot does not contain the exact 12-digit transaction ID you entered. Please upload the receipt for this transaction."
        });
      }
      res.json({
        success: true,
        verified: true,
        utr: cleanUtr,
        beneficiary: `ANVATION 2026 (${PAYMENT_UPI_ID})`,
        verifiedAt: (/* @__PURE__ */ new Date()).toISOString(),
        message: "Payment proof OCR matched the exact transaction ID. Final settlement must still be confirmed by the admin desk."
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/payment-listener", (req, res) => {
    try {
      const { upiId } = req.query;
      const ref = `UPI${Date.now().toString().slice(-8)}${Math.floor(1e3 + Math.random() * 9e3)}`;
      res.json({
        success: true,
        listenerActive: true,
        targetUpi: upiId || PAYMENT_UPI_ID,
        amount: String(cmsConfig.registrationFee),
        suggestedUtr: ref,
        status: "WAITING_FOR_USER_CONFIRMATION"
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.post("/api/send-registration-email", async (req, res) => {
    try {
      const { teamId, email, emails, teamName, domain, track, password, participants } = req.body;
      const participantList = Array.isArray(participants) && participants.length > 0 ? participants.map((p) => ({
        email: String(p && p.email || "").trim(),
        name: p && p.name || "",
        college: p && p.college || "Not specified",
        role: p && p.role || "Member"
      })) : [];
      const recipientList = participantList.length > 0 ? participantList.map((p) => p.email).filter(Boolean) : emails && Array.isArray(emails) ? emails : email ? [email] : [];
      if (recipientList.length === 0) {
        return res.status(400).json({ success: false, error: "At least one recipient email is required" });
      }
      const to = recipientList.join(", ");
      const subject = `Registration Confirmed: ANVATION 2026 [Team ID: ${teamId}]`;
      const dateStr = (/* @__PURE__ */ new Date()).toUTCString();
      let gateQr = "";
      let gateQrBuffer = null;
      try {
        gateQr = await QRCode.toDataURL(String(teamId || "AN-000"), { width: 220, margin: 1, errorCorrectionLevel: "H", color: { dark: "#0B192C", light: "#FFFFFF" } });
        gateQrBuffer = await QRCode.toBuffer(String(teamId || "AN-000"), { width: 220, margin: 1, errorCorrectionLevel: "H", color: { dark: "#0B192C", light: "#FFFFFF" } });
      } catch (e) {
      }
      const venue = "K.S. School of Engineering & Management (KSSEM), Kanakapura Road, Bengaluru - 560109";
      const dates = "October 8 - October 9, 2026 (24-Hour Hackathon)";
      const htmlR = `ANVATION 2026 - Registration Confirmed
Team ID: ${teamId}
Domain: ${domain || track || ""}
Team Name: ${teamName}
Portal Password: ${password}
Venue: ${venue}
Dates: ${dates}
Use your Team ID and Password (or Leader email) to log into the Participant Portal. Present the Gate Entry Pass QR at the entrance.`;
      const membersRows = (participantList.length > 0 ? participantList : recipientList.map((e) => ({ email: e, name: "", college: "Not specified", role: "Participant" }))).map((p) => `<tr><td style="padding:5px 8px;border:1px solid #e2e8f0;font-family:monospace;font-size:12px;color:#334155;">${p.email}</td><td style="padding:5px 8px;border:1px solid #e2e8f0;font-size:12px;color:#334155;">${p.college}</td><td style="padding:5px 8px;border:1px solid #e2e8f0;font-size:12px;color:#334155;">${p.role}</td></tr>`).join("");
      const qrImgForEml = gateQr ? `<img src="${gateQr}" style="width:180px;height:180px;" />` : `<span>Show your Team ID at the gate scanner.</span>`;
      const qrImgForMail = gateQr ? `<img src="cid:gate-pass-qr" style="width:180px;height:180px;" />` : `<span>Show your Team ID at the gate scanner.</span>`;
      const htmlOpen = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;color:#0f172a;">
<div style="background:#0b192c;color:#fff;padding:22px 26px;"><div style="font-size:22px;font-weight:800;letter-spacing:1px;">ANVATION 2026</div><div style="font-size:12px;color:#67e8f9;">NATIONAL LEVEL 24-HOUR HACKATHON</div></div>
<div style="padding:24px 26px;line-height:1.6;"><h2 style="margin-top:0;">Registration Confirmed \u2713</h2>
<p>Congratulations! Your team's registration for <strong>ANVATION 2026</strong> has been confirmed.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;">`;
      const htmlRows = `<tr><td style="padding:6px 0;color:#475569;">Team ID</td><td style="padding:6px 0;font-weight:bold;font-family:monospace;color:#0284c7;">${teamId}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Domain</td><td style="padding:6px 0;font-weight:bold;">${domain || track || ""}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Team Name</td><td style="padding:6px 0;font-weight:bold;">${teamName}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Portal Password</td><td style="padding:6px 0;font-weight:bold;font-family:monospace;color:#7e22ce;">${password}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Venue</td><td style="padding:6px 0;font-weight:bold;">${venue}</td></tr>
<tr><td style="padding:6px 0;color:#475569;">Dates</td><td style="padding:6px 0;font-weight:bold;">${dates}</td></tr></table>
<div style="margin-top:14px;"><div style="font-weight:800;color:#0b192c;margin-bottom:6px;">Registered Participants &amp; College</div>
<table style="width:100%;border-collapse:collapse;font-size:12px;"><tr><th style="padding:5px 8px;border:1px solid #e2e8f0;background:#f1f5f9;text-align:left;">Email</th><th style="padding:5px 8px;border:1px solid #e2e8f0;background:#f1f5f9;text-align:left;">College</th><th style="padding:5px 8px;border:1px solid #e2e8f0;background:#f1f5f9;text-align:left;">Role</th></tr>${membersRows}</table></div>
<div style="margin-top:18px;padding:14px;border:1px dashed #0284c7;border-radius:10px;text-align:center;background:#f0f9ff;"><div style="font-weight:800;color:#0b7490;margin-bottom:8px;">GATE ENTRY PASS</div>${qrImgForEml}<div style="font-size:11px;color:#475569;margin-top:6px;">Present this QR and your college ID at the KSSEM Gate Check-in desk on ${dates}.</div></div>
</div>
<div style="background:#f1f5f9;padding:14px 26px;font-size:12px;color:#64748b;">For any help, write to anvation2026@kssem.edu.in \xB7 Generated ${(/* @__PURE__ */ new Date()).toLocaleString()}</div>
</div>`;
      const htmlFull = htmlOpen + htmlRows;
      const htmlMail = htmlOpen + htmlRows.replace(`GATE ENTRY PASS</div>${qrImgForEml}`, `GATE ENTRY PASS</div>${qrImgForMail}`);
      const eml = [`From: "ANVATION 2026" <noreply@anvation.local>`, `To: ${to}`, `Subject: ${subject}`, `Date: ${dateStr}`, `MIME-Version: 1.0`, `Content-Type: text/html; charset=UTF-8`, "", `${htmlFull}`].join("\r\n");
      const smtp = getSmtpConfig();
      const smtpHost = process.env.SMTP_HOST;
      const smtpConfigured = smtp.configured;
      let delivered = 0, failed = 0;
      let smtpError = "";
      const emailRecipients = [];
      if (smtp.configured && smtpHost) {
        const transporter = nodemailer.createTransport({ host: smtpHost, port: Number(process.env.SMTP_PORT), secure: process.env.SMTP_SECURE === "true", auth: { user: String(process.env.SMTP_USER), pass: String(process.env.SMTP_PASS) } });
        const from = String(process.env.MAIL_FROM);
        try {
          await transporter.verify();
        } catch (verifyErr) {
          smtpError = String(verifyErr && verifyErr.message || verifyErr);
          console.error(`[EMAIL] SMTP verification failed: ${smtpError}`);
        }
        if (smtpError) {
          emailRecipients.push(...recipientList.map((r) => ({ recipient: r, status: "FAILED" })));
          failed = recipientList.length;
          return res.json({ success: false, smtpConfigured: true, deliveredCount: 0, failedCount: failed, recipients: recipientList, emailRecipients, transport: "SMTP", gatewayMessage: "Email delivery is temporarily unavailable. The downloadable .eml fallback is available.", subject, eml });
        }
        for (const recipient of recipientList) {
          try {
            const info = await transporter.sendMail({
              from,
              to: recipient,
              subject,
              text: htmlR,
              html: htmlMail,
              attachments: gateQrBuffer ? [{
                filename: "gate-pass-qr.png",
                content: gateQrBuffer,
                cid: "gate-pass-qr",
                contentType: "image/png"
              }] : void 0
            });
            delivered++;
            emailRecipients.push({ recipient, status: "SENT" });
            console.log(`[EMAIL SENT] To: ${recipient} | Team: ${teamId} | ${info.messageId}`);
          } catch (mailErr) {
            failed++;
            emailRecipients.push({ recipient, status: "FAILED" });
            console.error(`[EMAIL FAILED] To: ${recipient} | Team: ${teamId} | ${mailErr.message}`);
          }
        }
        res.json({ success: delivered > 0, deliveredCount: delivered, failedCount: failed, recipients: recipientList, emailRecipients, transport: "SMTP", gatewayMessage: delivered > 0 ? "Confirmation emails sent to all participants." : failed === recipientList.length ? "SMTP is configured but delivery failed \u2014 double-check SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS." : "Some emails could not be delivered.", subject, eml, smtpConfigured });
      } else {
        console.warn(`[EMAIL] SMTP incomplete (${smtp.missing.join(", ")}) \u2014 real mail was NOT delivered. Generated local .eml fallback for team ${teamId}.`);
        res.json({ success: true, message: "SMTP is not fully configured, so real emails were not sent. A downloadable .eml was generated as a fallback.", recipients: recipientList, emailRecipients: recipientList.map((r) => ({ recipient: r, status: "READY" })), deliveredCount: 0, failedCount: 0, subject, eml, smtpConfigured: false });
      }
    } catch (err) {
      console.error("[EMAIL ERROR]", err);
      res.status(500).json({ success: false, error: "Email delivery could not be completed." });
    }
  });
  app.put("/api/teams/:id", requireAdmin, (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const index = teams.findIndex((t) => t.id.toLowerCase() === id.toLowerCase() || (t.regNumber || "").toLowerCase() === id.toLowerCase());
      if (index === -1) {
        return res.status(404).json({ success: false, error: "Team not found" });
      }
      const existingTeam = teams[index];
      const updatedTeam = {
        ...existingTeam,
        ...updateData,
        id: existingTeam.id,
        // Preserve immutable ID
        regNumber: existingTeam.regNumber,
        members: updateData.members ? updateData.members : existingTeam.members,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      if (updateData.domain || updateData.preferredTrack) {
        updatedTeam.domain = String(updateData.domain || updateData.preferredTrack);
        updatedTeam.preferredTrack = updatedTeam.domain;
      }
      if (updatedTeam.members && updatedTeam.members.length > 0) {
        const leader = updatedTeam.members.find((m) => m.role === "Leader") || updatedTeam.members[0];
        if (leader?.email) {
          updatedTeam.leaderEmail = leader.email;
        }
      }
      teams[index] = updatedTeam;
      rebuildUniquenessIndexes();
      markDirty();
      res.json({ success: true, team: sanitizeTeamForClient(updatedTeam), message: "Team updated successfully" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.put("/api/participant/profile", requireAuth, (req, res) => {
    try {
      const teamId = String(req.session?.teamId || "").trim();
      const index = teams.findIndex((team) => team.id.toLowerCase() === teamId.toLowerCase());
      if (!teamId || index === -1) return res.status(404).json({ success: false, error: "Participant team not found." });
      const submittedMembers = Array.isArray(req.body?.members) ? req.body.members : [];
      const existingTeam = teams[index];
      const submittedById = new Map(submittedMembers.map((member) => [String(member.id), member]));
      const profileFields = ["college", "state", "accommodationRequired"];
      const updatedTeam = {
        ...existingTeam,
        members: existingTeam.members.map((member) => {
          const submitted = submittedById.get(member.id);
          if (!submitted) return member;
          const profile = Object.fromEntries(profileFields.filter((field) => field in submitted).map((field) => [field, field === "accommodationRequired" ? !!submitted[field] : sanitizeInputString(submitted[field])]));
          return { ...member, ...profile };
        })
      };
      teams[index] = updatedTeam;
      markDirty();
      res.json({ success: true, team: sanitizeTeamForClient(updatedTeam) });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  app.post("/api/admin/teams/:teamId/reset-password", requireRole(["ADMIN", "REGISTRATION_MANAGER", "SUPER_ADMIN"]), (req, res) => {
    const teamId = String(req.params.teamId || "").trim();
    const index = teams.findIndex(
      (team) => team.id.toLowerCase() === teamId.toLowerCase() || (team.regNumber || "").toLowerCase() === teamId.toLowerCase()
    );
    if (index === -1) {
      return res.status(404).json({ success: false, error: "Team not found." });
    }
    const previousTeam = teams[index];
    const temporaryPassword = generatePortalPassword();
    teams[index] = { ...previousTeam, accessPassword: hashPassword(temporaryPassword) };
    try {
      rebuildUniquenessIndexes();
      if (!persistNow()) {
        teams[index] = previousTeam;
        rebuildUniquenessIndexes();
        return res.status(500).json({ success: false, error: "Password reset could not be persisted." });
      }
      for (const [sessionId, session] of sessionStore.entries()) {
        if (session.user.type === "participant" && session.user.teamId === previousTeam.id) {
          sessionStore.delete(sessionId);
        }
      }
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actorEmail: req.session?.email || req.session?.username || "unknown-admin",
        actorRole: req.session?.role || "ADMIN",
        action: "participant_password_reset",
        target: previousTeam.id,
        reason: "Portal password reissued by authorized administrator.",
        ipAddress: getClientIp(req)
      });
      persistNow();
      return res.json({
        success: true,
        message: "Portal password reset successfully.",
        participantId: previousTeam.id,
        temporaryPassword
      });
    } catch (error) {
      teams[index] = previousTeam;
      rebuildUniquenessIndexes();
      return res.status(500).json({ success: false, error: "Password reset failed." });
    }
  });
  app.delete("/api/teams/:id", requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const initialLen = teams.length;
    teams = teams.filter((t) => t.id.toLowerCase() !== id.toLowerCase() && (t.regNumber || "").toLowerCase() !== id.toLowerCase());
    if (teams.length === initialLen) {
      return res.status(404).json({ success: false, error: "Team not found" });
    }
    rebuildUniquenessIndexes();
    res.json({ success: true, message: "Team deleted successfully" });
    markDirty();
  });
  app.put("/api/participants/:id", requireAdmin, (req, res) => {
    const { id } = req.params;
    const participantData = req.body;
    let found = false;
    for (const team of teams) {
      const memberIndex = team.members.findIndex((m) => m.id === id || m.usn.toLowerCase() === id.toLowerCase());
      if (memberIndex !== -1) {
        team.members[memberIndex] = {
          ...team.members[memberIndex],
          ...participantData
        };
        rebuildUniquenessIndexes();
        markDirty();
        found = true;
        return res.json({ success: true, participant: team.members[memberIndex], message: "Participant updated successfully" });
      }
    }
    if (!found) {
      res.status(404).json({ success: false, error: "Participant not found" });
    }
  });
  app.post("/api/checkin", requireAdmin, (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, error: "Query required" });
    const cleanQuery = query.trim().toUpperCase();
    const team = teams.find(
      (t) => t.id.toUpperCase() === cleanQuery || (t.regNumber || "").toUpperCase() === cleanQuery || t.members.some((m) => m.usn.toUpperCase() === cleanQuery || m.email.toUpperCase() === cleanQuery)
    );
    if (!team) {
      return res.status(404).json({ success: false, error: "Participant or Team not found" });
    }
    team.status = "Checked-In";
    team.members.forEach((m) => {
      m.checkedIn = true;
      m.checkInTime = (/* @__PURE__ */ new Date()).toISOString();
    });
    res.json({ success: true, team, message: `Team ${team.teamName} successfully checked in at KSSEM venue!` });
  });
  app.post("/api/food-coupon/claim", requireAdmin, (req, res) => {
    const { teamId, usn, mealKey } = req.body;
    const team = teams.find((t) => t.id === teamId);
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });
    const member = team.members.find((m) => m.usn === usn || m.id === usn);
    if (!member) return res.status(404).json({ success: false, error: "Member not found" });
    if (!member.foodCouponsClaimed) {
      member.foodCouponsClaimed = { lunch1: false, dinner1: false, midnightSnack: false, breakfast2: false, lunch2: false };
    }
    if (member.foodCouponsClaimed[mealKey]) {
      return res.status(400).json({ success: false, error: `Coupon for ${mealKey} already claimed!` });
    }
    member.foodCouponsClaimed[mealKey] = true;
    res.json({ success: true, member, message: `Coupon for ${mealKey} verified and redeemed!` });
  });
  app.get("/api/submissions", (req, res) => {
    res.json({ success: true, submissions });
  });
  app.post("/api/submit-project", requireTeamAccess, (req, res) => {
    try {
      const { teamId, projectTitle, problemStatement, technologyStack, architectureOverview, githubLink, demoVideoUrl, pptUrl, pdfDocUrl, futureScope, track } = req.body;
      if (!teamId || !projectTitle || !githubLink) {
        return res.status(400).json({ success: false, error: "Missing required submission fields" });
      }
      if (githubLink && !isValidSafeUrl(githubLink)) {
        return res.status(400).json({ success: false, error: "Invalid or unsafe GitHub URL provided." });
      }
      if (demoVideoUrl && !isValidSafeUrl(demoVideoUrl)) {
        return res.status(400).json({ success: false, error: "Invalid or unsafe Demo Video URL provided." });
      }
      if (pptUrl && !isValidSafeUrl(pptUrl)) {
        return res.status(400).json({ success: false, error: "Invalid or unsafe Presentation URL provided." });
      }
      if (pdfDocUrl && !isValidSafeUrl(pdfDocUrl)) {
        return res.status(400).json({ success: false, error: "Invalid or unsafe PDF Document URL provided." });
      }
      if (req.session?.teamId && teamId && String(teamId).toLowerCase() !== String(req.session.teamId).toLowerCase()) {
        return res.status(403).json({ success: false, error: "Forbidden: team access denied." });
      }
      const team = teams.find((t) => t.id === teamId);
      const teamName = team ? team.teamName : "Team " + teamId;
      const newSubmission = {
        id: `sub-${Date.now()}`,
        teamId,
        teamName,
        track: track || (team ? team.preferredTrack : "Artificial Intelligence & Machine Learning"),
        projectTitle,
        problemStatement,
        technologyStack: Array.isArray(technologyStack) ? technologyStack : (technologyStack || "").split(",").map((s) => s.trim()),
        architectureOverview,
        githubLink,
        demoVideoUrl,
        pptUrl,
        pdfDocUrl,
        futureScope,
        submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
        evaluated: false
      };
      const existingIdx = submissions.findIndex((s) => s.teamId === teamId);
      if (existingIdx >= 0) {
        submissions[existingIdx] = newSubmission;
      } else {
        submissions.push(newSubmission);
      }
      markDirty();
      if (team) {
        team.projectSubmitted = true;
        team.status = "Submitted";
      }
      res.json({ success: true, submission: newSubmission });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.get("/api/scorecards", (req, res) => {
    res.json({ success: true, scorecards });
  });
  app.post("/api/scorecards", requireAdmin, (req, res) => {
    try {
      const { submissionId, teamId, judgeName, innovation = 0, impact = 0, technicalComplexity = 0, presentation = 0, uiUx = 0, scalability = 0, originality = 0, bonusPoints = 0, penalty = 0, feedback } = req.body;
      const totalScore = Math.max(0, Number(innovation) + Number(impact) + Number(technicalComplexity) + Number(presentation) + Number(uiUx) + Number(scalability) + Number(originality) + Number(bonusPoints) - Number(penalty));
      const scorecard = {
        id: `sc-${Date.now()}`,
        submissionId,
        teamId,
        judgeName: judgeName || "Jury Panel",
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
        feedback: feedback || "Solid submission."
      };
      scorecards.push(scorecard);
      markDirty();
      const sub = submissions.find((s) => s.id === submissionId || s.teamId === teamId);
      if (sub) sub.evaluated = true;
      res.json({ success: true, scorecard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  let liveBroadcastAlert = {
    active: false,
    message: "Welcome to KSSEM ANVATION 1.0! All Checkpoint 1 reports due at 02:00 PM.",
    type: "info"
  };
  app.get("/api/announcements", (req, res) => {
    res.json({ success: true, announcements });
  });
  app.post("/api/announcements", requireAdmin, (req, res) => {
    const { title, content, category = "General", urgent } = req.body;
    if (!title || !content) return res.status(400).json({ success: false, error: "Title and content required" });
    const newAnn = {
      id: `ann-${Date.now()}`,
      title,
      content,
      category,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      urgent: !!urgent
    };
    announcements.unshift(newAnn);
    res.json({ success: true, announcement: newAnn });
  });
  app.post("/api/announcements/edit", requireAdmin, (req, res) => {
    const { id, title, content, category, urgent } = req.body;
    const ann = announcements.find((a) => a.id === id);
    if (!ann) return res.status(404).json({ success: false, error: "Announcement not found" });
    if (title) ann.title = title;
    if (content) ann.content = content;
    if (category) ann.category = category;
    if (urgent !== void 0) ann.urgent = !!urgent;
    res.json({ success: true, announcement: ann });
  });
  app.post("/api/announcements/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    announcements = announcements.filter((a) => a.id !== id);
    res.json({ success: true, message: "Announcement deleted" });
  });
  app.get("/api/sponsors", (req, res) => {
    res.json({ success: true, sponsors });
  });
  app.post("/api/sponsors", requireAdmin, (req, res) => {
    const { name, category = "Community", logo, website, description } = req.body;
    if (!name || !website) return res.status(400).json({ success: false, error: "Name and website are required" });
    const newSponsor = {
      id: `sp-${Date.now()}`,
      name,
      category,
      logo: logo || name,
      website,
      description: description || ""
    };
    sponsors.push(newSponsor);
    res.json({ success: true, sponsor: newSponsor });
  });
  app.post("/api/sponsors/edit", requireAdmin, (req, res) => {
    const { id, name, category, logo, website, description } = req.body;
    const sp = sponsors.find((s) => s.id === id);
    if (!sp) return res.status(404).json({ success: false, error: "Sponsor not found" });
    if (name) sp.name = name;
    if (category) sp.category = category;
    if (logo !== void 0) sp.logo = logo;
    if (website) sp.website = website;
    if (description !== void 0) sp.description = description;
    res.json({ success: true, sponsor: sp });
  });
  app.post("/api/sponsors/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    sponsors = sponsors.filter((s) => s.id !== id);
    res.json({ success: true, message: "Sponsor deleted" });
  });
  app.get("/api/broadcast-alert", (req, res) => {
    res.json({ success: true, alert: liveBroadcastAlert });
  });
  app.post("/api/broadcast-alert", requireAdmin, (req, res) => {
    const { active, message, type } = req.body;
    liveBroadcastAlert = {
      active: active !== void 0 ? active : true,
      message: message || liveBroadcastAlert.message,
      type: type || "info"
    };
    res.json({ success: true, alert: liveBroadcastAlert });
  });
  app.post("/api/teams/edit", requireAdmin, (req, res) => {
    const { id, teamName, preferredTrack, checkedIn, status } = req.body;
    const team = teams.find((t) => t.id === id);
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });
    if (teamName) team.teamName = teamName;
    if (preferredTrack) team.preferredTrack = preferredTrack;
    if (status) team.status = status;
    else if (checkedIn) team.status = "Checked-In";
    res.json({ success: true, team });
  });
  let auditLogs = [
    {
      id: "log-101",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "CMS Config Update",
      target: "Website CMS Settings",
      beforeValue: "Registration Open = true",
      afterValue: "Total Prize Pool = \u20B92,00,000+",
      reason: "Super Admin updated prize pool details",
      ipAddress: "192.168.1.10"
    },
    {
      id: "log-102",
      timestamp: new Date(Date.now() - 36e5).toISOString(),
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
  let adminUsers = [
    { id: "adm-1", email: "superadmin@kssem.edu.in", username: "superadmin", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Dr. K Venkata Rao", role: "SUPER_ADMIN", status: "Active", createdAt: "2026-08-01", twoFactorEnabled: true },
    { id: "adm-2", email: "regmanager@kssem.edu.in", username: "regmanager", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Prof. Rajesh Kumar", role: "REGISTRATION_MANAGER", status: "Active", createdAt: "2026-08-02", twoFactorEnabled: false },
    { id: "adm-3", email: "contentmanager@kssem.edu.in", username: "contentmanager", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Prof. Sneha V", role: "CONTENT_MANAGER", status: "Active", createdAt: "2026-08-03", twoFactorEnabled: true },
    { id: "adm-4", email: "judge1@bosch.com", username: "judge1", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Dr. Ramesh Kumar (Bosch)", role: "JUDGE", status: "Active", createdAt: "2026-08-04", twoFactorEnabled: false },
    { id: "adm-5", email: "checkin1@kssem.edu.in", username: "checkin1", password: hashPassword(DEFAULT_ADMIN_PASSWORD), name: "Volunteer Gate Staff 1", role: "CHECKIN_STAFF", status: "Active", createdAt: "2026-08-05", twoFactorEnabled: false }
  ];
  let checkpoints = [
    { id: "cp-1", number: 1, title: "Ideation & System Design", description: "Architecture, DB schema, UI wireframes, and API selection.", time: "02:00 PM (Day 1)", status: "Open" },
    { id: "cp-2", number: 2, title: "Core Prototype & API Integration", description: "Working code MVP, API endpoints, backend logic.", time: "10:00 PM (Day 1)", status: "Open" },
    { id: "cp-3", number: 3, title: "Final Pitch Deck & Live Demo", description: "Completed Github repo, video recording, and slides.", time: "07:00 AM (Day 2)", status: "Open" }
  ];
  const DATA_FILE = path.join(DATA_DIRECTORY, "server-data.json");
  let dirtyTimer = null;
  const loadPersisted = () => {
    try {
      fs.mkdirSync(DATA_DIRECTORY, { recursive: true, mode: 448 });
      if (!fs.existsSync(DATA_FILE)) return;
      const saved = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
      if (Array.isArray(saved.teams)) {
        teams = saved.teams.map((team) => ({
          ...team,
          accessPassword: normalizeStoredPassword(team.accessPassword)
        }));
      }
      if (Array.isArray(saved.adminUsers)) {
        const savedMap = new Map(saved.adminUsers.map((u) => [u.id, u]));
        const mergedUsers = [];
        for (const defaultUser of adminUsers) {
          if (savedMap.has(defaultUser.id)) {
            const savedU = savedMap.get(defaultUser.id);
            mergedUsers.push({
              ...savedU,
              password: normalizeStoredPassword(savedU.password || DEFAULT_ADMIN_PASSWORD)
            });
            savedMap.delete(defaultUser.id);
          } else {
            mergedUsers.push(defaultUser);
          }
        }
        for (const customUser of Array.from(savedMap.values())) {
          mergedUsers.push({
            ...customUser,
            password: normalizeStoredPassword(customUser.password || DEFAULT_ADMIN_PASSWORD)
          });
        }
        adminUsers = mergedUsers;
      }
      if (Array.isArray(saved.checkpoints)) checkpoints = saved.checkpoints;
      if (Array.isArray(saved.auditLogs)) auditLogs = saved.auditLogs;
      if (typeof saved.nextTeamNumber === "number") nextTeamNumber = saved.nextTeamNumber;
      rebuildUniquenessIndexes();
    } catch (e) {
      console.warn("Failed to load persisted records:", e);
    }
  };
  const persistNow = () => {
    try {
      fs.mkdirSync(DATA_DIRECTORY, { recursive: true, mode: 448 });
      const sanitizedTeams = teams.map((team) => ({
        ...team,
        accessPassword: normalizeStoredPassword(team.accessPassword)
      }));
      const normalizedAdminUsers = adminUsers.map((user) => ({
        ...user,
        password: normalizeStoredPassword(user.password)
      }));
      const payload = JSON.stringify({ teams: sanitizedTeams, adminUsers: normalizedAdminUsers, checkpoints, auditLogs, nextTeamNumber }, null, 2);
      const tmpFile = `${DATA_FILE}.tmp`;
      fs.writeFileSync(tmpFile, payload, "utf-8");
      fs.renameSync(tmpFile, DATA_FILE);
      return true;
    } catch (e) {
      console.warn("Failed to persist records:", e);
      return false;
    }
  };
  const persist = persistNow;
  const markDirty = () => {
    if (dirtyTimer) clearTimeout(dirtyTimer);
    dirtyTimer = setTimeout(() => {
      dirtyTimer = null;
      persistNow();
    }, 200);
  };
  if (!productionStoreEnabled) loadPersisted();
  if (productionStoreEnabled) {
    teams = await loadProductionTeams();
    nextTeamNumber = teams.reduce((highest, team) => {
      const match = String(team.id || "").match(/(\d+)$/);
      return Math.max(highest, match ? Number(match[1]) : 0);
    }, nextTeamNumber);
    rebuildUniquenessIndexes();
  }
  try {
    if (!productionStoreEnabled) initialiseParticipantRegistrationBackup();
  } catch (backupError) {
    console.error("[BACKUP] Could not initialise participant registration CSV:", backupError);
  }
  setInterval(persistNow, 5e3);
  let rulebooks = [
    { id: "rb-101", version: "v1.2", title: "Official ANVATION 1.0 Rulebook & Guidelines 2026", pdfUrl: "/rulebook_kssem_codeathon.pdf", uploadedAt: "2026-08-05", active: true, downloads: 342, notes: "Final approved by VTU and KSSEM Management" }
  ];
  let emailCampaigns = [
    { id: "camp-1", title: "Welcome & Gate QR Checkin Guide", targetGroup: "All Participants", subject: "KS HACKNOVE 2026: Important Check-In & Gate Pass Details", body: "Dear Hacker, please keep your QR Code ready at the KSSEM campus gate.", status: "Sent", sentAt: "2026-08-08 10:00 AM", recipientCount: 240 },
    { id: "camp-2", title: "Checkpoint 1 Submission Reminder", targetGroup: "Team Leaders", subject: "Urgent: Checkpoint 1 Milestone Report due at 02:00 PM", body: "Please log into the Participant Portal and submit your GitHub branch.", status: "Scheduled", recipientCount: 48 }
  ];
  let roomAllocations = [
    { id: "room-101", blockName: "Aryabhata Block", roomNumber: "Lab 301", gender: "Common", capacity: 40, occupiedCount: 32, assignedTeamIds: ["CT-101", "CT-102", "CT-103", "CT-104"] },
    { id: "room-102", blockName: "Aryabhata Block", roomNumber: "Lab 302", gender: "Common", capacity: 40, occupiedCount: 28, assignedTeamIds: ["CT-105", "CT-106", "CT-107"] },
    { id: "room-103", blockName: "Girls Hostel Block B", roomNumber: "Room 104", gender: "Girls", capacity: 20, occupiedCount: 16, assignedTeamIds: ["CT-108", "CT-109"] }
  ];
  let judgingRounds = [
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
  app.get("/api/audit-logs", requireAdmin, (req, res) => {
    res.json({ success: true, logs: auditLogs });
  });
  app.post("/api/audit-logs", requireAdmin, (req, res) => {
    const { action, target, beforeValue, afterValue, reason, actorEmail, actorRole } = req.body;
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
  app.get("/api/admin-users", requireAdmin, (req, res) => {
    res.json({ success: true, users: adminUsers.map((user) => sanitizeAdminUser(user)) });
  });
  app.post("/api/admin-login", async (req, res) => {
    const { identifier, password } = req.body;
    const idn = (identifier || "").trim().toLowerCase();
    const pass = (password || "").trim();
    if (!idn || !pass) {
      return res.status(400).json({ success: false, error: "Username and password are required." });
    }
    const user = adminUsers.find(
      (u) => (u.username || "").toLowerCase() === idn || (u.email || "").toLowerCase() === idn
    );
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials." });
    }
    if (user.status !== "Active") {
      return res.status(403).json({ success: false, error: "This account has been suspended." });
    }
    if (!verifyPassword(pass, user.password)) {
      return res.status(401).json({ success: false, error: "Invalid credentials." });
    }
    user.lastLogin = (/* @__PURE__ */ new Date()).toISOString();
    const sid = createSession({
      id: user.id,
      type: "admin",
      role: user.role,
      email: user.email,
      username: user.username,
      name: user.name
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
      const match = cookieRaw.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${AUTH_COOKIE}=`));
      const sid = match ? decodeURIComponent(match.slice(AUTH_COOKIE.length + 1)) : null;
      if (sid) sessionStore.delete(sid);
    }
    res.json({ success: true, message: "Logged out." });
  });
  app.post("/api/admin-users", requireSuperAdmin, (req, res) => {
    const { email, name, role, twoFactorEnabled, username, password } = req.body;
    const passwordValue = String(password || "").trim();
    const newUser = {
      id: `adm-${Date.now()}`,
      email,
      name,
      username: username || email,
      password: normalizeStoredPassword(passwordValue) || hashPassword(DEFAULT_ADMIN_PASSWORD),
      role: role || "ADMIN",
      status: "Active",
      createdAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      twoFactorEnabled: !!twoFactorEnabled
    };
    adminUsers.unshift(newUser);
    markDirty();
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
    const usr = adminUsers.find((u) => u.id === id);
    if (usr) {
      usr.status = status;
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
  app.put("/api/admin-users/:id", requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const { name, email, username, password, role, twoFactorEnabled } = req.body;
    const usr = adminUsers.find((u) => u.id === id);
    if (!usr) {
      return res.status(404).json({ success: false, error: "Admin user not found." });
    }
    const beforeRole = usr.role;
    if (name !== void 0) usr.name = name;
    if (email !== void 0) usr.email = email;
    if (username !== void 0) usr.username = username;
    if (password !== void 0 && String(password).trim() !== "") usr.password = normalizeStoredPassword(String(password).trim()) || usr.password;
    if (role !== void 0) usr.role = role;
    if (twoFactorEnabled !== void 0) usr.twoFactorEnabled = !!twoFactorEnabled;
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
  app.delete("/api/admin-users/:id", requireSuperAdmin, (req, res) => {
    const { id } = req.params;
    const idx = adminUsers.findIndex((u) => u.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Admin user not found." });
    }
    const removed = adminUsers[idx];
    adminUsers.splice(idx, 1);
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
  app.post("/api/submissions/override-score", requireSuperAdmin, (req, res) => {
    const { submissionId, newTotalScore, reason, actorEmail } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, error: "Mandatory audit reason is required for score override." });
    }
    const sub = submissions.find((s) => s.id === submissionId);
    let scoreCard = scorecards.find((sc) => sc.submissionId === submissionId);
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
      scoreCard.feedback += ` [Super Admin Override (${(/* @__PURE__ */ new Date()).toLocaleTimeString()}): ${reason}]`;
    }
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      actorEmail: actorEmail || "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: "Score Manual Override",
      target: `Submission ID: ${submissionId} (${sub?.teamName || ""})`,
      beforeValue: `Score: ${oldScore}`,
      afterValue: `Score: ${newTotalScore}`,
      reason,
      ipAddress: req.ip || "127.0.0.1"
    });
    res.json({ success: true, scorecard: scoreCard });
  });
  app.get("/api/rulebooks", (req, res) => {
    res.json({ success: true, rulebooks });
  });
  app.post("/api/rulebooks", requireAdmin, (req, res) => {
    const { title, version, notes } = req.body;
    rulebooks.forEach((r) => r.active = false);
    const newRb = {
      id: `rb-${Date.now()}`,
      version: version || `v1.${rulebooks.length + 1}`,
      title: title || "ANVATION 1.0 Updated Rulebook",
      pdfUrl: "/rulebook_kssem_codeathon.pdf",
      uploadedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      active: true,
      downloads: 0,
      notes
    };
    rulebooks.unshift(newRb);
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
    const group = String(targetGroup || "ALL_PARTICIPANTS");
    const recipients = [];
    for (const team of teams) {
      const members = team.members || [];
      if (group === "TEAM_LEADERS") {
        const leader = members.find((m) => m.role === "Leader") || members[0];
        if (leader && leader.email) recipients.push(leader.email);
      } else if (group === "CHECKED_IN" || group === "Checked-In Only") {
        for (const m of members) if (m.checkedIn && m.email) recipients.push(m.email);
      } else if (group === "UNVERIFIED_PAYMENTS") {
        if (team.paymentStatus !== "Verified") {
          for (const m of members) if (m.email) recipients.push(m.email);
        }
      } else {
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
    const escHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const bodyHtml = bodySafe.split(/\r?\n/).map((line) => {
      const escaped = escHtml(line.trim());
      return escaped ? `<p style="margin:0 0 12px;color:#334155;font-size:15px;line-height:1.6;">${escaped}</p>` : '<p style="margin:0;">&nbsp;</p>';
    }).join("");
    const htmlFull = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;color:#0f172a;">
<div style="background:#0b192c;color:#fff;padding:22px 26px;"><div style="font-size:22px;font-weight:800;letter-spacing:1px;">ANVATION 2026</div><div style="font-size:12px;color:#67e8f9;">NATIONAL LEVEL 24-HOUR HACKATHON</div></div>
<div style="padding:24px 26px;">${bodyHtml}</div>
<div style="background:#f1f5f9;padding:14px 26px;font-size:12px;color:#64748b;">For any help, write to anvation2026@kssem.edu.in \xB7 Sent ${(/* @__PURE__ */ new Date()).toLocaleString()}</div>
</div>`;
    const smtpHost = process.env.SMTP_HOST;
    const smtpConfigured = !!smtpHost;
    let delivered = 0;
    let failed = 0;
    let smtpError = "";
    const emailRecipients = recipientList.map((r) => ({ recipient: r, status: "QUEUED" }));
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
      } catch (verifyErr) {
        smtpError = String(verifyErr && verifyErr.message || verifyErr);
        console.error(`[EMAIL CAMPAIGN] SMTP verification failed: ${smtpError}`);
      }
      if (!smtpError) {
        for (const recipient of recipientList) {
          try {
            const info = await transporter.sendMail({ from, to: recipient, subject: subjectSafe, text: bodySafe, html: htmlFull });
            delivered++;
            const ri = emailRecipients.find((r) => r.recipient === recipient);
            if (ri) {
              ri.status = "SENT";
              ri.error = info.messageId;
            }
            console.log(`[EMAIL CAMPAIGN] SENT To: ${recipient} | ${subjectSafe} | ${info.messageId}`);
          } catch (mailErr) {
            failed++;
            const ri = emailRecipients.find((r) => r.recipient === recipient);
            if (ri) {
              ri.status = "FAILED";
              ri.error = String(mailErr && mailErr.message || mailErr);
            }
            console.error(`[EMAIL CAMPAIGN] FAILED To: ${recipient} | ${mailErr.message}`);
          }
        }
      } else {
        emailRecipients.forEach((r) => {
          r.status = "FAILED";
          r.error = smtpError;
        });
        failed = recipientList.length;
      }
    } else if (!smtpHost) {
      console.warn(`[EMAIL CAMPAIGN] SMTP NOT CONFIGURED (SMTP_HOST missing) \u2014 real mail NOT delivered. Campaign "${subjectSafe}" recorded only.`);
    }
    const targetLabel = group === "TEAM_LEADERS" ? "Team Leaders" : group === "CHECKED_IN" || group === "Checked-In Only" ? "Checked-In Only" : group === "UNVERIFIED_PAYMENTS" ? "Pending Payment Receipts" : "All Participants";
    const newCamp = {
      id: `camp-${Date.now()}`,
      title,
      targetGroup: targetLabel,
      subject: subjectSafe,
      body: bodySafe,
      status: smtpConfigured ? delivered > 0 ? "Sent" : "Draft" : "Draft",
      sentAt: (/* @__PURE__ */ new Date()).toLocaleString(),
      recipientCount: recipientList.length
    };
    emailCampaigns.unshift(newCamp);
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
        gatewayMessage: "SMTP is NOT configured (SMTP_HOST missing in .env) \u2014 the campaign was recorded but NO real emails were sent. Set SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS and restart the server to deliver mail."
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
      gatewayMessage: smtpError ? `SMTP is configured but the connection check failed: ${smtpError}. No emails were delivered. Double-check SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS (Gmail requires an App Password, not your login password).` : allDelivered ? `Bulk email sent successfully to ${delivered} recipient(s).` : `Emails sent to ${delivered} of ${recipientList.length} recipient(s); ${failed} failed. Check the server logs for details.`
    });
  });
  app.get("/api/room-allocations", (req, res) => {
    res.json({ success: true, rooms: roomAllocations });
  });
  app.post("/api/room-allocations/add", requireAdmin, (req, res) => {
    const { blockName, roomNumber, gender, capacity } = req.body;
    if (!blockName || !roomNumber) return res.status(400).json({ success: false, error: "Block name and room number required" });
    const newRoom = {
      id: `room-${Date.now()}`,
      blockName,
      roomNumber,
      gender: gender || "Common",
      capacity: Number(capacity) || 40,
      occupiedCount: 0,
      assignedTeamIds: []
    };
    roomAllocations.push(newRoom);
    res.json({ success: true, room: newRoom });
  });
  app.post("/api/room-allocations/assign", requireAdmin, (req, res) => {
    const { roomId, teamId } = req.body;
    const room = roomAllocations.find((r) => r.id === roomId);
    if (!room) return res.status(404).json({ success: false, error: "Room not found" });
    if (!room.assignedTeamIds.includes(teamId)) {
      room.assignedTeamIds.push(teamId);
      const team = teams.find((t) => t.id === teamId);
      const memberCount = team ? team.members.length : 4;
      room.occupiedCount = Math.min(room.capacity, room.occupiedCount + memberCount);
    }
    res.json({ success: true, room });
  });
  app.post("/api/room-allocations/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    roomAllocations = roomAllocations.filter((r) => r.id !== id);
    res.json({ success: true, message: "Room allocation removed" });
  });
  let scheduleItems = [
    { id: "sch-1", day: 1, time: "08:30 AM", title: "On-Campus Registration & Gate Badge Collection", description: "Collect physical badges, lanyards & Wi-Fi credentials at KSSEM CSE Block.", type: "general", location: "CSE Seminar Hall" },
    { id: "sch-2", day: 1, time: "09:30 AM", title: "Grand Opening Ceremony & Keynote Address", description: "Address by Principal, HoD CSE & Chief Guest from Bosch India.", type: "keynote", location: "Main Auditorium" },
    { id: "sch-3", day: 1, time: "10:30 AM", title: "24-Hour Hackathon Hacking Phase Begins!", description: "Clock starts! All teams move to designated lab allocations.", type: "general", location: "CSE Labs 301-308" },
    { id: "sch-4", day: 1, time: "01:00 PM", title: "Lunch & Refreshments", description: "South Indian buffet at Student Dining Hall.", type: "food", location: "Dining Hall" },
    { id: "sch-5", day: 1, time: "03:00 PM", title: "Checkpoint 1 Review: Architecture & Idea Pitch", description: "Jury panel visits tables for 5-min elevator pitch.", type: "review", location: "Lab Allocations" },
    { id: "sch-6", day: 1, time: "08:30 PM", title: "Dinner & Midnight Coffee Station", description: "Buffet dinner served. High-speed caffeine station active 24/7.", type: "food", location: "Dining Hall" },
    { id: "sch-7", day: 2, time: "08:00 AM", title: "Breakfast & Refreshment Station", description: "Morning tea/coffee and breakfast provided.", type: "food", location: "Dining Hall" },
    { id: "sch-8", day: 2, time: "10:30 AM", title: "Final Submission Deadline (GitHub + Video)", description: "All codes committed and PPT uploaded on Participant Portal.", type: "submission", location: "Participant Portal" },
    { id: "sch-9", day: 2, time: "11:00 AM", title: "Round 2 Grand Finale Judging & Live Pitching", description: "Top shortlisted teams present on stage in Auditorium.", type: "review", location: "Main Auditorium" },
    { id: "sch-10", day: 2, time: "03:00 PM", title: "Valedictory Ceremony & Cash Prize Distribution", description: "Felicitating Winners, Mentors & Sponsors.", type: "keynote", location: "Main Auditorium" }
  ];
  app.get("/api/schedule", (req, res) => {
    res.json({ success: true, schedule: scheduleItems });
  });
  app.post("/api/schedule/add", requireAdmin, (req, res) => {
    const { time, title, description, type, day, location } = req.body;
    if (!time || !title) return res.status(400).json({ success: false, error: "Time and title are required" });
    const newItem = {
      id: `sch-${Date.now()}`,
      time,
      title,
      description: description || "",
      type: type || "general",
      day: Number(day) === 2 ? 2 : 1,
      location: location || "KSSEM Campus"
    };
    scheduleItems.push(newItem);
    res.json({ success: true, item: newItem });
  });
  app.post("/api/schedule/edit", requireAdmin, (req, res) => {
    const { id, time, title, description, type, day, location } = req.body;
    const item = scheduleItems.find((s) => s.id === id);
    if (!item) return res.status(404).json({ success: false, error: "Schedule item not found" });
    if (time) item.time = time;
    if (title) item.title = title;
    if (description !== void 0) item.description = description;
    if (type) item.type = type;
    if (day) item.day = Number(day) === 2 ? 2 : 1;
    if (location) item.location = location;
    res.json({ success: true, item });
  });
  app.post("/api/schedule/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    scheduleItems = scheduleItems.filter((s) => s.id !== id);
    res.json({ success: true, message: "Schedule item deleted" });
  });
  let policies = [
    { id: "pol-1", title: "Zero Tolerance Code of Conduct & Anti-Plagiarism Policy", category: "Rules", text: "All submitted repositories must contain original code written during the 24-hour hackathon timeframe. Open-source libraries are permitted, but core business logic must be built live." },
    { id: "pol-2", title: "On-Campus Accommodation & Hostel Security Regulations", category: "Hostel", text: "Separate boys and girls hostels are monitored 24/7 by security wardens. Gate curfew applies for leaving campus after 10:00 PM without organizing committee pass." },
    { id: "pol-3", title: "Hardware & Wi-Fi Network Bandwidth Fair Usage", category: "Infrastructure", text: "High-speed 5G Wi-Fi access codes are restricted to registered laptops. Heavy torrenting or network spoofing will result in immediate disqualification." }
  ];
  app.get("/api/policies", (req, res) => {
    res.json({ success: true, policies });
  });
  app.post("/api/policies/add", requireAdmin, (req, res) => {
    const { title, category, text } = req.body;
    if (!title || !text) return res.status(400).json({ success: false, error: "Title and text required" });
    const newPol = { id: `pol-${Date.now()}`, title, category: category || "General", text };
    policies.unshift(newPol);
    res.json({ success: true, policy: newPol });
  });
  app.post("/api/policies/delete", requireAdmin, (req, res) => {
    const { id } = req.body;
    policies = policies.filter((p) => p.id !== id);
    res.json({ success: true, message: "Policy removed" });
  });
  app.post("/api/admin/teams/:teamId/approve", requireAdmin, async (req, res) => {
    try {
      const { teamId } = req.params;
      const team = teams.find((candidate) => candidate.id.toLowerCase() === teamId.toLowerCase());
      if (!team) return res.status(404).json({ success: false, error: "Team not found" });
      if (team.approvalStatus === "APPROVED") {
        return res.json({ success: true, team, alreadyApproved: true, message: "Team already approved." });
      }
      if (team.approvalStatus === "REJECTED") {
        return res.status(409).json({ success: false, error: "This team has already been rejected and cannot be approved." });
      }
      const previousApprovalStatus = team.approvalStatus || "PENDING";
      team.approvalStatus = "APPROVED";
      team.approvalTimestamp = (/* @__PURE__ */ new Date()).toISOString();
      team.status = "Confirmed";
      team.paymentStatus = "PAYMENT_APPROVED";
      team.paymentAmountDetail = `Payment of \u20B9${cmsConfig.registrationFee || 0} has been verified. Registration approved.`;
      team.approvalEmailStatus = "PENDING";
      if (productionStoreEnabled) {
        try {
          await updateProductionTeam(team);
        } catch (storageErr) {
          console.error("[DATABASE] Production approval update failed:", storageErr);
        }
      }
      markDirty();
      try {
        await sendApprovalEmail(team);
        team.approvalEmailStatus = "SENT";
        team.approvalEmailSentAt = (/* @__PURE__ */ new Date()).toISOString();
      } catch (emailErr) {
        team.approvalEmailStatus = "FAILED";
        console.error("[EMAIL APPROVAL] Failed for team", team.id, emailErr?.message || emailErr);
      }
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actorEmail: req.session?.email || req.session?.username || "unknown-admin",
        actorRole: req.session?.role || "ADMIN",
        action: "Team Approve",
        target: `Team ${team.teamName} (${team.id})`,
        beforeValue: previousApprovalStatus,
        afterValue: "APPROVED",
        reason: "Admin approved team after payment audit.",
        ipAddress: req.ip || "127.0.0.1"
      });
      return res.json({ success: true, team, approved: true, approvalEmailStatus: team.approvalEmailStatus, message: "Team approved successfully." });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || "Could not approve team." });
    }
  });
  app.post("/api/admin/teams/:teamId/reject", requireAdmin, async (req, res) => {
    try {
      const { teamId } = req.params;
      const { reason } = req.body;
      const team = teams.find((candidate) => candidate.id.toLowerCase() === teamId.toLowerCase());
      if (!team) return res.status(404).json({ success: false, error: "Team not found" });
      if (team.approvalStatus === "REJECTED") {
        return res.json({ success: true, team, alreadyRejected: true, message: "Team already rejected." });
      }
      if (team.approvalStatus === "APPROVED") {
        return res.status(409).json({ success: false, error: "This team has already been approved and cannot be rejected." });
      }
      const previousApprovalStatus = team.approvalStatus || "PENDING";
      team.approvalStatus = "REJECTED";
      team.approvalTimestamp = (/* @__PURE__ */ new Date()).toISOString();
      team.approvalReason = String(reason || "Payment audit rejected by admin").trim();
      team.status = "Rejected";
      team.paymentStatus = "Rejected";
      team.paymentAmountDetail = `Rejected by admin payment audit; ${team.approvalReason}`;
      team.approvalEmailStatus = "PENDING";
      if (productionStoreEnabled) {
        try {
          await updateProductionTeam(team);
        } catch (storageErr) {
          console.error("[DATABASE] Production rejection update failed:", storageErr);
        }
      }
      markDirty();
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actorEmail: req.session?.email || req.session?.username || "unknown-admin",
        actorRole: req.session?.role || "ADMIN",
        action: "Team Reject",
        target: `Team ${team.teamName} (${team.id})`,
        beforeValue: previousApprovalStatus,
        afterValue: "REJECTED",
        reason: team.approvalReason,
        ipAddress: req.ip || "127.0.0.1"
      });
      return res.json({ success: true, team, rejected: true, message: "Team rejected successfully." });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || "Could not reject team." });
    }
  });
  app.post("/api/finance/verify-utr", requireAdmin, async (req, res) => {
    const { teamId, paymentStatus } = req.body;
    const team = teams.find((candidate) => candidate.id.toLowerCase() === String(teamId || "").toLowerCase() || (candidate.regNumber || "").toLowerCase() === String(teamId || "").toLowerCase());
    if (!team) return res.status(404).json({ success: false, error: "Team not found" });
    if (paymentStatus === "Rejected") {
      const teamToRemove = { ...team };
      const oldSessions = /* @__PURE__ */ new Map();
      for (const [sid, session] of sessionStore.entries()) {
        if (session.user.type === "participant" && session.user.teamId === team.id) {
          oldSessions.set(sid, session);
          sessionStore.delete(sid);
        }
      }
      if (productionStoreEnabled) {
        try {
          await deleteProductionTeam(team.id);
        } catch (storageErr) {
          console.error("[DATABASE] Production team deletion for rejected payment failed:", storageErr);
        }
      }
      teams = teams.filter((candidate) => candidate.id.toLowerCase() !== team.id.toLowerCase() && (candidate.regNumber || "").toLowerCase() !== team.id.toLowerCase());
      rebuildUniquenessIndexes();
      markDirty();
      try {
        fs.writeFileSync(PARTICIPANT_BACKUP_FILE, participantBackupFileContents(teams), { encoding: "utf8", mode: 384 });
      } catch (backupErr) {
        console.error("[BACKUP] Failed to rewrite participant registration CSV after payment rejection:", backupErr);
      }
      auditLogs.unshift({
        id: `log-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        actorEmail: req.session?.email || req.session?.username || "unknown-admin",
        actorRole: req.session?.role || "ADMIN",
        action: "Payment Status Change: Rejected + credentials removed",
        target: `Team ${team.teamName} (${team.id})`,
        beforeValue: team.paymentStatus || "Pending",
        afterValue: "Rejected + Removed",
        reason: "Payment UTR rejected by finance admin. Team and participants removed from active directories.",
        ipAddress: getClientIp(req)
      });
      return res.json({ success: true, removed: true, team: teamToRemove, message: "Rejected payment team removed from active registration, team control and participant directory." });
    }
    if (paymentStatus === "Verified") {
      team.paymentStatus = "PAYMENT_APPROVED";
      team.paymentAmountDetail = `Payment of \u20B9${cmsConfig.registrationFee || 0} has been verified. Registration approved.`;
      team.status = "Confirmed";
      team.approvalStatus = "APPROVED";
      team.approvalTimestamp = (/* @__PURE__ */ new Date()).toISOString();
      team.approvalEmailStatus = "PENDING";
      try {
        await sendApprovalEmail(team);
        team.approvalEmailStatus = "SENT";
        team.approvalEmailSentAt = (/* @__PURE__ */ new Date()).toISOString();
      } catch (emailErr) {
        team.approvalEmailStatus = "FAILED";
        console.error("[EMAIL APPROVAL] Failed for team", team.id, emailErr?.message || emailErr);
      }
    } else {
      team.paymentStatus = paymentStatus;
    }
    if (productionStoreEnabled) {
      try {
        await updateProductionTeam(team);
      } catch (storageErr) {
        console.error("[DATABASE] Production verification update failed:", storageErr);
      }
    }
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      actorEmail: req.session?.email || req.session?.username || "unknown-admin",
      actorRole: req.session?.role || "ADMIN",
      action: `Payment Status Change: ${paymentStatus}`,
      target: `Team ${team.teamName} (${team.id})`,
      beforeValue: team.paymentUtr || "No UTR",
      afterValue: paymentStatus,
      reason: `Finance audit verification by Super Admin`,
      ipAddress: getClientIp(req)
    });
    res.json({ success: true, team });
  });
  app.get("/api/judging-rounds", (req, res) => {
    res.json({ success: true, rounds: judgingRounds });
  });
  app.post("/api/emergency-control", requireSuperAdmin, (req, res) => {
    const { actionType, freezeState, reason } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ success: false, error: "Mandatory emergency reason is required." });
    }
    if (actionType === "maintenance") cmsConfig.maintenanceMode = freezeState;
    if (actionType === "registrations") cmsConfig.freezeRegistrations = freezeState;
    if (actionType === "submissions") cmsConfig.freezeSubmissions = freezeState;
    if (actionType === "judging") cmsConfig.freezeJudging = freezeState;
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      actorEmail: "superadmin@kssem.edu.in",
      actorRole: "SUPER_ADMIN",
      action: `EMERGENCY CONTROL: ${actionType.toUpperCase()}`,
      target: "Global System Engine",
      afterValue: `State: ${freezeState ? "FROZEN / LOCKED" : "RELEASED / NORMAL"}`,
      reason,
      ipAddress: req.ip || "127.0.0.1"
    });
    res.json({ success: true, config: cmsConfig });
  });
  app.get("/api/tickets", (req, res) => {
    res.json({ success: true, tickets });
  });
  app.post("/api/tickets", requireTeamAccess, (req, res) => {
    const { teamId, teamName, subject, message, category } = req.body;
    const newTicket = {
      id: `t-${Date.now()}`,
      teamId: teamId || "KS-HACK-GUEST",
      teamName: teamName || "Participant",
      subject,
      message,
      category: category || "Other",
      status: "Open",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    tickets.unshift(newTicket);
    res.json({ success: true, ticket: newTicket });
  });
  app.post("/api/tickets/resolve", requireAdmin, (req, res) => {
    const { ticketId, response } = req.body;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (ticket) {
      ticket.status = "Resolved";
      ticket.response = response || "Resolved by KSSEM Organizing Committee.";
    }
    res.json({ success: true, ticket });
  });
  app.get("/api/milestone-reports", (req, res) => {
    res.json({ success: true, reports: milestoneReports });
  });
  app.post("/api/milestone-reports", requireTeamAccess, (req, res) => {
    const { teamId, checkpointNumber, checkpointName, summary, repoBranchOrLink, blockers } = req.body;
    if (!teamId || !checkpointNumber) {
      return res.status(400).json({ success: false, error: "Team ID and Checkpoint number required" });
    }
    const newReport = {
      id: `mr-${Date.now()}`,
      teamId,
      checkpointNumber: Number(checkpointNumber),
      checkpointName: checkpointName || `Checkpoint ${checkpointNumber}`,
      summary: summary || "",
      repoBranchOrLink,
      blockers,
      status: "Pending",
      submittedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const existingIndex = milestoneReports.findIndex((r) => r.teamId === teamId && r.checkpointNumber === Number(checkpointNumber));
    if (existingIndex >= 0) {
      milestoneReports[existingIndex] = newReport;
    } else {
      milestoneReports.unshift(newReport);
    }
    res.json({ success: true, report: newReport });
  });
  app.post("/api/milestone-reports/review", requireAdmin, (req, res) => {
    const { reportId, status, feedback } = req.body;
    const report = milestoneReports.find((r) => r.id === reportId);
    if (!report) return res.status(404).json({ success: false, error: "Report not found" });
    report.status = status || "Approved";
    if (feedback) report.feedback = feedback;
    res.json({ success: true, report });
  });
  app.get("/api/checkpoints", (req, res) => {
    res.json({ success: true, checkpoints });
  });
  app.post("/api/checkpoints", requireAdmin, (req, res) => {
    const { title, description, time, status } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, error: "Checkpoint title is required" });
    }
    const nextNumber = checkpoints.length + 1;
    const newCp = {
      id: `cp-${Date.now()}`,
      number: nextNumber,
      title: String(title).trim(),
      description: (description || "").trim(),
      time: (time || "").trim(),
      status: status === "Closed" ? "Closed" : "Open"
    };
    checkpoints.push(newCp);
    markDirty();
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
    const cp = checkpoints.find((c) => c.id === id);
    if (!cp) return res.status(404).json({ success: false, error: "Checkpoint not found" });
    const { title, description, time, status } = req.body;
    if (title !== void 0) cp.title = String(title).trim();
    if (description !== void 0) cp.description = String(description).trim();
    if (time !== void 0) cp.time = String(time).trim();
    if (status !== void 0) cp.status = status === "Closed" ? "Closed" : "Open";
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
    const idx = checkpoints.findIndex((c) => c.id === id);
    if (idx === -1) return res.status(404).json({ success: false, error: "Checkpoint not found" });
    const removed = checkpoints[idx];
    checkpoints.splice(idx, 1);
    checkpoints.forEach((c, i) => {
      c.number = i + 1;
    });
    auditLogs.unshift({
      id: `log-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
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
  app.get("/api/mentor-bookings", (req, res) => {
    res.json({ success: true, bookings: mentorBookings });
  });
  app.post("/api/mentor-bookings", requireTeamAccess, (req, res) => {
    const { teamId, teamName, mentorId, mentorName, slot, topic } = req.body;
    const newBooking = {
      id: `mb-${Date.now()}`,
      teamId: teamId || "GUEST",
      teamName: teamName || "Team",
      mentorId: mentorId || "m-1",
      mentorName: mentorName || "Assigned Mentor",
      slot: slot || "Immediate Slot",
      topic: topic || "Technical Architecture Review",
      status: "Confirmed"
    };
    mentorBookings.unshift(newBooking);
    res.json({ success: true, booking: newBooking });
  });
  app.get("/api/cms-config", requireAdmin, (req, res) => {
    res.json({ success: true, config: cmsConfig });
  });
  app.post("/api/cms-config", requireAdmin, (req, res) => {
    const updated = req.body;
    cmsConfig = { ...cmsConfig, ...updated };
    res.json({ success: true, config: cmsConfig, message: "Website CMS Configuration updated live across all sections!" });
  });
  app.get("/api/certificate-status", (req, res) => {
    res.json({ success: true, enabled: !!cmsConfig.enableCertificateDownloads });
  });
  app.post("/api/certificate-issue", requireAdmin, (req, res) => {
    cmsConfig.enableCertificateDownloads = true;
    res.json({ success: true, enabled: true, config: cmsConfig, message: "Certificates released to all verified participants!" });
  });
  app.get("/api/submission-status", (req, res) => {
    res.json({ success: true, enabled: !!cmsConfig.enableProjectSubmissions });
  });
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
  app.use((err, req, res, next) => {
    console.error("[SERVER ERROR]", err);
    if (res.headersSent) {
      return next(err);
    }
    const statusCode = typeof err?.status === "number" ? err.status : typeof err?.statusCode === "number" ? err.statusCode : 500;
    res.status(statusCode).json({
      success: false,
      error: "An internal server error occurred. Please try again later."
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    serveStaticWithCache(app, path.join(process.cwd(), "dist"));
  }
  if (!shouldListen) return app;
  const isAuthority = process.env.ANVATION_ROLE === "authority";
  const bindHost = isAuthority ? "0.0.0.0" : "0.0.0.0";
  const bindPort = isAuthority ? INTERNAL_PORT : requestedPort;
  const server = app.listen(bindPort, bindHost, () => {
    console.log(`KS-HackNova 2026 Server running on port ${bindPort}`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.warn(`Port ${bindPort} is already in use on ${bindHost}. You may already have a server running.`);
    }
    console.error("Failed to start server:", err);
  });
  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("\nShutting down \u2014 flushing pending data to disk\u2026");
    try {
      persistNow();
    } catch {
    }
    try {
      server.close();
    } catch {
    }
    setTimeout(() => process.exit(0), 150);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  return server;
}
var isDirectExecution = typeof __filename !== "undefined" ? path.resolve(process.argv[1] || "") === path.resolve(__filename) : Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href);
if (isDirectExecution) {
  run();
}
var vercelAppPromise = null;
async function vercelHandler(req, res) {
  if (!vercelAppPromise) vercelAppPromise = startServer({ listen: false });
  const app = await vercelAppPromise;
  return app(req, res);
}
export {
  vercelHandler as default,
  startServer
};
//# sourceMappingURL=server.js.map
