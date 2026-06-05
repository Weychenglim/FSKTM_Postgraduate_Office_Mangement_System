import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';
import { DemoUser, UserRole } from '../src/types/auth.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'fsktm-dev-secret-change-in-production';
const JWT_EXPIRES_IN = '8h';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  fullName: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  full_name: string;
  department: string;
  student_id: string | null;
  staff_id: string | null;
}

/**
 * Look up a user in Postgres by email / student ID / staff ID (case-insensitive)
 * and verify their password against the stored bcrypt hash. Returns the public
 * user profile on success, or null if no match / wrong password.
 */
export async function findUserByCredentials(
  identifier: string,
  password: string,
): Promise<DemoUser | null> {
  const cleanId = identifier.trim().toLowerCase();
  const { rows } = await pool.query<UserRow>(
    `SELECT id, email, password_hash, role, full_name, department, student_id, staff_id
       FROM users
      WHERE lower(email) = $1
         OR lower(student_id) = $1
         OR lower(staff_id) = $1
      LIMIT 1`,
    [cleanId],
  );
  if (rows.length === 0) return null;

  const row = rows[0];
  const passwordMatches = await bcrypt.compare(password, row.password_hash);
  if (!passwordMatches) return null;

  return {
    id: row.id,
    email: row.email,
    role: row.role as UserRole,
    fullName: row.full_name,
    department: row.department,
    studentId: row.student_id ?? undefined,
    staffId: row.staff_id ?? undefined,
  };
}
