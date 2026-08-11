"use client"

import { useEffect, useRef, useState } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { createQaPreviewFlashLoader } from "@/lib/qa-preview-flash-client"

export function QaPreviewFlashConsumer({
  enabled,
  previewKey,
}: {
  enabled: boolean
  previewKey: string | null
}) {
  const { publishQaPreviews } = useNotifications()
  const [loadPreviews] = useState(() => createQaPreviewFlashLoader())
  const publishedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || !previewKey) return

    let cancelled = false

    void loadPreviews(previewKey).then((previews) => {
      if (
        !cancelled &&
        previews.length > 0 &&
        publishedKeyRef.current !== previewKey
      ) {
        publishedKeyRef.current = previewKey
        publishQaPreviews(previews)
      }
    })

    return () => {
      cancelled = true
    }
  }, [enabled, loadPreviews, previewKey, publishQaPreviews])

  return null
}
