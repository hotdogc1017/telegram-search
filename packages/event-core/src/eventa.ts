import { customAlphabet } from 'nanoid'

interface EventPayload<T> {
  id: string
  data: T
  timestamp: number
}

export function nanoid() {
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16)()
}

export function generateEventPayload<T>(data: T): EventPayload<T> {
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

export function defineEventa<Req, Res>(tag?: string) {
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

export type InvokeEvent<Req, Res> = ReturnType<typeof defineEventa<Req, Res>>
