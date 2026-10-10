export const MOBILE_NOTIFICATION_CATEGORY_KEYS = [
  "security",
  "transactions",
  "financing",
  "cooperative",
  "support",
] as const

export type MobileNotificationCategoryKey =
  (typeof MOBILE_NOTIFICATION_CATEGORY_KEYS)[number]

export const MOBILE_NOTIFICATION_CATEGORIES = [
  {
    defaultEnabled: true,
    description: "Sign-in and device protection",
    key: "security",
    mandatory: true,
    title: "Security",
  },
  {
    defaultEnabled: true,
    description: "Receipts and account changes",
    key: "transactions",
    mandatory: true,
    title: "Transactions",
  },
  {
    defaultEnabled: true,
    description: "Requests and repayments",
    key: "financing",
    mandatory: false,
    title: "Financing",
  },
  {
    defaultEnabled: true,
    description: "Announcements and reminders",
    key: "cooperative",
    mandatory: false,
    title: "Cooperative updates",
  },
  {
    defaultEnabled: true,
    description: "Replies to your requests",
    key: "support",
    mandatory: false,
    title: "Support",
  },
] as const satisfies ReadonlyArray<{
  defaultEnabled: boolean
  description: string
  key: MobileNotificationCategoryKey
  mandatory: boolean
  title: string
}>

export const MOBILE_NOTIFICATION_ACTIONS = [
  "open_notifications",
  "open_receipts",
  "open_financing",
  "open_procurement",
  "open_food_purchase",
  "open_project_financing",
  "open_guarantors",
  "open_support",
  "open_reports",
  "open_security",
  "open_updates",
] as const

export type MobileNotificationAction =
  (typeof MOBILE_NOTIFICATION_ACTIONS)[number]

export const MOBILE_NOTIFICATION_ROLES = [
  "super_admin",
  "tenant_admin",
  "finance_officer",
  "operations_officer",
  "member",
] as const

export type MobileNotificationRole =
  (typeof MOBILE_NOTIFICATION_ROLES)[number]

export const MOBILE_NOTIFICATION_PAYLOAD_VERSION = 1 as const

export type MobileNotificationActionPayload = {
  action: MobileNotificationAction
  entityId?: string
  intendedRole: MobileNotificationRole
  notificationId: string
  tenantId: string
  version: typeof MOBILE_NOTIFICATION_PAYLOAD_VERSION
}

export type MobileNotificationRouting = {
  action: MobileNotificationAction
  category: MobileNotificationCategoryKey
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

export function isMobileNotificationOpaqueIdentifier(
  value: unknown
): value is string {
  return (
    typeof value === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(value.trim())
  )
}

export function parseMobileNotificationActionPayload(
  value: unknown
): MobileNotificationActionPayload | null {
  if (!isRecord(value) || value.version !== MOBILE_NOTIFICATION_PAYLOAD_VERSION) {
    return null
  }
  if (
    typeof value.action !== "string" ||
    !MOBILE_NOTIFICATION_ACTIONS.includes(
      value.action as MobileNotificationAction
    ) ||
    typeof value.intendedRole !== "string" ||
    !MOBILE_NOTIFICATION_ROLES.includes(
      value.intendedRole as MobileNotificationRole
    ) ||
    !isMobileNotificationOpaqueIdentifier(value.notificationId) ||
    !isMobileNotificationOpaqueIdentifier(value.tenantId) ||
    (value.entityId !== undefined &&
      !isMobileNotificationOpaqueIdentifier(value.entityId))
  ) {
    return null
  }

  return {
    action: value.action as MobileNotificationAction,
    ...(typeof value.entityId === "string" && value.entityId.trim()
      ? { entityId: value.entityId.trim() }
      : {}),
    intendedRole: value.intendedRole as MobileNotificationRole,
    notificationId: value.notificationId.trim(),
    tenantId: value.tenantId.trim(),
    version: MOBILE_NOTIFICATION_PAYLOAD_VERSION,
  }
}

export function isMandatoryMobileNotificationCategory(
  key: MobileNotificationCategoryKey
) {
  return MOBILE_NOTIFICATION_CATEGORIES.some(
    (category) => category.key === key && category.mandatory
  )
}

export function getMobileNotificationRouting(
  notificationType: string,
  intendedRole: MobileNotificationRole
): MobileNotificationRouting {
  const normalized = notificationType.trim().toLowerCase()
  const isMember = intendedRole === "member"

  if (/(?:security|session|password|sign.?in|auth)/.test(normalized)) {
    return { action: "open_security", category: "security" }
  }
  if (normalized.includes("support")) {
    return { action: "open_support", category: "support" }
  }
  if (normalized.includes("guarantor")) {
    return {
      action: isMember ? "open_guarantors" : "open_financing",
      category: "financing",
    }
  }
  if (normalized.includes("project_financing")) {
    return { action: "open_project_financing", category: "financing" }
  }
  if (normalized.includes("food_purchase")) {
    return { action: "open_food_purchase", category: "financing" }
  }
  if (normalized.includes("procurement")) {
    return { action: "open_procurement", category: "financing" }
  }
  if (
    [
      "loan",
      "financing",
      "collections",
    ].some((part) => normalized.includes(part))
  ) {
    return { action: "open_financing", category: "financing" }
  }
  if (/(?:report|audit|import)/.test(normalized)) {
    return {
      action: isMember ? "open_notifications" : "open_reports",
      category: "cooperative",
    }
  }
  if (
    [
      "receipt",
      "payment",
      "contribution",
      "charge",
      "monthly_record",
      "repayment",
      "share",
    ].some((part) => normalized.includes(part))
  ) {
    return {
      action:
        isMember && /(?:receipt|payment)/.test(normalized)
          ? "open_receipts"
          : "open_notifications",
      category: "transactions",
    }
  }
  if (/(?:app_update|release)/.test(normalized)) {
    return { action: "open_updates", category: "cooperative" }
  }
  return { action: "open_notifications", category: "cooperative" }
}
