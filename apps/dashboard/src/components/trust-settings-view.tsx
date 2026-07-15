import type { ComponentProps } from "react"
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
import { OpenTrustSettingsSheet } from "@/components/open-trust-settings-sheet"
import { TrustSettingsSheet } from "@/components/sheets/trust-settings-sheet"
import type { loadTrustReadinessPageData } from "@/lib/settings/load-trust-readiness-page"

type TrustReadinessData = Awaited<
  ReturnType<typeof loadTrustReadinessPageData>
>
type TrustSettingsSheetDefaults = ComponentProps<
  typeof TrustSettingsSheet
>["defaultValues"]

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

      <DashboardSectionCard>
        <DashboardSectionHeader
          description="Use this page to explain what is ready, what needs legal or infrastructure confirmation, and where staff should go for evidence."
          eyebrow="Pilot posture"
          title="Operational trust checklist"
        />
        <div className="mt-5 space-y-3">
          {data.items.map((item) => (
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
          actions={<OpenTrustSettingsSheet />}
          description="Record the legal links, incident contact, backup-retention note, and recovery objectives from a focused sheet."
          eyebrow="Evidence"
          title="Pilot trust profile"
        />
        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          Trust evidence editing opens in a sheet so the readiness checklist
          remains easy to review.
        </p>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          description="These items prevent vague assurances during pilot discussions."
          eyebrow="Security posture"
          title="What this page does not promise"
        />
        <ul className="mt-5 space-y-2 text-sm leading-6 text-muted-foreground">
          <li>
            Final legal text must come from counsel; the product only tracks the
            readiness requirement.
          </li>
          <li>
            Database restore procedures, retention windows, and recovery
            objectives must be confirmed with the hosting and database provider.
          </li>
          <li>
            Formal uptime SLAs should wait until the platform is out of beta and
            supported by matching operations.
          </li>
        </ul>
      </DashboardSectionCard>

      <TrustSettingsSheet defaultValues={defaultValues} />
    </WorkspacePageShell>
  )
}
