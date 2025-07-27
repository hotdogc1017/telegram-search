import { describe, it } from 'vitest'

import { createWsAdapter } from '.'
import { createContext } from '../../eventa'

describe('wsAdapter', () => {
  it('should create a ws adapter', () => {
    const wsAdapter = createWsAdapter('ws://localhost:3000')
    const ctx = createContext({ adapter: wsAdapter })
  })
})
