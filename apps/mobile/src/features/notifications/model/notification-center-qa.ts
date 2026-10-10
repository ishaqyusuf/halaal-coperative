import type {
  NotificationCenter,
  NotificationCenterQaState,
  NotificationDelivery,
} from "./notification-center-types"

function staleCache(
  center: NotificationCenter,
  reason: "offline" | "stale"
) {
  return {
    ageMs: center.cache?.ageMs ?? 15 * 60 * 1000,
    cachedAt: center.cache?.cachedAt ?? center.generatedAt,
    reason,
    scope: center.cache?.scope ?? "ticket-09-qa",
    status: "stale" as const,
  }
}

function withDeliveryState(
  center: NotificationCenter,
  status: Extract<NotificationDelivery["status"], "failed" | "queued">
) {
  const deliveries = center.deliveries.map((delivery, index) =>
    index === 0
      ? {
          ...delivery,
          errorMessage:
            status === "failed"
              ? "Delivery could not be completed. Try again later."
              : null,
          status,
        }
      : delivery
  )

  return {
    ...center,
    deliveries,
    summary: {
      ...center.summary,
      failed: deliveries.filter((delivery) => delivery.status === "failed")
        .length,
      queued: deliveries.filter((delivery) => delivery.status === "queued")
        .length,
      sent: deliveries.filter((delivery) => delivery.status === "sent").length,
    },
  }
}

export function presentNotificationCenterForQa(
  center: NotificationCenter,
  qaState: NotificationCenterQaState | null
): NotificationCenter {
  if (qaState === "empty") {
    return {
      ...center,
      deliveries: [],
      summary: {
        ...center.summary,
        failed: 0,
        queued: 0,
        sent: 0,
        totalDeliveries: 0,
        unread: 0,
      },
    }
  }

  if (qaState === "offline" || qaState === "stale") {
    return { ...center, cache: staleCache(center, qaState) }
  }

  if (qaState === "failed" || qaState === "queued") {
    return withDeliveryState(center, qaState)
  }

  return center
}
