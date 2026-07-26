import { NextResponse } from "next/server"
import { checkTenantSignupAvailability } from "@halaalvest/db"
import {
  createQaNotificationPreviews,
  createSignupVerificationEmail,
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
    throw new Error("Early access approval is required before setup.")
  }

  const approval = verifySignedSignupApprovalToken(input.approvalToken)
  const emailMatches =
    approval.primaryContactEmail.toLowerCase() ===
    input.primaryContactEmail.trim().toLowerCase()
  const cooperativeMatches =
    normalizeComparableText(approval.cooperativeName) ===
    normalizeComparableText(input.cooperativeName)

  if (!emailMatches || !cooperativeMatches) {
    throw new Error(
      "This setup request does not match the approved early access request."
    )
  }
}

export async function POST(request: Request) {
  try {
    const input = signupRequestSchema.parse(await request.json())
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
      return NextResponse.json(
        {
          availability,
          error: !availability.cooperativeName.available
            ? "That cooperative name is already in use."
            : "That workspace subdomain is not available.",
        },
        { status: 409 }
      )
    }

    if (process.env.NODE_ENV === "production" && !emailDeliveryConfigured) {
      return NextResponse.json(
        {
          error:
            "Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM_ADDRESS before enabling approved setup.",
        },
        { status: 503 }
      )
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
      verificationUrl: onboardingUrl.toString(),
    })
    const notificationService = createServerNotificationService()
    const verificationDelivery = await notificationService.tryEmail(verificationEmail)

    if (process.env.NODE_ENV === "production" && verificationDelivery.status !== "sent") {
      return NextResponse.json(
        {
          error:
            verificationDelivery.errorMessage ??
            "We could not send the verification email. Please try again.",
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      devMode: process.env.NODE_ENV !== "production",
      emailDeliveryConfigured,
      expiresAt: payload.expiresAt,
      onboardingUrl: onboardingUrl.toString(),
      qaPreviews: createQaNotificationPreviews([verificationDelivery]),
      verificationDelivery,
      verificationEmail,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We could not prepare setup verification.",
      },
      { status: 400 }
    )
  }
}
