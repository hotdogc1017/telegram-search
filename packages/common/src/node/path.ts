import type { Config } from '../browser'

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'

import { useLogger } from '@unbird/logg'
import { dirname, join, resolve } from 'pathe'

import { DatabaseType, generateDefaultConfig } from '../browser'

const logger = useLogger()

export function getDatabaseFilePath(config: Config): string {
  const { database } = config

  let extension = ''
  switch (database.type) {
    case DatabaseType.PGLITE:
      extension = '.pglite'
      break
    default:
      return ''
  }

  return join('./data', `db${extension}`)
}

export async function useConfigPath(): Promise<string> {
  const configPath = resolve('./config', 'config.yaml')

  logger.withFields({ configPath }).log('Config path')

  if (!existsSync(configPath)) {
    mkdirSync(dirname(configPath), { recursive: true })
    writeFileSync(configPath, JSON.stringify(generateDefaultConfig()))
  }

  return configPath
}

export function getSessionPath(): string {
  const sessionPath = join('./data', 'sessions')
  if (!existsSync(sessionPath)) {
    mkdirSync(sessionPath, { recursive: true })
  }

  logger.withFields({ sessionPath }).log('Session path')

  return sessionPath
}

