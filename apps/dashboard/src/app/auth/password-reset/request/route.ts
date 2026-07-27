import {
  findUserByEmailAsync,
  getTenantByIdAsync,
  recordNotificationDeliveryAudit,
  resolveTenantAsync,
} from "@halaalvest/db"
import {
  createNotificationEmailDraft,
  createQaNotificationPreviews,
} from "@halaalvest/notifications"
import { createServerNotificationService } from "@halaalvest/notifications/server"
import { buildTenantDashboardUrl } from "@halaalvest/utils"
import { NextResponse, type NextRequest } from "next/server"
import { buildDashboardRedirectUrl } from "@/lib/auth-redirect"
import { createPasswordResetToken } from "@/lib/password-reset-token"
import { setQaPreviewFlash } from "@/lib/qa-preview-flash.server"
import { getPublicRequestHost } from "@/lib/request-host"

export function GET(request: NextRequest) {
  return NextResponse.redirect(
    buildDashboardRedirectUrl(request, "/login/reset")
  )
}

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const host = getPublicRequestHost(request.headers)
  const tenantResolution = await resolveTenantAsync({
    hostname: request.headers.get("x-tenant-hostname") ?? host,
    slug: request.headers.get("x-tenant-subdomain"),
  })
  const user = email
    ? await findUserByEmailAsync({
        email,
        tenantId: tenantResolution.tenant?.id ?? null,
      })
    : null

  if (user) {
    const tenant =
      tenantResolution.tenant ?? (await getTenantByIdAsync(user.tenantId))

    if (tenant) {
      const reset = createPasswordResetToken(user)
      const resetUrl = buildTenantDashboardUrl(tenant.slug, {
        currentOrigin: request.headers.get("origin") ?? request.nextUrl.origin,
        pathname: `/login/reset/confirm?token=${encodeURIComponent(reset.token)}`,
        tenantHostname: request.headers.get("x-tenant-hostname"),
      })
      const bodyText = [
        `Hello ${user.fullName},`,
        "",
        `Use this link to set a new password for ${tenant.name}.`,
        `This link expires on ${reset.expiresAt}.`,
        "",
        resetUrl,
      ].join("\n")
      const draft = createNotificationEmailDraft({
        actionLabel: "Reset password",
        actionUrl: resetUrl,
        bodyText,
        eventLabel: "auth.password_reset_requested",
        notificationType: "auth.password_reset_requested",
        previewText: `Use this link to set a new password for ${tenant.name}.`,
        recipient: {
          displayName: user.fullName,
          email: user.email,
          kind: "email",
          value: user.email,
        },
        sender: {
          displayName: tenant.name,
          localPart: tenant.slug,
        },
        subject: `${tenant.name}: reset your password`,
      })
      const delivery = await createServerNotificationService().tryEmail(draft)

      await recordNotificationDeliveryAudit({
        attempts: delivery.attempts,
        deliveredRecipients: delivery.routing?.deliveredRecipients,
        errorMessage: delivery.errorMessage,
        messageId: delivery.messageId,
        notificationType: "auth.password_reset_requested",
        recipient: user.email,
        routingMode: delivery.routing?.mode,
        source: "dashboard.password_reset",
        status: delivery.status,
        tenantId: tenant.id,
      })

      await setQaPreviewFlash(createQaNotificationPreviews([delivery]))
    }
  }

  const query = new URLSearchParams({ sent: "1" })

  return NextResponse.redirect(
    buildDashboardRedirectUrl(request, `/login/reset?${query.toString()}`),
    303
  )
}
