import "react-native-get-random-values"

export function createClientSubmissionKey() {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) return randomUuid

  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues?.(bytes)
  if (bytes.every((value) => value === 0)) {
    throw new Error(
      "Secure request identifiers are unavailable on this device."
    )
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"))
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`
}
