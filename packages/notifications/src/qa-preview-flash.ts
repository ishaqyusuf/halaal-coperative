import { createHmac, timingSafeEqual } from "node:crypto"
import { z } from "zod"
import type { QaNotificationPreview } from "./core-types"

const qaArtifactSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("link"),
    label: z.string(),
    value: z.string(),
  }),
  z.object({
    expiresAt: z.string().optional(),
    kind: z.literal("otp"),
    label: z.string(),
    value: z.string(),
  }),
])

const qaPreviewSchema = z.object({
  artifacts: z.array(qaArtifactSchema),
  deliveryStatus: z.enum(["failed", "queued", "sent"]),
  id: z.string(),
  notificationType: z.string(),
  recipient: z.string(),
})

const qaPreviewFlashSchema = z.object({
  expiresAt: z.string().datetime(),
  previews: z.array(qaPreviewSchema).max(10),
})

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url")
}

export function createQaPreviewFlashValue(
  previews: readonly QaNotificationPreview[],
  options: { now?: Date; secret: string },
) {
  const now = options.now ?? new Date()
  const payload = qaPreviewFlashSchema.parse({
    expiresAt: new Date(now.getTime() + 60_000).toISOString(),
    previews: previews.slice(-10),
  })
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")

  return `${body}.${sign(body, options.secret)}`
}

export function parseQaPreviewFlashValue(
  value: string | null | undefined,
  options: { now?: Date; secret: string },
): QaNotificationPreview[] {
  if (!value) return []

  try {
    const [body, signature] = value.split(".")
    if (!body || !signature) return []

    const expected = Buffer.from(sign(body, options.secret))
    const received = Buffer.from(signature)
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    ) {
      return []
    }

    const payload = qaPreviewFlashSchema.parse(
      JSON.parse(Buffer.from(body, "base64url").toString("utf8")),
    )
    const now = options.now ?? new Date()

    return new Date(payload.expiresAt).getTime() > now.getTime()
      ? payload.previews
      : []
  } catch {
    return []
  }
}
