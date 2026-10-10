import { isMobileNotificationOpaqueIdentifier } from "@halaalvest/domain/mobile-notifications"

export function getNotificationEntityIdParam(
  value: string | string[] | undefined
) {
  return typeof value === "string" &&
    isMobileNotificationOpaqueIdentifier(value)
    ? value
    : null
}
