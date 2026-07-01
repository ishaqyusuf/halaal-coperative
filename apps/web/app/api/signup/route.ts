import { NextResponse } from "next/server"
import { checkTenantSignupAvailability } from "@halaalvest/db"
import { createSignupVerificationEmail } from "@halaalvest/notifications"
import {
  createServerNotificationService,
  isServerEmailDeliveryConfigured,
} from "@/lib/server-notifications"
import { createSignedSignupToken } from "@/lib/signup-token"
import {
  createSignupVerificationPayload,
  signupIntentSchema,
} from "@/lib/signup-flow"

export async function POST(request: Request) {
  try {
    const input = signupIntentSchema.parse(await request.json())
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
            "Email delivery is not configured. Set RESEND_API_KEY and HALAAL_VEST_EMAIL_FROM before enabling public signup.",
        },
        { status: 503 }
      )
    }

    const payload = createSignupVerificationPayload(input)
    const token = createSignedSignupToken(payload)
    const onboardingUrl = new URL("/onboarding", request.url)
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
      verificationDelivery,
      verificationEmail,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We could not prepare signup verification.",
      },
      { status: 400 }
    )
  }
}
