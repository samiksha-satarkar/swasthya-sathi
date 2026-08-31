-- ============================================================
-- SwasthyaSathi · Migration 002: Village-Based Access + Audit Log
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================
--
-- Access model:
--   ASHA workers are assigned to villages. A worker sees ALL patients
--   in their assigned villages, regardless of who created the record.
--   This is deliberate: workers may be unavailable, and patient care
--   cannot wait for a specific worker to return.
--
-- Soft-delete on village assignments:
--   Removing a worker from a village sets removed_at, does NOT delete
--   the row. This preserves an audit trail of who had access when.
--   RLS checks removed_at IS NULL so access is revoked immediately.
--
-- Audit logging:
--   Ships with this migration, not deferred. Every patient action
--   (view/create/update/delete) must produce an audit_log row.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ══════════════════════════════════════════════════════════════
-- 1. WORKER_VILLAGES — junction table with soft-delete
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS worker_villages (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  village        TEXT        NOT NULL,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  removed_at     TIMESTAMPTZ           -- NULL = active assignment; set = revoked
);

-- A user can have at most one ACTIVE assignment per village.
-- They may have multiple historical (removed_at IS NOT NULL) rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wv_active_assignment
  ON worker_villages (user_id, village)
  WHERE removed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_wv_user_id ON worker_villages (user_id);
CREATE INDEX IF NOT EXISTS idx_wv_village ON worker_villages (village);
CREATE INDEX IF NOT EXISTS idx_wv_active  ON worker_villages (user_id) WHERE removed_at IS NULL;

-- RLS
ALTER TABLE worker_villages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workers see own villages" ON worker_villages;
CREATE POLICY "Workers see own villages"
  ON worker_villages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Workers insert own villages" ON worker_villages;
CREATE POLICY "Workers insert own villages"
  ON worker_villages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Workers can update their own rows (to set removed_at)
DROP POLICY IF EXISTS "Workers update own villages" ON worker_villages;
CREATE POLICY "Workers update own villages"
  ON worker_villages FOR UPDATE
  USING (auth.uid() = user_id);

-- No hard delete allowed — soft-delete only via removed_at
-- (No DELETE policy means DELETE operations will be denied by RLS)


-- ══════════════════════════════════════════════════════════════
-- 2. ADD created_by TO PATIENTS
-- ══════════════════════════════════════════════════════════════
-- Tracks which worker created the record (for audit, not for access).

ALTER TABLE patients ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);


-- ══════════════════════════════════════════════════════════════
-- 3. PATIENTS RLS — village-based, checks removed_at IS NULL
-- ══════════════════════════════════════════════════════════════

-- Drop ALL old policies (both the original open ones and any from
-- a previous version of this migration)
DROP POLICY IF EXISTS "Allow public read on patients"   ON patients;
DROP POLICY IF EXISTS "Allow public insert on patients" ON patients;
DROP POLICY IF EXISTS "Allow public update on patients" ON patients;
DROP POLICY IF EXISTS "Allow public delete on patients" ON patients;
DROP POLICY IF EXISTS "Workers see patients in assigned villages"    ON patients;
DROP POLICY IF EXISTS "Workers insert patients in assigned villages" ON patients;
DROP POLICY IF EXISTS "Workers update patients in assigned villages" ON patients;
DROP POLICY IF EXISTS "Workers delete patients in assigned villages" ON patients;

-- SELECT: Worker can see patients in their ACTIVE assigned villages
CREATE POLICY "village_select"
  ON patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM worker_villages wv
      WHERE wv.user_id = auth.uid()
        AND wv.village = patients.village
        AND wv.removed_at IS NULL
    )
  );

-- INSERT: Worker can add patients to their ACTIVE assigned villages
CREATE POLICY "village_insert"
  ON patients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM worker_villages wv
      WHERE wv.user_id = auth.uid()
        AND wv.village = patients.village
        AND wv.removed_at IS NULL
    )
  );

-- UPDATE: Worker can update patients in their ACTIVE assigned villages
CREATE POLICY "village_update"
  ON patients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM worker_villages wv
      WHERE wv.user_id = auth.uid()
        AND wv.village = patients.village
        AND wv.removed_at IS NULL
    )
  );

-- DELETE: Worker can delete patients in their ACTIVE assigned villages
CREATE POLICY "village_delete"
  ON patients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM worker_villages wv
      WHERE wv.user_id = auth.uid()
        AND wv.village = patients.village
        AND wv.removed_at IS NULL
    )
  );


-- ══════════════════════════════════════════════════════════════
-- 4. AUDIT_LOG TABLE
-- ══════════════════════════════════════════════════════════════
-- Records every patient action. API routes must insert here
-- BEFORE returning success — if the audit insert fails, the
-- entire request must fail.

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id   UUID        NOT NULL REFERENCES auth.users(id),
  patient_id  UUID,       -- nullable for failed creates where no id exists yet
  action      TEXT        NOT NULL CHECK (action IN ('view', 'create', 'update', 'delete')),
  detail      JSONB,      -- optional extra context (e.g. which fields changed)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_worker   ON audit_log (worker_id);
CREATE INDEX IF NOT EXISTS idx_audit_patient  ON audit_log (patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_action   ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_created  ON audit_log (created_at DESC);

-- RLS: Workers can INSERT audit rows for themselves, and SELECT their own rows.
-- No UPDATE or DELETE — audit log is append-only.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workers insert own audit" ON audit_log;
CREATE POLICY "Workers insert own audit"
  ON audit_log FOR INSERT
  WITH CHECK (auth.uid() = worker_id);

DROP POLICY IF EXISTS "Workers read own audit" ON audit_log;
CREATE POLICY "Workers read own audit"
  ON audit_log FOR SELECT
  USING (auth.uid() = worker_id);


-- ══════════════════════════════════════════════════════════════
-- 5. ASHA_WORKERS RLS — per-user profile
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Allow public read on asha"   ON asha_workers;
DROP POLICY IF EXISTS "Allow public insert on asha" ON asha_workers;
DROP POLICY IF EXISTS "Allow public update on asha" ON asha_workers;
DROP POLICY IF EXISTS "Workers see own profile"     ON asha_workers;
DROP POLICY IF EXISTS "Workers insert own profile"  ON asha_workers;
DROP POLICY IF EXISTS "Workers update own profile"  ON asha_workers;

CREATE POLICY "asha_select"
  ON asha_workers FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "asha_insert"
  ON asha_workers FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "asha_update"
  ON asha_workers FOR UPDATE
  USING (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════
-- 6. HELPER FUNCTION: active villages for current user
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_my_villages()
RETURNS TABLE(village TEXT) AS $$
  SELECT wv.village
  FROM worker_villages wv
  WHERE wv.user_id = auth.uid()
    AND wv.removed_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
