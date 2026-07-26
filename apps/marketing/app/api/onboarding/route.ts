import { NextResponse } from "next/server"
import {
  checkTenantSignupAvailability,
  createTenantWorkspaceBootstrap,
  recordNotificationDeliveryAudit,
  syncTenantDomainVerificationByHostname,
} from "@halaalvest/db"
import {
  createQaNotificationPreviews,
  createWorkspaceReadyEmail,
} from "@halaalvest/notifications"
import {
  composeMemberNumber,
  normalizeWorkspaceSlug,
  onboardingFormSchema,
} from "@/lib/signup-flow"
import { hashPassword } from "@/lib/password"
import { createServerNotificationService } from "@/lib/server-notifications"
import { verifySignedSignupToken } from "@/lib/signup-token"
import { buildOnboardingWorkspaceUrls } from "@/lib/tenant-workspace-urls"
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

export async function POST(request: Request) {
  try {
    const input = onboardingFormSchema.parse(await request.json())
    const verification = verifySignedSignupToken(input.token)
    const availability = await checkTenantSignupAvailability({
      cooperativeName: input.cooperativeName,
      workspaceSlug: verification.workspaceSlug,
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

    const result = await createTenantWorkspaceBootstrap({
      city: input.city,
      country: input.country,
      currentSize: input.currentSize,
      name: input.cooperativeName,
      officeAddress: input.officeAddress,
      memberNumberPrefix: input.memberNumberPrefix || null,
      ownerEmail: verification.primaryContactEmail,
      ownerFullName: input.primaryContactFullName,
      ownerMemberNumber: composeMemberNumber(
        input.memberNumberPrefix,
        input.primaryContactMemberNumber
      ),
      ownerPasswordHash: hashPassword(input.password),
      slug: normalizeWorkspaceSlug(verification.workspaceSlug),
      state: input.state,
      startDate: input.startDate,
    })

    const { dashboardUrl, devDashboardUrlVariants, siteUrl } =
      buildOnboardingWorkspaceUrls({
        currentOrigin: request.url,
        tenantSlug: result.tenant.slug,
      })
    const vercelDomainProvisioning = await provisionTenantDomainOnVercel(
      result.primarySiteHostname
    )

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

    const siteHostname = new URL(siteUrl).host
    const notificationService = createServerNotificationService()
    const workspaceReadyEmail = createWorkspaceReadyEmail({
      dashboardUrl,
      recipientEmail: verification.primaryContactEmail,
      recipientName: input.primaryContactFullName,
      siteUrl,
      tenantName: result.tenant.name,
    })
    const workspaceReadyDelivery =
      await notificationService.tryEmail(workspaceReadyEmail)

    await recordNotificationDeliveryAudit({
      attempts: workspaceReadyDelivery.attempts,
      deliveredRecipients: workspaceReadyDelivery.routing?.deliveredRecipients,
      errorMessage: workspaceReadyDelivery.errorMessage,
      messageId: workspaceReadyDelivery.messageId,
      notificationType: workspaceReadyDelivery.draft.notificationType,
      recipient: workspaceReadyDelivery.draft.recipient.value,
      routingMode: workspaceReadyDelivery.routing?.mode,
      source: "apps/marketing/app/api/onboarding",
      status: workspaceReadyDelivery.status,
      tenantId: result.tenant.id,
    })

    return NextResponse.json({
      dashboardUrl,
      devDashboardUrlVariants,
      primaryDashboardHostname: siteHostname,
      primarySiteHostname: siteHostname,
      qaPreviews: createQaNotificationPreviews([workspaceReadyDelivery]),
      siteUrl,
      tenantId: result.tenant.id,
      tenantName: result.tenant.name,
      vercelDomainProvisioning,
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
      { status: 400 }
    )
  }
}
