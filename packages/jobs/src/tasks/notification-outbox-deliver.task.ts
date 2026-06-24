import type { BackgroundTask } from "../trigger"
import { notificationOutboxDeliverHandler } from "../handlers/notification-outbox-deliver"

export type NotificationOutboxDeliverPayload = {
  includeFailed?: boolean
  limit?: number
  maxAttempts?: number
  tenantId?: string
}

export const notificationOutboxDeliverTask: BackgroundTask<NotificationOutboxDeliverPayload> =
  {
    id: "notification-outbox-deliver",
    run: notificationOutboxDeliverHandler,
  }
