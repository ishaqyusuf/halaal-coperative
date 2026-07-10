import {
  getTenantTrustProfile,
  type TenantTrustProfile,
} from "@halaalvest/db"
import {
  DashboardActionLink,
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { TenantTrustProfileForm } from "@/components/forms/settings-forms"
import { getDashboardServerContext } from "@/lib/server-context"
import { hasAnyRole, workspaceAdminRoles } from "@/lib/workspace-access"

type TrustReadinessItem = {
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

export default async function TrustReadinessPage() {
  const context = await getDashboardServerContext()
  const canViewTrustReadiness = hasAnyRole(
    context.auth.membership?.role,
    workspaceAdminRoles
  )
  const trustProfile = context.tenant
    ? await getTenantTrustProfile(context.tenant.id)
    : emptyTrustProfile
  const items = buildTrustReadinessItems(trustProfile)
  const readyItems = items.filter((item) => item.tone === "positive")
  const warningItems = items.filter((item) => item.tone === "warning")
  const savedLegalLinks = [
    trustProfile.legalTermsUrl,
    trustProfile.privacyPolicyUrl,
    trustProfile.dataProcessingUrl,
  ].filter(Boolean).length
  const lastReviewedAt = trustProfile.reviewedAt
    ? trustProfile.reviewedAt.toISOString()
    : null

  if (!canViewTrustReadiness) {
    return (
      <WorkspacePageShell
        description="Operational trust posture for pilot readiness."
        eyebrow="Settings"
        title="Trust readiness"
      >
        <WorkspaceEmptyState
          body="Cooperative admins and super admins can review operational trust readiness."
          title="Trust readiness access is limited."
        />
      </WorkspacePageShell>
    )
  }

  return (
    <WorkspacePageShell
      description="Pilot-facing posture for legal readiness, exports, monitoring, feature requests, reliability, and safe error handling."
      eyebrow="Settings"
      title="Trust readiness"
    >
      <section className="grid gap-4 md:grid-cols-4">
        <DashboardStatCard
          detail="Items with an implemented or available operating path."
          label="Ready"
          tone="positive"
          value={readyItems.length.toString()}
        />
        <DashboardStatCard
          detail="Items that need operational, legal, or infrastructure follow-up."
          label="Needs follow-up"
          tone={warningItems.length > 0 ? "warning" : "positive"}
          value={warningItems.length.toString()}
        />
        <DashboardStatCard
          detail="Error monitoring variable detected in the current runtime."
          label="Monitoring"
          tone={isMonitoringConfigured() ? "positive" : "warning"}
          value={isMonitoringConfigured() ? "Configured" : "Needs setup"}
        />
        <DashboardStatCard
          detail={
            lastReviewedAt
              ? `Last updated ${new Date(lastReviewedAt).toLocaleDateString()}`
              : "No saved trust profile yet."
          }
          label="Trust profile"
          tone={lastReviewedAt ? "positive" : "warning"}
          value={lastReviewedAt ? `${savedLegalLinks} docs` : "Draft"}
        />
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Pilot posture"
          title="Operational trust checklist"
          description="Use this page to explain what is ready, what needs legal or infrastructure confirmation, and where staff should go for evidence."
        />
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <DashboardSurfaceCard key={item.label}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{item.label}</p>
                    <TrendPill tone={item.tone}>{item.status}</TrendPill>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                  <dl className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-foreground">Owner</dt>
                      <dd className="mt-1">{item.owner}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-foreground">Evidence</dt>
                      <dd className="mt-1">{item.evidence}</dd>
                    </div>
                  </dl>
                </div>
                {item.actionHref && item.actionLabel ? (
                  <DashboardActionLink href={item.actionHref}>
                    {item.actionLabel}
                  </DashboardActionLink>
                ) : null}
              </div>
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Evidence"
          title="Pilot trust profile"
          description="Record the legal links, incident contact, backup-retention note, and recovery objectives that support client safety discussions."
        />
        <div className="mt-5">
          <TenantTrustProfileForm
            defaultValues={{
              backupRetentionNote: trustProfile.backupRetentionNote ?? "",
              dataProcessingUrl: trustProfile.dataProcessingUrl ?? "",
              incidentContactEmail: trustProfile.incidentContactEmail ?? "",
              incidentContactName: trustProfile.incidentContactName ?? "",
              legalTermsUrl: trustProfile.legalTermsUrl ?? "",
              privacyPolicyUrl: trustProfile.privacyPolicyUrl ?? "",
              recoveryPointObjective:
                trustProfile.recoveryPointObjective ?? "",
              recoveryTimeObjective: trustProfile.recoveryTimeObjective ?? "",
            }}
          />
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Security posture"
          title="What this page does not promise"
          description="These items prevent vague assurances during pilot discussions."
        />
        <ul className="mt-5 space-y-2 text-sm leading-6 text-muted-foreground">
          <li>
            Final legal text must come from counsel; the product only tracks the
            readiness requirement.
          </li>
          <li>
            Database restore procedures, retention windows, and recovery
            objectives must be confirmed with the hosting and database
            provider.
          </li>
          <li>
            Formal uptime SLAs should wait until the platform is out of beta and
            supported by matching operations.
          </li>
        </ul>
      </DashboardSectionCard>
    </WorkspacePageShell>
  )
}
