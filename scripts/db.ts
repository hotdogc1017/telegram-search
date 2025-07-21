import { spawn } from 'node:child_process'
import process from 'node:process'

import { DatabaseType } from '../packages/common/src/browser/config-schema.js'
import { useLogger } from '@tg-search/logg'

import { getDatabaseDSN, initConfig, useConfig } from '../packages/common/src/node'

(async () => {
  await initConfig()
  const logger = useLogger('script:drizzle')

  const dsn = getDatabaseDSN(useConfig())
  const args = process.argv.slice(2)
  const config = useConfig()

  try {
    // Handle DuckDB migrations through our custom system
    if (config.database.type === DatabaseType.DUCKDB && args.includes('migrate')) {
      logger.log('Using DuckDB custom migration system...')
      
      // Import and run our DuckDB initialization which handles migrations
      const { initDrizzle } = await import('../packages/db/src/drizzle.js')
      await initDrizzle()
      
      logger.log('DuckDB migration completed successfully')
      return
    }

    // For other database types or non-migrate commands, use drizzle-kit
    const child = spawn('pnpm', ['drizzle-kit', ...args], {
      env: {
        ...process.env,
        DATABASE_DSN: dsn,
        DATABASE_TYPE: config.database.type,
      },
      stdio: 'pipe',
      shell: true,
    })

    child.stdout.on('data', (data) => {
      console.log(data.toString())
    })

    child.stderr.on('data', (data) => {
      console.error(data.toString())
    })

    await new Promise<void>((resolve, reject) => {
      child.on('close', (code) => {
        if (code === 0)
          resolve()
        else
          reject(new Error(`Process exited with code ${code}`))
      })
    })
  }
  catch (error) {
    logger.withError(error).error('Error executing drizzle operation')
    process.exit(1)
  }
})()
