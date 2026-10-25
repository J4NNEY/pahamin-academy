-- Run with the project's database owner, through db:migrate or SQL Editor.
-- Application accounts are managed by Express; these are not auth.users.
CREATE SCHEMA IF NOT EXISTS pahamin;
REVOKE ALL ON SCHEMA pahamin FROM PUBLIC;

CREATE TABLE pahamin.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE pahamin.users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  name text NOT NULL,
  password text NOT NULL,
  goal integer NOT NULL DEFAULT 3 CHECK (goal BETWEEN 1 AND 10)
);
CREATE TABLE pahamin.sessions (
  token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  expires bigint NOT NULL CHECK (expires BETWEEN 0 AND 9007199254740991)
);
CREATE INDEX sessions_user_idx ON pahamin.sessions(user_id);
CREATE INDEX sessions_expiry_idx ON pahamin.sessions(expires);
CREATE TABLE pahamin.materials (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX materials_owner_idx ON pahamin.materials(user_id);
CREATE TABLE pahamin.questions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX questions_owner_idx ON pahamin.questions(user_id);
CREATE TABLE pahamin.progress (
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  material_id text NOT NULL,
  completed_at timestamptz NOT NULL,
  PRIMARY KEY(user_id, material_id)
);
CREATE TABLE pahamin.bookmarks (
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  material_id text NOT NULL,
  PRIMARY KEY(user_id, material_id)
);
CREATE TABLE pahamin.attempts (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('practice', 'tryout')),
  started bigint NOT NULL CHECK (started BETWEEN 0 AND 9007199254740991),
  duration integer NOT NULL CHECK (duration >= 0),
  questions jsonb NOT NULL CHECK (jsonb_typeof(questions) = 'array'),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object'),
  result jsonb CHECK (result IS NULL OR jsonb_typeof(result) = 'object'),
  UNIQUE(id, user_id)
);
CREATE INDEX attempts_owner_started_idx ON pahamin.attempts(user_id, started DESC);
CREATE TABLE pahamin.study_preferences (
  user_id uuid PRIMARY KEY REFERENCES pahamin.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object')
);
CREATE TABLE pahamin.question_bookmarks (
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  PRIMARY KEY(user_id, question_id)
);
CREATE TABLE pahamin.event_enrollments (
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  created timestamptz NOT NULL,
  PRIMARY KEY(user_id, event_id)
);
CREATE TABLE pahamin.event_attempts (
  attempt_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  subject text NOT NULL,
  FOREIGN KEY(attempt_id, user_id) REFERENCES pahamin.attempts(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY(user_id, event_id) REFERENCES pahamin.event_enrollments(user_id, event_id) ON DELETE CASCADE
);
CREATE INDEX event_attempts_owner_idx ON pahamin.event_attempts(user_id);
CREATE TABLE pahamin.live_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object')
);
CREATE INDEX live_sessions_owner_idx ON pahamin.live_sessions(user_id);
CREATE TABLE pahamin.tutor_messages (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES pahamin.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created timestamptz NOT NULL,
  sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE
);
CREATE INDEX tutor_messages_owner_order_idx ON pahamin.tutor_messages(user_id, sequence DESC);

-- Server-only schema. No browser/Data API role has access, including answer keys,
-- password hashes and session hashes. Ownership is enforced by the Express API.
DO $$
DECLARE item record; role_name text;
BEGIN
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname = 'pahamin' LOOP
    EXECUTE format('ALTER TABLE pahamin.%I ENABLE ROW LEVEL SECURITY', item.tablename);
    EXECUTE format('REVOKE ALL ON TABLE pahamin.%I FROM PUBLIC', item.tablename);
  END LOOP;
  FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated', 'service_role') LOOP
    EXECUTE format('REVOKE ALL ON SCHEMA pahamin FROM %I', role_name);
    EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA pahamin FROM %I', role_name);
    EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA pahamin FROM %I', role_name);
  END LOOP;
END $$;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA pahamin FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA pahamin REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA pahamin REVOKE ALL ON SEQUENCES FROM PUBLIC;
INSERT INTO pahamin.schema_migrations(version) VALUES ('202610260001_pahamin');
