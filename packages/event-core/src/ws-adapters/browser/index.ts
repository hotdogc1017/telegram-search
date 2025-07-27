import type { EventaAdapter } from '..'
import type { EventContextEmitFn } from '../../context'
import type { EventTag } from '../../eventa'

import { generateWebsocketPayload, parseWebsocketPayload } from '..'
import { defineInvokeEventa } from '../../invoke-shared'

export const wsConnectedEvent = defineInvokeEventa<{ url: string }, object>()
export const wsDisconnectedEvent = defineInvokeEventa<{ url: string }, object>()
export const wsErrorEvent = defineInvokeEventa<{ error: unknown }, object>()

export function createWsAdapter(url: string): EventaAdapter {
  return (emit: EventContextEmitFn) => {
    const ws = new WebSocket(url)

    ws.onmessage = ({ data }) => {
      const { type, payload } = parseWebsocketPayload(data)
      emit(type, payload)
    }

    ws.onopen = () => {
      emit(wsConnectedEvent.sendEvent, { url })
    }

    ws.onerror = (error) => {
      emit(wsErrorEvent.sendEvent, { error })
    }

    ws.onclose = () => {
      emit(wsDisconnectedEvent.sendEvent, { url })
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
