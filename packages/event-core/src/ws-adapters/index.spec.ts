import type { WebsocketPayload } from '.'
import type { EventTag } from '../eventa'

import { describe, expect, it } from 'vitest'

import { generateWebsocketPayload, parseWebsocketPayload } from '.'

describe('ws-adapters-index', () => {
  describe('generateWebsocketPayload', () => {
    it('should generate a valid websocket payload with all required fields', () => {
      const eventTag = 'test-event' as EventTag<string, string>
      const payload = 'test payload'

      const result = generateWebsocketPayload(eventTag, payload)

      expect(result).toEqual({
        id: expect.any(String),
        type: eventTag,
        payload,
        timestamp: expect.any(Number),
      })

      // Verify id is not empty
      expect(result.id).toHaveLength(16) // nanoid default length

      // Verify timestamp is recent (within last second)
      expect(result.timestamp).toBeGreaterThan(Date.now() - 1000)
      expect(result.timestamp).toBeLessThanOrEqual(Date.now())
    })

    it('should generate unique IDs for different calls', () => {
      const eventTag = 'test-event' as EventTag<string, string>
      const payload = 'test payload'

      const result1 = generateWebsocketPayload(eventTag, payload)
      const result2 = generateWebsocketPayload(eventTag, payload)

      expect(result1.id).not.toBe(result2.id)
    })

    it('should handle different payload types', () => {
      const eventTag = 'test-event' as EventTag<any, any>

      // Test with object payload
      const objectPayload = { key: 'value', number: 42 }
      const objectResult = generateWebsocketPayload(eventTag, objectPayload)
      expect(objectResult.payload).toEqual(objectPayload)

      // Test with array payload
      const arrayPayload = [1, 2, 3]
      const arrayResult = generateWebsocketPayload(eventTag, arrayPayload)
      expect(arrayResult.payload).toEqual(arrayPayload)

      // Test with null payload
      const nullResult = generateWebsocketPayload(eventTag, null)
      expect(nullResult.payload).toBeNull()

      // Test with undefined payload
      const undefinedResult = generateWebsocketPayload(eventTag, undefined)
      expect(undefinedResult.payload).toBeUndefined()
    })

    it('should preserve event tag correctly', () => {
      const eventTag = 'complex-event-name-123' as EventTag<string, string>
      const payload = 'test'

      const result = generateWebsocketPayload(eventTag, payload)

      expect(result.type).toBe(eventTag)
    })
  })

  describe('parseWebsocketPayload', () => {
    it('should correctly parse a valid websocket payload JSON string', () => {
      const originalPayload: WebsocketPayload<string> = {
        id: 'test-id-123',
        type: 'test-event' as EventTag<string, string>,
        payload: 'test payload',
        timestamp: 1234567890,
      }

      const jsonString = JSON.stringify(originalPayload)
      const parsed = parseWebsocketPayload<string>(jsonString)

      expect(parsed).toEqual(originalPayload)
    })

    it('should handle complex payload types', () => {
      const complexPayload = {
        user: { id: 1, name: 'John' },
        messages: ['hello', 'world'],
        metadata: { timestamp: Date.now(), type: 'chat' },
      }

      const originalPayload: WebsocketPayload<typeof complexPayload> = {
        id: 'complex-id',
        type: 'complex-event' as EventTag<typeof complexPayload, any>,
        payload: complexPayload,
        timestamp: Date.now(),
      }

      const jsonString = JSON.stringify(originalPayload)
      const parsed = parseWebsocketPayload<typeof complexPayload>(jsonString)

      expect(parsed).toEqual(originalPayload)
      expect(parsed.payload.user.name).toBe('John')
      expect(parsed.payload.messages).toHaveLength(2)
    })

    it('should throw error for invalid JSON', () => {
      const invalidJson = '{ invalid json structure'

      expect(() => parseWebsocketPayload(invalidJson)).toThrow()
    })

    it('should throw error for empty string', () => {
      expect(() => parseWebsocketPayload('')).toThrow()
    })

    it('should handle null and undefined payloads', () => {
      const nullPayload: WebsocketPayload<null> = {
        id: 'null-id',
        type: 'null-event' as EventTag<null, any>,
        payload: null,
        timestamp: Date.now(),
      }

      const undefinedPayload: WebsocketPayload<undefined> = {
        id: 'undefined-id',
        type: 'undefined-event' as EventTag<undefined, any>,
        payload: undefined,
        timestamp: Date.now(),
      }

      const nullParsed = parseWebsocketPayload<null>(JSON.stringify(nullPayload))
      const undefinedParsed = parseWebsocketPayload<undefined>(JSON.stringify(undefinedPayload))

      expect(nullParsed.payload).toBeNull()
      expect(undefinedParsed.payload).toBeUndefined()
    })
  })

  describe('integration: generate and parse roundtrip', () => {
    it('should maintain data integrity through generate -> stringify -> parse cycle', () => {
      const eventTag = 'roundtrip-test' as EventTag<string, string>
      const originalPayload = 'test data for roundtrip'

      // Generate payload
      const generated = generateWebsocketPayload(eventTag, originalPayload)

      // Stringify and parse
      const jsonString = JSON.stringify(generated)
      const parsed = parseWebsocketPayload<string>(jsonString)

      // Verify integrity
      expect(parsed.id).toBe(generated.id)
      expect(parsed.type).toBe(generated.type)
      expect(parsed.payload).toBe(generated.payload)
      expect(parsed.timestamp).toBe(generated.timestamp)
    })

    it('should handle complex objects through roundtrip', () => {
      const eventTag = 'complex-roundtrip' as EventTag<any, any>
      const complexPayload = {
        nested: {
          array: [1, 2, { deep: 'value' }],
          boolean: true,
          number: 42.5,
        },
        specialChars: 'unicode: 你好 emoji: 🚀',
      }

      const generated = generateWebsocketPayload(eventTag, complexPayload)
      const jsonString = JSON.stringify(generated)
      const parsed = parseWebsocketPayload<typeof complexPayload>(jsonString)

      expect(parsed.payload).toEqual(complexPayload)
      expect(parsed.payload.nested.array[2]).toEqual({ deep: 'value' })
      expect(parsed.payload.specialChars).toBe('unicode: 你好 emoji: 🚀')
    })
  })

  describe('websocketPayload interface compliance', () => {
    it('should generate payload that conforms to WebsocketPayload interface', () => {
      const eventTag = 'interface-test' as EventTag<number, number>
      const payload = 42

      const result = generateWebsocketPayload(eventTag, payload)

      // Type checks (these will fail at compile time if interface is wrong)
      const id: string = result.id
      const type: EventTag<number, number> = result.type
      const payloadValue: number = result.payload
      const timestamp: number = result.timestamp

      expect(typeof id).toBe('string')
      expect(typeof type).toBe('string')
      expect(typeof payloadValue).toBe('number')
      expect(typeof timestamp).toBe('number')
    })
  })

  describe('error handling and edge cases', () => {
    it('should handle very large payloads', () => {
      const largePayload = 'x'.repeat(10000) // 10KB string
      const eventTag = 'large-payload' as EventTag<string, string>

      const generated = generateWebsocketPayload(eventTag, largePayload)
      const jsonString = JSON.stringify(generated)
      const parsed = parseWebsocketPayload<string>(jsonString)

      expect(parsed.payload).toBe(largePayload)
      expect(parsed.payload.length).toBe(10000)
    })

    it('should handle special JavaScript values', () => {
      const eventTag = 'special-values' as EventTag<any, any>

      // Test Date objects (will be serialized as strings)
      const datePayload = new Date()
      const dateGenerated = generateWebsocketPayload(eventTag, datePayload)
      const dateParsed = parseWebsocketPayload<Date>(JSON.stringify(dateGenerated))

      // Note: Date objects become strings after JSON roundtrip
      expect(typeof dateParsed.payload).toBe('string')
    })

    it('should maintain timestamp precision', () => {
      const eventTag = 'timestamp-test' as EventTag<string, string>
      const payload = 'timestamp test'

      const before = Date.now()
      const generated = generateWebsocketPayload(eventTag, payload)
      const after = Date.now()

      expect(generated.timestamp).toBeGreaterThanOrEqual(before)
      expect(generated.timestamp).toBeLessThanOrEqual(after)
    })
  })
})
