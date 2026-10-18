import { describe, expect, it } from 'vitest'
import { pushRecent, RECENT_MAX } from '../../src/lib/recent'

describe('pushRecent', () => {
  it('puts the newest first and removes the older copy', () => {
    expect(pushRecent([3, 2, 1], 2)).toEqual([2, 3, 1])
    expect(pushRecent([], 5)).toEqual([5])
  })
  it('returns the same list when the card is already first', () => {
    const l = [4, 3]; expect(pushRecent(l, 4)).toBe(l)
  })
  it('keeps at most 20', () => {
    const l = Array.from({ length: RECENT_MAX }, (_, i) => i)
    const r = pushRecent(l, 99); expect(r.length).toBe(RECENT_MAX); expect(r[0]).toBe(99); expect(r).not.toContain(RECENT_MAX - 1)
  })
})
