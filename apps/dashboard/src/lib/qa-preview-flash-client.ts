import type { QaNotificationPreview } from "@halaalvest/notifications"

type QaPreviewFlashResponse = {
  previews?: QaNotificationPreview[]
}

type QaPreviewFetcher = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>

const fetchQaPreview: QaPreviewFetcher = (input, init) => fetch(input, init)

export function createQaPreviewFlashLoader(
  fetcher: QaPreviewFetcher = fetchQaPreview
) {
  let latestRequest: {
    key: string
    promise: Promise<QaNotificationPreview[]>
  } | null = null

  return (key: string) => {
    if (latestRequest?.key === key) {
      return latestRequest.promise
    }

    const promise = fetcher("/api/qa-notification-previews", {
      cache: "no-store",
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) return []

        const payload = (await response.json()) as QaPreviewFlashResponse
        return payload.previews ?? []
      })
      .catch(() => [])

    latestRequest = { key, promise }

    return promise
  }
}
