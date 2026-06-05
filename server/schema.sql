-- FSKTM Postgraduate Office Management System — auth schema.
-- Holds login accounts for all roles (Office Staff/Admin, Programme
-- Coordinator, Lecturer, Student). Passwords are stored as bcrypt hashes,
-- never in plaintext.

CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(64)  PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(64)  NOT NULL,
  full_name     VARCHAR(255) NOT NULL,
  department    VARCHAR(255) NOT NULL,
  student_id    VARCHAR(64),
  staff_id      VARCHAR(64),
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- A user logs in with their email, student ID, or staff ID — all matched
-- case-insensitively, so index the lower-cased forms for fast lookups.
CREATE INDEX IF NOT EXISTS idx_users_email      ON users (lower(email));
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users (lower(student_id));
CREATE INDEX IF NOT EXISTS idx_users_staff_id   ON users (lower(staff_id));
