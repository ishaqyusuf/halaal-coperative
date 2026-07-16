import { NextResponse } from "next/server"
import { createMarketingEarlyAccessRequestEmail } from "@halaalvest/notifications"
import {
  createServerNotificationService,
  isServerEmailDeliveryConfigured,
} from "@/lib/server-notifications"
import {
  createEarlyAccessRequestPayload,
  createSignedEarlyAccessRequestToken,
  earlyAccessRequestSchema,
} from "@/lib/early-access"
import { getMarketingAppOrigin } from "@/lib/runtime-url"

function getMarketingAdminRecipients() {
  const configured =
    process.env.MARKETING_ADMIN_EMAILS ??
    process.env.PLATFORM_ADMIN_EMAILS ??
    (process.env.NODE_ENV !== "production" ? process.env.TEST_EMAIL : "")

  return (configured ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
}

function buildApprovalUrl(requestUrl: string, token: string) {
  const url = new URL(
    "/api/early-access/approve",
    getMarketingAppOrigin(requestUrl)
  )
  url.searchParams.set("token", token)

  return url.toString()
}

export async function POST(request: Request) {
  try {
    const input = earlyAccessRequestSchema.parse(await request.json())
    const emailDeliveryConfigured = isServerEmailDeliveryConfigured()
    const adminRecipients = getMarketingAdminRecipients()

    if (process.env.NODE_ENV === "production" && !emailDeliveryConfigured) {
      return NextResponse.json(
        {
          error:
            "Email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM_ADDRESS before enabling early access.",
        },
        { status: 503 }
      )
    }

    if (process.env.NODE_ENV === "production" && adminRecipients.length === 0) {
      return NextResponse.json(
        {
          error:
            "Marketing admin recipients are not configured. Set MARKETING_ADMIN_EMAILS before enabling early access.",
        },
        { status: 503 }
      )
    }

    const payload = createEarlyAccessRequestPayload(input)
    const token = createSignedEarlyAccessRequestToken(payload)
    const approvalUrl = buildApprovalUrl(request.url, token)
    const notificationService = createServerNotificationService()
    const recipients =
      adminRecipients.length > 0
        ? adminRecipients
        : ["hello@halaalvest.localhost"]
    const deliveries = await Promise.all(
      recipients.map((recipientEmail) => {
        const requestEmail = createMarketingEarlyAccessRequestEmail({
          approvalUrl,
          contactEmail: payload.primaryContactEmail,
          contactName: payload.primaryContactFullName,
          message: payload.message,
          phone: payload.phone,
          recipientEmail,
          recipientName: "Halaalvest admin",
          requestedAt: payload.issuedAt,
          tenantName: payload.cooperativeName,
        })

        return notificationService.tryEmail(requestEmail)
      })
    )

    if (
      process.env.NODE_ENV === "production" &&
      deliveries.every((delivery) => delivery.status !== "sent")
    ) {
      return NextResponse.json(
        {
          error:
            deliveries.find((delivery) => delivery.errorMessage)
              ?.errorMessage ??
            "We could not send the early access request. Please try again.",
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      approvalUrl:
        process.env.NODE_ENV !== "production" || !emailDeliveryConfigured
          ? approvalUrl
          : undefined,
      deliveries,
      devMode: process.env.NODE_ENV !== "production",
      emailDeliveryConfigured,
      message:
        "Your early access request has been received. We will email you after approval.",
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "We could not submit the early access request.",
      },
      { status: 400 }
    )
  }
}
