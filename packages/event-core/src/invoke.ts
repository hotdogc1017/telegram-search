import type { EventContext } from './context'
import type { InvokeEvent } from './eventa'

export function defineInvoke<Req, Res>(clientCtx: EventContext, event: InvokeEvent<Req, Res>) {
  return (req: Req) => new Promise<Res>((resolve) => {
    clientCtx.until(event.outboundEvent, resolve) // on: event_response
    clientCtx.emit(event.inboundEvent, req) // emit: event_trigger
  })
}

export function defineInvokeHandler<Req, Res>(serverCtx: EventContext, event: InvokeEvent<Req, Res>, fn: (payload: Req) => Res) {
  serverCtx.on(event.inboundEvent, (payload) => { // on: event_trigger
    serverCtx.emit(event.outboundEvent, fn(payload) as unknown as Req) // emit: event_response
  })
}
