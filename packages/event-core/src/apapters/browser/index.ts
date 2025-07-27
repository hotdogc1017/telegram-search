import type { EventContextEmitFn, SymbolEvent } from '../../eventa'

import { defineInvokeEvent } from '../../eventa'

const wsConnectedEvent = defineInvokeEvent<{ url: string }, object>()
const wsDisconnectedEvent = defineInvokeEvent<{ url: string }, object>()
const wsErrorEvent = defineInvokeEvent<{ error: unknown }, object>()

export function createWsAdapter(url: string) {
  return (emit: EventContextEmitFn) => {
    const ws = new WebSocket(url)

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      emit(data.type, data.data)
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
        onReceive: <Req, Res>(event: SymbolEvent<Req, Res>, params: Req) => {
          ws.send(JSON.stringify({
            type: event,
            data: params,
          }))
        },
      },
    }
  }
}

export type Adapter = ReturnType<typeof createWsAdapter>
