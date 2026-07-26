"use client"

import {
  createMemoryNotificationStore,
  NotificationService,
  type NotificationInput,
  type NotificationRecord,
  type NotificationStore,
  type NotificationVariant,
  type QaNotificationPreview,
} from "@halaalvest/notifications"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@halaalvest/ui/components/sheet"
import { Toaster } from "@halaalvest/ui/toaster"
import { toast, useToast } from "@halaalvest/ui/use-toast"
import {
  createContext,
  type ReactNode,
  use,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"

type NotificationsContextValue = {
  clear: () => void
  clearQaPreviews: () => void
  dismiss: (notificationId: string) => void
  notifications: NotificationRecord[]
  notify: (input: NotificationInput) => string
  publishQaPreviews: (
    previews:
      | QaNotificationPreview
      | QaNotificationPreview[]
      | null
      | undefined,
  ) => void
  qaPreviews: QaNotificationPreview[]
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
  const [qaPreviews, setQaPreviews] = useState<QaNotificationPreview[]>([])
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const { dismiss: dismissToast } = useToast()

  function notify(input: NotificationInput) {
    const id = notificationStore.publish(input)

    toast({
      id,
      title: input.title,
      description: input.description,
      variant: input.variant,
      duration: input.durationMs,
      onOpenChange(open) {
        if (!open) {
          notificationStore.dismiss(id)
        }
      },
    })

    return id
  }

  const [service] = useState(
    () => new NotificationService((input) => notify(input)),
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

  const value: NotificationsContextValue = {
    clear() {
      notificationStore.clear()
      dismissToast()
    },
    clearQaPreviews() {
      setQaPreviews([])
    },
    dismiss(notificationId) {
      notificationStore.dismiss(notificationId)
      dismissToast(notificationId)
    },
    notifications: state.notifications.filter((notification) => notification.status === "active"),
    notify,
    publishQaPreviews(previews) {
      const nextPreviews = Array.isArray(previews)
        ? previews
        : previews
          ? [previews]
          : []

      if (nextPreviews.length === 0) return

      setQaPreviews((current) => {
        const byId = new Map(current.map((preview) => [preview.id, preview]))

        for (const preview of nextPreviews) {
          byId.set(preview.id, preview)
        }

        return [...byId.values()].slice(-20)
      })
    },
    qaPreviews,
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
      <QaNotificationTray
        onClear={() => setQaPreviews([])}
        previews={qaPreviews}
      />
      <Toaster />
    </NotificationsContext>
  )
}

function QaArtifactActions({
  preview,
}: {
  preview: QaNotificationPreview
}) {
  return (
    <div className="space-y-3">
      {preview.artifacts.map((artifact) => (
        <div
          className="rounded-md border border-border bg-muted/30 p-3"
          key={`${artifact.kind}-${artifact.value}`}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted-foreground">
              {artifact.label}
            </p>
            <Badge variant="outline">{artifact.kind.toUpperCase()}</Badge>
          </div>
          <p className="mt-2 break-all font-mono text-xs text-foreground">
            {artifact.value}
          </p>
          {"expiresAt" in artifact && artifact.expiresAt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Expires {new Date(artifact.expiresAt).toLocaleString()}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {artifact.kind === "link" ? (
              <Button
                render={<a href={artifact.value} />}
                size="sm"
                variant="outline"
              >
                Open link
              </Button>
            ) : null}
            <Button
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => navigator.clipboard.writeText(artifact.value)}
            >
              Copy {artifact.kind === "otp" ? "code" : "link"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function QaNotificationPreviewCard({
  preview,
}: {
  preview: QaNotificationPreview
}) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">QA email artifact</p>
          <p className="mt-1 text-xs opacity-75">
            {preview.recipient} · {preview.notificationType}
          </p>
        </div>
        <Badge variant="outline">{preview.deliveryStatus}</Badge>
      </div>
      <div className="mt-3">
        <QaArtifactActions preview={preview} />
      </div>
    </div>
  )
}

function QaNotificationTray({
  onClear,
  previews,
}: {
  onClear: () => void
  previews: QaNotificationPreview[]
}) {
  if (previews.length === 0) return null

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            className="fixed right-4 bottom-4 z-50 shadow-lg"
            type="button"
          />
        }
      >
        QA email artifacts ({previews.length})
      </SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>QA email artifacts</SheetTitle>
          <SheetDescription>
            Request-time links and codes routed to configured QA domains. These
            values stay only in browser memory.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          <div className="flex justify-end">
            <Button size="sm" type="button" variant="ghost" onClick={onClear}>
              Clear
            </Button>
          </div>
          {[...previews].reverse().map((preview) => (
            <QaNotificationPreviewCard key={preview.id} preview={preview} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function useNotifications() {
  const context = use(NotificationsContext)

  if (!context) {
    throw new Error("useNotifications must be used within NotificationsProvider.")
  }

  return context
}
