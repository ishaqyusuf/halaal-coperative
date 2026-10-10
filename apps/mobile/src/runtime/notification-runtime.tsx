import { NotificationRuntimeProvider as FeatureNotificationRuntimeProvider } from "@/features/notifications/platform/notification-runtime-provider"
import type { ReactNode } from "react"

/**
 * Root-shell adapter for the notification feature runtime.
 *
 * The app layout composes runtime adapters only; notification ownership stays
 * inside its feature boundary.
 */
export function NotificationRuntime({ children }: { children: ReactNode }) {
  return (
    <FeatureNotificationRuntimeProvider>
      {children}
    </FeatureNotificationRuntimeProvider>
  )
}
