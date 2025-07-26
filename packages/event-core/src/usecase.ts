import { defineEvent } from '.'

const errorEvent = defineEvent<{
  error: string | Error | unknown
}>({
  hooks: {
    afterEmit: ({ id, timestamp }) => {
      console.log('Event emitted with ID:', id, timestamp)
    },
  },
})

errorEvent.emit({ error: new Error('Test error') })
errorEvent.on(({ data }) => {
  console.error('Error event received:', data.error)
})

await errorEvent.until(({ data }) => {
  console.error('Progress event received:', data.error)
})

function useCaseWebWorker() {
  const initializeEvent: any = {}
  const initializedEvent: any = {}
  const progressEvent: any = {}

  function workerThread() {
    let initializing = false
    let initialized = false

    // const ctx = defineContext()
    initializeEvent.on((payload) => {
      if (initializing) {
        return
      }

      initializing = true
      setTimeout(() => {
        for (const progress of Array.from({ length: 10 }).fill(0)) {
          progressEvent.emit(ctx, { progress })
        }

        initialized = true
        initializing = false

        initializedEvent.emit()
      }, 1000)
    })
  }

  function mainThread() {
    const ctx = defineContext()

    initializeEvent.emit(ctx, { what })
    progressEvent.on(ctx, (payload) => {
      console.log('Progress:', payload.progress)
    })
    initializedEvent.until().then(() => {})
  }
}

function useCaseWebWorkerDesigned() {
  function workerThread() {

  }

  function mainThread() {

  }
}

function createSignal<T>() {

}

async function createInvoke<Response, Request = undefined>() {

}

async function* createStream<Response, Request = undefined>(): Event<ReadableStream<Reponse>> {

}

const setState = createSignal<boolean>()
const initialize = createInvoke<{ config: any }, boolean>()
const progressStream = createStream<{ progress: number }>()

function webWorker() {
  on(setState, () => {

  })
}

async function mainThread() {
  setState()
  await initialize({ config: {} })
}
