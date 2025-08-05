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

export function resolveStoragePath(path: string): string {
  // For browser compatibility, just use relative paths
  if (path.startsWith('~')) {
    path = path.replace('~', './data')
  }

  const resolvedPath = resolve(path)
  return resolvedPath
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

export async function getDrizzlePath(): Promise<string> {
  const drizzlePath = resolve('./drizzle')
  logger.withFields({ drizzlePath }).log('Drizzle migrations path')
  return drizzlePath
}

export async function useAssetsPath(): Promise<string> {
  const assetsPath = resolve('./assets')

  logger.withFields({ assetsPath }).log('Assets path')

  if (!existsSync(assetsPath)) {
    mkdirSync(dirname(assetsPath), { recursive: true })
  }

  return assetsPath
}

export function getSessionPath(): string {
  const sessionPath = join('./data', 'sessions')
  if (!existsSync(sessionPath)) {
    mkdirSync(sessionPath, { recursive: true })
  }

  logger.withFields({ sessionPath }).log('Session path')

  return sessionPath
}

export function getMediaPath(): string {
  const mediaPath = join('./data', 'media')
  if (!existsSync(mediaPath)) {
    mkdirSync(mediaPath, { recursive: true })
  }

  logger.withFields({ mediaPath }).log('Media path')
  return mediaPath
}
