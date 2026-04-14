import { NextResponse } from "next/server"
import {
  createNotificationOutboxEntry,
  createTenantWorkspaceBootstrap,
  recordNotificationDeliveryAudit,
  updateNotificationOutboxDelivery,
} from "@halaal-vest/db"
import { createWorkspaceReadyEmail } from "@halaal-vest/notifications"
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

    const dashboardUrl = `https://${result.primaryDashboardHostname}`
    const siteUrl = `https://${result.primarySiteHostname}`
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
      primaryDashboardHostname: result.primaryDashboardHostname,
      primarySiteHostname: result.primarySiteHostname,
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
