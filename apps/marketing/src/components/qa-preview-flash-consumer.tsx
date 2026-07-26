"use client"

import { useEffect } from "react"
import type { QaNotificationPreview } from "@halaalvest/notifications"
import { useNotifications } from "@halaalvest/notifications-react"

export function QaPreviewFlashConsumer() {
  const { publishQaPreviews } = useNotifications()

  useEffect(() => {
    async function consume() {
      try {
        const response = await fetch("/api/qa-notification-previews", {
          cache: "no-store",
          credentials: "same-origin",
        })
        if (!response.ok) return

        const payload = (await response.json()) as {
          previews?: QaNotificationPreview[]
        }
        publishQaPreviews(payload.previews)
      } catch {
        // A preview is a QA convenience; notification delivery remains primary.
      }
    }

    void consume()
  }, [publishQaPreviews])

  return null
}
