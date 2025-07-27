import type { EventTag } from './eventa'
import type { EventaAdapter } from './ws-adapters'

interface CreateContextProps {
  adapter?: EventaAdapter

  // hooks?: {
  //   onReceived?: (event: Event<any, any>) => void
  // }
}

export function createContext(props: CreateContextProps = {}) {
  const listeners = new Map<EventTag<any, any>, Set<(params: any) => any>>()
  const onceListeners = new Map<EventTag<any, any>, Set<(params: any) => any>>()

  const hooks = props.adapter?.(emit).hooks

  function emit<Req, Res = undefined>(event: EventTag<Res, Req>, payload: Req) {
    for (const listener of listeners.get(event) || []) {
      listener(payload)
    }

    for (const onceListener of onceListeners.get(event) || []) {
      onceListener(payload)
      onceListeners.get(event)?.delete(onceListener)
    }

    hooks?.onSent(event, payload)
  }

  return {
    get listeners() {
      return listeners
    },

    get onceListeners() {
      return onceListeners
    },

    emit,

    on<Req, Res = undefined>(event: EventTag<Res, Req>, handler: (payload: Req) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)?.add((payload: Req) => {
        handler(payload)
        hooks?.onReceived?.(event, payload)
      })
    },

    once<Req, Res = undefined>(event: EventTag<Res, Req>, handler: (payload: Req) => void) {
      if (!onceListeners.has(event)) {
        onceListeners.set(event, new Set())
      }

      onceListeners.get(event)?.add((payload: Req) => {
        handler(payload)
        hooks?.onReceived?.(event, payload)
      })
    },

    off<Req, Res>(event: EventTag<Res, Req>) {
      listeners.delete(event)
      onceListeners.delete(event)
    },
  }
}

export type EventContext = ReturnType<typeof createContext>
export type EventContextEmitFn = EventContext['emit']
