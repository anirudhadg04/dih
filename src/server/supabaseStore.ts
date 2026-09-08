import crypto from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Participant, Team } from "../types";

let client: SupabaseClient | null = null;

export const isSupabaseConfigured = () => Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);

const getClient = (): SupabaseClient => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (!client) {
    client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }
  return client;
};

const participantFromRow = (row: any): Participant => ({
  id: row.id,
  fullName: row.full_name,
  college: row.college,
  department: row.department,
  semester: row.semester,
  email: row.email,
  phone: row.phone || "",
  usn: row.usn || "",
  gender: row.gender || "",
  githubUrl: row.github_url || undefined,
  linkedinUrl: row.linkedin_url || undefined,
  role: row.role,
  teamId: row.team_id,
  accommodationRequired: Boolean(row.accommodation_required),
  emergencyContact: row.emergency_contact || "",
  checkedIn: Boolean(row.checked_in),
  checkInTime: row.check_in_time || undefined,
  foodCouponsClaimed: row.food_coupons_claimed || undefined,
});

const teamFromRows = (row: any, participants: any[]): Team => ({
  id: row.id,
  regNumber: row.registration_number,
  teamName: row.team_name,
  leaderEmail: row.leader_email,
  accessPassword: row.access_password_hash,
  preferredTrack: row.preferred_track,
  members: participants.map(participantFromRow),
  status: row.status,
  createdAt: row.created_at,
  projectSubmitted: Boolean(row.project_submitted),
  paymentUtr: row.payment_utr || undefined,
  paymentStatus: row.payment_status,
  paymentScreenshot: row.payment_screenshot_path || null,
});

export const allocateTeamNumber = async (): Promise<number> => {
  const { data, error } = await getClient().rpc("allocate_team_number");
  if (error) throw error;
  return Number(data);
};

export const listTeams = async (): Promise<Team[]> => {
  const supabase = getClient();
  const { data: rows, error } = await supabase.from("teams").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  const teamRows = rows || [];
  if (!teamRows.length) return [];

  const { data: memberRows, error: memberError } = await supabase
    .from("participants")
    .select("*")
    .in("team_id", teamRows.map((team) => team.id));
  if (memberError) throw memberError;

  return teamRows.map((team) => teamFromRows(
    team,
    (memberRows || []).filter((member) => member.team_id === team.id)
  ));
};

const uploadPaymentScreenshot = async (team: Team): Promise<string | null> => {
  const screenshot = team.paymentScreenshot;
  if (!screenshot || !screenshot.startsWith("data:")) return null;
  const match = screenshot.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid payment screenshot format.");

  const [, contentType, encoded] = match;
  const bytes = Buffer.from(encoded, "base64");
  const extension = contentType.split("/")[1]?.replace(/[^a-z0-9]/gi, "") || "bin";
  const filePath = `${team.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await getClient().storage
    .from("payment-screenshots")
    .upload(filePath, bytes, { contentType, upsert: false });
  if (error) throw error;
  return filePath;
};

export const saveTeam = async (team: Team): Promise<void> => {
  const screenshotPath = await uploadPaymentScreenshot(team);
  const supabase = getClient();
  const { error: teamError } = await supabase.from("teams").insert({
    id: team.id,
    registration_number: team.regNumber,
    team_name: team.teamName,
    leader_email: team.leaderEmail,
    access_password_hash: team.accessPassword,
    preferred_track: team.preferredTrack,
    status: team.status,
    created_at: team.createdAt,
    project_submitted: Boolean(team.projectSubmitted),
    payment_utr: team.paymentUtr,
    payment_status: team.paymentStatus,
    payment_screenshot_path: screenshotPath,
  });
  if (teamError) throw teamError;

  const { error: participantError } = await supabase.from("participants").insert(
    team.members.map((member) => ({
      id: member.id,
      team_id: team.id,
      full_name: member.fullName,
      college: member.college,
      department: member.department,
      semester: member.semester,
      email: member.email,
      phone: member.phone,
      usn: member.usn,
      gender: member.gender,
      github_url: member.githubUrl,
      linkedin_url: member.linkedinUrl,
      role: member.role,
      accommodation_required: member.accommodationRequired,
      emergency_contact: member.emergencyContact,
      checked_in: member.checkedIn,
      check_in_time: member.checkInTime,
      food_coupons_claimed: member.foodCouponsClaimed || {},
    }))
  );
  if (participantError) {
    await supabase.from("teams").delete().eq("id", team.id);
    throw participantError;
  }

  const { error: backupError } = await supabase.from("registration_backup_rows").insert(
    team.members.map((member) => ({
      registration_timestamp: team.createdAt,
      team_id: team.id,
      registration_number: team.regNumber,
      team_name: team.teamName,
      track: team.preferredTrack,
      participant_id: member.id,
      participant_name: member.fullName,
      role: member.role,
      email: member.email,
      phone: member.phone,
      usn: member.usn,
      college: member.college,
      department: member.department,
      semester: member.semester,
      gender: member.gender,
      github_url: member.githubUrl,
      linkedin_url: member.linkedinUrl,
      accommodation_required: member.accommodationRequired,
      emergency_contact: member.emergencyContact,
      payment_utr: team.paymentUtr,
      payment_status: team.paymentStatus,
      team_status: team.status,
    }))
  );
  if (backupError) {
    await supabase.from("participants").delete().eq("team_id", team.id);
    await supabase.from("teams").delete().eq("id", team.id);
    if (screenshotPath) {
      await supabase.storage.from("payment-screenshots").remove([screenshotPath]);
    }
    throw backupError;
  }
};