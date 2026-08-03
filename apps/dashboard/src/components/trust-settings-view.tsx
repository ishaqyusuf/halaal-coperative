import type { ComponentProps } from "react"
import {
  DashboardActionLink,
  DashboardStatCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { OpenTrustSettingsSheet } from "@/components/open-trust-settings-sheet"
import { TrustSettingsSheet } from "@/components/sheets/trust-settings-sheet"
import type { loadTrustReadinessPageData } from "@/lib/settings/load-trust-readiness-page"

type TrustReadinessData = Awaited<ReturnType<typeof loadTrustReadinessPageData>>
type TrustSettingsSheetDefaults = ComponentProps<
  typeof TrustSettingsSheet
>["defaultValues"]

const trustLimitations = [
  "Final legal text must come from counsel; the product only tracks the readiness requirement.",
  "Database restore procedures, retention windows, and recovery objectives must be confirmed with the hosting and database provider.",
  "Formal uptime SLAs should wait until the platform is out of beta and supported by matching operations.",
] as const

export function TrustSettingsUnavailableView() {
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

export function TrustSettingsView({
  data,
  defaultValues,
}: {
  data: TrustReadinessData
  defaultValues: TrustSettingsSheetDefaults
}) {
  const incidentContact = [
    defaultValues.incidentContactName,
    defaultValues.incidentContactEmail,
  ]
    .filter(Boolean)
    .join(" · ")
  const recoveryObjectives = [
    defaultValues.recoveryPointObjective
      ? `RPO ${defaultValues.recoveryPointObjective}`
      : null,
    defaultValues.recoveryTimeObjective
      ? `RTO ${defaultValues.recoveryTimeObjective}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ")
  const evidenceRows = [
    {
      detail:
        "Terms, privacy policy, and data-processing agreement references.",
      key: "legal_documents",
      label: "Legal documents",
      status: `${data.savedLegalLinks}/3 recorded`,
      tone:
        data.savedLegalLinks > 0 ? ("positive" as const) : ("warning" as const),
      value:
        data.savedLegalLinks > 0
          ? "Saved links are included in the trust review."
          : "No legal document links recorded.",
    },
    {
      detail: "Primary escalation contact for operational incidents.",
      key: "incident_contact",
      label: "Incident contact",
      status: incidentContact ? "Recorded" : "Not recorded",
      tone: incidentContact ? ("positive" as const) : ("warning" as const),
      value: incidentContact || "Add a responsible contact and email address.",
    },
    {
      detail:
        "Recovery point and recovery time expectations for pilot operation.",
      key: "recovery_objectives",
      label: "Recovery objectives",
      status: recoveryObjectives ? "Recorded" : "Not recorded",
      tone: recoveryObjectives ? ("positive" as const) : ("warning" as const),
      value: recoveryObjectives || "Add provider-backed recovery objectives.",
    },
    {
      detail:
        "Documented backup frequency, retention, and provider responsibility.",
      key: "backup_retention",
      label: "Backup retention",
      status: defaultValues.backupRetentionNote ? "Recorded" : "Not recorded",
      tone: defaultValues.backupRetentionNote
        ? ("positive" as const)
        : ("warning" as const),
      value:
        defaultValues.backupRetentionNote ||
        "Add the confirmed backup and retention posture.",
    },
  ]

  return (
    <WorkspacePageShell
      actions={<OpenTrustSettingsSheet />}
      description="Pilot-facing posture for legal readiness, exports, monitoring, feature requests, reliability, and safe error handling."
      eyebrow="Settings"
      title="Trust readiness"
    >
      <section className="hidden gap-4 md:grid md:grid-cols-4">
        <DashboardStatCard
          detail="Items with an implemented or available operating path."
          label="Ready"
          tone="positive"
          value={data.readyItems.length.toString()}
        />
        <DashboardStatCard
          detail="Items that need operational, legal, or infrastructure follow-up."
          label="Needs follow-up"
          tone={data.warningItems.length > 0 ? "warning" : "positive"}
          value={data.warningItems.length.toString()}
        />
        <DashboardStatCard
          detail="Error monitoring variable detected in the current runtime."
          label="Monitoring"
          tone={data.monitoringConfigured ? "positive" : "warning"}
          value={data.monitoringConfigured ? "Configured" : "Needs setup"}
        />
        <DashboardStatCard
          detail={
            data.lastReviewedAt
              ? `Last updated ${new Date(data.lastReviewedAt).toLocaleDateString()}`
              : "No saved trust profile yet."
          }
          label="Trust profile"
          tone={data.lastReviewedAt ? "positive" : "warning"}
          value={data.lastReviewedAt ? `${data.savedLegalLinks} docs` : "Draft"}
        />
      </section>

      <section aria-labelledby="trust-checklist-title">
        <div className="pb-4">
          <p className="text-xs font-medium text-muted-foreground">
            Pilot posture
          </p>
          <h2
            className="mt-1 text-base font-semibold text-foreground"
            id="trust-checklist-title"
          >
            Operational trust checklist
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review what is ready, what still needs legal or infrastructure
            confirmation, and where staff can find supporting evidence.
          </p>
        </div>

        <div className="divide-y divide-border/70 border-y border-border/70">
          {data.items.map((item) => (
            <div
              className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
              data-trust-readiness-item={item.label}
              key={item.label}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-medium text-foreground">{item.label}</h3>
                  <TrendPill tone={item.tone}>{item.status}</TrendPill>
                </div>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
                  {item.detail}
                </p>
                <dl className="mt-3 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
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
                <DashboardActionLink
                  className="h-11 w-full md:h-9 md:w-auto"
                  href={item.actionHref}
                >
                  {item.actionLabel}
                </DashboardActionLink>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="trust-profile-evidence-title">
        <div className="pb-4">
          <p className="text-xs font-medium text-muted-foreground">Evidence</p>
          <h2
            className="mt-1 text-base font-semibold text-foreground"
            id="trust-profile-evidence-title"
          >
            Saved trust profile
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            Current legal, incident-response, backup, and recovery evidence is
            visible here without opening the editor.
          </p>
        </div>

        <div className="divide-y divide-border/70 border-y border-border/70">
          {evidenceRows.map((row) => (
            <div
              className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_minmax(14rem,0.7fr)] md:items-center md:gap-8"
              data-trust-profile-evidence={row.key}
              key={row.key}
            >
              <div>
                <h3 className="font-medium text-foreground">{row.label}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {row.detail}
                </p>
              </div>
              <div>
                <TrendPill tone={row.tone}>{row.status}</TrendPill>
                <p className="mt-2 text-sm break-words text-muted-foreground">
                  {row.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="trust-limitations-title">
        <div className="pb-4">
          <p className="text-xs font-medium text-muted-foreground">
            Security posture
          </p>
          <h2
            className="mt-1 text-base font-semibold text-foreground"
            id="trust-limitations-title"
          >
            What this page does not promise
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
            These boundaries prevent vague assurances during pilot discussions.
          </p>
        </div>
        <ul className="divide-y divide-border/70 border-y border-border/70 text-sm leading-6 text-muted-foreground">
          {trustLimitations.map((limitation) => (
            <li className="flex gap-3 py-4" key={limitation}>
              <span
                aria-hidden="true"
                className="mt-2.5 size-1.5 shrink-0 rounded-full bg-muted-foreground"
              />
              <span>{limitation}</span>
            </li>
          ))}
        </ul>
      </section>

      <TrustSettingsSheet defaultValues={defaultValues} />
    </WorkspacePageShell>
  )
}
