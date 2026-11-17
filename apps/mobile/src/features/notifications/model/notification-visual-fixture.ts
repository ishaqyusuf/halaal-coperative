import type {
  NotificationCenter,
  NotificationDelivery,
} from "./notification-center-types"

const KINDS = [
  ["Receipt", "open_receipts"],
  ["Financing", "open_financing"],
  ["Guarantor", "open_guarantors"],
  ["Cooperative", "open_updates"],
  ["Support", "open_support"],
  ["Project financing", "open_financing"],
] as const
const TODAY = [
  [0, 9, 12],
  [1, 8, 30],
  [2, 7, 5],
] as const
const YESTERDAY = [
  [3, 18, 40],
  [4, 15, 2],
  [0, 11, 20],
  [5, 10, 5],
] as const

/** Development-only pose using the approved reference's inbox mix. */
export function visualNotificationFixture(
  center: NotificationCenter
): NotificationCenter {
  const now = new Date()
  function delivery(
    kind: number,
    daysAgo: number,
    hour: number,
    minute: number,
    index: number
  ): NotificationDelivery {
    const [label, action] = KINDS[kind] ?? KINDS[0]
    const date = new Date(now)
    date.setDate(now.getDate() - daysAgo)
    date.setHours(hour, minute, 0, 0)
    const existing = center.deliveries.find((item) => item.action === action)
    return {
      action,
      channel: "push",
      entityId: existing?.entityId ?? null,
      errorMessage: null,
      id: `notification-visual-${index}`,
      intendedRole: center.deliveries[0]?.intendedRole ?? null,
      isRead: ![0, 1, 2, 11, 15].includes(index),
      notificationType: label,
      occurredAt: date.toISOString(),
      safeSummary: `${label} activity is available inside the app.`,
      safeTitle: `${label} update`,
      source: null,
      status: index === 2 ? "failed" : "sent",
    }
  }
  const deliveries = [
    ...TODAY.map(([kind, hour, minute], index) =>
      delivery(kind, 0, hour, minute, index)
    ),
    ...YESTERDAY.map(([kind, hour, minute], index) =>
      delivery(kind, 1, hour, minute, index + TODAY.length)
    ),
    ...Array.from({ length: 21 }, (_, index) =>
      delivery(index % KINDS.length, index + 2, 9, 0, index + 7)
    ),
  ]
  return {
    ...center,
    deliveries,
    preferences: center.preferences.map((preference) =>
      preference.key === "support"
        ? { ...preference, enabled: false }
        : preference
    ),
    summary: {
      ...center.summary,
      failed: 1,
      queued: 0,
      sent: 27,
      totalDeliveries: 28,
      unread: 5,
    },
  }
}
