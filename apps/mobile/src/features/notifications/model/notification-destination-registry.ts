import {
  parseMobileNotificationActionPayload,
  type MobileNotificationActionPayload,
} from "@halaalvest/domain/mobile-notifications"
import type { MobileProfile } from "@/lib/session-store"

export type NotificationDestinationResult =
  | { href: string; ok: true; payload: MobileNotificationActionPayload }
  | {
      message: string
      ok: false
      reason:
        | "invalid"
        | "signed_out"
        | "tenant_mismatch"
        | "role_mismatch"
        | "unavailable"
    }

const adminRoles = new Set([
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
])

function adminDestination(
  action: MobileNotificationActionPayload["action"]
) {
  if (action === "open_receipts") return "/(admin)/(tabs)/finance"
  if (action === "open_financing") return "/(admin)/financing-operations"
  if (action === "open_procurement") return "/(admin)/procurement-operations"
  if (action === "open_food_purchase") {
    return "/(admin)/food-purchase-operations"
  }
  if (action === "open_project_financing") {
    return "/(admin)/project-financing-operations"
  }
  if (action === "open_guarantors") return "/(admin)/financing-operations"
  if (action === "open_reports") return "/(admin)/(tabs)/reports"
  if (action === "open_support") return "/(admin)/(tabs)/finance"
  return null
}

function memberDestination(
  action: MobileNotificationActionPayload["action"]
) {
  if (action === "open_receipts") return "/(member)/receipts"
  if (action === "open_financing") return "/(member)/(tabs)/financing"
  if (action === "open_procurement") return "/(member)/procurement"
  if (action === "open_food_purchase") return "/(member)/food-purchase"
  if (action === "open_project_financing") {
    return "/(member)/project-financing"
  }
  if (action === "open_guarantors") return "/(member)/guarantor-approvals"
  if (action === "open_support") return "/(member)/support"
  return null
}

export function resolveNotificationDestination(
  value: unknown,
  profile: MobileProfile | null
): NotificationDestinationResult {
  const payload = parseMobileNotificationActionPayload(value)
  if (!payload) {
    return {
      message: "This notification link is not available.",
      ok: false,
      reason: "invalid",
    }
  }
  if (!profile) {
    return {
      message: "Sign in to open this notification.",
      ok: false,
      reason: "signed_out",
    }
  }
  if (payload.tenantId !== profile.tenant.id) {
    return {
      message: "This notification belongs to another cooperative.",
      ok: false,
      reason: "tenant_mismatch",
    }
  }
  const role = profile.cooperativeRole ?? (profile.role === "member" ? "member" : null)
  if (!role || payload.intendedRole !== role) {
    return {
      message: "Switch to the intended role to open this notification.",
      ok: false,
      reason: "role_mismatch",
    }
  }

  if (payload.action === "open_notifications") {
    return { href: "/notifications", ok: true, payload }
  }
  if (payload.action === "open_security") {
    return { href: "/sessions", ok: true, payload }
  }
  if (payload.action === "open_updates") {
    return { href: "/updates", ok: true, payload }
  }

  const href =
    role === "member"
      ? memberDestination(payload.action)
      : adminRoles.has(role)
        ? adminDestination(payload.action)
        : null
  if (!href) {
    return {
      message: "This destination is unavailable for the active role.",
      ok: false,
      reason: "unavailable",
    }
  }
  const entityHref = payload.entityId
    ? `${href}${href.includes("?") ? "&" : "?"}notificationEntityId=${encodeURIComponent(payload.entityId)}`
    : href
  return { href: entityHref, ok: true, payload }
}
