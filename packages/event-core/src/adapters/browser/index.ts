import type { EventContextEmitFn } from '../../context'
import type { EventTag } from '../../eventa'
import type { EventaAdapter } from '../websocket'

import { defineEventa } from '../../eventa'
import { generateWebsocketPayload, parseWebsocketPayload } from '../websocket'

export const wsConnectedEvent = defineEventa<{ url: string }, object>()
export const wsDisconnectedEvent = defineEventa<{ url: string }, object>()
export const wsErrorEvent = defineEventa<{ error: unknown }, object>()

export function createWsAdapter(url: string): EventaAdapter {
  return (emit: EventContextEmitFn) => {
    const ws = new WebSocket(url)

    ws.onmessage = ({ data }) => {
      const { type, payload } = parseWebsocketPayload(data)
      emit(type, payload)
    }

    ws.onopen = () => {
      emit(wsConnectedEvent.inboundEvent, { url })
    }

    ws.onerror = (error) => {
      emit(wsErrorEvent.inboundEvent, { error })
    }

    ws.onclose = () => {
      emit(wsDisconnectedEvent.inboundEvent, { url })
    }

    return {
      cleanup: () => ws.close(),

      hooks: {
        onReceived: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => {
          ws.send(JSON.stringify(generateWebsocketPayload(tag, payload)))
        },

        onSent: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => {
          ws.send(JSON.stringify(generateWebsocketPayload(tag, payload)))
        },
      },
    }
  }
}
