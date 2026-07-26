"use client"

import { useEffect } from "react"
import type { QaNotificationPreview } from "@halaalvest/notifications"
import { useNotifications } from "@halaalvest/notifications-react"

type QaPreviewFlashResponse = {
  previews?: QaNotificationPreview[]
}

export function QaPreviewFlashConsumer({ enabled }: { enabled: boolean }) {
  const { publishQaPreviews } = useNotifications()

  useEffect(() => {
    if (!enabled) return

    let cancelled = false

    async function consume() {
      try {
        const response = await fetch("/api/qa-notification-previews", {
          cache: "no-store",
          credentials: "same-origin",
        })
        if (!response.ok || cancelled) return

        const payload = (await response.json()) as QaPreviewFlashResponse
        if (!cancelled) {
          publishQaPreviews(payload.previews)
        }
      } catch {
        // A preview is a QA convenience; notification delivery remains primary.
      }
    }

    void consume()
    const interval = window.setInterval(consume, 1_500)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [enabled, publishQaPreviews])

  return null
}
