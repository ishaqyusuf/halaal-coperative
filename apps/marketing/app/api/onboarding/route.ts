import { NextResponse } from "next/server"
import { AppError } from "@halaalvest/errors"
import {
  createTenantWorkspaceBootstrap,
  recordNotificationDeliveryAudit,
  resolveConfiguredQaDomain,
  syncTenantDomainVerificationByHostname,
} from "@halaalvest/db"
import {
  createQaNotificationPreviews,
  createWorkspaceReadyEmail,
  getNotificationEmailDeliveryErrorCause,
} from "@halaalvest/notifications"
import { getServerQaEmailDomains } from "@halaalvest/notifications/server"
import {
  composeMemberNumber,
  normalizeWorkspaceSlug,
  onboardingFormSchema,
} from "@/lib/signup-flow"
import { hashPassword } from "@/lib/password"
import { createServerNotificationService } from "@/lib/server-notifications"
import { resolveSignupVerification } from "@/lib/signup-verification.server"
import { buildOnboardingWorkspaceUrls } from "@/lib/tenant-workspace-urls"
import { provisionTenantDomainOnVercel } from "@/lib/vercel-domains.server"
import { getMarketingErrorResponse } from "@/lib/error-response"
import { getMarketingServerErrorResponse } from "@/lib/error-response.server"
import { parseMarketingJson } from "@/lib/parse-json.server"
import { captureMarketingError } from "@/lib/sentry"

export async function POST(request: Request) {
  try {
    const input = onboardingFormSchema.parse(await parseMarketingJson(request))
    const verificationResult = await resolveSignupVerification(input.token)

    if (verificationResult.status === "invalid") {
      const response = getMarketingErrorResponse(
        new AppError({
          code: "VALIDATION_FAILED",
          publicMessage: verificationResult.errorMessage,
        }),
        { status: 410 }
      )
      return NextResponse.json(response.body, { status: response.status })
    }

    const verification = verificationResult.value
    const result = await createTenantWorkspaceBootstrap({
      city: input.city,
      country: input.country,
      currentSize: input.currentSize,
      name: verification.cooperativeName,
      officeAddress: input.officeAddress,
      memberNumberPrefix: verification.memberNumberPrefix || null,
      ownerEmail: verification.primaryContactEmail,
      ownerFullName: verification.primaryContactFullName,
      ownerMemberNumber: composeMemberNumber(
        verification.memberNumberPrefix,
        verification.primaryContactMemberNumber
      ),
      ownerPasswordHash: hashPassword(input.password),
      qaSourceDomain: resolveConfiguredQaDomain(
        verification.primaryContactEmail,
        getServerQaEmailDomains()
      ),
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
      recipientName: verification.primaryContactFullName,
      siteUrl,
      tenantName: result.tenant.name,
      tenantSlug: result.tenant.slug,
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

    if (workspaceReadyDelivery.status === "failed") {
      captureMarketingError(
        new AppError({
          cause: getNotificationEmailDeliveryErrorCause(workspaceReadyDelivery),
          code: "PROVIDER_UNAVAILABLE",
          publicMessage: "The workspace-ready email could not be sent.",
        }),
        "marketing.provider",
        { method: "POST", provider: "email" }
      )
    }

    const exposeQaArtifacts = process.env.NODE_ENV !== "production"
    const domainPublicMessage =
      vercelDomainProvisioning.status === "failed"
        ? "The cooperative domain could not be configured automatically."
        : vercelDomainProvisioning.status === "pending_verification"
          ? "The cooperative domain was accepted and still needs verification."
          : null

    return NextResponse.json({
      dashboardUrl,
      devDashboardUrlVariants,
      primaryDashboardHostname: siteHostname,
      primarySiteHostname: siteHostname,
      qaPreviews: exposeQaArtifacts
        ? createQaNotificationPreviews([workspaceReadyDelivery])
        : [],
      siteUrl,
      tenantId: result.tenant.id,
      tenantName: result.tenant.name,
      vercelDomainProvisioning: {
        publicMessage: domainPublicMessage,
        status: vercelDomainProvisioning.status,
      },
      workspaceReadyDeliveryError:
        workspaceReadyDelivery.status === "failed"
          ? "Email delivery failed."
          : null,
      workspaceReadyDelivery: {
        attempts: workspaceReadyDelivery.attempts,
        messageId: workspaceReadyDelivery.messageId,
        routingMode: workspaceReadyDelivery.routing?.mode,
        status: workspaceReadyDelivery.status,
      },
      workspaceReadyEmail: exposeQaArtifacts
        ? workspaceReadyDelivery.draft
        : undefined,
    })
  } catch (error) {
    const response = getMarketingServerErrorResponse(error, { method: "POST" })
    return NextResponse.json(response.body, { status: response.status })
  }
}
