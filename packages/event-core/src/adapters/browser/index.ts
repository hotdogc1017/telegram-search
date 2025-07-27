import type { EventContextEmitFn, EventTag } from '../../eventa'

import { defineInvokeEvent, nanoid } from '../../eventa'

const wsConnectedEvent = defineInvokeEvent<{ url: string }, object>()
const wsDisconnectedEvent = defineInvokeEvent<{ url: string }, object>()
const wsErrorEvent = defineInvokeEvent<{ error: unknown }, object>()

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
