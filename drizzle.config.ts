import process from 'node:process'

import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './packages/db/src/schemas/*.ts',
  out: './drizzle-duckdb',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_DSN || 'file:./db.duckdb',
  },
})
