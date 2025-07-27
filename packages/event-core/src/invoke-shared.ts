import type { EventTag } from './eventa'

import { defineEventa, nanoid } from './eventa'

export enum InvokeEventType {
  SendEvent,
  SendEventError,
  ReceiveEvent,
  ReceiveEventError,
  ReceiveEventStreamEnd,
}

export interface SendEvent<Res, Req = undefined, _ = undefined, __ = undefined> { id: EventTag<Res, Req>, type: InvokeEventType.SendEvent, body?: { invokeId: string, content: Req } }
export interface SendEventError<Res, Req = undefined, _ = undefined, ReqErr = Error> { id: EventTag<Res, Req>, type: InvokeEventType.SendEventError, body?: { invokeId: string, content: ReqErr } }
export interface ReceiveEvent<Res, Req = undefined, _ = undefined, __ = undefined> { id: EventTag<Res, Req>, type: InvokeEventType.ReceiveEvent, body?: { invokeId: string, content: Res } }
export interface ReceiveEventError<Res, Req = undefined, ResErr = undefined, _ = undefined> { id: EventTag<Res, Req>, type: InvokeEventType.ReceiveEventError, body?: { invokeId: string, content: { error: ResErr } } }
export interface ReceiveEventStreamEnd<Res, Req = undefined, _ = undefined, __ = undefined> { id: EventTag<Res, Req>, type: InvokeEventType.ReceiveEventStreamEnd, body?: { invokeId: string, content: undefined } }

export interface InvokeEventa<Res, Req = undefined, ResErr = Error, ReqErr = Error> {
  sendEvent: SendEvent<Res, Req, ResErr, ReqErr>
  sendEventError: SendEventError<Res, Req, ResErr, ReqErr>
  receiveEvent: ReceiveEvent<Res, Req, ResErr, ReqErr>
  receiveEventError: ReceiveEventError<Res, Req, ResErr, ReqErr>
  receiveEventStreamEnd: ReceiveEventStreamEnd<Res, Req, ResErr, ReqErr>
}

export function defineInvokeEventa<Res, Req = undefined, ResErr = Error, ReqErr = Error>(tag?: string) {
  if (!tag) {
    tag = nanoid()
  }

  const sendEvent = defineEventa<InvokeEventType.SendEvent>(`${tag}-send`) as SendEvent<Res, Req, ResErr, ReqErr>

  const sendEventError = defineEventa<InvokeEventType.SendEventError>(`${tag}-send-error`) as SendEventError<Res, Req, ResErr, ReqErr>

  const receiveEvent = defineEventa<InvokeEventType.ReceiveEvent>(`${tag}-receive`) as ReceiveEvent<Res, Req, ResErr, ReqErr>

  const receiveEventError = defineEventa<InvokeEventType.ReceiveEventError>(`${tag}-receive-error`) as ReceiveEventError<Res, Req, ResErr, ReqErr>

  const receiveEventStreamEnd = defineEventa<InvokeEventType.ReceiveEventStreamEnd>(`${tag}-receive-stream-end`) as ReceiveEventStreamEnd<Res, Req, ResErr, ReqErr>

  return {
    sendEvent,
    sendEventError,
    receiveEvent,
    receiveEventError,
    receiveEventStreamEnd,
  } satisfies InvokeEventa<Res, Req, ResErr, ReqErr>
}
