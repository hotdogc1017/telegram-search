import { bigint, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { bytea } from './type'

export const joinedChatsTable = pgTable('joined_chats', () => {
  return {
    id: uuid().primaryKey().defaultRandom(),
    platform: text().notNull().default('telegram'),
    chat_id: text().notNull().default('').unique(),
    chat_name: text().notNull().default(''),
    chat_type: text().notNull().default('user').$type<'user' | 'channel' | 'group'>(),
    photo_id: bigint({ mode: 'bigint' }).unique(),
    photo_bytes: bytea(),
    created_at: bigint({ mode: 'number' }).notNull().default(0).$defaultFn(() => Date.now()),
    updated_at: bigint({ mode: 'number' }).notNull().default(0).$defaultFn(() => Date.now()),
  }
})