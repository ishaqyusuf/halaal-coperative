import { cookies } from "next/headers"
import type { QaNotificationPreview } from "@halaalvest/notifications"
import {
  createQaPreviewFlashValue,
  parseQaPreviewFlashValue,
} from "@halaalvest/notifications/qa-preview-flash"

const qaPreviewFlashCookieName = "halaalvest_qa_preview"

function getSecret() {
  const configured = process.env.AUTH_SECRET?.trim()

  if (configured) return configured
  if (process.env.NODE_ENV !== "production") {
    return "halaalvest-dev-qa-preview-secret"
  }

  throw new Error("AUTH_SECRET is required for QA notification previews.")
}

export async function setQaPreviewFlash(
  previews: readonly QaNotificationPreview[]
) {
  if (previews.length === 0) return

  const cookieStore = await cookies()
  cookieStore.set(
    qaPreviewFlashCookieName,
    createQaPreviewFlashValue(previews, { secret: getSecret() }),
    {
      httpOnly: true,
      maxAge: 60,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    }
  )
}

export async function consumeQaPreviewFlash() {
  const cookieStore = await cookies()
  const flash = cookieStore.get(qaPreviewFlashCookieName)?.value
  if (!flash) return []
  cookieStore.delete(qaPreviewFlashCookieName)
  return parseQaPreviewFlashValue(flash, { secret: getSecret() })
}
