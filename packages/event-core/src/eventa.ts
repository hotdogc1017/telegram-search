import { customAlphabet } from 'nanoid'

export function nanoid() {
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16)()
}

export interface InvokeEventConstraint<_Req, _Res> {}

export type EventTag<Res, Req> = string & InvokeEventConstraint<Req, Res>

// type ServerInvokeHandlerEvent<Req, Res> = symbol & InvokeEventConstraint<Req, Res>
// type ClientInvoke<Req> = symbol & InvokeEventConstraint<Req, null>

export interface Eventa<T> {
  id: string
  type?: T
}

export function defineEventa<T>(tag?: string, type?: T) {
  if (!tag) {
    tag = nanoid()
  }

  return {
    id: tag,
    type,
  } satisfies Eventa<T>
}
