const ADJECTIVES = [
  'butter',
  'cosy',
  'gentle',
  'happy',
  'lucky',
  'mellow',
  'sunny',
  'warm',
] as const

const NOUNS = [
  'bun',
  'kopi',
  'otter',
  'pandan',
  'peach',
  'toast',
  'waffle',
  'yakult',
] as const

// Curated to stay soft against the warm court and away from semantic colors.
export const AVATAR_TINTS = [
  '#d88c73',
  '#93a77b',
  '#d7b65d',
  '#bd8066',
  '#83a7bf',
  '#a892bd',
  '#cf8fa3',
  '#78a9a0',
] as const

export function hashPresenceKey(value: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

export function worldIdentity(key: string) {
  const hash = hashPresenceKey(key)
  const adjective = ADJECTIVES[hash % ADJECTIVES.length]
  const noun = NOUNS[Math.floor(hash / ADJECTIVES.length) % NOUNS.length]
  const suffix = 1 + (hash % 99)

  return {
    name: `${adjective}-${noun}-${suffix}`,
    tint: AVATAR_TINTS[hash % AVATAR_TINTS.length],
  }
}

/** Anonymous per-tab key shared by the flat social and 3D presence channels. */
export function presenceKey() {
  const storageKey = 'drops-social-session'
  try {
    const existing = window.sessionStorage.getItem(storageKey)
    if (existing) return existing
    const created = crypto.randomUUID()
    window.sessionStorage.setItem(storageKey, created)
    return created
  } catch {
    return crypto.randomUUID()
  }
}
