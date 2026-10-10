import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { z } from "zod"
import {
  beginExternalAccountDeletion,
  discardUndeliveredAccountDeletionChallenge,
  enforceAuthRateLimits,
  privacyChallengeTokenHash,
  privacyRecipientEmailHash,
} from "@halaalvest/db"
import { createNotificationEmailDraft } from "@halaalvest/notifications"
import {
  createServerNotificationService,
  isServerEmailDeliveryConfigured,
} from "@/lib/server-notifications"
import { externalDeletionVerificationUrl } from "@/lib/external-deletion-link"
import { getMarketingEmailOrigin } from "@/lib/marketing-email-origin"
import { parseMarketingJson } from "@/lib/parse-json.server"
import { getMarketingServerErrorResponse } from "@/lib/error-response.server"
import { isExternalDeletionRequestAvailable } from "@/lib/external-deletion-readiness"
import { AppError } from "@halaalvest/errors"
import { publicDeletionFlowCopy } from "@halaalvest/domain/public-policies"
import { externalDeletionWorkspacePattern } from "@/lib/external-deletion-workspace"

const schema = z
  .object({
    email: z.email().max(254),
    workspaceSlug: z
      .string()
      .trim()
      .toLowerCase()
      .min(2)
      .max(253)
      .regex(externalDeletionWorkspacePattern),
  })
  .strict()
const neutral = {
  message: publicDeletionFlowCopy.request.success,
}
export async function POST(request: Request) {
  try {
    if (!isExternalDeletionRequestAvailable())
      throw new AppError({
        code: "PROVIDER_UNAVAILABLE",
        publicMessage: "Email verification is temporarily unavailable.",
      })
    if (!isServerEmailDeliveryConfigured())
      throw new AppError({
        code: "PROVIDER_UNAVAILABLE",
        publicMessage: "Email verification is temporarily unavailable.",
      })
    const verificationOrigin = getMarketingEmailOrigin(request.url)
    const input = schema.parse(await parseMarketingJson(request))
    const network =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    await enforceAuthRateLimits({
      operation: "privacy_external_request",
      rules: [
        {
          signalType: "account",
          signalHash: privacyRecipientEmailHash(input.email),
          limit: 3,
          windowMs: 15 * 60_000,
        },
        {
          signalType: "network",
          signalHash: privacyRecipientEmailHash(`network:${network}`),
          limit: 20,
          windowMs: 15 * 60_000,
        },
      ],
    })
    const token = randomBytes(32).toString("base64url")
    const challenge = await beginExternalAccountDeletion({
      email: input.email,
      workspaceSlug: input.workspaceSlug,
      tokenHash: privacyChallengeTokenHash(token),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    })
    if (challenge) {
      const verificationUrl = externalDeletionVerificationUrl(
        verificationOrigin,
        challenge.challengeId,
        token
      )
      const email = createNotificationEmailDraft({
        notificationType: "privacy_account_deletion_verification",
        ...publicDeletionFlowCopy.email,
        actionUrl: verificationUrl,
        recipient: {
          kind: "email",
          email: challenge.email,
          value: challenge.email,
          displayName: challenge.displayName,
        },
      })
      const delivery = await createServerNotificationService().tryEmail(email)
      if (delivery.status !== "sent") {
        try {
          await discardUndeliveredAccountDeletionChallenge(
            challenge.challengeId
          )
        } catch {
          console.error("Could not discard an undelivered deletion challenge")
        }
      }
    }
    return NextResponse.json(neutral, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (error) {
    const response = getMarketingServerErrorResponse(error, { method: "POST" })
    return NextResponse.json(response.body, { status: response.status })
  }
}
