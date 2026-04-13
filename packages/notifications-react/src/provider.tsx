"use client"

import {
  createMemoryNotificationStore,
  NotificationService,
  type NotificationInput,
  type NotificationRecord,
  type NotificationStore,
  type NotificationVariant,
} from "@halaal-vest/notifications"
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

import { NotificationsViewport } from "./viewport.js"

type NotificationsContextValue = {
  clear: () => void
  dismiss: (notificationId: string) => void
  notifications: NotificationRecord[]
  notify: (input: NotificationInput) => string
  service: NotificationService
  showError: (title: string, description?: string) => string
  showInfo: (title: string, description?: string) => string
  showSuccess: (title: string, description?: string) => string
  showWarning: (title: string, description?: string) => string
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

function useNotificationStore(store: NotificationStore) {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState)
}

export function NotificationsProvider({
  children,
  store,
}: {
  children: ReactNode
  store?: NotificationStore
}) {
  const [notificationStore] = useState<NotificationStore>(() => store ?? createMemoryNotificationStore())
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const [service] = useState(
    () => new NotificationService((input) => notificationStore.publish(input)),
  )
  const state = useNotificationStore(notificationStore)

  useEffect(() => {
    const timers = timersRef.current

    for (const notification of state.notifications) {
      if (
        notification.status !== "active" ||
        notification.durationMs === undefined ||
        timers.has(notification.id)
      ) {
        continue
      }

      const timer = setTimeout(() => {
        notificationStore.dismiss(notification.id)
      }, notification.durationMs)

      timers.set(notification.id, timer)
    }

    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [notificationStore, state.notifications])

  function notifyWithVariant(variant: NotificationVariant, title: string, description?: string) {
    return notify({
      title,
      description,
      variant,
    })
  }

  function notify(input: NotificationInput) {
    return notificationStore.publish(input)
  }

  const value: NotificationsContextValue = {
    clear() {
      notificationStore.clear()
    },
    dismiss(notificationId) {
      notificationStore.dismiss(notificationId)
    },
    notifications: state.notifications.filter((notification) => notification.status === "active"),
    notify,
    service,
    showError(title, description) {
      return notifyWithVariant("error", title, description)
    },
    showInfo(title, description) {
      return notifyWithVariant("info", title, description)
    },
    showSuccess(title, description) {
      return notifyWithVariant("success", title, description)
    },
    showWarning(title, description) {
      return notifyWithVariant("warning", title, description)
    },
  }

  return (
    <NotificationsContext value={value}>
      {children}
      <NotificationsViewport notifications={value.notifications} onDismiss={value.dismiss} />
    </NotificationsContext>
  )
}

export function useNotifications() {
  const context = use(NotificationsContext)

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider.")
  }

  return context
}
