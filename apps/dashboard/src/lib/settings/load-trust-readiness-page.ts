import {
  getTenantTrustProfile,
  type TenantTrustProfile,
} from "@halaalvest/db"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

export type TrustReadinessItem = {
  actionHref?: string
  actionLabel?: string
  detail: string
  evidence: string
  label: string
  owner: string
  status: string
  tone?: "neutral" | "positive" | "warning"
}

function isMonitoringConfigured() {
  return Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)
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

function buildTrustReadinessItems(
  trustProfile: TenantTrustProfile
): TrustReadinessItem[] {
  const monitoringConfigured = isMonitoringConfigured()
  const hasLegalEvidence = Boolean(
    trustProfile.legalTermsUrl ||
      trustProfile.privacyPolicyUrl ||
      trustProfile.dataProcessingUrl
  )
  const hasRestoreEvidence = Boolean(
    trustProfile.backupRetentionNote ||
      trustProfile.recoveryPointObjective ||
      trustProfile.recoveryTimeObjective ||
      trustProfile.incidentContactEmail
  )

  return [
    {
      actionHref: "/reports",
      actionLabel: "Open reports",
      detail:
        "Tenant-scoped exports are available for audit activity, support cases, " +
        "members, contributions, financing, repayments, charges, and statements.",
      evidence: "Reports workspace and CSV export routes",
      label: "Backup and offline confidence",
      owner: "Tenant admin and platform operator",
      status: "Export-ready",
      tone: "positive",
    },
    {
      detail:
        hasRestoreEvidence
          ? "Restore evidence has been recorded for pilot discussions. " +
            "Infrastructure and database-provider procedures still need to " +
            "match the documented retention and recovery objectives."
          : "Restore remains an infrastructure and database-operation " +
            "responsibility. Pilot terms should name recovery responsibilities, " +
            "retention windows, and escalation contacts before launch.",
      evidence: hasRestoreEvidence
        ? "Saved trust profile"
        : "Operational policy item",
      label: "Restore posture",
      owner: "Platform operator",
      status: hasRestoreEvidence ? "Evidence saved" : "Document before pilot",
      tone: hasRestoreEvidence ? "positive" : "warning",
    },
    {
      detail:
        hasLegalEvidence
          ? "Legal document references have been recorded. Counsel still owns " +
            "the final approved terms, privacy language, and data-processing " +
            "scope before the pilot is contract-ready."
          : "Final legal terms, privacy language, data-processing scope, and " +
            "support responsibilities must be supplied by the legal team before " +
            "the pilot is treated as contract-ready.",
      evidence: hasLegalEvidence ? "Saved legal links" : "Legal readiness item",
      label: "Terms and conditions",
      owner: "Legal and founder",
      status: hasLegalEvidence ? "Evidence saved" : "Legal review required",
      tone: hasLegalEvidence ? "positive" : "warning",
    },
    {
      detail: monitoringConfigured
        ? "A Sentry-compatible DSN is present in this runtime, so application " +
          "errors can be routed to monitoring."
        : "No Sentry-compatible DSN was detected in this runtime. Configure " +
          "monitoring before pilot traffic is invited.",
      evidence: "SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN",
      label: "Error monitoring",
      owner: "Platform operator",
      status: monitoringConfigured ? "Configured" : "Needs setup",
      tone: monitoringConfigured ? "positive" : "warning",
    },
    {
      actionHref: "/reports/audit-export",
      actionLabel: "Open activity report",
      detail:
        "The dashboard error boundary sends sanitized crash reports to the " +
        "tenant audit log when database-backed tenant context is available. " +
        "This gives admins internal evidence even before external alerting is " +
        "configured.",
      evidence: "Audit action: application.error_captured",
      label: "Internal crash evidence",
      owner: "Engineering and support",
      status: "Available",
      tone: "positive",
    },
    {
      actionHref: "/support",
      actionLabel: "Open support",
      detail:
        "Feature requests are captured through the audited support workflow with " +
        "assignment, replies, status updates, notifications, and CSV export.",
      evidence: "Support category: feature_request",
      label: "Feature request triage",
      owner: "Product and support",
      status: "Live",
      tone: "positive",
    },
    {
      detail:
        "Pilot messaging should describe beta availability, support response " +
        "expectations, and planned maintenance honestly instead of promising a " +
        "formal uptime SLA too early.",
      evidence: "Reliability messaging item",
      label: "Reliability expectations",
      owner: "Founder and platform operator",
      status: "Beta posture",
      tone: "warning",
    },
    {
      detail:
        "The app-level error boundary gives users a safe recovery message for " +
        "unexpected crashes without exposing stack traces, database details, or " +
        "infrastructure internals.",
      evidence: "Dashboard error boundary",
      label: "Sensitive error disclosure",
      owner: "Engineering",
      status: "Guarded",
      tone: "positive",
    },
  ]
}

export async function loadTrustReadinessPageData() {
  const context = await getDashboardServerContext()
  const canViewTrustReadiness = hasAnyRole(
    context.auth.membership?.role,
    workspaceAdminRoles
  )
  const trustProfile = context.tenant
    ? await getTenantTrustProfile(context.tenant.id)
    : emptyTrustProfile
  const items = buildTrustReadinessItems(trustProfile)
  const lastReviewedAt = trustProfile.reviewedAt
    ? trustProfile.reviewedAt.toISOString()
    : null

  return {
    canViewTrustReadiness,
    items,
    lastReviewedAt,
    monitoringConfigured: isMonitoringConfigured(),
    readyItems: items.filter((item) => item.tone === "positive"),
    savedLegalLinks: [
      trustProfile.legalTermsUrl,
      trustProfile.privacyPolicyUrl,
      trustProfile.dataProcessingUrl,
    ].filter(Boolean).length,
    trustProfile,
    warningItems: items.filter((item) => item.tone === "warning"),
  }
}
