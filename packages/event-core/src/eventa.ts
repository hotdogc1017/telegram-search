interface InvokeEventConstraint<_Req, _Res> {}

type SymbolEvent<Req, Res> = symbol & InvokeEventConstraint<Req, Res>

// type ServerInvokeHandlerEvent<Req, Res> = symbol & InvokeEventConstraint<Req, Res>
// type ClientInvoke<Req> = symbol & InvokeEventConstraint<Req, null>

enum EventType {
  InboundEvent,
  OutboundEvent,
  OutboundEventStreamEnd,
}

type InboundEvent<Req, Res> = SymbolEvent<Req, Res> & { type: EventType.InboundEvent }
type OutboundEvent<Req, Res> = SymbolEvent<Req, Res> & { type: EventType.OutboundEvent }
type OutboundEventStreamEnd<Req, Res> = SymbolEvent<Req, Res> & { type: EventType.OutboundEventStreamEnd }

export function defineInvokeEvent<Req, Res>() {
  const inboundEvent = Symbol(EventType.InboundEvent) as InboundEvent<Req, Res>
  const outboundEvent = Symbol(EventType.OutboundEvent) as OutboundEvent<Req, Res>
  const outboundEventStreamEnd = Symbol(EventType.OutboundEventStreamEnd) as OutboundEventStreamEnd<Req, Res>

  return {
    inboundEvent,
    outboundEvent,
    outboundEventStreamEnd,
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
    clientCtx.until(event.outboundEvent, resolve) // on: event_response
    clientCtx.emit(event.inboundEvent, req) // emit: event_trigger
  })
}

export function defineStreamInvoke<Req, Res>(clientCtx: EventContext, event: InvokeEvent<Req, Res>) {
  return (req: Req) => {
    const stream = new ReadableStream<Res>({
      start(controller) {
        clientCtx.on(event.outboundEvent, (res: Res) => {
          controller.enqueue(res)
        })
        clientCtx.on(event.outboundEventStreamEnd, () => {
          controller.close()
        })
      },
      cancel() {
        clientCtx.off(event.outboundEvent)
      },
    })

    clientCtx.emit(event.inboundEvent, req) // emit: event_trigger
    return stream
  }
}

export function defineInvokeHandler<Req, Res>(serverCtx: EventContext, event: InvokeEvent<Req, Res>, fn: (params: Req) => Res) {
  serverCtx.on(event.inboundEvent, (params) => { // on: event_trigger
    serverCtx.emit(event.outboundEvent, fn(params)) // emit: event_response
  })
}

export function defineStreamInvokeHandler<Req, Res>(serverCtx: EventContext, event: InvokeEvent<Req, Res>, fn: (params: Req) => AsyncGenerator<Res, void, unknown>) {
  serverCtx.on(event.inboundEvent, async (params) => { // on: event_trigger
    const generator = fn(params)
    for await (const res of generator) {
      serverCtx.emit(event.outboundEvent, res) // emit: event_response
    }

    serverCtx.emit(event.outboundEventStreamEnd, undefined as any) // emit: event_stream_end
  })
}

export function toStreamHandler<Req, Res>(handler: (context: { params: Req, emit: (data: Res) => void }) => Promise<void>): (params: Req) => AsyncGenerator<Res, void, unknown> {
  return (params) => {
    const values: Promise<[Res, boolean]>[] = []
    let resolve: (x: [Res, boolean]) => void
    let handlerError: Error | null = null

    values.push(new Promise((r) => {
      resolve = r
    }))

    const emit = (data: Res) => {
      resolve([data, false])
      values.push(new Promise((r) => {
        resolve = r
      }))
    }

    // Start the handler and mark completion when done
    handler({ params, emit })
      .then(() => {
        resolve([undefined as any, true])
      })
      .catch((err) => {
        handlerError = err
        resolve([undefined as any, true])
      })

    return (async function* () {
      let val: Res
      for (let i = 0, done = false; !done; i++) {
        [val, done] = await values[i]
        delete values[i] // Clean up memory

        if (handlerError) {
          throw handlerError
        }

        if (!done) {
          yield val
        }
      }
    }())
  }
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
