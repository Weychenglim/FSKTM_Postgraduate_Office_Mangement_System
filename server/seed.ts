/**
 * One-shot database setup + seed.
 *
 *   npm run db:setup
 *
 * Steps:
 *   1. Connect to the maintenance `postgres` database and CREATE the app
 *      database if it does not already exist.
 *   2. Run schema.sql against the app database (idempotent).
 *   3. Seed one login account per role, hashing each password with bcrypt.
 *      Re-running updates existing rows (upsert), so it is safe to run again.
 *
 * Seed accounts come from DEMO_CREDENTIALS so the demo logins keep working,
 * but from here on authentication reads from Postgres, not that file.
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { DEMO_CREDENTIALS } from '../src/types/auth.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const conn = {
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? 'postgres',
};
const dbName = process.env.PGDATABASE ?? 'fsktm_pg_office';
const BCRYPT_ROUNDS = 10;

async function ensureDatabase(): Promise<void> {
  const admin = new Client({ ...conn, database: 'postgres' });
  await admin.connect();
  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (existing.rowCount === 0) {
      // DB name can't be parameterized; it is server-controlled config, not user input.
      await admin.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✓ Created database "${dbName}"`);
    } else {
      console.log(`• Database "${dbName}" already exists`);
    }
  } finally {
    await admin.end();
  }
}

async function applySchemaAndSeed(): Promise<void> {
  const db = new Client({ ...conn, database: dbName });
  await db.connect();
  try {
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await db.query(schema);
    console.log('✓ Schema applied');

    for (const key of Object.keys(DEMO_CREDENTIALS)) {
      const { pass, user } = DEMO_CREDENTIALS[key];
      const hash = await bcrypt.hash(pass, BCRYPT_ROUNDS);
      await db.query(
        `INSERT INTO users (id, email, password_hash, role, full_name, department, student_id, staff_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           email         = EXCLUDED.email,
           password_hash = EXCLUDED.password_hash,
           role          = EXCLUDED.role,
           full_name     = EXCLUDED.full_name,
           department    = EXCLUDED.department,
           student_id    = EXCLUDED.student_id,
           staff_id      = EXCLUDED.staff_id`,
        [
          user.id,
          user.email,
          hash,
          user.role,
          user.fullName,
          user.department,
          user.studentId ?? null,
          user.staffId ?? null,
        ],
      );
      console.log(`✓ Seeded ${user.role.padEnd(22)} ${user.email}`);
    }
  } finally {
    await db.end();
  }
}

async function main(): Promise<void> {
  console.log(`Connecting to Postgres at ${conn.host}:${conn.port} as "${conn.user}"…`);
  await ensureDatabase();
  await applySchemaAndSeed();
  console.log('\nDatabase setup complete. You can now start the API with: npm run dev:server');
}

main().catch((err) => {
  console.error('\n✗ Database setup failed:', err.message);
  process.exit(1);
});
