-- =============================================================
--  Road Test Management ERP — initial schema
--  Migration: 001_initial_schema.sql
--  Target:    PostgreSQL 15+ (Supabase managed)
--  Author:    RTM platform team
--
--  This file is idempotent on a *clean* database. To re-run during
--  development, drop the rtm schema first:
--     DROP SCHEMA IF EXISTS rtm CASCADE;
-- =============================================================

-- -------------------------------------------------------------
-- 0. Extensions
-- -------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4 / v5
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid
CREATE EXTENSION IF NOT EXISTS "citext";      -- case-insensitive email

-- -------------------------------------------------------------
-- 1. Dedicated schema (keeps Supabase's auth / storage clean)
-- -------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS rtm;
SET search_path TO rtm, public;


-- =============================================================
--  ENUM TYPES
--  Mirror the TypeScript unions in src/types/index.ts.
--  Adding a value later requires: ALTER TYPE ... ADD VALUE 'X';
-- =============================================================

CREATE TYPE role_enum AS ENUM (
  'Admin', 'PMO', 'Project Manager', 'Test Engineer', 'Driver', 'Finance'
);

CREATE TYPE account_status_enum AS ENUM (
  'Active', 'Suspended', 'Left'
);

CREATE TYPE project_status_enum AS ENUM (
  'Draft', 'Pending Review', 'Approved', 'Scheduling',
  'In Progress', 'Paused', 'Issue Handling', 'Data Uploading',
  'Completed', 'Archived', 'Cancelled'
);

CREATE TYPE priority_enum AS ENUM ('Low', 'Medium', 'High');

CREATE TYPE vehicle_status_enum AS ENUM (
  'Available', 'Reserved', 'In Use', 'Maintenance', 'Accident'
);

CREATE TYPE powertrain_enum AS ENUM ('Petrol', 'Diesel', 'Hybrid', 'EV');

CREATE TYPE ownership_enum AS ENUM ('Owned', 'Leased');

CREATE TYPE insurance_status_enum AS ENUM ('Covered', 'Pending', 'Expired');

CREATE TYPE plate_status_enum AS ENUM (
  'Available', 'Reserved', 'In Use', 'Expired'
);

CREATE TYPE plate_type_enum AS ENUM ('Trade Plate', 'Temporary Plate');

CREATE TYPE route_type_enum AS ENUM ('Highway', 'Urban', 'Rural', 'Mixed');

CREATE TYPE risk_level_enum AS ENUM ('Low', 'Medium', 'High');

CREATE TYPE route_status_enum AS ENUM ('Active', 'Draft', 'Archived');

CREATE TYPE poi_type_enum AS ENUM (
  'Charging', 'Parking', 'Risk Point', 'Service Area',
  'Start Point', 'Data Handover', 'Camera Site', 'Test Site',
  'Boundary', 'Junction'
);

CREATE TYPE task_status_enum AS ENUM (
  'Planned', 'In Progress', 'Completed', 'Issue', 'Cancelled'
);

CREATE TYPE attendance_type_enum AS ENUM (
  'Clock In', 'Clock Out', 'Arrived Test Area', 'Break Start', 'Break End'
);

CREATE TYPE attendance_status_enum AS ENUM (
  'Normal', 'Late', 'Manual Correction'
);

CREATE TYPE check_type_enum AS ENUM (
  'Pre-Drive', 'Post-Drive', 'Check-In', 'Check-Out', 'Weekly'
);

CREATE TYPE check_status_enum AS ENUM ('OK', 'Warning', 'Critical');

CREATE TYPE issue_type_enum AS ENUM (
  'Vehicle', 'Device', 'Data', 'Staff', 'Route', 'Plate',
  'Safety', 'Weather', 'Client Change', 'Finance', 'File', 'Delivery'
);

CREATE TYPE issue_severity_enum AS ENUM ('Low', 'Medium', 'High', 'Critical');

CREATE TYPE issue_status_enum AS ENUM (
  'Open', 'In Progress', 'Resolved', 'Closed'
);

CREATE TYPE expense_category_enum AS ENUM (
  'Hotel', 'Meal', 'Public Transport', 'Parking', 'Charging', 'Fuel',
  'Vehicle Cleaning', 'Vehicle Repair', 'HDD Postage',
  'Equipment Purchase', 'Other'
);

CREATE TYPE expense_status_enum AS ENUM (
  'Draft', 'Submitted', 'Approved', 'Rejected', 'Paid'
);

CREATE TYPE currency_enum AS ENUM ('GBP', 'EUR', 'USD');

CREATE TYPE file_permission_enum AS ENUM ('Private', 'Project', 'Public');

CREATE TYPE audit_action_enum AS ENUM (
  'INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'EXPORT'
);


-- =============================================================
--  HELPER FUNCTIONS
-- =============================================================

-- Trigger function: stamps updated_at on every UPDATE.
CREATE OR REPLACE FUNCTION rtm.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- current_user_id():
--   Returns the rtm.users.id corresponding to the JWT 'sub' claim.
--   Lark OAuth (Step 7) writes the Lark open_id into auth.users metadata,
--   and the Workers backend will keep rtm.users.lark_open_id in sync.
--
--   IMPORTANT: marked SECURITY DEFINER so the function bypasses RLS while
--   resolving the current user — otherwise the RLS policy on rtm.users
--   itself would call current_user_id() recursively.
CREATE OR REPLACE FUNCTION rtm.current_user_id()
RETURNS uuid AS $$
DECLARE
  claims_raw text;
  open_id    text;
  uid        uuid;
BEGIN
  -- Guard against missing or malformed JWT claims so anonymous browsers
  -- (no JWT at all) don't raise an error mid-query — they just see NULL.
  claims_raw := nullif(current_setting('request.jwt.claims', true), '');
  IF claims_raw IS NULL THEN
    RETURN NULL;
  END IF;
  BEGIN
    open_id := nullif(claims_raw::jsonb ->> 'sub', '');
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  IF open_id IS NULL THEN
    RETURN NULL;
  END IF;
  SELECT id INTO uid FROM rtm.users WHERE lark_open_id = open_id LIMIT 1;
  RETURN uid;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = rtm, public;

-- has_role(role): true if current user has one of the given roles.
-- Also SECURITY DEFINER for the same reason.
CREATE OR REPLACE FUNCTION rtm.has_role(VARIADIC roles_to_check rtm.role_enum[])
RETURNS BOOLEAN AS $$
DECLARE
  my_role rtm.role_enum;
BEGIN
  SELECT role INTO my_role FROM rtm.users WHERE id = rtm.current_user_id();
  RETURN my_role = ANY(roles_to_check);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = rtm, public;

-- is_project_member(project_uuid):
--   true if current user manages the project, is the PMO owner, or appears in project_members.
CREATE OR REPLACE FUNCTION rtm.is_project_member(p uuid)
RETURNS BOOLEAN AS $$
DECLARE
  uid uuid := rtm.current_user_id();
BEGIN
  IF uid IS NULL THEN RETURN FALSE; END IF;
  RETURN EXISTS (
    SELECT 1 FROM rtm.projects pr
    WHERE pr.id = p AND (pr.manager_id = uid OR pr.pmo_owner_id = uid)
  ) OR EXISTS (
    SELECT 1 FROM rtm.project_members pm
    WHERE pm.project_id = p AND pm.user_id = uid
      AND (pm.end_date IS NULL OR pm.end_date >= CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = rtm, public;


-- =============================================================
--  TABLES
-- =============================================================

-- -------------------------------------------------------------
-- users
--   Bridge between Lark / human identity and the rest of the system.
--   `lark_open_id` will be the JWT 'sub' once OAuth lands.
--   `legacy_id` keeps the old "U001" handles addressable during dev.
-- -------------------------------------------------------------
CREATE TABLE rtm.users (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id          text UNIQUE,                -- e.g. "U001" — drop after full OAuth migration
  lark_open_id       text UNIQUE,                -- populated on first OAuth login
  lark_union_id      text UNIQUE,                -- across Lark apps
  name               text NOT NULL,
  email              citext UNIQUE NOT NULL,
  phone              text,
  role               role_enum NOT NULL,
  city               text,
  account_status     account_status_enum NOT NULL DEFAULT 'Active',
  licence_valid      boolean NOT NULL DEFAULT true,
  licence_expiry     date,
  training_complete  boolean NOT NULL DEFAULT false,
  insurance_eligible boolean NOT NULL DEFAULT true,
  last_login_at      timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX users_role_idx           ON rtm.users(role);
CREATE INDEX users_account_status_idx ON rtm.users(account_status);
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON rtm.users
  FOR EACH ROW EXECUTE FUNCTION rtm.set_updated_at();


-- -------------------------------------------------------------
-- projects
--   Master project table. progress is a manual % from the PM.
-- -------------------------------------------------------------
CREATE TABLE rtm.projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id       text UNIQUE,                  -- e.g. "PRJ-2025-014"
  code            text UNIQUE NOT NULL,         -- human-friendly stable code
  name            text NOT NULL,
  client          text NOT NULL,
  type            text NOT NULL,                -- e.g. "ADAS Testing"
  manager_id      uuid NOT NULL REFERENCES rtm.users(id),
  pmo_owner_id    uuid NOT NULL REFERENCES rtm.users(id),
  region          text,
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  status          project_status_enum NOT NULL DEFAULT 'Draft',
  priority        priority_enum NOT NULL DEFAULT 'Medium',
  vehicles_needed integer NOT NULL DEFAULT 0,
  staff_needed    integer NOT NULL DEFAULT 0,
  plate_needed    boolean NOT NULL DEFAULT false,
  data_req        text,
  progress        smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_dates_chk CHECK (end_date >= start_date)
);
CREATE INDEX projects_status_idx    ON rtm.projects(status);
CREATE INDEX projects_manager_idx   ON rtm.projects(manager_id);
CREATE INDEX projects_pmo_owner_idx ON rtm.projects(pmo_owner_id);
CREATE INDEX projects_dates_idx     ON rtm.projects(start_date, end_date);
CREATE TRIGGER projects_set_updated_at BEFORE UPDATE ON rtm.projects
  FOR EACH ROW EXECUTE FUNCTION rtm.set_updated_at();


-- -------------------------------------------------------------
-- project_members
--   Many-to-many between users and projects, with time-bounded
--   roles (e.g. "Primary engineer 2026-04-22 → 2026-05-15").
-- -------------------------------------------------------------
CREATE TABLE rtm.project_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid NOT NULL REFERENCES rtm.projects(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES rtm.users(id) ON DELETE CASCADE,
  role_in_project text NOT NULL,                -- free text: "Primary driver", "Backup engineer", etc.
  start_date      date NOT NULL DEFAULT CURRENT_DATE,
  end_date        date,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_members_project_idx ON rtm.project_members(project_id);
CREATE INDEX project_members_user_idx    ON rtm.project_members(user_id);
CREATE UNIQUE INDEX project_members_active_unique
  ON rtm.project_members(project_id, user_id)
  WHERE end_date IS NULL;


-- -------------------------------------------------------------
-- vehicles
-- -------------------------------------------------------------
CREATE TABLE rtm.vehicles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id        text UNIQUE,                 -- e.g. "V-001"
  plate            text UNIQUE NOT NULL,        -- road-legal reg, e.g. "LR72 KXP"
  vin              text UNIQUE NOT NULL,
  brand            text NOT NULL,
  model            text NOT NULL,
  year             smallint NOT NULL CHECK (year BETWEEN 1990 AND 2100),
  power            powertrain_enum NOT NULL,
  ownership        ownership_enum NOT NULL,
  city             text,
  current_project_id uuid REFERENCES rtm.projects(id),
  current_driver_id  uuid REFERENCES rtm.users(id),
  status           vehicle_status_enum NOT NULL DEFAULT 'Available',
  insurance        insurance_status_enum NOT NULL DEFAULT 'Covered',
  insurance_expiry date,
  mot_expiry       date NOT NULL,
  road_tax_expiry  date,
  mileage          integer NOT NULL DEFAULT 0 CHECK (mileage >= 0),
  equipment        text[] NOT NULL DEFAULT '{}',
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicles_status_idx     ON rtm.vehicles(status);
CREATE INDEX vehicles_project_idx    ON rtm.vehicles(current_project_id);
CREATE INDEX vehicles_driver_idx     ON rtm.vehicles(current_driver_id);
CREATE INDEX vehicles_mot_expiry_idx ON rtm.vehicles(mot_expiry);
CREATE INDEX vehicles_city_idx       ON rtm.vehicles(city);
CREATE TRIGGER vehicles_set_updated_at BEFORE UPDATE ON rtm.vehicles
  FOR EACH ROW EXECUTE FUNCTION rtm.set_updated_at();


-- -------------------------------------------------------------
-- vehicle_checks
--   Per-session inspection record. The 12-point checklist from
--   the front-end is stored compactly in checklist_state JSONB:
--     {"tyres": "ok", "lights": "ok", "hdd": "bad", ...}
-- -------------------------------------------------------------
CREATE TABLE rtm.vehicle_checks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id        text UNIQUE,
  vehicle_id       uuid NOT NULL REFERENCES rtm.vehicles(id),
  project_id       uuid REFERENCES rtm.projects(id),
  task_id          uuid,                        -- FK added later (forward ref to daily_tasks)
  submitted_by     uuid REFERENCES rtm.users(id),
  check_type       check_type_enum NOT NULL,
  status           check_status_enum NOT NULL,
  performed_at     timestamptz NOT NULL,
  mileage          integer NOT NULL CHECK (mileage >= 0),
  fuel_pct         smallint NOT NULL CHECK (fuel_pct BETWEEN 0 AND 100),
  hdd_free_gb      integer NOT NULL CHECK (hdd_free_gb >= 0),
  issue_found      boolean NOT NULL DEFAULT false,
  checklist_state  jsonb NOT NULL DEFAULT '{}'::jsonb,   -- per-item ok/warning/bad
  photos           jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{path, lark_drive_id, taken_at}]
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX vehicle_checks_vehicle_idx     ON rtm.vehicle_checks(vehicle_id);
CREATE INDEX vehicle_checks_project_idx     ON rtm.vehicle_checks(project_id);
CREATE INDEX vehicle_checks_performed_idx   ON rtm.vehicle_checks(performed_at DESC);
CREATE INDEX vehicle_checks_status_idx      ON rtm.vehicle_checks(status);


-- -------------------------------------------------------------
-- plates  (Trade plates + temporary plates)
-- -------------------------------------------------------------
CREATE TABLE rtm.plates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id           text UNIQUE,
  number              text UNIQUE NOT NULL,     -- e.g. "TX 1245"
  type                plate_type_enum NOT NULL,
  valid_from          date NOT NULL,
  valid_to            date NOT NULL,
  status              plate_status_enum NOT NULL DEFAULT 'Available',
  current_project_id  uuid REFERENCES rtm.projects(id),
  current_vehicle_id  uuid REFERENCES rtm.vehicles(id),
  responsible_user_id uuid NOT NULL REFERENCES rtm.users(id),
  document_ref        text,                     -- Lark Drive id of the physical permit doc
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plates_dates_chk CHECK (valid_to >= valid_from)
);
CREATE INDEX plates_status_idx     ON rtm.plates(status);
CREATE INDEX plates_valid_to_idx   ON rtm.plates(valid_to);
CREATE INDEX plates_responsible_idx ON rtm.plates(responsible_user_id);
CREATE TRIGGER plates_set_updated_at BEFORE UPDATE ON rtm.plates
  FOR EACH ROW EXECUTE FUNCTION rtm.set_updated_at();


-- -------------------------------------------------------------
-- plate_allocations
--   Bookings on the plate timeline. The `conflict` flag is
--   computed by a trigger so the UI doesn't have to detect overlaps.
-- -------------------------------------------------------------
CREATE TABLE rtm.plate_allocations (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id            text UNIQUE,
  plate_id             uuid NOT NULL REFERENCES rtm.plates(id) ON DELETE CASCADE,
  project_id           uuid NOT NULL REFERENCES rtm.projects(id),
  vehicle_id           uuid NOT NULL REFERENCES rtm.vehicles(id),
  responsible_user_id  uuid NOT NULL REFERENCES rtm.users(id),
  start_date           date NOT NULL,
  end_date             date NOT NULL,
  conflict             boolean NOT NULL DEFAULT false,
  notes                text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plate_alloc_dates_chk CHECK (end_date >= start_date)
);
CREATE INDEX plate_alloc_plate_idx   ON rtm.plate_allocations(plate_id);
CREATE INDEX plate_alloc_project_idx ON rtm.plate_allocations(project_id);
CREATE INDEX plate_alloc_dates_idx   ON rtm.plate_allocations(start_date, end_date);

-- Conflict detection trigger: marks ANY overlapping allocations on the same
-- plate as conflict = true on insert / update.
CREATE OR REPLACE FUNCTION rtm.detect_plate_conflicts()
RETURNS TRIGGER AS $$
BEGIN
  -- Flag this row if any other allocation on the same plate overlaps.
  IF EXISTS (
    SELECT 1 FROM rtm.plate_allocations
    WHERE plate_id = NEW.plate_id
      AND id <> NEW.id
      AND daterange(start_date, end_date, '[]') &&
          daterange(NEW.start_date, NEW.end_date, '[]')
  ) THEN
    NEW.conflict := true;
  ELSE
    NEW.conflict := false;
  END IF;

  -- Also re-flag any sibling rows on the same plate that overlap.
  UPDATE rtm.plate_allocations
     SET conflict = true
   WHERE plate_id = NEW.plate_id
     AND id <> NEW.id
     AND daterange(start_date, end_date, '[]') &&
         daterange(NEW.start_date, NEW.end_date, '[]');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER plate_alloc_conflict_check
  BEFORE INSERT OR UPDATE OF plate_id, start_date, end_date
  ON rtm.plate_allocations
  FOR EACH ROW EXECUTE FUNCTION rtm.detect_plate_conflicts();


-- -------------------------------------------------------------
-- routes
-- -------------------------------------------------------------
CREATE TABLE rtm.routes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   text UNIQUE,
  project_id  uuid REFERENCES rtm.projects(id),
  name        text NOT NULL,
  city        text,
  region      text,
  type        route_type_enum NOT NULL,
  start_point text,
  end_point   text,
  distance_mi numeric(6,1) NOT NULL CHECK (distance_mi >= 0),
  duration    interval,                          -- "1 hour 10 minutes"
  risk_level  risk_level_enum NOT NULL DEFAULT 'Low',
  maps_link   text,
  gpx_file    text,                              -- Lark Drive ref / S3 key
  status      route_status_enum NOT NULL DEFAULT 'Draft',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX routes_project_idx    ON rtm.routes(project_id);
CREATE INDEX routes_status_idx     ON rtm.routes(status);
CREATE INDEX routes_risk_level_idx ON rtm.routes(risk_level);
CREATE TRIGGER routes_set_updated_at BEFORE UPDATE ON rtm.routes
  FOR EACH ROW EXECUTE FUNCTION rtm.set_updated_at();


-- -------------------------------------------------------------
-- pois  (Points of Interest along routes)
-- -------------------------------------------------------------
CREATE TABLE rtm.pois (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id   text UNIQUE,
  route_id    uuid REFERENCES rtm.routes(id) ON DELETE SET NULL,
  project_id  uuid REFERENCES rtm.projects(id),
  name        text NOT NULL,
  type        poi_type_enum NOT NULL,
  address     text,
  city        text,
  lat         numeric(9,6) NOT NULL,
  lng         numeric(9,6) NOT NULL,
  photo_ref   text,                              -- Lark Drive id or null
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pois_route_idx   ON rtm.pois(route_id);
CREATE INDEX pois_project_idx ON rtm.pois(project_id);
CREATE INDEX pois_type_idx    ON rtm.pois(type);


-- -------------------------------------------------------------
-- daily_tasks
-- -------------------------------------------------------------
CREATE TABLE rtm.daily_tasks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id        text UNIQUE,
  task_date        date NOT NULL,
  project_id       uuid NOT NULL REFERENCES rtm.projects(id),
  vehicle_id       uuid REFERENCES rtm.vehicles(id),
  driver_id        uuid REFERENCES rtm.users(id),
  engineer_id      uuid REFERENCES rtm.users(id),
  route_id         uuid REFERENCES rtm.routes(id),
  start_point      text,
  end_point        text,
  planned_start_at timestamptz,
  planned_end_at   timestamptz,
  actual_start_at  timestamptz,
  actual_end_at    timestamptz,
  planned_hours    numeric(4,1) NOT NULL CHECK (planned_hours >= 0),
  actual_hours     numeric(4,1) CHECK (actual_hours IS NULL OR actual_hours >= 0),
  status           task_status_enum NOT NULL DEFAULT 'Planned',
  data_req         text,
  hdd_state        text,                          -- e.g. "412 GB free at start"
  notes            text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX daily_tasks_date_idx     ON rtm.daily_tasks(task_date);
CREATE INDEX daily_tasks_project_idx  ON rtm.daily_tasks(project_id);
CREATE INDEX daily_tasks_driver_idx   ON rtm.daily_tasks(driver_id);
CREATE INDEX daily_tasks_engineer_idx ON rtm.daily_tasks(engineer_id);
CREATE INDEX daily_tasks_vehicle_idx  ON rtm.daily_tasks(vehicle_id);
CREATE INDEX daily_tasks_status_idx   ON rtm.daily_tasks(status);
CREATE TRIGGER daily_tasks_set_updated_at BEFORE UPDATE ON rtm.daily_tasks
  FOR EACH ROW EXECUTE FUNCTION rtm.set_updated_at();

-- Now add the forward-ref FK from vehicle_checks.task_id → daily_tasks.id
ALTER TABLE rtm.vehicle_checks
  ADD CONSTRAINT vehicle_checks_task_fk
  FOREIGN KEY (task_id) REFERENCES rtm.daily_tasks(id) ON DELETE SET NULL;


-- -------------------------------------------------------------
-- attendance_records
-- -------------------------------------------------------------
CREATE TABLE rtm.attendance_records (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id         text UNIQUE,
  user_id           uuid NOT NULL REFERENCES rtm.users(id),
  project_id        uuid REFERENCES rtm.projects(id),
  task_id           uuid REFERENCES rtm.daily_tasks(id),
  vehicle_id        uuid REFERENCES rtm.vehicles(id),
  event_type        attendance_type_enum NOT NULL,
  status            attendance_status_enum NOT NULL DEFAULT 'Normal',
  event_at          timestamptz NOT NULL,
  location          text,
  lat               numeric(9,6),
  lng               numeric(9,6),
  has_photo         boolean NOT NULL DEFAULT false,
  photo_ref         text,
  manual_correction boolean NOT NULL DEFAULT false,
  correction_reason text,
  corrected_by      uuid REFERENCES rtm.users(id),
  corrected_at      timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attendance_user_idx     ON rtm.attendance_records(user_id);
CREATE INDEX attendance_project_idx  ON rtm.attendance_records(project_id);
CREATE INDEX attendance_task_idx     ON rtm.attendance_records(task_id);
CREATE INDEX attendance_event_at_idx ON rtm.attendance_records(event_at DESC);
CREATE INDEX attendance_status_idx   ON rtm.attendance_records(status);


-- -------------------------------------------------------------
-- issues
-- -------------------------------------------------------------
CREATE TABLE rtm.issues (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id       text UNIQUE,
  title           text NOT NULL,
  description     text,
  type            issue_type_enum NOT NULL,
  severity        issue_severity_enum NOT NULL,
  status          issue_status_enum NOT NULL DEFAULT 'Open',
  project_id      uuid REFERENCES rtm.projects(id),
  vehicle_id      uuid REFERENCES rtm.vehicles(id),
  task_id         uuid REFERENCES rtm.daily_tasks(id),
  reported_by     uuid NOT NULL REFERENCES rtm.users(id),
  reported_at     timestamptz NOT NULL DEFAULT now(),
  owner_id        uuid REFERENCES rtm.users(id),
  resolution      text,
  resolved_at     timestamptz,
  attachments     jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX issues_project_idx  ON rtm.issues(project_id);
CREATE INDEX issues_vehicle_idx  ON rtm.issues(vehicle_id);
CREATE INDEX issues_owner_idx    ON rtm.issues(owner_id);
CREATE INDEX issues_status_idx   ON rtm.issues(status);
CREATE INDEX issues_severity_idx ON rtm.issues(severity);
CREATE INDEX issues_reported_idx ON rtm.issues(reported_at DESC);
CREATE TRIGGER issues_set_updated_at BEFORE UPDATE ON rtm.issues
  FOR EACH ROW EXECUTE FUNCTION rtm.set_updated_at();


-- -------------------------------------------------------------
-- expenses
-- -------------------------------------------------------------
CREATE TABLE rtm.expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id     text UNIQUE,
  applicant_id  uuid NOT NULL REFERENCES rtm.users(id),
  project_id    uuid REFERENCES rtm.projects(id),
  vehicle_id    uuid REFERENCES rtm.vehicles(id),
  category      expense_category_enum NOT NULL,
  amount        numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency      currency_enum NOT NULL DEFAULT 'GBP',
  expense_date  date NOT NULL,
  description   text,
  receipt_ref   text,                              -- Lark Drive id / Supabase storage path
  status        expense_status_enum NOT NULL DEFAULT 'Draft',
  approver_id   uuid REFERENCES rtm.users(id),
  approved_at   timestamptz,
  paid_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX expenses_applicant_idx ON rtm.expenses(applicant_id);
CREATE INDEX expenses_project_idx   ON rtm.expenses(project_id);
CREATE INDEX expenses_status_idx    ON rtm.expenses(status);
CREATE INDEX expenses_date_idx      ON rtm.expenses(expense_date DESC);
CREATE INDEX expenses_approver_idx  ON rtm.expenses(approver_id);
CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON rtm.expenses
  FOR EACH ROW EXECUTE FUNCTION rtm.set_updated_at();


-- -------------------------------------------------------------
-- files
--   Index of binary content held in Lark Drive / Supabase Storage.
-- -------------------------------------------------------------
CREATE TABLE rtm.files (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id         text UNIQUE,
  project_id        uuid REFERENCES rtm.projects(id),
  related_id        text,                          -- e.g. "R-001" or "DT-2461" — generic reference
  category          text NOT NULL,                 -- free-form, e.g. "Daily Report", "Project Contract"
  name              text NOT NULL,
  size_bytes        bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
  mime_type         text,
  storage_provider  text NOT NULL DEFAULT 'lark_drive', -- 'lark_drive' | 'supabase_storage' | 's3'
  lark_drive_ref    text,                          -- e.g. "shtcnXXX"
  storage_path      text,                          -- Supabase Storage bucket path
  external_url      text,
  version           text NOT NULL DEFAULT 'v1.0',
  permission        file_permission_enum NOT NULL DEFAULT 'Project',
  uploaded_by       uuid NOT NULL REFERENCES rtm.users(id),
  uploaded_at       timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX files_project_idx    ON rtm.files(project_id);
CREATE INDEX files_category_idx   ON rtm.files(category);
CREATE INDEX files_uploaded_idx   ON rtm.files(uploaded_at DESC);
CREATE INDEX files_uploader_idx   ON rtm.files(uploaded_by);


-- -------------------------------------------------------------
-- audit_logs
--   Append-only. The Workers backend writes here on every mutation.
-- -------------------------------------------------------------
CREATE TABLE rtm.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid REFERENCES rtm.users(id),
  entity_type text NOT NULL,                       -- 'project' | 'expense' | 'plate_allocation' ...
  entity_id   uuid,
  action      audit_action_enum NOT NULL,
  before_data jsonb,
  after_data  jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_actor_idx    ON rtm.audit_logs(actor_id);
CREATE INDEX audit_logs_entity_idx   ON rtm.audit_logs(entity_type, entity_id);
CREATE INDEX audit_logs_created_idx  ON rtm.audit_logs(created_at DESC);


-- -------------------------------------------------------------
-- settings
--   Single-row config store. Use category+key as the natural key.
--   Secrets DO NOT go here — they live in Cloudflare Workers secret bindings.
-- -------------------------------------------------------------
CREATE TABLE rtm.settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category    text NOT NULL,                       -- 'lark' | 'notifications' | 'backup' | ...
  key         text NOT NULL,
  value       jsonb NOT NULL,
  description text,
  updated_by  uuid REFERENCES rtm.users(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category, key)
);
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON rtm.settings
  FOR EACH ROW EXECUTE FUNCTION rtm.set_updated_at();


-- =============================================================
--  ROW LEVEL SECURITY (Draft — see docs/rls-policy-notes.md)
-- =============================================================

ALTER TABLE rtm.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.projects           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.project_members    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.vehicles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.vehicle_checks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.plates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.plate_allocations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.routes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.pois               ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.daily_tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.issues             ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.expenses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.files              ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.audit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm.settings           ENABLE ROW LEVEL SECURITY;

-- --- USERS ---------------------------------------------------
-- Everyone reads everyone's basic profile (needed for "@mention" / avatar lookup).
-- Only Admin / PMO can modify other users.
CREATE POLICY users_select_all       ON rtm.users
  FOR SELECT  USING (rtm.current_user_id() IS NOT NULL);

CREATE POLICY users_update_admin     ON rtm.users
  FOR UPDATE  USING (rtm.has_role('Admin', 'PMO'));

CREATE POLICY users_self_update      ON rtm.users
  FOR UPDATE  USING (id = rtm.current_user_id());

-- --- PROJECTS ------------------------------------------------
-- Admin / PMO / Finance: read all.
-- PM: read projects they manage or own.
-- Driver / Engineer: read projects they are members of (incl. daily_tasks).
CREATE POLICY projects_select        ON rtm.projects
  FOR SELECT  USING (
    rtm.has_role('Admin','PMO','Finance') OR rtm.is_project_member(id)
  );

CREATE POLICY projects_modify_pmo    ON rtm.projects
  FOR ALL     USING (rtm.has_role('Admin','PMO'));

CREATE POLICY projects_modify_pm     ON rtm.projects
  FOR UPDATE  USING (manager_id = rtm.current_user_id());

-- --- PROJECT MEMBERS ----------------------------------------
CREATE POLICY pm_select              ON rtm.project_members
  FOR SELECT  USING (rtm.has_role('Admin','PMO') OR rtm.is_project_member(project_id));

CREATE POLICY pm_modify              ON rtm.project_members
  FOR ALL     USING (
    rtm.has_role('Admin','PMO') OR
    (rtm.has_role('Project Manager') AND
       EXISTS (SELECT 1 FROM rtm.projects p
               WHERE p.id = project_id AND p.manager_id = rtm.current_user_id()))
  );

-- --- VEHICLES ------------------------------------------------
-- All authenticated roles can read; only Admin/PMO modify.
CREATE POLICY vehicles_select        ON rtm.vehicles
  FOR SELECT  USING (rtm.current_user_id() IS NOT NULL);

CREATE POLICY vehicles_modify        ON rtm.vehicles
  FOR ALL     USING (rtm.has_role('Admin','PMO'));

-- --- VEHICLE CHECKS -----------------------------------------
-- Drivers see only their own checks. PM / PMO / Admin see all.
CREATE POLICY vc_select_self         ON rtm.vehicle_checks
  FOR SELECT  USING (
    submitted_by = rtm.current_user_id()
    OR rtm.has_role('Admin','PMO')
    OR rtm.is_project_member(project_id)
  );

CREATE POLICY vc_insert_self         ON rtm.vehicle_checks
  FOR INSERT  WITH CHECK (submitted_by = rtm.current_user_id());

-- --- PLATES + ALLOCATIONS -----------------------------------
-- Read for everyone, write for Admin / PMO only.
CREATE POLICY plates_select          ON rtm.plates
  FOR SELECT  USING (rtm.current_user_id() IS NOT NULL);
CREATE POLICY plates_modify          ON rtm.plates
  FOR ALL     USING (rtm.has_role('Admin','PMO'));

CREATE POLICY pa_select              ON rtm.plate_allocations
  FOR SELECT  USING (rtm.current_user_id() IS NOT NULL);
CREATE POLICY pa_modify              ON rtm.plate_allocations
  FOR ALL     USING (
    rtm.has_role('Admin','PMO') OR
    (rtm.has_role('Project Manager') AND
       EXISTS (SELECT 1 FROM rtm.projects p
               WHERE p.id = project_id AND p.manager_id = rtm.current_user_id()))
  );

-- --- ROUTES + POIS -----------------------------------------
CREATE POLICY routes_select          ON rtm.routes
  FOR SELECT  USING (
    rtm.has_role('Admin','PMO') OR rtm.is_project_member(project_id) OR project_id IS NULL
  );
CREATE POLICY routes_modify          ON rtm.routes
  FOR ALL     USING (
    rtm.has_role('Admin','PMO') OR
    (rtm.has_role('Project Manager') AND
       EXISTS (SELECT 1 FROM rtm.projects p
               WHERE p.id = project_id AND p.manager_id = rtm.current_user_id()))
  );

CREATE POLICY pois_select            ON rtm.pois
  FOR SELECT  USING (
    rtm.has_role('Admin','PMO') OR rtm.is_project_member(project_id) OR project_id IS NULL
  );
CREATE POLICY pois_modify            ON rtm.pois
  FOR ALL     USING (
    rtm.has_role('Admin','PMO') OR
    (rtm.has_role('Project Manager') AND
       EXISTS (SELECT 1 FROM rtm.projects p
               WHERE p.id = project_id AND p.manager_id = rtm.current_user_id()))
  );

-- --- DAILY TASKS --------------------------------------------
-- Drivers / Engineers see only tasks where they are assigned.
CREATE POLICY tasks_select           ON rtm.daily_tasks
  FOR SELECT  USING (
    rtm.has_role('Admin','PMO','Finance')
    OR rtm.is_project_member(project_id)
    OR driver_id   = rtm.current_user_id()
    OR engineer_id = rtm.current_user_id()
  );

CREATE POLICY tasks_modify           ON rtm.daily_tasks
  FOR ALL     USING (
    rtm.has_role('Admin','PMO') OR
    (rtm.has_role('Project Manager') AND
       EXISTS (SELECT 1 FROM rtm.projects p
               WHERE p.id = project_id AND p.manager_id = rtm.current_user_id()))
  );

-- --- ATTENDANCE ---------------------------------------------
-- Driver / Engineer: see and create only their own records.
-- PM / PMO / Admin: full visibility.
CREATE POLICY att_select             ON rtm.attendance_records
  FOR SELECT  USING (
    user_id = rtm.current_user_id()
    OR rtm.has_role('Admin','PMO')
    OR rtm.is_project_member(project_id)
  );

CREATE POLICY att_insert_self        ON rtm.attendance_records
  FOR INSERT  WITH CHECK (user_id = rtm.current_user_id());

CREATE POLICY att_correct_admin      ON rtm.attendance_records
  FOR UPDATE  USING (rtm.has_role('Admin','PMO'));

-- --- ISSUES -------------------------------------------------
CREATE POLICY issues_select          ON rtm.issues
  FOR SELECT  USING (
    rtm.has_role('Admin','PMO')
    OR rtm.is_project_member(project_id)
    OR reported_by = rtm.current_user_id()
    OR owner_id    = rtm.current_user_id()
  );
CREATE POLICY issues_insert          ON rtm.issues
  FOR INSERT  WITH CHECK (reported_by = rtm.current_user_id());

CREATE POLICY issues_update          ON rtm.issues
  FOR UPDATE  USING (
    rtm.has_role('Admin','PMO')
    OR owner_id    = rtm.current_user_id()
    OR (rtm.has_role('Project Manager') AND
        EXISTS (SELECT 1 FROM rtm.projects p
                WHERE p.id = project_id AND p.manager_id = rtm.current_user_id()))
  );

-- --- EXPENSES -----------------------------------------------
-- Applicant sees own; PM sees their projects'; Finance / PMO / Admin see all.
CREATE POLICY exp_select             ON rtm.expenses
  FOR SELECT  USING (
    applicant_id = rtm.current_user_id()
    OR approver_id = rtm.current_user_id()
    OR rtm.has_role('Admin','PMO','Finance')
    OR rtm.is_project_member(project_id)
  );

CREATE POLICY exp_insert_self        ON rtm.expenses
  FOR INSERT  WITH CHECK (applicant_id = rtm.current_user_id());

CREATE POLICY exp_update             ON rtm.expenses
  FOR UPDATE  USING (
    -- Applicant can edit only Drafts of their own
    (applicant_id = rtm.current_user_id() AND status = 'Draft')
    OR rtm.has_role('Admin','PMO','Finance')
    OR (rtm.has_role('Project Manager') AND
        EXISTS (SELECT 1 FROM rtm.projects p
                WHERE p.id = project_id AND p.manager_id = rtm.current_user_id()))
  );

-- --- FILES --------------------------------------------------
CREATE POLICY files_select           ON rtm.files
  FOR SELECT  USING (
    permission = 'Public'
    OR uploaded_by = rtm.current_user_id()
    OR rtm.has_role('Admin','PMO')
    OR (permission = 'Project' AND rtm.is_project_member(project_id))
  );
CREATE POLICY files_insert           ON rtm.files
  FOR INSERT  WITH CHECK (uploaded_by = rtm.current_user_id());

-- --- AUDIT LOG ----------------------------------------------
-- Read-only for Admin / PMO. Inserts come from Workers (service role bypasses RLS).
CREATE POLICY audit_select_admin     ON rtm.audit_logs
  FOR SELECT  USING (rtm.has_role('Admin','PMO'));

-- --- SETTINGS -----------------------------------------------
-- Read by Admin / PMO only. Write by Admin only.
CREATE POLICY settings_select        ON rtm.settings
  FOR SELECT  USING (rtm.has_role('Admin','PMO'));
CREATE POLICY settings_modify        ON rtm.settings
  FOR ALL     USING (rtm.has_role('Admin'));


-- =============================================================
--  GRANTS — required so Supabase's PostgREST (anon / authenticated
--  roles) can see and call objects in the rtm schema.
--
--  Security model:
--    - The browser NEVER talks to PostgREST directly with the anon
--      key. All client traffic goes through Cloudflare Workers.
--    - Workers uses the SERVICE ROLE key which bypasses RLS entirely.
--    - These grants exist so that, if you ever wire PostgREST direct
--      access (e.g. for the Supabase dashboard), RLS still gates rows.
-- =============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON SCHEMA rtm TO anon;
    GRANT SELECT ON ALL TABLES IN SCHEMA rtm TO anon;
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rtm TO anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT USAGE ON SCHEMA rtm TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA rtm TO authenticated;
    EXECUTE 'GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA rtm TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT USAGE ON SCHEMA rtm TO service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA rtm TO service_role;
    EXECUTE 'GRANT ALL ON ALL FUNCTIONS IN SCHEMA rtm TO service_role';
  END IF;
END $$;


-- =============================================================
--  COMMENTS — documentation for Supabase Table Editor
-- =============================================================

COMMENT ON SCHEMA rtm                   IS 'Road Test Management ERP — all application tables';

COMMENT ON TABLE rtm.users              IS 'System users, bridged to Lark identity via lark_open_id';
COMMENT ON TABLE rtm.projects           IS 'Master project table (one row per client engagement)';
COMMENT ON TABLE rtm.project_members    IS 'Many-to-many: users assigned to projects with time-bounded roles';
COMMENT ON TABLE rtm.vehicles           IS 'Fleet vehicles (incl. EV, hybrid and ICE)';
COMMENT ON TABLE rtm.vehicle_checks     IS 'Pre/Post-drive inspection records with 12-item JSONB checklist';
COMMENT ON TABLE rtm.plates             IS 'Trade plates + temporary plates (the physical permits)';
COMMENT ON TABLE rtm.plate_allocations  IS 'Plate bookings; conflict flag auto-maintained by trigger';
COMMENT ON TABLE rtm.routes             IS 'Test routes with risk level + Maps/GPX references';
COMMENT ON TABLE rtm.pois               IS 'Points of interest along routes (charging, parking, risk, etc.)';
COMMENT ON TABLE rtm.daily_tasks        IS 'Daily testing tasks — one row per (date, driver, vehicle)';
COMMENT ON TABLE rtm.attendance_records IS 'Clock-in/out and milestone events from the driver mobile app';
COMMENT ON TABLE rtm.issues             IS 'Operational issues and risks raised in the field';
COMMENT ON TABLE rtm.expenses           IS 'Driver/Engineer expense claims with approval workflow';
COMMENT ON TABLE rtm.files              IS 'Index of files held in Lark Drive or Supabase Storage';
COMMENT ON TABLE rtm.audit_logs         IS 'Append-only operation log; populated by Workers backend';
COMMENT ON TABLE rtm.settings           IS 'Non-secret system configuration (Lark sync flags, schedules, etc.)';

-- =============================================================
--  End of 001_initial_schema.sql
-- =============================================================
