-- Admin privileges are assigned by an operator, never by public registration.
ALTER TABLE pahamin.users ADD COLUMN role text NOT NULL DEFAULT 'student'
  CHECK (role IN ('student', 'admin'));

-- Shared editorial content is separate from each student's private library.
CREATE TABLE pahamin.catalogue (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('material', 'question')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_by uuid REFERENCES pahamin.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES pahamin.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX catalogue_public_idx ON pahamin.catalogue(kind, status);
ALTER TABLE pahamin.catalogue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pahamin.catalogue FROM PUBLIC;
DO $$
DECLARE role_name text;
BEGIN
  FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role') LOOP
    EXECUTE format('REVOKE ALL ON pahamin.catalogue FROM %I', role_name);
  END LOOP;
END $$;
INSERT INTO pahamin.schema_migrations(version) VALUES ('202610260002_admin');
