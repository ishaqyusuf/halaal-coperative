import type {
  EmailRoutingMetadata,
  NotificationEmailDelivery,
  NotificationEmailDraft,
  NotificationInput,
  NotificationRecord,
} from "./core-types"

export type {
  NotificationEmailDelivery,
  NotificationEmailDraft,
  NotificationInput,
  NotificationRecord,
  NotificationVariant,
  QaNotificationPreview,
} from "./core-types"

export type NotificationEmailTransport = {
  send: (
    draft: NotificationEmailDraft
  ) => NotificationEmailDelivery | Promise<NotificationEmailDelivery>
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
            : notification
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
  constructor(
    private readonly sendNotification: (input: NotificationInput) => string,
    private readonly emailTransport?: NotificationEmailTransport
  ) {}

  notify(input: NotificationInput) {
    return this.sendNotification(input)
  }

  async email(draft: NotificationEmailDraft) {
    if (!this.emailTransport) {
      return {
        attempts: 1,
        draft,
        messageId: `email-${Date.now()}-${Math.random()}`,
        status: "queued",
      } satisfies NotificationEmailDelivery
    }

    return this.emailTransport.send(draft)
  }

  async tryEmail(draft: NotificationEmailDraft) {
    try {
      return await this.email(draft)
    } catch (error) {
      const delivery = {
        attempts: 1,
        draft,
        errorMessage: "Email delivery failed.",
        messageId: `email-${Date.now()}-${Math.random()}`,
        routing: getEmailRoutingFromError(error),
        status: "failed",
      } satisfies NotificationEmailDelivery
      notificationDeliveryErrorCauses.set(delivery, error)
      return delivery
    }
  }
}

const notificationDeliveryErrorCauses = new WeakMap<
  NotificationEmailDelivery,
  unknown
>()

export function getNotificationEmailDeliveryErrorCause(
  delivery: NotificationEmailDelivery
) {
  return notificationDeliveryErrorCauses.get(delivery)
}

function getEmailRoutingFromError(error: unknown) {
  if (error && typeof error === "object" && "emailRouting" in error) {
    return (error as { emailRouting?: EmailRoutingMetadata }).emailRouting
  }

  return undefined
}
