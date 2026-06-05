import { Pool } from 'pg';

/**
 * Shared Postgres connection pool. Connection settings are read from env vars
 * (see .env): PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE.
 *
 * The pool is lazy — it does not open a socket until the first query — so it is
 * safe to import even before the database/schema have been created.
 */
export const pool = new Pool({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  user: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? 'postgres',
  database: process.env.PGDATABASE ?? 'fsktm_pg_office',
});
