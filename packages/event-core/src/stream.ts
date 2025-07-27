import type { EventContext } from './context'
import type { InvokeEvent } from './eventa'

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
