import { describe, expect, it } from 'vitest'

import { Err, Ok } from '.'
import { Async, AsyncFromResult } from './async'

describe('asyncResult', () => {
  it('handles successful async operations', async () => {
    const result = await Async(async () => 42)
      .map(x => x * 2)
      .await()

    expect(result.unwrap()).toBe(84)
  })

  it('handles errors in async operations', async () => {
    const error = new Error('test error')
    const result = await Async(async () => {
      throw error
    })
      .await()

    let caught = false
    try {
      result.unwrap()
    }
    catch (e) {
      caught = true
      expect(e).toBe(error)
    }
    expect(caught).toBe(true)
  })

  it('allows error transformation with mapErr', async () => {
    const error = new Error('original error')
    const newError = new Error('transformed error')

    const result = await Async(async () => {
      throw error
    })
      .mapErr(() => newError)
      .await()

    let caught = false
    try {
      result.unwrap()
    }
    catch (e) {
      caught = true
      expect(e).toBe(newError)
    }
    expect(caught).toBe(true)
  })

  it('chains operations with then', async () => {
    const result = await Async(async () => 10)
      .then(x => x * 2)
      .then(x => Async(async () => x + 5))
      .await()

    expect(result.unwrap()).toBe(25)
  })

  it('recovers from errors with catch', async () => {
    const result = await Async(async () => {
      throw new Error()
    })
      .catch(() => 42)
      .await()

    expect(result.unwrap()).toBe(42)
  })

  it('works with AsyncFromResult', async () => {
    const success = await AsyncFromResult(async () => Ok(42))
      .map(x => x * 2)
      .await()

    expect(success.unwrap()).toBe(84)

    // eslint-disable-next-line unicorn/error-message
    const failure = await AsyncFromResult(async () => Err<number>(new Error()))
      .map(x => x * 2)
      .await()

    expect(failure.orUndefined()).toBeUndefined()
  })
})
