export type EventProperties = Record<string, string | number | boolean | null>
export type EventGroups = Record<
  string,
  { key: string; properties?: EventProperties }
>
export type Attribution = {
  actorId?: string
  groups?: EventGroups
  properties: EventProperties
}
export type AnalyticsContext = {
  token: string
  scope: string
  expiresAt: number
}

// Product-owned metadata, not a dump of account/form fields.
const allowedProperties = new Set([
  "surface",
  "app_area",
  "audience",
  "workspace_role",
  "channel",
  "payment_method",
  "item_count",
  "action",
  "category",
  "status",
  "duration_ms",
  "success",
])
export function safeProperties(input: EventProperties): EventProperties {
  return Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) =>
        allowedProperties.has(key) &&
        (value === null ||
          typeof value === "boolean" ||
          (typeof value === "number" && Number.isFinite(value)) ||
          (typeof value === "string" && value.length <= 256))
    )
  )
}

export function validEventName(name: string) {
  return name.length > 0 && name.length <= 80 && /^[a-z][a-z0-9_.]*$/.test(name)
}
