CREATE TABLE waitlist (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anon users may insert only — no SELECT, UPDATE, or DELETE.
CREATE POLICY "anon_insert_only" ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);
