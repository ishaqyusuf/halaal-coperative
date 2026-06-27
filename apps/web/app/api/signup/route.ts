import { NextResponse } from "next/server"
import {
  checkTenantSignupAvailability,
  createNotificationOutboxEntryFromDraft,
} from "@halaalvest/db"
import {
  notificationOutboxDeliverHandler,
  notificationOutboxDeliverTask,
  triggerJob,
} from "@halaalvest/jobs"
import { createSignupVerificationEmail } from "@halaalvest/notifications"
import { isServerEmailDeliveryConfigured } from "@/lib/server-notifications"
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
    const outboxEntry = await createNotificationOutboxEntryFromDraft({
      draft: verificationEmail,
      source: "apps/web/app/api/signup",
    })

    if (!outboxEntry) {
      return NextResponse.json(
        {
          error: "We could not queue the verification email. Please try again.",
        },
        { status: 503 }
      )
    }

    let deliveryTriggerError: string | null = null

    if (emailDeliveryConfigured) {
      try {
        await triggerJob(
          notificationOutboxDeliverTask,
          async (jobPayload) => {
            await notificationOutboxDeliverHandler(jobPayload)
          },
          {
            includeFailed: true,
            limit: 10,
            maxAttempts: 4,
          },
          { baseDelayMs: 1000, maxAttempts: 3 }
        )
      } catch (error) {
        deliveryTriggerError =
          error instanceof Error
            ? error.message
            : "Verification delivery job could not be started."
      }
    }

    const verificationDelivery = {
      attempts: 0,
      draft: verificationEmail,
      messageId: outboxEntry.id,
      status: "queued" as const,
    }

    if (process.env.NODE_ENV === "production" && deliveryTriggerError) {
      return NextResponse.json(
        {
          error:
            "We could not start verification email delivery. Please try again.",
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      devMode: process.env.NODE_ENV !== "production",
      deliveryTriggerError,
      emailDeliveryConfigured,
      expiresAt: payload.expiresAt,
      onboardingUrl: onboardingUrl.toString(),
      outboxId: outboxEntry.id,
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
