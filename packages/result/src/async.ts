import type { Result } from '.'

import { Err, Ok } from '.'

/**
 * AsyncResult provides a promise-like interface for chaining operations
 * with deferred execution until await is called
 */
export interface AsyncResult<T> {
  /** Transform the success value if the operation succeeds */
  map: <U>(fn: (value: T) => U | Promise<U>) => AsyncResult<U>
  /** Transform the error if the operation fails */
  mapErr: (fn: (error: unknown) => unknown) => AsyncResult<T>
  /** Chain another async operation on success */
  then: <U>(fn: (value: T) => U | Promise<U> | AsyncResult<U>) => AsyncResult<U>
  /** Handle errors and potentially recover */
  catch: <U>(fn: (error: unknown) => U | Promise<U> | AsyncResult<U>) => AsyncResult<T | U>
  /** Execute the chain and return the final Result */
  await: () => Promise<Result<T>>
  /** Execute the chain and unwrap the result (throws on error) */
  unwrap: () => Promise<T>
  /** Execute the chain and expect success (throws with message on error) */
  expect: (message?: string) => Promise<T>
}

export function Async<T>(fn: () => Promise<T>): AsyncResult<T> {
  return createAsyncResult(async () => {
    try {
      return Ok(await fn())
    }
    catch (error) {
      return Err<T>(error)
    }
  })
}

export function AsyncFromResult<T>(fn: () => Promise<Result<T>>): AsyncResult<T> {
  return createAsyncResult(fn)
}

function createAsyncResult<T>(executor: () => Promise<Result<T>>): AsyncResult<T> {
  return {
    map: <U>(fn: (value: T) => U | Promise<U>) => {
      return createAsyncResult(async () => {
        const result = await executor()
        if (result.orUndefined() === undefined) {
          return result as unknown as Result<U>
        }
        try {
          const transformed = fn(result.unwrap())
          const awaited = await Promise.resolve(transformed)
          return Ok(awaited)
        }
        catch (error) {
          return Err<U>(error)
        }
      })
    },

    mapErr: (fn: (error: unknown) => unknown) => {
      return createAsyncResult(async () => {
        const result = await executor()
        if (result.orUndefined() !== undefined) {
          return result
        }
        try {
          // Extract the error from the Err result
          let error: unknown
          try {
            result.unwrap()
          }
          catch (e) {
            error = e
          }
          const transformed = fn(error)
          return Err<T>(transformed)
        }
        catch (error) {
          return Err<T>(error)
        }
      })
    },

    // oxlint-disable-next-line no-thenable
    then: <U>(fn: (value: T) => U | Promise<U> | AsyncResult<U>) => {
      return createAsyncResult(async () => {
        const result = await executor()
        if (result.orUndefined() === undefined) {
          return result as unknown as Result<U>
        }
        try {
          const transformed = fn(result.unwrap())

          // Handle AsyncResult
          if (transformed && typeof transformed === 'object' && 'await' in transformed) {
            return await (transformed as AsyncResult<U>).await()
          }

          // Handle Promise
          const awaited = await Promise.resolve(transformed)
          return Ok(awaited)
        }
        catch (error) {
          return Err<U>(error)
        }
      })
    },

    catch: <U>(fn: (error: unknown) => U | Promise<U> | AsyncResult<U>) => {
      return createAsyncResult(async () => {
        const result = await executor()
        if (result.orUndefined() !== undefined) {
          return result as unknown as Result<T | U>
        }
        try {
          // Extract the error from the Err result
          let error: unknown
          try {
            result.unwrap()
          }
          catch (e) {
            error = e
          }

          const recovered = fn(error)

          // Handle AsyncResult
          if (recovered && typeof recovered === 'object' && 'await' in recovered) {
            return await (recovered as AsyncResult<U>).await() as Result<T | U>
          }

          // Handle Promise
          const awaited = await Promise.resolve(recovered)
          return Ok(awaited) as Result<T | U>
        }
        catch (error) {
          return Err<T | U>(error)
        }
      })
    },

    await: () => executor(),

    unwrap: async () => {
      const result = await executor()
      return result.unwrap()
    },

    expect: async (message?: string) => {
      const result = await executor()
      return result.expect(message)
    },
  }
}
