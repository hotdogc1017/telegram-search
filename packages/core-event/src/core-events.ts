// Define a type for event handlers that can be synchronous or asynchronous
export type EventHandler<T = any> = (data: T) => void | Promise<void>

// Extract the data type from an event handler type
export type EventData<T> = T extends EventHandler<infer D> ? D : never

// Utility type to convert union types to intersection types
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never

/**
 * Merges multiple event definitions into a single Events object
 */
function mergeEvents<T extends Events<any, any>[]>(...events: T): UnionToIntersection<T[number]> {
  return events.reduce((acc, event) => ({ ...acc, ...event }), {}) as UnionToIntersection<T[number]>
}

export type Events<K extends PropertyKey, V> = {
  [key in K]: V
}

function havingPayload<D>(): D {
  return undefined as D
}

function defineEvent<K extends PropertyKey, V>(name: K, vFn: () => V) {
  return { [name]: () => undefined } as Events<K, ReturnType<typeof vFn>>
}

export const CoreError = defineEvent('core:error', havingPayload<{ error: string | Error | unknown }>)
export const CoreProgress = defineEvent('core:progress', havingPayload<{ progress: number }>)

const merged = mergeEvents(CoreError, CoreProgress)

function getEventKey<E extends Events<any, any>>(event: E) {
  return Object.keys(event)[0]
}
