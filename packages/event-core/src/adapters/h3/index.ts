import type { EventHandler } from 'h3'

import type { EventContextEmitFn } from '../../context'
import type { EventTag } from '../../eventa'
import type { EventaAdapter } from '../websocket'

import { createApp, defineWebSocketHandler } from 'h3'

import { defineEventa } from '../../eventa'
import { generateWebsocketPayload, parseWebsocketPayload } from '../websocket'

export const wsConnectedEvent = defineEventa<{ id: string }, object>()
export const wsDisconnectedEvent = defineEventa<{ id: string }, object>()
export const wsErrorEvent = defineEventa<{ error: unknown }, object>()

// H3 does not export the Peer type directly, so we extract it from the `message` hook of the WebSocket event handler.
type Hooks = NonNullable<EventHandler['__websocket__']>
export type Peer = Parameters<NonNullable<Hooks['message']>>[0]

export function createH3WsAdapter(): EventaAdapter {
  return (emit: EventContextEmitFn) => {
    const app = createApp()
    const peers = new Set<Peer>()

    app.use('/ws', defineWebSocketHandler({
      open(peer) {
        peers.add(peer)
        emit(wsConnectedEvent.inboundEvent, { id: peer.id })
      },

      close(peer) {
        peers.delete(peer)
        emit(wsDisconnectedEvent.inboundEvent, { id: peer.id })
      },

      error(peer, error) {
        emit(wsErrorEvent.inboundEvent, { error })
      },

      async message(peer, message) {
        try {
          const { type, payload } = parseWebsocketPayload(message.json())
          emit(type, payload)
        }
        catch (error) {
          emit(wsErrorEvent.inboundEvent, { error })
        }
      },
    }))

    return {
      cleanup: () => {
        for (const peer of peers) {
          peer.close()
        }
        peers.clear()
      },

      hooks: {
        onReceived: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => {
          const data = JSON.stringify(generateWebsocketPayload(tag, payload))
          for (const peer of peers) {
            peer.send(data)
          }
        },

        onSent: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => {
          const data = JSON.stringify(generateWebsocketPayload(tag, payload))
          for (const peer of peers) {
            peer.send(data)
          }
        },
      },
    }
  }
}
