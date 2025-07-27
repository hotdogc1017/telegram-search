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

export interface InvokeEventConstraint<_Req, _Res> {}

export type EventTag<Res, Req> = string & InvokeEventConstraint<Req, Res>

// type ServerInvokeHandlerEvent<Req, Res> = symbol & InvokeEventConstraint<Req, Res>
// type ClientInvoke<Req> = symbol & InvokeEventConstraint<Req, null>

export enum EventType {
  SendEvent,
  SendEventError,
  ReceiveEvent,
  ReceiveEventError,
  ReceiveEventStreamEnd,
}

export interface SendEvent<Res, Req = undefined, _ = undefined, __ = undefined> { id: EventTag<Res, Req>, type: EventType.SendEvent, body?: { invokeId: string, content: Req } }
export interface SendEventError<Res, Req = undefined, _ = undefined, ReqErr = Error> { id: EventTag<Res, Req>, type: EventType.SendEventError, body?: { invokeId: string, content: ReqErr } }
export interface ReceiveEvent<Res, Req = undefined, _ = undefined, __ = undefined> { id: EventTag<Res, Req>, type: EventType.ReceiveEvent, body?: { invokeId: string, content: Res } }
export interface ReceiveEventError<Res, Req = undefined, ResErr = undefined, _ = undefined> { id: EventTag<Res, Req>, type: EventType.ReceiveEventError, body?: { invokeId: string, content: { error: ResErr } } }
export interface ReceiveEventStreamEnd<Res, Req = undefined, _ = undefined, __ = undefined> { id: EventTag<Res, Req>, type: EventType.ReceiveEventStreamEnd, body?: { invokeId: string, content: undefined } }

export interface Eventa<Res, Req = undefined, ResErr = Error, ReqErr = Error> {
  sendEvent: SendEvent<Res, Req, ResErr, ReqErr>
  sendEventError: SendEventError<Res, Req, ResErr, ReqErr>
  receiveEvent: ReceiveEvent<Res, Req, ResErr, ReqErr>
  receiveEventError: ReceiveEventError<Res, Req, ResErr, ReqErr>
  receiveEventStreamEnd: ReceiveEventStreamEnd<Res, Req, ResErr, ReqErr>
}

export function defineEventa<Res, Req = undefined, ResErr = Error, ReqErr = Error>(tag?: string) {
  if (!tag) {
    tag = nanoid()
  }

  const sendEvent = {
    id: `${tag}-send`,
    type: EventType.SendEvent,
  } as SendEvent<Res, Req, ResErr, ReqErr>

  const sendEventError = {
    id: `${tag}-send-error`,
    type: EventType.SendEventError,
  } as SendEventError<Res, Req, ResErr, ReqErr>

  const receiveEvent = {
    id: `${tag}-receive`,
    type: EventType.ReceiveEvent,
  } as ReceiveEvent<Res, Req, ResErr, ReqErr>

  const receiveEventError = {
    id: `${tag}-receive-error`,
    type: EventType.ReceiveEventError,
  } as ReceiveEventError<Res, Req, ResErr, ReqErr>

  const receiveEventStreamEnd = {
    id: `${tag}-receive-stream-end`,
    type: EventType.ReceiveEventStreamEnd,
  } as ReceiveEventStreamEnd<Res, Req, ResErr, ReqErr>

  return {
    sendEvent,
    sendEventError,
    receiveEvent,
    receiveEventError,
    receiveEventStreamEnd,
  } satisfies Eventa<Res, Req, ResErr, ReqErr>
}
