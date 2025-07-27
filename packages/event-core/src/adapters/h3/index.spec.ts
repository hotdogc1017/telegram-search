import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createH3WsAdapter, wsConnectedEvent, wsDisconnectedEvent, wsErrorEvent } from '.'
import { createContext } from '../../context'
import { defineEventa } from '../../eventa'

describe('h3-ws-adapter', () => {
  let peer: any

  beforeEach(() => {
    // Mock H3 WebSocket peer
    peer = {
      id: '123',
      send: vi.fn(),
      close: vi.fn(),
    }
  })

  it('should create a h3 ws adapter and handle events', () => {
    const wsAdapter = createH3WsAdapter()
    const ctx = createContext({ adapter: wsAdapter })

    expect(ctx).toBeDefined()

    // Test sending message
    const testEvent = defineEventa<string, string>('test')
    ctx.emit(testEvent.inboundEvent, 'hello')

    // Test receiving message
    const onMessage = vi.fn()
    ctx.on(testEvent.outboundEvent, onMessage)

    // Simulate peer receiving message
    const message = {
      json: () => JSON.stringify({
        id: '123',
        type: testEvent.outboundEvent,
        payload: 'world',
        timestamp: Date.now(),
      }),
    }

    wsAdapter(ctx.emit).hooks.onReceived(testEvent.outboundEvent, 'world')
    expect(onMessage).toHaveBeenCalledWith('world')
  })

  it('should handle connection lifecycle events', () => {
    const wsAdapter = createH3WsAdapter()
    const ctx = createContext({ adapter: wsAdapter })

    const onConnect = vi.fn()
    const onError = vi.fn()
    const onDisconnect = vi.fn()

    ctx.on(wsConnectedEvent.inboundEvent, onConnect)
    ctx.on(wsErrorEvent.inboundEvent, onError)
    ctx.on(wsDisconnectedEvent.inboundEvent, onDisconnect)

    // Simulate connection events
    wsAdapter(ctx.emit).hooks.onReceived(wsConnectedEvent.inboundEvent, { id: peer.id })
    expect(onConnect).toHaveBeenCalledWith({ id: peer.id })

    const error = new Error('test error')
    wsAdapter(ctx.emit).hooks.onReceived(wsErrorEvent.inboundEvent, { error })
    expect(onError).toHaveBeenCalledWith({ error })

    wsAdapter(ctx.emit).hooks.onReceived(wsDisconnectedEvent.inboundEvent, { id: peer.id })
    expect(onDisconnect).toHaveBeenCalledWith({ id: peer.id })
  })
})
