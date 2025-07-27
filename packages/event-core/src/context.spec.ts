import { describe, expect, it, vi } from 'vitest'

import { createContext } from './context'

describe('eventContext', () => {
  it('should register and emit events', () => {
    const ctx = createContext()
    const testEvent = 'test-event'
    const handler = vi.fn()

    ctx.on(testEvent, handler)
    ctx.emit(testEvent, { data: 'test' })

    expect(handler).toHaveBeenCalledWith({ data: 'test' })
  })

  it('should handle once listeners', () => {
    const ctx = createContext()
    const testEvent = 'test-event'
    const handler = vi.fn()

    ctx.once(testEvent, handler)
    ctx.emit(testEvent, { data: 'test1' })
    ctx.emit(testEvent, { data: 'test2' })

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ data: 'test1' })
  })

  it('should resolve until promise', async () => {
    const ctx = createContext()
    const testEvent = 'test-event'

    const promise = ctx.until(testEvent, (data: { value: number }) => data.value * 2)

    setTimeout(() => {
      ctx.emit(testEvent, { value: 5 })
    }, 0)

    const result = await promise
    expect(result).toBe(10)
  })

  it('should reject until promise on error', async () => {
    const ctx = createContext()
    const testEvent = 'test-event'

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
    const testEvent = 'test-event'
    const handler = vi.fn()

    ctx.on(testEvent, handler)
    ctx.off(testEvent)
    ctx.emit(testEvent, { data: 'test' })

    expect(handler).not.toHaveBeenCalled()
  })
})
