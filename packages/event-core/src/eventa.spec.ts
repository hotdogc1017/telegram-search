import { describe, expect, it } from 'vitest'

import { defineEventa } from './eventa'

describe('eventa', () => {
  it('should create server and client events', () => {
    const events = defineEventa<{ name: string }, { id: string }>()
    expect(typeof events.inboundEvent).toBe('string')
    expect(typeof events.outboundEvent).toBe('string')
    expect(events.inboundEvent).not.toBe(events.outboundEvent)
  })
})
