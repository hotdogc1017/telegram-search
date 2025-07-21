import { customType } from 'drizzle-orm/pg-core'

// Get database type from environment
const isDuckDB = process.env.DATABASE_TYPE === 'duckdb'

/**
 * Custom vector type that adapts to different databases
 * - PostgreSQL: uses native vector(dimensions) type
 * - DuckDB: uses FLOAT array type
 */
export function vector(config: { dimensions: number }) {
  if (isDuckDB) {
    // For DuckDB, use FLOAT array
    return customType<{ data: number[]; driverData: string }>({
      dataType() {
        return `FLOAT[${config.dimensions}]`
      },
      toDriver(value: number[]) {
        return JSON.stringify(value)
      },
      fromDriver(value: string) {
        return JSON.parse(value)
      },
    })()
  } else {
    // For PostgreSQL, use native vector type
    return customType<{ data: number[]; driverData: string }>({
      dataType() {
        return `vector(${config.dimensions})`
      },
    })()
  }
}