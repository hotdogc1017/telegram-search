import type { EventContext } from './context'
import type {
  InvokeEventa,
  ReceiveEvent,
  ReceiveEventError,
  ReceiveEventStreamEnd,
  SendEvent,
} from './invoke-shared'

import { nanoid } from './eventa'

export function defineStreamInvoke<Res, Req = undefined, ResErr = Error, ReqErr = Error>(clientCtx: EventContext, event: InvokeEventa<Res, Req, ResErr, ReqErr>) {
  return (req: Req) => {
    const invokeId = nanoid()

    const stream = new ReadableStream<Res>({
      start(controller) {
        clientCtx.on<ReceiveEvent<Res, Req, ResErr, ReqErr>>(event.receiveEvent.id, (payload) => {
          if (!payload.body) {
            return
          }
          if (payload.body.invokeId !== invokeId) {
            return
          }

          controller.enqueue(payload.body.content as Res)
        })
        clientCtx.on<ReceiveEventError<Res, Req, ResErr, ReqErr>>(event.receiveEventError.id, (payload) => {
          if (!payload.body) {
            return
          }
          if (payload.body.invokeId !== invokeId) {
            return
          }

          controller.error(payload.body.content as ResErr)
        })
        clientCtx.on<ReceiveEventStreamEnd<Res, Req, ResErr, ReqErr>>(event.receiveEventStreamEnd.id, (payload) => {
          if (!payload.body) {
            return
          }
          if (payload.body.invokeId !== invokeId) {
            return
          }

          controller.close()
        })
      },
      cancel() {
        clientCtx.off(event.receiveEvent.id)
      },
    })

    clientCtx.emit<SendEvent<Res, Req, ResErr, ReqErr>>(event.sendEvent.id, { ...event.sendEvent, body: { invokeId, content: req } }) // emit: event_trigger
    return stream
  }
}

export function defineStreamInvokeHandler<Res, Req = undefined, ResErr = Error, ReqErr = Error>(serverCtx: EventContext, event: InvokeEventa<Res, Req, ResErr, ReqErr>, fn: (payload: Req) => AsyncGenerator<Res, void, unknown>) {
  serverCtx.on<SendEvent<Res, Req, ResErr, ReqErr>>(event.sendEvent.id, async (payload) => { // on: event_trigger
    if (!payload.body) {
      return
    }
    if (!payload.body.invokeId) {
      return
    }

    const generator = fn(payload.body.content as Req) // Call the handler function with the request payload
    for await (const res of generator) {
      serverCtx.emit<ReceiveEvent<Res, Req, ResErr, ReqErr>>(event.receiveEvent.id, { ...event.receiveEvent, body: { ...payload.body, content: res } }) // emit: event_response
    }

    serverCtx.emit<ReceiveEventStreamEnd<Res, Req, ResErr, ReqErr>>(event.receiveEventStreamEnd.id, { ...event.receiveEventStreamEnd, body: { ...payload.body, content: undefined } }) // emit: event_stream_end
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
