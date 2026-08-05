import { NextResponse } from "next/server"
import { AppError } from "@halaalvest/errors"
import { checkTenantSignupAvailability } from "@halaalvest/db"
import {
  createQaNotificationPreviews,
  createSignupVerificationEmail,
  getNotificationEmailDeliveryErrorCause,
} from "@halaalvest/notifications"
import {
  createServerNotificationService,
  isServerEmailDeliveryConfigured,
} from "@/lib/server-notifications"
import { createSignedSignupToken } from "@/lib/signup-token"
import {
  createSignupVerificationPayload,
  signupRequestSchema,
} from "@/lib/signup-flow"
import { verifySignedSignupApprovalToken } from "@/lib/early-access"
import { getMarketingConfig } from "@/lib/marketing-config"
import { getMarketingAppOrigin } from "@/lib/runtime-url"
import { getMarketingErrorResponse } from "@/lib/error-response"
import { getMarketingServerErrorResponse } from "@/lib/error-response.server"
import { parseMarketingJson } from "@/lib/parse-json.server"

function normalizeComparableText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

function verifyEarlyAccessApproval(input: {
  approvalToken?: string
  cooperativeName: string
  primaryContactEmail: string
}) {
  if (!getMarketingConfig().earlyAccessModeEnabled) {
    return
  }

  if (!input.approvalToken) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage: "Early access approval is required before setup.",
    })
  }

  let approval
  try {
    approval = verifySignedSignupApprovalToken(input.approvalToken)
  } catch (cause) {
    if (cause instanceof AppError && cause.reportable) throw cause
    throw new AppError({
      cause,
      code: "VALIDATION_FAILED",
      publicMessage: "This early access approval link could not be used.",
    })
  }
  const emailMatches =
    approval.primaryContactEmail.toLowerCase() ===
    input.primaryContactEmail.trim().toLowerCase()
  const cooperativeMatches =
    normalizeComparableText(approval.cooperativeName) ===
    normalizeComparableText(input.cooperativeName)

  if (!emailMatches || !cooperativeMatches) {
    throw new AppError({
      code: "VALIDATION_FAILED",
      publicMessage:
        "This setup request does not match the approved early access request.",
    })
  }
}

export async function POST(request: Request) {
  try {
    const input = signupRequestSchema.parse(await parseMarketingJson(request))
    verifyEarlyAccessApproval(input)
    const emailDeliveryConfigured = isServerEmailDeliveryConfigured()
    const availability = await checkTenantSignupAvailability({
      cooperativeName: input.cooperativeName,
      workspaceSlug: input.workspaceSlug,
    })

    if (
      !availability.cooperativeName.available ||
      !availability.workspaceSlug.available
    ) {
      const response = getMarketingErrorResponse(
        new AppError({
          code: "CONFLICT",
          publicMessage: !availability.cooperativeName.available
            ? "That cooperative name is already in use."
            : "That workspace subdomain is not available.",
        })
      )
      return NextResponse.json(
        { ...response.body, availability },
        { status: response.status }
      )
    }

    if (process.env.NODE_ENV === "production" && !emailDeliveryConfigured) {
      const response = getMarketingServerErrorResponse(
        new AppError({
          code: "PROVIDER_UNAVAILABLE",
          publicMessage: "Email delivery is temporarily unavailable.",
        }),
        { method: "POST", status: 503 }
      )
      return NextResponse.json(response.body, { status: response.status })
    }

    const payload = createSignupVerificationPayload(input)
    const token = createSignedSignupToken(payload)
    const onboardingUrl = new URL(
      "/onboarding",
      getMarketingAppOrigin(request.url)
    )
    onboardingUrl.searchParams.set("token", token)
    const verificationEmail = createSignupVerificationEmail({
      expiresAt: payload.expiresAt,
      recipientEmail: payload.primaryContactEmail,
      recipientName: payload.primaryContactFullName,
      tenantName: payload.cooperativeName,
      tenantSlug: payload.workspaceSlug,
      verificationUrl: onboardingUrl.toString(),
    })
    const notificationService = createServerNotificationService()
    const verificationDelivery =
      await notificationService.tryEmail(verificationEmail)

    if (
      process.env.NODE_ENV === "production" &&
      verificationDelivery.status !== "sent"
    ) {
      const response = getMarketingServerErrorResponse(
        new AppError({
          cause: getNotificationEmailDeliveryErrorCause(verificationDelivery),
          code: "PROVIDER_UNAVAILABLE",
          publicMessage:
            "We could not send the verification email. Please try again.",
        }),
        { method: "POST", status: 502 }
      )
      return NextResponse.json(response.body, { status: response.status })
    }

    const exposeQaArtifacts = process.env.NODE_ENV !== "production"

    return NextResponse.json({
      devMode: process.env.NODE_ENV !== "production",
      emailDeliveryConfigured,
      expiresAt: payload.expiresAt,
      onboardingUrl: exposeQaArtifacts ? onboardingUrl.toString() : undefined,
      qaPreviews: exposeQaArtifacts
        ? createQaNotificationPreviews([verificationDelivery])
        : [],
      verificationDelivery: {
        attempts: verificationDelivery.attempts,
        messageId: verificationDelivery.messageId,
        routingMode: verificationDelivery.routing?.mode,
        status: verificationDelivery.status,
      },
      verificationEmail: exposeQaArtifacts ? verificationEmail : undefined,
    })
  } catch (error) {
    const response = getMarketingServerErrorResponse(error, { method: "POST" })
    return NextResponse.json(response.body, { status: response.status })
  }
}
