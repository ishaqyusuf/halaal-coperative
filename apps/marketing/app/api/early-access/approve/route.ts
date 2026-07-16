import { NextResponse } from "next/server"
import { createMarketingEarlyAccessApprovedEmail } from "@halaalvest/notifications"
import {
  createServerNotificationService,
  isServerEmailDeliveryConfigured,
} from "@/lib/server-notifications"
import {
  createSignedSignupApprovalToken,
  createSignupApprovalPayload,
  verifySignedEarlyAccessRequestToken,
} from "@/lib/early-access"
import { getMarketingAppOrigin } from "@/lib/runtime-url"

function buildSignupUrl(requestUrl: string, token: string) {
  const url = new URL("/signup", getMarketingAppOrigin(requestUrl))
  url.searchParams.set("approvalToken", token)

  return url.toString()
}

function htmlResponse(input: { body: string; status?: number; title: string }) {
  const title = escapeHtml(input.title)
  const body = escapeHtml(input.body)

  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;background:#fafafa;color:#111827}main{max-width:42rem;margin:12vh auto;padding:2rem;border:1px solid #e5e7eb;background:#fff}h1{font-size:1.5rem;margin:0 0 1rem}p{line-height:1.6;color:#4b5563}</style></head><body><main><h1>${title}</h1><p>${body}</p></main></body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
      status: input.status ?? 200,
    }
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get("token")

    if (!token) {
      return htmlResponse({
        body: "The approval token is missing from this link.",
        status: 400,
        title: "Approval link missing",
      })
    }

    const requestPayload = verifySignedEarlyAccessRequestToken(token)
    const approvalPayload = createSignupApprovalPayload(requestPayload)
    const signupApprovalToken = createSignedSignupApprovalToken(approvalPayload)
    const signupUrl = buildSignupUrl(request.url, signupApprovalToken)
    const approvalEmail = createMarketingEarlyAccessApprovedEmail({
      expiresAt: approvalPayload.expiresAt,
      recipientEmail: approvalPayload.primaryContactEmail,
      recipientName: approvalPayload.primaryContactFullName,
      signupUrl,
      tenantName: approvalPayload.cooperativeName,
    })
    const delivery =
      await createServerNotificationService().tryEmail(approvalEmail)

    if (
      process.env.NODE_ENV === "production" &&
      (!isServerEmailDeliveryConfigured() || delivery.status !== "sent")
    ) {
      return htmlResponse({
        body:
          delivery.errorMessage ??
          "The approval email could not be sent. Check email delivery configuration and try again.",
        status: 502,
        title: "Approval email failed",
      })
    }

    const devSuffix =
      process.env.NODE_ENV !== "production"
        ? ` Development setup link: ${signupUrl}`
        : ""

    return htmlResponse({
      body: `Approval sent to ${approvalPayload.primaryContactEmail}.${devSuffix}`,
      title: "Early access approved",
    })
  } catch (error) {
    return htmlResponse({
      body:
        error instanceof Error
          ? error.message
          : "This early access approval link could not be used.",
      status: 400,
      title: "Approval link invalid",
    })
  }
}
