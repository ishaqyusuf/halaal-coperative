import { buildLegalReadinessItems } from "./legal-readiness"
import { getTenantTrustProfile, type TenantTrustProfile } from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

/**
 * One checklist row. Only things the cooperative itself records or can do
 * are listed; platform engineering items (monitoring, error pages) are not
 * the admin's to tick and were removed (thread 15).
 */
export type TrustReadinessItem = {
  actionHref?: string
  actionLabel?: string
  detail: string
  done: boolean
  key: string
  label: string
}

const emptyTrustProfile: TenantTrustProfile = {
  backupRetentionNote: null,
  dataProcessingUrl: null,
  incidentContactEmail: null,
  incidentContactName: null,
  legalTermsUrl: null,
  privacyPolicyUrl: null,
  recoveryPointObjective: null,
  recoveryTimeObjective: null,
  reviewedAt: null,
  reviewedByUserId: null,
}

export function buildTrustReadinessItems(
  trustProfile: TenantTrustProfile
): TrustReadinessItem[] {
  const contact = [
    trustProfile.incidentContactName,
    trustProfile.incidentContactEmail,
  ]
    .filter(Boolean)
    .join(", ")
  const recovery = [
    trustProfile.recoveryPointObjective
      ? `Could lose up to ${trustProfile.recoveryPointObjective}`
      : null,
    trustProfile.recoveryTimeObjective
      ? `back in ${trustProfile.recoveryTimeObjective}`
      : null,
  ]
    .filter(Boolean)
    .join(", ")
  const backupWritten = Boolean(
    trustProfile.backupRetentionNote?.trim() ||
    trustProfile.recoveryPointObjective?.trim() ||
    trustProfile.recoveryTimeObjective?.trim()
  )

  return [
    ...buildLegalReadinessItems(trustProfile),
    {
      detail: trustProfile.incidentContactEmail
        ? contact
        : "Add a name and email for problems.",
      done: Boolean(trustProfile.incidentContactEmail),
      key: "contact",
      label: "Who to contact if something goes wrong",
    },
    {
      detail: backupWritten
        ? trustProfile.backupRetentionNote?.trim() || recovery
        : "Write down how your records are backed up.",
      done: backupWritten,
      key: "backups",
      label: "Backups",
    },
    {
      actionHref: "/reports",
      actionLabel: "Open reports",
      detail: "Download members, payments and loans as spreadsheets.",
      done: true,
      key: "downloads",
      label: "Copies of your records",
    },
  ]
}

export async function loadTrustReadinessPageData() {
  const context = await getDashboardServerContext()
  const canViewTrustReadiness = hasAnyRole(
    context.auth.membership?.role,
    workspaceAdminRoles
  )
  const trustProfile =
    canViewTrustReadiness && context.tenant
      ? await getTenantTrustProfile(context.tenant.id)
      : emptyTrustProfile
  const items = buildTrustReadinessItems(trustProfile)

  return {
    canViewTrustReadiness,
    doneCount: items.filter((item) => item.done).length,
    items,
    lastSavedAt: trustProfile.reviewedAt
      ? trustProfile.reviewedAt.toISOString()
      : null,
    trustProfile,
  }
}
