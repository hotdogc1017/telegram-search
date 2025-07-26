import { describe, expect, it, vi } from 'vitest'

import { createContext, defineInvoke, defineInvokeEvent, defineInvokeHandler } from './eventa'

describe('eventSystem', () => {
  describe('defineInvokeEvent', () => {
    it('should create server and client events', () => {
      const events = defineInvokeEvent<{ name: string }, { id: string }>()
      expect(events.serverEvent).toBeTypeOf('symbol')
      expect(events.clientEvent).toBeTypeOf('symbol')
      expect(events.serverEvent).not.toBe(events.clientEvent)
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

      // setTimeout(() => {
      //   serverCtx.emit(events.serverEvent, { name: 'alice', age: 25 })
      // }, 0)

      // setTimeout(() => {
      //   clientCtx.emit(events.clientEvent, { id: 'alice-25' })
      // }, 0)

      expect(result).toEqual({ id: 'alice-25' })
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
        clientCtx.emit(events.clientEvent, { result: 20 })
        clientCtx.emit(events.clientEvent, { result: 40 })
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
