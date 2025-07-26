interface InvokeEventConstraint<_Req, _Res> {}
type SymbolEvent<Req, Res> = symbol & InvokeEventConstraint<Req, Res>

// type ServerInvokeHandlerEvent<Req, Res> = symbol & InvokeEventConstraint<Req, Res>
// type ClientInvoke<Req> = symbol & InvokeEventConstraint<Req, null>

enum EventType {
  ServerEvent,
  ClientEvent,
}

type ServerEvent<Req, Res> = SymbolEvent<Req, Res> & { type: EventType.ServerEvent }
type ClientEvent<Req, Res> = SymbolEvent<Req, Res> & { type: EventType.ClientEvent }

export function defineInvokeEvent<Req, Res>() {
  const serverEvent = Symbol(EventType.ServerEvent) as ServerEvent<Req, Res>
  const clientEvent = Symbol(EventType.ClientEvent) as ClientEvent<Req, Res>

  return {
    serverEvent,
    clientEvent,
  }
}

type InvokeEvent<Req, Res> = ReturnType<typeof defineInvokeEvent<Req, Res>>

export function createContext() {
  const listeners = new Map<SymbolEvent<any, any>, Set<(params: any) => any>>()
  const onceListeners = new Map<SymbolEvent<any, any>, Set<(params: any) => any>>()

  return {
    // listeners,
    // onceListeners,

    emit<Req, Res>(event: SymbolEvent<Req, Res>, params: Req | Res) {
      for (const listener of listeners.get(event) || []) {
        listener(params)
      }

      for (const onceListener of onceListeners.get(event) || []) {
        onceListener(params)
        onceListeners.get(event)?.delete(onceListener)
      }
    },

    on<Req, Res>(event: SymbolEvent<Req, Res>, handler: (params: Req) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)?.add(handler)
    },

    once<Req, Res>(event: SymbolEvent<Req, Res>, handler: (params: Req) => void) {
      if (!onceListeners.has(event)) {
        onceListeners.set(event, new Set())
      }
      onceListeners.get(event)?.add(handler)
    },

    off<Req, Res>(event: SymbolEvent<Req, Res>) {
      listeners.delete(event)
    },

    until<Req, Res>(event: SymbolEvent<Req, Res>, listener: (params: Req) => any): Promise<Res> {
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

type EventContext = ReturnType<typeof createContext>

export function defineInvoke<Req, Res>(clientCtx: EventContext, event: InvokeEvent<Req, Res>) {
  return (req: Req) => new Promise<Res>((resolve) => {
    clientCtx.until(event.clientEvent, resolve) // on: event_response

    clientCtx.emit(event.serverEvent, req) // emit: event_trigger
  })
}

export function defineInvokeHandler<Req, Res>(serverCtx: EventContext, event: InvokeEvent<Req, Res>, fn: (params: Req) => Res) {
  serverCtx.on(event.serverEvent, (params) => { // on: event_trigger
    serverCtx.emit(event.clientEvent, fn(params)) // emit: event_response
  })
}

// // Server
// const serverCtx = createContext()
// const invokeEvent = defineInvokeEvent<{ name: string, age: number }, { id: string }>()
// defineInvokeHandler(serverCtx, invokeEvent, ({ name, age }) => {
//   return {
//     id: name + age.toString(),
//   }
// })

// // Client
// const clientCtx = createContext()
// const invoke = defineInvoke(clientCtx, invokeEvent)
// // eslint-disable-next-line antfu/no-top-level-await
// const { id } = await invoke({
//   name: 'alice',
//   age: 12,
// })
