import { createApp } from 'h3'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createH3WsAdapter, wsConnectedEvent, wsDisconnectedEvent, wsErrorEvent } from '.'
import { createContext } from '../../context'
import { defineEventa } from '../../eventa'

describe('h3-ws-adapter', () => {
  let peer: {
    id: string
    send: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
  }
  const peers = new Set<any>()

  beforeEach(() => {
    // Mock H3 WebSocket peer
    peer = {
      id: '123',
      send: vi.fn(),
      close: vi.fn(),
    }

    peers.add(peer)
  })

  it('should create a h3 ws adapter and handle events', () => {
    const wsAdapter = createH3WsAdapter(createApp(), peers)
    const ctx = createContext({ adapter: wsAdapter })
    const serverCtx = ctx
    expect(ctx).toBeDefined()

    const toEvent = defineEventa<string>('send')
    const fromEvent = defineEventa<string>('receive')

    // Test receiving message
    const onMessage = vi.fn()
    ctx.on(fromEvent.id, onMessage) // <- event_response

    // Test sending message
    ctx.emit(toEvent.id, 'hello') // event <-
    expect(peer.send).toHaveBeenCalledWith(expect.stringContaining('"payload":"hello"'))

    serverCtx.emit(fromEvent.id, 'world') // ???
    expect(onMessage).toHaveBeenCalledWith('world')
  })

  it('should handle connection lifecycle events', () => {
    const wsAdapter = createH3WsAdapter(createApp(), peers)
    const ctx = createContext({ adapter: wsAdapter })

    const onConnect = vi.fn()
    const onError = vi.fn()
    const onDisconnect = vi.fn()

    ctx.on(wsConnectedEvent.id, onConnect)
    ctx.on(wsErrorEvent.id, onError)
    ctx.on(wsDisconnectedEvent.id, onDisconnect)

    // Simulate connection events
    ctx.emit(wsConnectedEvent.id, { id: peer.id })
    // wsAdapter(ctx.emit).hooks.onReceived(wsConnectedEvent.inboundEvent, { id: peer.id })
    expect(onConnect).toHaveBeenCalledWith({ id: peer.id })

    const error = new Error('test error')
    ctx.emit(wsErrorEvent.id, { error })
    expect(onError).toHaveBeenCalledWith({ error })

    ctx.emit(wsDisconnectedEvent.id, { id: peer.id })
    expect(onDisconnect).toHaveBeenCalledWith({ id: peer.id })
  })
})
