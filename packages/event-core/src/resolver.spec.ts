import { defineFn } from './resolver'

const fn = defineFn(() => {
  console.log('Function executed')
})

await fn()
