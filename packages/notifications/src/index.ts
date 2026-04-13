export type NotificationVariant = "info" | "success" | "warning" | "error"

export type NotificationAction = {
  actionId: string
  label: string
}

export type NotificationRecipient = {
  kind: "user" | "email" | "role"
  value: string
  displayName?: string
}

export type NotificationInput = {
  id?: string
  title: string
  description?: string
  variant: NotificationVariant
  notificationType?: string
  recipients?: NotificationRecipient[]
  durationMs?: number
  action?: NotificationAction
}

export type NotificationRecord = NotificationInput & {
  id: string
  recipients: NotificationRecipient[]
  status: "active" | "dismissed"
}

export type NotificationStoreState = {
  notifications: NotificationRecord[]
}

export type NotificationStore = {
  clear: () => void
  dismiss: (notificationId: string) => void
  getState: () => NotificationStoreState
  publish: (input: NotificationInput) => string
  subscribe: (listener: () => void) => () => void
}

export type PlatformNotificationType =
  | "app_notification"
  | "workspace_invitation"
  | "loan_approval_required"

export const platformNotificationTypes: Record<
  PlatformNotificationType,
  {
    durationMs: number
    variant: NotificationVariant
    buildTitle: (payload: Record<string, string | number>) => string
    buildDescription: (payload: Record<string, string | number>) => string
  }
> = {
  app_notification: {
    durationMs: 5000,
    variant: "info",
    buildTitle: () => "Notification",
    buildDescription: () => "A new event requires your attention.",
  },
  workspace_invitation: {
    durationMs: 7000,
    variant: "success",
    buildTitle: (payload) => `Invitation ready for ${payload.recipientName}`,
    buildDescription: (payload) =>
      `${payload.recipientName} can now join ${payload.tenantName}.`,
  },
  loan_approval_required: {
    durationMs: 8000,
    variant: "warning",
    buildTitle: (payload) => `Approval required for ${payload.memberName}`,
    buildDescription: (payload) =>
      `A loan request for NGN ${payload.amount} is waiting for review.`,
  },
}

export function createNotificationFromType<TType extends PlatformNotificationType>(
  registry: typeof platformNotificationTypes,
  type: TType,
  payload: Record<string, string | number>,
): NotificationInput {
  const definition = registry[type]

  return {
    notificationType: type,
    title: definition.buildTitle(payload),
    description: definition.buildDescription(payload),
    durationMs: definition.durationMs,
    recipients: [],
    variant: definition.variant,
  }
}

export function createMemoryNotificationStore(): NotificationStore {
  let state: NotificationStoreState = {
    notifications: [],
  }
  const listeners = new Set<() => void>()

  function emit() {
    for (const listener of listeners) {
      listener()
    }
  }

  return {
    clear() {
      state = {
        notifications: [],
      }
      emit()
    },
    dismiss(notificationId) {
      state = {
        notifications: state.notifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                status: "dismissed",
              }
            : notification,
        ),
      }
      emit()
    },
    getState() {
      return state
    },
    publish(input) {
      const id = input.id ?? `notification-${Date.now()}-${Math.random()}`
      state = {
        notifications: [
          ...state.notifications,
          {
            ...input,
            id,
            recipients: input.recipients ?? [],
            status: "active",
          },
        ],
      }
      emit()
      return id
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export class NotificationService {
  constructor(private readonly sendNotification: (input: NotificationInput) => string) {}

  notify(input: NotificationInput) {
    return this.sendNotification(input)
  }
}
