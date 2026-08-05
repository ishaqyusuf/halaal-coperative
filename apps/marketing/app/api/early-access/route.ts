import { NextResponse } from "next/server"
import {
  createMarketingEarlyAccessRequestEmail,
  createQaNotificationPreviews,
  type QaNotificationPreview,
} from "@halaalvest/notifications"
import { isEmailAtQaDomain } from "@halaalvest/utils"
import {
  createServerNotificationService,
  getServerQaEmailDomains,
  isServerEmailDeliveryConfigured,
} from "@/lib/server-notifications"
import {
  createEarlyAccessRequestPayload,
  createSignedEarlyAccessRequestToken,
  earlyAccessRequestSchema,
  formatEarlyAccessLaunchTimeline,
  formatEarlyAccessRecordSystem,
  formatEarlyAccessSetupNeeds,
} from "@/lib/early-access"
import { formatCooperativeSizeRangeLabel } from "@halaalvest/domain"
import { getMarketingAppOrigin } from "@/lib/runtime-url"
import { getMarketingErrorResponse } from "@/lib/error-response"

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
          error: "Email delivery is temporarily unavailable.",
        },
        { status: 503 }
      )
    }

    if (process.env.NODE_ENV === "production" && adminRecipients.length === 0) {
      return NextResponse.json(
        {
          error: "Early access requests are temporarily unavailable.",
        },
        { status: 503 }
      )
    }

    const payload = createEarlyAccessRequestPayload(input)
    const token = createSignedEarlyAccessRequestToken(payload)
    const approvalUrl = buildApprovalUrl(request.url, token)
    const qaDomains = getServerQaEmailDomains()
    const isQaRequest = isEmailAtQaDomain(
      payload.primaryContactEmail,
      qaDomains
    )
    const approveAndContinueUrl = new URL(approvalUrl)
    approveAndContinueUrl.searchParams.set("continue", "1")
    const notificationService = createServerNotificationService()
    const recipients =
      adminRecipients.length > 0
        ? adminRecipients
        : ["hello@halaalvest.localhost"]
    const deliveries = await Promise.all(
      recipients.map((recipientEmail) => {
        const requestEmail = createMarketingEarlyAccessRequestEmail({
          approvalUrl: isQaRequest
            ? approveAndContinueUrl.toString()
            : approvalUrl,
          contactEmail: payload.primaryContactEmail,
          contactName: payload.primaryContactFullName,
          currentSizeLabel: formatCooperativeSizeRangeLabel(
            payload.currentSize
          ),
          launchTimelineLabel: formatEarlyAccessLaunchTimeline(
            payload.launchTimeline
          ),
          message: payload.message,
          phone: payload.phone,
          recordSystemLabel: formatEarlyAccessRecordSystem(
            payload.recordSystem
          ),
          recipientEmail,
          recipientName: "Halaalvest admin",
          requestedAt: payload.issuedAt,
          setupNeedLabels: formatEarlyAccessSetupNeeds(payload.setupNeeds),
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
            "We could not send the early access request. Please try again.",
        },
        { status: 502 }
      )
    }

    const qaPreviews: QaNotificationPreview[] = isQaRequest
      ? [
          ...createQaNotificationPreviews(deliveries),
          {
            artifacts: [
              {
                kind: "link",
                label: "Approve and get started",
                value: approveAndContinueUrl.toString(),
              },
            ],
            deliveryStatus: deliveries.some(
              (delivery) => delivery.status === "sent"
            )
              ? "sent"
              : deliveries.some((delivery) => delivery.status === "queued")
                ? "queued"
                : "failed",
            id: `early-access-${payload.issuedAt}`,
            notificationType: "marketing.early_access_requested",
            recipient: payload.primaryContactEmail,
          },
        ]
      : []

    return NextResponse.json({
      approveAndContinueUrl: isQaRequest
        ? approveAndContinueUrl.toString()
        : undefined,
      approvalUrl:
        !isQaRequest &&
        (process.env.NODE_ENV !== "production" || !emailDeliveryConfigured)
          ? approvalUrl
          : undefined,
      deliveries: deliveries.map((delivery) => ({
        attempts: delivery.attempts,
        errorMessage:
          delivery.status === "failed" ? "Email delivery failed." : null,
        messageId: delivery.messageId,
        routingMode: delivery.routing?.mode,
        status: delivery.status,
      })),
      devMode: process.env.NODE_ENV !== "production",
      emailDeliveryConfigured,
      message:
        "Your early access request has been received. We will email you after approval.",
      qaPreviews,
    })
  } catch (error) {
    const response = getMarketingErrorResponse(error)
    return NextResponse.json(response.body, { status: response.status })
  }
}
