type EventPayload<T> = T

interface Event<T> {
  payload: EventPayload<T>
  emit: (data: T) => void | Promise<void>
  on: (listener: (data: T) => void | Promise<void>) => void
  once: (listener: (data: T) => void | Promise<void>) => void
  off: (listener: (data: T) => void | Promise<void>) => void
  until: (listener: (data: T) => void | Promise<void>) => Promise<void>
}

interface EventContext {
  having: <T>() => Event<T>
}

export function defineContext(): EventContext {
  return {
    having<T>(): Event<T> {
      return {
        emit: () => undefined,
        on: () => undefined,
        once: () => undefined,
        off: () => undefined,
        until: () => Promise.resolve(),
        payload: {} as EventPayload<T>,
      }
    },
  }
}
