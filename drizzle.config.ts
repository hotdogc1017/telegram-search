import process from 'node:process'

import { defineConfig } from 'drizzle-kit'

// Get database type from environment or default to PostgreSQL
const dbType = process.env.DATABASE_TYPE || 'postgres'
const isDuckDB = dbType === 'duckdb'

export default defineConfig({
  schema: './packages/db/src/schemas/*.ts',
  out: isDuckDB ? './drizzle-duckdb' : './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_DSN || (isDuckDB ? 'file:./db.duckdb' : 'postgres://localhost:5432/postgres'),
  },
})
