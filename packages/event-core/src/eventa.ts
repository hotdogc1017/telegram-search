import type { Adapter } from './adapters/browser'

import { customAlphabet } from 'nanoid'

interface EventPayload<T> {
  id: string
  data: T
  timestamp: number
}

export function nanoid() {
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16)()
}

function generateEventPayload<T>(data: T): EventPayload<T> {
  return {
    id: nanoid(),
    data,
    timestamp: Date.now(),
  }
}

interface InvokeEventConstraint<_Req, _Res> {}

export type EventTag<Req, Res> = string & InvokeEventConstraint<Req, Res>

// type ServerInvokeHandlerEvent<Req, Res> = symbol & InvokeEventConstraint<Req, Res>
// type ClientInvoke<Req> = symbol & InvokeEventConstraint<Req, null>

enum EventType {
  InboundEvent,
  OutboundEvent,
  OutboundEventStreamEnd,
}

type InboundEvent<Req, Res> = EventTag<Req, Res> & { type: EventType.InboundEvent }
type OutboundEvent<Req, Res> = EventTag<Req, Res> & { type: EventType.OutboundEvent }
type OutboundEventStreamEnd<Req, Res> = EventTag<Req, Res> & { type: EventType.OutboundEventStreamEnd }

export function defineInvokeEvent<Req, Res>(tag?: string) {
  if (!tag) {
    tag = nanoid()
  }

  const inboundEvent = `${tag}-inbound` as InboundEvent<Req, Res>
  const outboundEvent = `${tag}-outbound` as OutboundEvent<Req, Res>
  const outboundEventStreamEnd = `${tag}-outbound-stream-end` as OutboundEventStreamEnd<Req, Res>

  return {
    inboundEvent,
    outboundEvent,
    outboundEventStreamEnd,
  }
}

export type InvokeEvent<Req, Res> = ReturnType<typeof defineInvokeEvent<Req, Res>>

interface CreateContextProps {
  adapter?: Adapter

  // hooks?: {
  //   onReceive?: (event: Event<any, any>) => void
  // }
}

export function createContext(props: CreateContextProps = {}) {
  const listeners = new Map<EventTag<any, any>, Set<(params: any) => any>>()
  const onceListeners = new Map<EventTag<any, any>, Set<(params: any) => any>>()

  function emit<Req, Res>(event: EventTag<Req, Res>, payload: Req) {
    for (const listener of listeners.get(event) || []) {
      listener(payload)
    }

    for (const onceListener of onceListeners.get(event) || []) {
      onceListener(payload)
      onceListeners.get(event)?.delete(onceListener)
    }
  }

  const hooks = props.adapter?.(emit).hooks

  return {
    // listeners,
    // onceListeners,

    emit,

    on<Req, Res>(event: EventTag<Req, Res>, handler: (payload: Req) => void) {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)?.add((payload: Req) => {
        handler(payload)
        hooks?.onReceive?.(event, payload)
      })
    },

    once<Req, Res>(event: EventTag<Req, Res>, handler: (payload: Req) => void) {
      if (!onceListeners.has(event)) {
        onceListeners.set(event, new Set())
      }
      onceListeners.get(event)?.add((payload: Req) => {
        handler(payload)
        hooks?.onReceive?.(event, payload)
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

export function defineInvokeHandler<Req, Res>(serverCtx: EventContext, event: InvokeEvent<Req, Res>, fn: (payload: Req) => Res) {
  serverCtx.on(event.inboundEvent, (payload) => { // on: event_trigger
    serverCtx.emit(event.outboundEvent, fn(payload) as unknown as Req) // emit: event_response
  })
}

export function defineStreamInvokeHandler<Req, Res>(serverCtx: EventContext, event: InvokeEvent<Req, Res>, fn: (payload: Req) => AsyncGenerator<Res, void, unknown>) {
  serverCtx.on(event.inboundEvent, async (payload) => { // on: event_trigger
    const generator = fn(payload)
    for await (const res of generator) {
      serverCtx.emit(event.outboundEvent, res as unknown as Req) // emit: event_response
    }

    serverCtx.emit(event.outboundEventStreamEnd, undefined) // emit: event_stream_end
  })
}

export function toStreamHandler<Req, Res>(handler: (context: { payload: Req, emit: (data: Res) => void }) => Promise<void>): (payload: Req) => AsyncGenerator<Res, void, unknown> {
  return (payload) => {
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
    handler({ payload, emit })
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
