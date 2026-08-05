function randomReferencePart() {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid.replaceAll("-", "").slice(0, 10).toUpperCase()
  return Math.random().toString(36).slice(2, 12).toUpperCase().padEnd(10, "0")
}

export function createErrorReference() {
  return `ERR-${randomReferencePart()}`
}

function hashDigest(value: string, seed: number) {
  let hash = seed
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 16777619)
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, "0")
}

export function createErrorReferenceFromDigest(digest?: string) {
  const normalized = digest?.trim()
  if (!normalized) return undefined
  return `ERR-NEXT-${hashDigest(normalized, 2166136261)}${hashDigest(
    normalized,
    3339675911
  )}`
}
