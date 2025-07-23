import { Ok } from '@tg-search/result'
import { eq } from 'drizzle-orm'

import { withDb } from '../drizzle'
import { joinedChatsTable } from '../schemas/joined_chats'
import { must0 } from './utils/must'

export type JoinedChat = typeof joinedChatsTable.$inferSelect
export type NewJoinedChat = typeof joinedChatsTable.$inferInsert

export function recordJoinedChat(data: NewJoinedChat) {
  return withDb(db =>
    db.insert(joinedChatsTable)
      .values(data)
      .onConflictDoUpdate({
        target: [joinedChatsTable.chat_id],
        set: {
          chat_name: data.chat_name,
          photo_id: data.photo_id,
          photo_bytes: data.photo_bytes,
          updated_at: Date.now(),
        },
      })
      .returning(), // 关键：加上这一行
  )
}

export async function getPhotoByUserEntity(entityId: string) {
  const result = (await withDb(db => db.select().from(joinedChatsTable).where(eq(joinedChatsTable.chat_id, entityId)))).unwrap()
  return Ok(must0(result))
}
