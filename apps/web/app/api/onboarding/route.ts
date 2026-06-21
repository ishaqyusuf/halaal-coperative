import { NextResponse } from "next/server"
import {
  checkTenantSignupAvailability,
  createNotificationOutboxEntry,
  createTenantWorkspaceBootstrap,
  recordNotificationDeliveryAudit,
  syncTenantDomainVerificationByHostname,
  updateNotificationOutboxDelivery,
} from "@halaalvest/db"
import { createWorkspaceReadyEmail } from "@halaalvest/notifications"
import {
  buildTenantDashboardUrl,
  buildTenantSiteUrl,
} from "@halaalvest/utils"
import { normalizeWorkspaceSlug, onboardingFormSchema } from "@/lib/signup-flow"
import { createServerNotificationService } from "@/lib/server-notifications"
import { verifySignedSignupToken } from "@/lib/signup-token"
import { provisionTenantDomainOnVercel } from "@/lib/vercel-domains.server"

function formatOnboardingError(error: unknown) {
  if (!(error instanceof Error)) {
    return "We could not provision the workspace."
  }

  if (error.message.includes("Unique constraint failed")) {
    return "That cooperative name or primary contact email is already in use. Try a different value."
  }

  return error.message
}

function getTenantAppOrigin(currentOrigin?: string | null) {
  const configuredOrigin =
    process.env.DASHBOARD_APP_URL ?? process.env.NEXT_PUBLIC_DASHBOARD_APP_URL

  if (configuredOrigin) {
    return configuredOrigin
  }

  try {
    const url = currentOrigin ? new URL(currentOrigin) : null
    const hostname = url?.hostname ?? ""

    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0"
    ) {
      const port = process.env.HALAAL_VEST_DASHBOARD_APP_PORT ?? "1441"
      return `${url?.protocol ?? "http:"}//${hostname}:${port}`
    }
  } catch {
    return currentOrigin ?? "http://app.halaalvest.localhost:1441"
  }

  return currentOrigin ?? "http://app.halaalvest.localhost:1441"
}

export async function POST(request: Request) {
  try {
    const input = onboardingFormSchema.parse(await request.json())
    const verification = verifySignedSignupToken(input.token)
    const availability = await checkTenantSignupAvailability({
      cooperativeName: input.cooperativeName,
      workspaceSlug: verification.workspaceSlug,
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

    const result = await createTenantWorkspaceBootstrap({
      currentSize: input.currentSize,
      name: input.cooperativeName,
      officeAddress: input.officeAddress,
      ownerEmail: verification.primaryContactEmail,
      ownerFullName: input.primaryContactFullName,
      ownerMemberNumber: input.primaryContactMemberNumber,
      slug: normalizeWorkspaceSlug(verification.workspaceSlug),
      startDate: input.startDate,
    })

    const dashboardUrl = buildTenantDashboardUrl(result.tenant.slug, {
      currentOrigin: getTenantAppOrigin(request.url),
      pathname: "/",
      tenantHostname: result.primarySiteHostname,
    })
    const siteUrl = buildTenantSiteUrl(result.tenant.slug, {
      currentOrigin: getTenantAppOrigin(request.url),
      tenantHostname: result.primarySiteHostname,
    })
    const vercelDomainProvisioning = await provisionTenantDomainOnVercel(result.primarySiteHostname)

    if (vercelDomainProvisioning.status !== "skipped") {
      await syncTenantDomainVerificationByHostname({
        hostname: result.primarySiteHostname,
        tenantId: result.tenant.id,
        verificationDetails: vercelDomainProvisioning,
        verificationStatus:
          vercelDomainProvisioning.status === "verified"
            ? "verified"
            : vercelDomainProvisioning.status === "pending_verification"
              ? "pending_dns"
              : "failed",
      })
    }

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
      vercelDomainProvisioning,
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
