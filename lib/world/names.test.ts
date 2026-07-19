import { describe, expect, it } from 'vitest'

import { AVATAR_TINTS, worldIdentity } from './names'

describe('worldIdentity', () => {
  it('is deterministic for a presence key', () => {
    expect(worldIdentity('same-tab')).toEqual(worldIdentity('same-tab'))
  })

  it('returns a fun name and a curated tint', () => {
    const identity = worldIdentity('buyer-42')
    expect(identity.name).toMatch(/^[a-z]+-[a-z]+-\d+$/)
    expect(AVATAR_TINTS).toContain(identity.tint)
  })
})
