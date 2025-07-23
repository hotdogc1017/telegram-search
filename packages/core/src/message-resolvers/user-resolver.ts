import type { Entity, EntityLike } from 'telegram/define'

import type { MessageResolver, MessageResolverOpts } from '.'
import type { CoreContext } from '../context'

import { Buffer } from 'node:buffer'

import { getPhotoByUserEntity, recordJoinedChat } from '@tg-search/db'
import { useLogger } from '@tg-search/logg'

import { resolveEntity } from '../utils/entity'

async function extractPhoto(ctx: CoreContext, entity: EntityLike) {
  const logger = useLogger('core:resolver:user:photo')
  // 类型守卫，确保 entity 是对象且有 id
  const entityObj = typeof entity === 'object' && entity !== null ? entity as Entity : undefined
  const entityId = entityObj?.id?.toString()

  if (!entityId) {
    logger.debug('Entity has no ID, skipping photo extraction')
    return null
  }

  try {
    const existingPhoto = (await getPhotoByUserEntity(entityId)).unwrap()

    if (existingPhoto && existingPhoto.photo_bytes) {
      logger.debug('Photo exists in database, returning cached photo')
      return existingPhoto.photo_bytes
    }

    logger.debug('Downloading profile photo from Telegram')
    const photoBuffer = await ctx.getClient().downloadProfilePhoto(entity)

    if (photoBuffer && Buffer.isBuffer(photoBuffer)) {
      // resolveEntity 需要 Entity 类型
      const resolvedEntity = entityObj ? resolveEntity(entityObj).orUndefined() : undefined
      // 只有 User 类型才有 photo 属性
      const photoId = 'photo' in (entityObj ?? {}) ? (entityObj as any).photo?.photoId : undefined
      await recordJoinedChat({
        platform: 'telegram',
        chat_id: entityId,
        chat_name: resolvedEntity?.name || 'Unknown',
        chat_type: 'user',
        photo_id: photoId,
        photo_bytes: photoBuffer,
      })

      logger.debug('Photo downloaded and saved to database')
      return photoBuffer
    }

    return null
  }
  catch (error) {
    logger.withError(error).error('Failed to extract photo')
    return null
  }
}

export function createUserResolver(ctx: CoreContext): MessageResolver {
  const logger = useLogger('core:resolver:user')

  const entities = new Map<string, Entity>()

  return {
    async* stream(opts: MessageResolverOpts) {
      logger.verbose('Executing user resolver')

      const { messages } = opts

      for (const message of messages) {
        if (!entities.has(message.fromId)) {
          const entity = await ctx.getClient().getEntity(message.fromId)
          entities.set(message.fromId, entity)
          logger.withFields(entity).debug('Resolved entity')
        }

        const entity = entities.get(message.fromId)!
        const photo = await extractPhoto(ctx, entity)

        const result = resolveEntity(entity).orUndefined()

        if (!result) {
          yield message
          continue
        }

        if (photo) {
          if (!Array.isArray(message.media)) {
            message.media = []
          }
          message.media?.push({
            platformId: 'telegram',
            type: 'profile_photo',
            byte: photo,
          })
        }
        message.fromName = result.name

        yield message
      }
    },
  }
}
