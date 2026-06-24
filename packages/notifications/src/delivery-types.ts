import type {
  NotificationChannel,
  NotificationChannelDispatch,
} from "./core-types"

export type { NotificationChannel }

export type NotificationSkippedChannel = {
  channel: NotificationChannel
  reason: string
}

export type NotificationDeliveryPlan = {
  dispatches: NotificationChannelDispatch[]
  skippedChannels: NotificationSkippedChannel[]
}
