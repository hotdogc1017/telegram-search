import type { MessageResolver, MessageResolverOpts } from '.'
import type { CoreMessage } from '../utils/message'

import { useLogger } from '@unbird/logg'
import { Err, Ok } from '@unbird/result'

import { ensureJieba } from '../utils/jieba'

export function createJiebaResolver(): MessageResolver {
  const logger = useLogger('core:resolver:jieba')

  return {
    run: async (opts: MessageResolverOpts) => {
      logger.verbose('Executing jieba resolver')

      if (opts.messages.length === 0)
        return Err('No messages')

      const messages: CoreMessage[] = opts.messages.filter(
        message => message.content && message.jiebaTokens.length === 0,
      )

      if (messages.length === 0)
        return Err('No messages to parse')

      // Initialize jieba asynchronously
      const jieba = await ensureJieba()
      if (!jieba) {
        logger.warn('Jieba not available, skipping tokenization')
        return Err('Jieba initialization failed')
      }

      const jiebaMessages = messages.map((message) => {
        // Token without empty strings
        const tokens = jieba.cut(message.content).filter(token => !!token)
        logger.withFields({ message: message.content, tokens }).debug('Jieba tokens')

        return {
          ...message,
          jiebaTokens: tokens,
        }
      })

      logger.withFields({ messages: jiebaMessages.length }).verbose('Processed jieba messages')

      return Ok(jiebaMessages)
    },
  }
}
