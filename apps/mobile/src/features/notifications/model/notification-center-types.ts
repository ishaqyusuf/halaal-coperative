import type { MobileReadCacheState } from "@/lib/read-cache"
import type {
  MobileNotificationAction,
  MobileNotificationCategoryKey,
  MobileNotificationRole,
} from "@halaalvest/domain/mobile-notifications"

export type NotificationCenterQaState =
  | "denied"
  | "empty"
  | "error"
  | "failed"
  | "fixture"
  | "loading"
  | "offline"
  | "queued"
  | "stale"

export type NotificationDelivery = {
  action: MobileNotificationAction
  entityId: string | null
  errorMessage: string | null
  id: string
  intendedRole: MobileNotificationRole | null
  isRead: boolean
  notificationType: string
  occurredAt: string
  safeSummary: string
  safeTitle: string
  source: string | null
  status: "failed" | "queued" | "sent" | "suppressed" | "unknown"
}

export type NotificationPreference = {
  available: boolean
  channel: "push"
  description: string
  enabled: boolean
  key: MobileNotificationCategoryKey
  mandatory: boolean
  title: string
}

export type NotificationPushRegistration = {
  lastValidatedAt: string
  permissionStatus: string
  status: string
}

export type NotificationCenter = {
  cache?: MobileReadCacheState
  deliveries: NotificationDelivery[]
  generatedAt: string
  preferences: NotificationPreference[]
  pushRegistration: NotificationPushRegistration | null
  summary: {
    enabledPreferences: number
    failed: number
    queued: number
    sent: number
    totalDeliveries: number
    unread: number
  }
}
