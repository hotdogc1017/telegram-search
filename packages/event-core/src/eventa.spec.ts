import { describe, expect, it, vi } from 'vitest'

import { createContext, defineInvoke, defineInvokeEvent, defineInvokeHandler, defineStreamInvoke, defineStreamInvokeHandler, toStreamHandler } from './eventa'

describe('eventSystem', () => {
  describe('defineInvokeEvent', () => {
    it('should create server and client events', () => {
      const events = defineInvokeEvent<{ name: string }, { id: string }>()
      expect(events.inboundEvent).toBeTypeOf('symbol')
      expect(events.outboundEvent).toBeTypeOf('symbol')
      expect(events.inboundEvent).not.toBe(events.outboundEvent)
    })
  })

  describe('eventContext', () => {
    it('should register and emit events', () => {
      const ctx = createContext()
      const testEvent = Symbol('test')
      const handler = vi.fn()

      ctx.on(testEvent, handler)
      ctx.emit(testEvent, { data: 'test' })

      expect(handler).toHaveBeenCalledWith({ data: 'test' })
    })

    it('should handle once listeners', () => {
      const ctx = createContext()
      const testEvent = Symbol('test')
      const handler = vi.fn()

      ctx.once(testEvent, handler)
      ctx.emit(testEvent, { data: 'test1' })
      ctx.emit(testEvent, { data: 'test2' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ data: 'test1' })
    })

    it('should resolve until promise', async () => {
      const ctx = createContext()
      const testEvent = Symbol('test')

      const promise = ctx.until(testEvent, (data: { value: number }) => data.value * 2)

      setTimeout(() => {
        ctx.emit(testEvent, { value: 5 })
      }, 0)

      const result = await promise
      expect(result).toBe(10)
    })

    it('should reject until promise on error', async () => {
      const ctx = createContext()
      const testEvent = Symbol('test')

      const promise = ctx.until(testEvent, () => {
        throw new Error('Test error')
      })

      setTimeout(() => {
        ctx.emit(testEvent, {})
      }, 0)

      await expect(promise).rejects.toThrow('Test error')
    })

    it('should remove listeners with off', () => {
      const ctx = createContext()
      const testEvent = Symbol('test')
      const handler = vi.fn()

      ctx.on(testEvent, handler)
      ctx.off(testEvent)
      ctx.emit(testEvent, { data: 'test' })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('invokeSystem', () => {
    it('should handle request-response pattern', async () => {
      const ctx = createContext()
      const events = defineInvokeEvent<{ name: string, age: number }, { id: string }>()

      defineInvokeHandler(ctx, events, ({ name, age }) => ({
        id: `${name}-${age}`,
      }))

      const invoke = defineInvoke(ctx, events)

      const result = await invoke({ name: 'alice', age: 25 })

      expect(result).toEqual({ id: 'alice-25' })
    })

    it('should handle request-stream-response pattern', async () => {
      const ctx = createContext()

      interface Parameter { type: 'parameters', name: string, age: number }
      interface Progress { type: 'progress', progress: number }
      interface Result { type: 'result', result: boolean }

      const events = defineInvokeEvent<{ name: string, age: number }, Parameter | Progress | Result>()

      defineStreamInvokeHandler(ctx, events, ({ name, age }) => {
        return (async function* () {
          yield { type: 'parameters', name, age } as Parameter

          for (let i = 0; i < 5; i++) {
            yield { type: 'progress', progress: (i + 1) * 20 } as Progress
          }

          yield { type: 'result', result: true } as Result
        }())
      })

      const invoke = defineStreamInvoke(ctx, events)

      let parametersName: string | undefined
      let parametersAge: number | undefined
      let progressCalled = 0
      let resultCalled = 0

      for await (const streamResult of invoke({ name: 'alice', age: 25 })) {
        switch (streamResult.type) {
          case 'parameters':
            parametersName = streamResult.name
            parametersAge = streamResult.age
            break
          case 'progress':
            progressCalled++
            break
          case 'result':
            resultCalled++
            break
        }
      }

      expect(parametersName).toBe('alice')
      expect(parametersAge).toBe(25)
      expect(progressCalled).toBe(5)
      expect(resultCalled).toBe(1)
    })

    it('should handle request-stream-response pattern with to stream handler', async () => {
      const ctx = createContext()

      interface Parameter { type: 'parameters', name: string, age: number }
      interface Progress { type: 'progress', progress: number }
      interface Result { type: 'result', result: boolean }

      const events = defineInvokeEvent<{ name: string, age: number }, Parameter | Progress | Result>()

      defineStreamInvokeHandler(ctx, events, toStreamHandler(async ({ params, emit }) => {
        emit({ type: 'parameters', name: params.name, age: params.age })

        for (let i = 0; i < 5; i++) {
          emit({ type: 'progress', progress: (i + 1) * 20 } as Progress)
        }

        emit({ type: 'result', result: true } as Result)
      }))

      const invoke = defineStreamInvoke(ctx, events)

      let parametersName: string | undefined
      let parametersAge: number | undefined
      let progressCalled = 0
      let resultCalled = 0

      for await (const streamResult of invoke({ name: 'alice', age: 25 })) {
        switch (streamResult.type) {
          case 'parameters':
            parametersName = streamResult.name
            parametersAge = streamResult.age
            break
          case 'progress':
            progressCalled++
            break
          case 'result':
            resultCalled++
            break
        }
      }

      expect(parametersName).toBe('alice')
      expect(parametersAge).toBe(25)
      expect(progressCalled).toBe(5)
      expect(resultCalled).toBe(1)
    })

    it('should handle multiple concurrent invokes', async () => {
      const serverCtx = createContext()
      const clientCtx = createContext()
      const events = defineInvokeEvent<{ value: number }, { result: number }>()

      defineInvokeHandler(serverCtx, events, ({ value }) => ({
        result: value * 2,
      }))

      const invoke = defineInvoke(clientCtx, events)

      const promise1 = invoke({ value: 10 })
      const promise2 = invoke({ value: 20 })

      setTimeout(() => {
        clientCtx.emit(events.outboundEvent, { result: 20 })
        clientCtx.emit(events.outboundEvent, { result: 40 })
      }, 0.1)

      const [result1, result2] = await Promise.all([promise1, promise2])
      expect(result1).toEqual({ result: 20 })
      expect(result2).toEqual({ result: 40 })
    })
  })

  describe('typeSafety', () => {
    it('should maintain type constraints', () => {
      interface UserRequest {
        name: string
        email: string
      }

      interface UserResponse {
        id: string
        created: boolean
      }

      const events = defineInvokeEvent<UserRequest, UserResponse>()
      const serverCtx = createContext()
      const clientCtx = createContext()

      defineInvokeHandler(serverCtx, events, (req: UserRequest): UserResponse => ({
        id: `user-${req.name}`,
        created: true,
      }))

      const invoke = defineInvoke(clientCtx, events)

      expect(typeof invoke).toBe('function')
    })
  })
})
