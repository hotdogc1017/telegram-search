import type { Logger } from '@tg-search/logg'

import type { CoreSentEvents } from './core-events'

import { useLogger } from '@tg-search/logg'
import { EventEmitter } from 'eventemitter3'

export type CoreEventData<T> = T extends (data: infer D) => void ? D : never

export type Service<T> = (ctx: CoreContext) => T

export type Events = Record<string, (...args: any[]) => void | Promise<void>>

export type CoreContext = ReturnType<typeof createCoreContext>

interface CreateCoreContextOptions {
  logger?: Logger
  errorHandler?: (error: unknown) => Error
}

export function createCoreContext<
  EventReceived extends Events,
  EventSent extends Events & CoreSentEvents,
  CoreEvents extends Events = EventReceived & EventSent,
>(options: CreateCoreContextOptions = {}) {
  const { logger } = options

  const emitter = new EventEmitter<CoreEvents>()

  const receivedEvents = new Set<keyof EventReceived>()
  const sentEvents = new Set<keyof EventSent>()

  const wrapEmitterOn = (emitter: EventEmitter<CoreEvents>, fn?: (event: keyof EventReceived) => void) => {
    const _on = emitter.on.bind(emitter)

    emitter.on = (event, listener) => {
      const onFn = _on(event, async (...args) => {
        try {
          fn?.(event as keyof EventReceived)

          logger?.withFields({ event }).debug('Handle core event')
          return await listener(...args)
        }
        catch (error) {
          logger?.withError(error).error('Failed to handle core event')
        }
      })

      if (receivedEvents.has(event as keyof EventReceived)) {
        return onFn
      }

      logger?.withFields({ event }).debug('Register to core event')
      receivedEvents.add(event as keyof EventReceived)
      return onFn
    }
  }

  const wrapEmitterEmit = (emitter: EventEmitter<CoreEvents>, fn?: (event: keyof EventSent) => void) => {
    const _emit = emitter.emit.bind(emitter)

    emitter.emit = (event, ...args) => {
      if (sentEvents.has(event as keyof EventSent)) {
        return _emit(event, ...args)
      }

      logger?.withFields({ event }).debug('Register from core event')

      sentEvents.add(event as keyof EventSent)
      fn?.(event as keyof EventSent)

      return _emit(event, ...args)
    }
  }

  wrapEmitterOn(emitter, (event) => {
    logger?.withFields({ event }).debug('Core event received')
  })

  wrapEmitterEmit(emitter, (event) => {
    logger?.withFields({ event }).debug('Core event emitted')
  })

  function withError(error: unknown, description?: string): Error {
    const result = options.errorHandler?.(error)

    if (result instanceof Error) {
      return result
    }
    else {
      emitter.emit('core:error' as keyof CoreEvents, { error })

      logger?.withError(error).error(description)

      return new Error(description || 'Error occurred')
    }
  }

  return {
    emitter,
    toCoreEvents: receivedEvents,
    fromCoreEvents: sentEvents,
    wrapEmitterEmit,
    wrapEmitterOn,
    withError,
  }
}

export function useService<T>(ctx: CoreContext, fn: Service<T>) {
  useLogger().withFields({ fn: fn.name }).log('Register service')
  return fn(ctx)
}
