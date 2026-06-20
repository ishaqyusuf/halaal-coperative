import { NextResponse } from "next/server"
import {
  checkTenantSignupAvailability,
  createNotificationOutboxEntry,
  updateNotificationOutboxDelivery,
} from "@halaalvest/db"
import { createSignupVerificationEmail } from "@halaalvest/notifications"
import { createServerNotificationService } from "@/lib/server-notifications"
import { createSignedSignupToken } from "@/lib/signup-token"
import {
  createSignupVerificationPayload,
  signupIntentSchema,
} from "@/lib/signup-flow"

export async function POST(request: Request) {
  try {
    const input = signupIntentSchema.parse(await request.json())
    const availability = await checkTenantSignupAvailability({
      cooperativeName: input.cooperativeName,
      workspaceSlug: input.workspaceSlug,
    })

    if (!availability.cooperativeName.available || !availability.workspaceSlug.available) {
      return NextResponse.json(
        {
          availability,
          error: !availability.cooperativeName.available
            ? "That cooperative name is already in use."
            : "That workspace subdomain is not available.",
        },
        { status: 409 },
      )
    }

    const payload = createSignupVerificationPayload(input)
    const token = createSignedSignupToken(payload)
    const onboardingUrl = new URL("/onboarding", request.url)
    onboardingUrl.searchParams.set("token", token)
    const notificationService = createServerNotificationService()
    const verificationEmail = createSignupVerificationEmail({
      expiresAt: payload.expiresAt,
      recipientEmail: payload.primaryContactEmail,
      recipientName: payload.primaryContactFullName,
      tenantName: payload.cooperativeName,
      verificationUrl: onboardingUrl.toString(),
    })
    const outboxEntry = await createNotificationOutboxEntry({
      actionLabel: verificationEmail.actionLabel,
      actionUrl: verificationEmail.actionUrl,
      bodyText: verificationEmail.bodyText,
      metadata: {
        previewText: verificationEmail.previewText,
        recipientDisplayName: verificationEmail.recipient.displayName ?? null,
      },
      notificationType: verificationEmail.notificationType,
      recipient: verificationEmail.recipient.value,
      source: "apps/web/app/api/signup",
      subject: verificationEmail.subject,
    })
    const verificationDelivery = await notificationService.tryEmail(verificationEmail)

    if (outboxEntry) {
      await updateNotificationOutboxDelivery({
        attempts: verificationDelivery.attempts,
        errorMessage: verificationDelivery.errorMessage,
        messageId: verificationDelivery.messageId,
        outboxId: outboxEntry.id,
        status: verificationDelivery.status,
      })
    }

    if (verificationDelivery.status === "failed") {
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV !== "production"
              ? `Verification email delivery failed: ${verificationDelivery.errorMessage}`
              : "We could not send the verification email. Please try again.",
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      devMode: process.env.NODE_ENV !== "production",
      expiresAt: payload.expiresAt,
      onboardingUrl: onboardingUrl.toString(),
      outboxId: outboxEntry?.id ?? null,
      verificationDelivery,
      verificationEmail: verificationDelivery.draft,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "We could not prepare signup verification.",
      },
      { status: 400 },
    )
  }
}
