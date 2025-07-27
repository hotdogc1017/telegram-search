import type { EventaAdapter } from './ws-adapters'
import type { EventTag } from './eventa'

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

  function emit<Req, Res>(event: EventTag<Req, Res>, payload: Req) {
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

    on<Req, Res>(event: EventTag<Req, Res>, handler: (payload: Req) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)?.add((payload: Req) => {
        handler(payload)
        hooks?.onReceived?.(event, payload)
      })
    },

    once<Req, Res>(event: EventTag<Req, Res>, handler: (payload: Req) => void) {
      if (!onceListeners.has(event)) {
        onceListeners.set(event, new Set())
      }
      onceListeners.get(event)?.add((payload: Req) => {
        handler(payload)
        hooks?.onReceived?.(event, payload)
      })
    },

    off<Req, Res>(event: EventTag<Req, Res>) {
      listeners.delete(event)
      onceListeners.delete(event)
    },

    until<Req, Res>(event: EventTag<Req, Res>, listener: (payload: Req) => any): Promise<Res> {
      return new Promise((resolve, reject) => {
        if (!onceListeners.has(event)) {
          onceListeners.set(event, new Set())
        }

        onceListeners.get(event)?.add((data) => {
          try {
            const result = listener(data)
            resolve(result)
          }
          catch (error) {
            reject(error)
          }
        })
      })
    },
  }
}

export type EventContext = ReturnType<typeof createContext>
export type EventContextEmitFn = EventContext['emit']
