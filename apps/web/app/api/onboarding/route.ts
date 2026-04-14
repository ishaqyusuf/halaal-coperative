import { NextResponse } from "next/server"
import {
  createNotificationOutboxEntry,
  createTenantWorkspaceBootstrap,
  recordNotificationDeliveryAudit,
  updateNotificationOutboxDelivery,
} from "@halaal-vest/db"
import { createWorkspaceReadyEmail } from "@halaal-vest/notifications"
import {
  buildTenantDashboardUrl,
  buildTenantSiteUrl,
} from "@halaal-vest/utils"
import { normalizeWorkspaceSlug, onboardingFormSchema } from "@/lib/signup-flow"
import { createServerNotificationService } from "@/lib/server-notifications"
import { verifySignedSignupToken } from "@/lib/signup-token"

function formatOnboardingError(error: unknown) {
  if (!(error instanceof Error)) {
    return "We could not provision the workspace."
  }

  if (error.message.includes("Unique constraint failed")) {
    return "That cooperative name or primary contact email is already in use. Try a different value."
  }

  return error.message
}

function getDashboardAppUrl(currentOrigin?: string | null) {
  return process.env.DASHBOARD_APP_URL
    ?? process.env.NEXT_PUBLIC_DASHBOARD_APP_URL
    ?? currentOrigin
    ?? "http://app.halaal-vest.localhost:1441"
}

function getTenantSiteAppUrl(currentOrigin?: string | null) {
  return process.env.TENANT_SITE_APP_URL
    ?? process.env.NEXT_PUBLIC_TENANT_SITE_APP_URL
    ?? currentOrigin
    ?? "http://tenant.halaal-vest.localhost:1443"
}

export async function POST(request: Request) {
  try {
    const input = onboardingFormSchema.parse(await request.json())
    const verification = verifySignedSignupToken(input.token)
    const result = await createTenantWorkspaceBootstrap({
      currentSize: input.currentSize,
      name: input.cooperativeName,
      officeAddress: input.officeAddress,
      ownerEmail: verification.primaryContactEmail,
      ownerFullName: input.primaryContactFullName,
      slug: normalizeWorkspaceSlug(input.cooperativeName),
      startDate: input.startDate,
    })

    const dashboardUrl = buildTenantDashboardUrl(result.tenant.slug, {
      currentOrigin: getDashboardAppUrl(request.url),
      tenantHostname: result.primarySiteHostname,
    })
    const siteUrl = buildTenantSiteUrl(result.tenant.slug, {
      currentOrigin: getTenantSiteAppUrl(request.url),
      tenantHostname: result.primarySiteHostname,
    })
    const dashboardHostname = new URL(dashboardUrl).host
    const siteHostname = new URL(siteUrl).host
    const notificationService = createServerNotificationService()
    const workspaceReadyEmail = createWorkspaceReadyEmail({
      dashboardUrl,
      recipientEmail: verification.primaryContactEmail,
      recipientName: input.primaryContactFullName,
      siteUrl,
      tenantName: result.tenant.name,
    })
    const outboxEntry = await createNotificationOutboxEntry({
      actionLabel: workspaceReadyEmail.actionLabel,
      actionUrl: workspaceReadyEmail.actionUrl,
      bodyText: workspaceReadyEmail.bodyText,
      metadata: {
        previewText: workspaceReadyEmail.previewText,
        recipientDisplayName: workspaceReadyEmail.recipient.displayName ?? null,
      },
      notificationType: workspaceReadyEmail.notificationType,
      recipient: workspaceReadyEmail.recipient.value,
      source: "apps/web/app/api/onboarding",
      subject: workspaceReadyEmail.subject,
      tenantId: result.tenant.id,
    })
    const workspaceReadyDelivery = await notificationService.tryEmail(workspaceReadyEmail)

    if (outboxEntry) {
      await updateNotificationOutboxDelivery({
        attempts: workspaceReadyDelivery.attempts,
        errorMessage: workspaceReadyDelivery.errorMessage,
        messageId: workspaceReadyDelivery.messageId,
        outboxId: outboxEntry.id,
        status: workspaceReadyDelivery.status,
      })
    }

    await recordNotificationDeliveryAudit({
      attempts: workspaceReadyDelivery.attempts,
      errorMessage: workspaceReadyDelivery.errorMessage,
      messageId: workspaceReadyDelivery.messageId,
      notificationType: workspaceReadyDelivery.draft.notificationType,
      recipient: workspaceReadyDelivery.draft.recipient.value,
      source: "apps/web/app/api/onboarding",
      status: workspaceReadyDelivery.status,
      tenantId: result.tenant.id,
    })

    return NextResponse.json({
      dashboardUrl,
      primaryDashboardHostname: dashboardHostname,
      primarySiteHostname: siteHostname,
      siteUrl,
      tenantId: result.tenant.id,
      tenantName: result.tenant.name,
      workspaceReadyOutboxId: outboxEntry?.id ?? null,
      workspaceReadyDeliveryError:
        workspaceReadyDelivery.status === "failed"
          ? workspaceReadyDelivery.errorMessage
          : null,
      workspaceReadyDelivery,
      workspaceReadyEmail: workspaceReadyDelivery.draft,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: formatOnboardingError(error),
      },
      { status: 400 },
    )
  }
}
