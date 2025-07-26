import { customAlphabet } from 'nanoid'

interface EventPayload<T> {
  id: string
  data: T
  timestamp: number
}

function nanoid() {
  return customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 16)()
}

function generateEventPayload<T>(data: T): EventPayload<T> {
  return {
    id: nanoid(),
    data,
    timestamp: Date.now(),
  }
}

type MaybePromise<T> = T | Promise<T>

interface DefineEventContextProps {
  hooks: {
    beforeEmit?: () => MaybePromise<void>
    afterEmit?: <T>(payload: EventPayload<T>) => MaybePromise<void>
  }
}

export function defineEvent<T>(props?: DefineEventContextProps) {
  const listeners = new Set<(payload: EventPayload<T>) => MaybePromise<void>>()
  const onceListeners = new Set<(payload: EventPayload<T>) => MaybePromise<void>>()

  return {
    emit: (data: T) => {
      props?.hooks.beforeEmit?.()

      for (const listener of listeners) {
        const eventPayload = generateEventPayload(data)

        listener(eventPayload)

        props?.hooks.afterEmit?.(eventPayload)
      }

      for (const listener of onceListeners) {
        const eventPayload = generateEventPayload(data)

        listener(eventPayload)
        onceListeners.delete(listener)

        props?.hooks.afterEmit?.(eventPayload)
      }
    },
    on: (listener: (payload: EventPayload<T>) => MaybePromise<void>) => {
      listeners.add(listener)
    },
    once: (listener: (payload: EventPayload<T>) => MaybePromise<void>) => {
      onceListeners.add(listener)
    },
    off: (listener: (payload: EventPayload<T>) => MaybePromise<void>) => {
      listeners.delete(listener)
    },
    until: <R>(listener: (payload: EventPayload<T>) => R) => {
      return new Promise<R>((resolve) => {
        onceListeners.add((data) => {
          const result = listener(data)
          resolve(result)
        })
      })
    },
  }
}

export type Event<T> = ReturnType<typeof defineEvent<T>>

// export function createInvoke<Res, Req>() {
//   const event = defineEvent<Res>()

//   return {
//     event,
//   }
// }

// type InvokeFunction<Res, Req> = ReturnType<typeof createInvoke<Res, Req>>

// function watch<T>(invokeFn: InvokeFunction<T>, cb: (payload: EventPayload<T>) => void) {
//   invokeFn.on((payload) => {
//     cb(payload)
//   })
// }

// const testInvoke = createInvoke<boolean, { name: string }>()
// const result = testInvoke({ name: 'alice' }) // emit

// watch(testInvoke, (payload) => {
//   console.log('Event payload:', payload)
// })

function defineInvoke<Res, Req>(fn: (req?: Req) => Res) {
  const serverEvent = defineEvent<Req>()
  const clientEvent = defineEvent<Res>()

  serverEvent.on((payload) => {
    clientEvent.emit(fn(payload.data))
  })

  return (req?: Req) => {
    serverEvent.emit(req as Req)

    return clientEvent.until((payload) => {
      return payload.data
    })
  }
}

// // shared/events.ts
// const getUsers = defineEvent()

// // api/users.ts
// const serverCtx = defineCtx()
// serverCtx()
//   .having(defineInvokeHandler(getUsers, async () => []))

// // render/pages/users.tsx
// const clientCtx = defineCtx()
// const getUsers = defineInvoke(serverCtx, getUsersEvent)

// const users = await getUsers()

// interface Event<T> {
//   id: string
//   data: T
// }

// interface Ctx {
//   on: any
//   off: any
//   emit: any
//   until: any
// }

// type SomeEvent = Event<{ extra: string }>

// function defineInvoke(ctx: Ctx, event: SomeEvent) {
//   return function (param: Parameter<SomeEvent>): Promise<ReturnType<SomeEvent> => {
//     return new Promise((resolve, reject) => {
//       ctx.on(SomeEvent.requestSubEvent, resolve)
//       ctx.on(SomeEvent.errorSubEvent, reject)
//       ctx.emit(SomeEvent.baseEvent, param)
//     })
//   }
// }

// function defineInvokeHandler(ctx: Ctx, event: SomeEvent, stream: true, handler: (param: Parameter<SomeEvent>) => AsyncIterable<ReturnType<SomeEvent>>)
// function defineInvokeHandler(ctx: Ctx, event: SomeEvent, ...params: (boolean | ((param: Parameter<SomeEvent>) => ReturnType<SomeEvent>))[]) {
//   ctx.on(event.baseEvent, async (param: Parameter<SomeEvent>) => {
//     try {
//       const result = await handler(param)
//       ctx.emit(event.responseSubEvent, result)
//     } catch (error) {
//       ctx.emit(event.errorSubEvent, error)
//     }
//   })
// }


// For server
const testInvoke = defineInvoke(() => {
  return 1
})

// For client
const result = await testInvoke() // 1
