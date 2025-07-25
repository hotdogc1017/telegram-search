import { defineContext } from '.'

const ctx = defineContext()

const errorEvent = ctx.having<{
  error: string | Error | unknown
}>()

errorEvent.emit({ error: new Error('Test error') })
errorEvent.on((data) => {
  console.error('Error event received:', data.error)
})

await errorEvent.until((data) => {
  console.error('Progress event received:', data.error)
})
