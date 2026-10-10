// Avoid browser-only encoders: this is also used by the native transport.
function utf8Size(value: string) {
  let bytes = 0
  for (const character of value) {
    const point = character.codePointAt(0)!
    bytes += point <= 0x7f ? 1 : point <= 0x7ff ? 2 : point <= 0xffff ? 3 : 4
  }
  return bytes
}
export function packBatch<T>(events: T[], sentAt: string) {
  const batch = {
    sentAt,
    sdk: { name: "@ishaqyusuf/logly-core" as const, version: "0.3.0" },
    events: [] as T[],
  }
  for (const event of events.slice(0, 25)) {
    const next = { ...batch, events: [...batch.events, event] }
    if (utf8Size(JSON.stringify(next)) > 48 * 1024) break
    batch.events.push(event)
  }
  return batch
}
