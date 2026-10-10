import type { EventProperties } from "@halaalvest/events/attribution"
import type { createNativeAnalytics } from "@halaalvest/events/native"

let activeClient: ReturnType<typeof createNativeAnalytics> | null = null
export function setProductAnalyticsClient(client: typeof activeClient) {
  activeClient = client
}
export function trackProductEvent(
  name: string,
  properties: EventProperties = {}
) {
  return activeClient?.track(name, properties) ?? false
}
