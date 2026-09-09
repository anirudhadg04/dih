CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE payment_status AS ENUM ('PENDING', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'REFUNDED');
CREATE TYPE team_status AS ENUM ('Registered', 'Shortlisted', 'Confirmed', 'Checked-In', 'Submitted');

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  registration_number TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  leader_email TEXT NOT NULL,
  preferred_track TEXT NOT NULL,
  status team_status NOT NULL DEFAULT 'Registered',
  access_password_hash TEXT,
  project_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  college TEXT NOT NULL,
  department TEXT NOT NULL,
  semester TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  usn TEXT NOT NULL,
  gender TEXT NOT NULL,
  github_url TEXT,
  linkedin_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('Leader', 'Member')),
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  accommodation_required BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_contact TEXT NOT NULL,
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  check_in_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (LOWER(email)),
  UNIQUE (LOWER(usn))
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  utr TEXT UNIQUE,
  amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
  status payment_status NOT NULL DEFAULT 'PENDING',
  proof_object_key TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id TEXT NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  track TEXT NOT NULL,
  project_title TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  technology_stack TEXT[] NOT NULL DEFAULT '{}',
  architecture_overview TEXT NOT NULL,
  github_link TEXT NOT NULL,
  demo_video_url TEXT,
  ppt_url TEXT,
  pdf_doc_url TEXT,
  future_scope TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evaluated BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  username TEXT UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  user_type TEXT NOT NULL CHECK (user_type IN ('admin', 'participant')),
  user_id TEXT NOT NULL,
  team_id TEXT REFERENCES teams(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scorecards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES admin_users(id),
  innovation NUMERIC(5,2) NOT NULL CHECK (innovation BETWEEN 0 AND 15),
  impact NUMERIC(5,2) NOT NULL CHECK (impact BETWEEN 0 AND 15),
  technical_complexity NUMERIC(5,2) NOT NULL CHECK (technical_complexity BETWEEN 0 AND 20),
  presentation NUMERIC(5,2) NOT NULL CHECK (presentation BETWEEN 0 AND 15),
  ui_ux NUMERIC(5,2) NOT NULL CHECK (ui_ux BETWEEN 0 AND 15),
  scalability NUMERIC(5,2) NOT NULL CHECK (scalability BETWEEN 0 AND 10),
  originality NUMERIC(5,2) NOT NULL CHECK (originality BETWEEN 0 AND 10),
  bonus_points NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (bonus_points BETWEEN 0 AND 5),
  penalty NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (penalty >= 0),
  feedback TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (submission_id, judge_id)
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS participants_team_id_idx ON participants(team_id);
CREATE INDEX IF NOT EXISTS participants_email_idx ON participants(LOWER(email));
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS announcements_created_at_idx ON announcements(created_at DESC);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teams_updated_at ON teams;
CREATE TRIGGER teams_updated_at BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS admin_users_updated_at ON admin_users;
CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS scorecards_updated_at ON scorecards;
CREATE TRIGGER scorecards_updated_at BEFORE UPDATE ON scorecards FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
