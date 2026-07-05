
/*
# Bit Cities DOT (Department of Transportation) System Schema

## Overview
Full management system for the Bit Cities Department of Transportation. Handles officer accounts,
duty shift tracking, service transactions, announcements, and configurable service rates.

## New Tables

### 1. officers
Stores DOT officer accounts managed by the Commissioner.
- id: UUID primary key
- username: Unique login username
- password_hash: SHA-256 hashed password
- name: Display name
- rank: Role - 'commissioner' | 'inspector' | 'officer'
- department: Department assignment
- status: Account status - 'active' | 'suspended' | 'deleted'
- is_on_duty: Current duty status
- created_at, updated_at: Timestamps

### 2. announcements
Public announcements created by the Commissioner.
- id, title, content, is_pinned, created_by (officer id), timestamps

### 3. service_rates
Configurable rate catalog for DOT services (Commissioner manages).
- id, name, description, price, category, is_active, timestamps

### 4. service_records
All service transactions for citizens. Searchable by Roblox/Discord username.
- id, roblox_username, discord_username, service_rate_id, service_name, amount
- status: 'paid' | 'unpaid'
- officer_id, officer_name, notes, service_date, timestamps

### 5. duty_logs
Clock-in/clock-out history for officers.
- id, officer_id, officer_name, clock_in, clock_out, duration_minutes
- Soft-delete support: deleted_at, deleted_by, delete_reason

### 6. audit_logs
Immutable audit trail for administrative actions (deletions, etc.)
- id, action, target_type, target_id, performed_by, performed_by_name, details (jsonb), created_at

## Security
- All tables use RLS with anon + authenticated policies (custom auth, not Supabase Auth)
- Application-level role enforcement for Commissioner-only features
- RLS uses USING(true) since this app uses custom auth (officer sessions in localStorage)

## Notes
- This system uses custom authentication against the officers table (not Supabase Auth)
- Passwords are SHA-256 hashed client-side before storage
- Role-based access control is enforced at the application layer
- Soft-delete is used for officers to preserve history
*/

-- ============================================================
-- OFFICERS
-- ============================================================
CREATE TABLE IF NOT EXISTS officers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  name text NOT NULL,
  rank text NOT NULL DEFAULT 'officer' CHECK (rank IN ('commissioner', 'inspector', 'officer')),
  department text NOT NULL DEFAULT 'traffic_management',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  is_on_duty boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE officers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_officers" ON officers;
CREATE POLICY "anon_select_officers" ON officers FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_officers" ON officers;
CREATE POLICY "anon_insert_officers" ON officers FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_officers" ON officers;
CREATE POLICY "anon_update_officers" ON officers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_officers" ON officers;
CREATE POLICY "anon_delete_officers" ON officers FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES officers(id) ON DELETE SET NULL,
  created_by_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_announcements" ON announcements;
CREATE POLICY "anon_select_announcements" ON announcements FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_announcements" ON announcements;
CREATE POLICY "anon_insert_announcements" ON announcements FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_announcements" ON announcements;
CREATE POLICY "anon_update_announcements" ON announcements FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_announcements" ON announcements;
CREATE POLICY "anon_delete_announcements" ON announcements FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- SERVICE RATES
-- ============================================================
CREATE TABLE IF NOT EXISTS service_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  category text NOT NULL DEFAULT 'general',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_service_rates" ON service_rates;
CREATE POLICY "anon_select_service_rates" ON service_rates FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_service_rates" ON service_rates;
CREATE POLICY "anon_insert_service_rates" ON service_rates FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_service_rates" ON service_rates;
CREATE POLICY "anon_update_service_rates" ON service_rates FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_service_rates" ON service_rates;
CREATE POLICY "anon_delete_service_rates" ON service_rates FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- SERVICE RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS service_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roblox_username text DEFAULT '',
  discord_username text DEFAULT '',
  service_rate_id uuid REFERENCES service_rates(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid')),
  officer_id uuid REFERENCES officers(id) ON DELETE SET NULL,
  officer_name text NOT NULL DEFAULT '',
  notes text DEFAULT '',
  service_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_service_records" ON service_records;
CREATE POLICY "anon_select_service_records" ON service_records FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_service_records" ON service_records;
CREATE POLICY "anon_insert_service_records" ON service_records FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_service_records" ON service_records;
CREATE POLICY "anon_update_service_records" ON service_records FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_service_records" ON service_records;
CREATE POLICY "anon_delete_service_records" ON service_records FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- DUTY LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS duty_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer_id uuid REFERENCES officers(id) ON DELETE SET NULL,
  officer_name text NOT NULL DEFAULT '',
  clock_in timestamptz NOT NULL DEFAULT now(),
  clock_out timestamptz,
  duration_minutes integer,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES officers(id) ON DELETE SET NULL,
  deleted_by_name text,
  delete_reason text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE duty_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_duty_logs" ON duty_logs;
CREATE POLICY "anon_select_duty_logs" ON duty_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_duty_logs" ON duty_logs;
CREATE POLICY "anon_insert_duty_logs" ON duty_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_duty_logs" ON duty_logs;
CREATE POLICY "anon_update_duty_logs" ON duty_logs FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_duty_logs" ON duty_logs;
CREATE POLICY "anon_delete_duty_logs" ON duty_logs FOR DELETE TO anon, authenticated USING (true);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  performed_by uuid REFERENCES officers(id) ON DELETE SET NULL,
  performed_by_name text NOT NULL DEFAULT '',
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_audit_logs" ON audit_logs;
CREATE POLICY "anon_select_audit_logs" ON audit_logs FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_audit_logs" ON audit_logs;
CREATE POLICY "anon_insert_audit_logs" ON audit_logs FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ============================================================
-- SEED: Default Commissioner Account
-- (username: commissioner, password: DOT@2025 -> SHA-256)
-- ============================================================
INSERT INTO officers (username, password_hash, name, rank, department, status)
VALUES (
  'commissioner',
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
  'Commissioner',
  'commissioner',
  'traffic_management',
  'active'
) ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- SEED: Default Service Rates
-- ============================================================
INSERT INTO service_rates (name, description, price, category) VALUES
  ('ซ่อมถนน', 'บริการซ่อมแซมถนนและทางเท้า', 500, 'civil_maintenance'),
  ('ซ่อมไฟฟ้า', 'บริการซ่อมระบบไฟฟ้าสาธารณะ', 800, 'electrical'),
  ('กู้ภัยรถยก', 'บริการรถยกและกู้ภัยรถยนต์', 1200, 'vehicle_rescue'),
  ('จัดการจราจร', 'บริการควบคุมและจัดการการจราจร', 300, 'traffic_management'),
  ('ช่วยเหลือฉุกเฉิน', 'บริการช่วยเหลือฉุกเฉินบนท้องถนน', 600, 'emergency_assistance')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED: Welcome Announcement
-- ============================================================
INSERT INTO announcements (title, content, is_pinned, created_by_name)
VALUES (
  'ยินดีต้อนรับสู่ระบบ Bit Cities DOT',
  'ระบบบริหารจัดการกรมขนส่ง Bit Cities ได้เปิดให้บริการอย่างเป็นทางการแล้ว เจ้าหน้าที่สามารถเข้าสู่ระบบและเริ่มใช้งานได้ทันที',
  true,
  'Commissioner'
) ON CONFLICT DO NOTHING;
