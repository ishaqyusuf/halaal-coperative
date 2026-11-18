import { NextResponse } from "next/server"
import { AppError } from "@halaalvest/errors"
import {
  checkTenantSignupAvailability,
  getPublishedLegalBundle,
} from "@halaalvest/db"
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
  signupIntentSchema,
} from "@/lib/signup-flow"
import { getMarketingEmailOrigin } from "@/lib/marketing-email-origin"
import { getMarketingErrorResponse } from "@/lib/error-response"
import { getMarketingServerErrorResponse } from "@/lib/error-response.server"
import { parseMarketingJson } from "@/lib/parse-json.server"
import {
  enforceMarketingRateLimit,
  type MarketingRateLimiter,
} from "@/lib/public-rate-limit.server"

export async function handleSignupRequest(
  request: Request,
  limit: MarketingRateLimiter = enforceMarketingRateLimit
) {
  try {
    const input = signupIntentSchema.parse(await parseMarketingJson(request))
    const legalBundle = getPublishedLegalBundle()
    if (legalBundle.acceptanceRequired && !legalBundle.available)
      throw new AppError({
        code: "PRECONDITION_FAILED",
        publicMessage:
          "Approved platform terms and privacy notice are not yet available for signup.",
      })
    const emailOrigin = getMarketingEmailOrigin(request.url)
    // Counted only once the request is valid and would look up and email.
    await limit({
      email: input.primaryContactEmail,
      headers: request.headers,
      operation: "signup_verification",
    })
    const emailDeliveryConfigured = isServerEmailDeliveryConfigured()
    const availability = await checkTenantSignupAvailability({
      cooperativeCodePrefix: input.cooperativeCodePrefix,
      cooperativeName: input.cooperativeName,
      workspaceSlug: input.workspaceSlug,
    })

    if (
      !availability.cooperativeName.available ||
      !availability.cooperativeCodePrefix.available ||
      !availability.workspaceSlug.available
    ) {
      const response = getMarketingErrorResponse(
        new AppError({
          code: "CONFLICT",
          publicMessage: !availability.cooperativeName.available
            ? "That cooperative name is already in use."
            : !availability.cooperativeCodePrefix.available
              ? "That cooperative prefix is already in use."
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

    // The sign-up checkbox accepts the published terms and privacy notice.
    // Their versions travel in the signed link, so onboarding records the
    // acceptance without asking again. Drafts are not contractual.
    const payload = createSignupVerificationPayload(
      input,
      legalBundle.available
        ? {
            confirmed: true,
            documents: legalBundle.documents.map(
              ({ contentHash, documentType, documentVersion }) => ({
                contentHash,
                documentType,
                documentVersion,
              })
            ),
          }
        : undefined
    )
    const token = createSignedSignupToken(payload)
    const onboardingUrl = new URL("/onboarding", emailOrigin)
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
    // A Preview build runs with NODE_ENV=production but never emails, so its
    // QA-domain sign-ups read the link from the QA preview instead.
    const emailSuppressed = Boolean(verificationDelivery.routing?.suppressed)

    return NextResponse.json({
      devMode: process.env.NODE_ENV !== "production",
      emailDeliveryConfigured,
      expiresAt: payload.expiresAt,
      onboardingUrl: exposeQaArtifacts ? onboardingUrl.toString() : undefined,
      qaPreviews:
        exposeQaArtifacts || emailSuppressed
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

export function POST(request: Request) {
  return handleSignupRequest(request)
}
