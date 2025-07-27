import type { EventContextEmitFn } from '../../context'
import type { EventTag } from '../../eventa'

import { defineEventa, nanoid } from '../../eventa'

const wsConnectedEvent = defineEventa<{ url: string }, object>()
const wsDisconnectedEvent = defineEventa<{ url: string }, object>()
const wsErrorEvent = defineEventa<{ error: unknown }, object>()

interface WebsocketPayload<T> {
  id: string
  type: EventTag<any, any>
  payload: T
  timestamp: number
}

function generateWebsocketPayload<T>(type: EventTag<any, any>, payload: T): WebsocketPayload<T> {
  return {
    id: nanoid(),
    type,
    payload,
    timestamp: Date.now(),
  }
}

function parseWebsocketPayload<T>(data: string): WebsocketPayload<T> {
  return JSON.parse(data) as WebsocketPayload<T>
}

export function createWsAdapter(url: string) {
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
        onReceive: <Req, Res>(tag: EventTag<Req, Res>, payload: Req) => {
          ws.send(JSON.stringify(generateWebsocketPayload(tag, payload)))
        },
      },
    }
  }
}

export type Adapter = ReturnType<typeof createWsAdapter>
