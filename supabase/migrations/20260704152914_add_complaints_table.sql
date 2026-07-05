
/*
# Add complaints table

1. New Tables
- `complaints` — Stores public complaints against DOT officers
  - id: UUID primary key
  - discord_username: Reporter's Discord username (or "ไม่ระบุตัวตน")
  - officer_name: Name or ID of the officer being reported
  - incident_datetime: Date, time, and location of the incident (free text)
  - details: Full description of the complaint (large text)
  - evidence_url: Optional URL to image or video evidence
  - status: Complaint status — 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  - created_at: Timestamp

2. Security
- RLS enabled, anon + authenticated can insert and select (public system, no login required)
*/

CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discord_username text NOT NULL,
  officer_name text DEFAULT '',
  incident_datetime text NOT NULL DEFAULT '',
  details text NOT NULL,
  evidence_url text DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_complaints" ON complaints;
CREATE POLICY "anon_select_complaints" ON complaints FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_complaints" ON complaints;
CREATE POLICY "anon_insert_complaints" ON complaints FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_complaints" ON complaints;
CREATE POLICY "anon_update_complaints" ON complaints FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
