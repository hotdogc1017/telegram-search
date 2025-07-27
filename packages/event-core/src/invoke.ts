import type { EventContext } from './context'
import type { Eventa, ReceiveEvent, ReceiveEventError, SendEvent } from './eventa'

import { nanoid } from './eventa'

export function defineInvoke<Res, Req = undefined, ResErr = Error, ReqErr = Error>(clientCtx: EventContext, event: Eventa<Res, Req, ResErr, ReqErr>) {
  const mInvokeIdPromiseResolvers = new Map<string, (value: Res | PromiseLike<Res>) => void>()
  const mInvokeIdPromiseRejectors = new Map<string, (err?: any) => void>()

  return (req: Req) => new Promise<Res>((resolve, reject) => {
    const invokeId = nanoid()
    mInvokeIdPromiseResolvers.set(invokeId, resolve)
    mInvokeIdPromiseRejectors.set(invokeId, reject)

    clientCtx.on<ReceiveEvent<Res, Req, ResErr, ReqErr>>(event.receiveEvent.id, (payload) => {
      if (!payload.body) {
        return
      }
      if (payload.body.invokeId !== invokeId) {
        return
      }

      const { content } = payload.body
      mInvokeIdPromiseResolvers.get(invokeId)?.(content as Res)
      mInvokeIdPromiseResolvers.delete(invokeId)
      mInvokeIdPromiseRejectors.delete(invokeId)
      clientCtx.off(event.receiveEvent.id) // Clean up listener after receiving response
    })

    clientCtx.on<ReceiveEventError<Res, Req, ResErr, ReqErr>>(event.receiveEventError.id, (payload) => {
      if (!payload.body) {
        return
      }
      if (payload.body.invokeId !== invokeId) {
        return
      }

      const { error } = payload.body.content
      mInvokeIdPromiseRejectors.get(invokeId)?.(error)
      mInvokeIdPromiseRejectors.delete(invokeId)
      mInvokeIdPromiseResolvers.delete(invokeId)
    })

    clientCtx.emit<SendEvent<Res, Req, ResErr, ReqErr>>(event.sendEvent.id, { ...event.sendEvent, body: { invokeId, content: req } }) // emit: event_trigger
  })
}

export function defineInvokeHandler<Res, Req = undefined, ResErr = Error, ReqErr = Error>(serverCtx: EventContext, event: Eventa<Res, Req, ResErr, ReqErr>, fn: (payload: Req) => Res) {
  serverCtx.on<SendEvent<Res, Req, ResErr, ReqErr>>(event.sendEvent.id, (payload) => { // on: event_trigger
    if (!payload.body) {
      return
    }
    if (!payload.body.invokeId) {
      return
    }

    try {
      const response = fn(payload.body?.content as Req) // Call the handler function with the request payload
      serverCtx.emit<ReceiveEvent<Res, Req, ResErr, ReqErr>>(event.receiveEvent.id, { ...event.receiveEvent, body: { ...payload.body, content: response } }) // emit: event_response
    }
    catch (error) {
      // TODO: to error object
      serverCtx.emit<ReceiveEventError<Res, Req, ResErr, ReqErr>>(event.receiveEventError.id, { ...event.receiveEventError, body: { ...payload.body, content: error as any } }) // emit: event_response with error
    }
  })
}
