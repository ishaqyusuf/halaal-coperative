import type { ComponentProps } from "react"
import {
  DashboardStatCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { OpenOperationProfileSettingsSheet } from "@/components/open-operation-profile-settings-sheet"
import { OperationProfileSettingsSheet } from "@/components/sheets/operation-profile-settings-sheet"
import {
  getOperationProfileAccessModeLabel,
  getOperationProfileAccessModeSummary,
  getOperationProfileService,
  operationProfileServiceRows,
  operationProfileServiceSections,
} from "@/lib/settings/operation-profile-settings"

type OperationProfileSettingsSheetProps = ComponentProps<
  typeof OperationProfileSettingsSheet
>

export function OperationProfileSettingsUnavailableView({
  body,
  description,
  title,
}: {
  body: string
  description: string
  title: string
}) {
  return (
    <WorkspacePageShell
      description={description}
      eyebrow="Settings"
      title="Operation profile"
    >
      <WorkspaceEmptyState body={body} title={title} />
    </WorkspacePageShell>
  )
}

export function OperationProfileSettingsView({
  policy,
  reviewedAt,
  services,
}: OperationProfileSettingsSheetProps & {
  reviewedAt: Date | null
}) {
  const enabledServices = operationProfileServiceRows.filter(
    (service) => services[service.key].accessMode !== "disabled"
  )
  const memberSelfServiceCount = operationProfileServiceRows.filter(
    (service) => services[service.key].accessMode === "member_self_service"
  ).length

  return (
    <WorkspacePageShell
      description="Choose which cooperative services are offered, whether members can start requests online, and when a service is office-only or view-only."
      eyebrow="Settings"
      title="Operation profile"
    >
      <section className="hidden gap-4 md:grid md:grid-cols-3">
        <DashboardStatCard
          detail="Services not disabled."
          label="Enabled services"
          value={`${enabledServices.length}/${operationProfileServiceRows.length}`}
        />
        <DashboardStatCard
          detail="Services where members can submit requests themselves."
          label="Member self-service"
          value={memberSelfServiceCount.toString()}
        />
        <DashboardStatCard
          detail={
            reviewedAt
              ? new Date(reviewedAt).toLocaleDateString()
              : "Not reviewed yet."
          }
          label="Last reviewed"
          tone={reviewedAt ? "positive" : "warning"}
          value={reviewedAt ? "Reviewed" : "Draft"}
        />
      </section>

      <section
        aria-labelledby="operation-profile-services-title"
        className="space-y-8 md:space-y-10"
      >
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            Service access
          </p>
          <h2
            className="mt-1 text-base font-semibold text-foreground"
            id="operation-profile-services-title"
          >
            Cooperative services
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review every current access mode at a glance. Editing one service
            does not change the others.
          </p>
        </div>

        {operationProfileServiceSections.map((section) => (
          <section
            aria-labelledby={`operation-profile-${section.key}-title`}
            data-operation-profile-section={section.key}
            key={section.key}
          >
            <div className="pb-4">
              <h3
                className="text-base font-semibold text-foreground"
                id={`operation-profile-${section.key}-title`}
              >
                {section.label}
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {section.body}
              </p>
            </div>

            <div className="divide-y divide-border/70 border-y border-border/70">
              {section.serviceKeys.map((serviceKey) => {
                const service = getOperationProfileService(serviceKey)
                const accessMode = services[service.key].accessMode

                return (
                  <div
                    className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_minmax(15rem,auto)] md:items-center"
                    data-operation-profile-service={service.key}
                    key={service.key}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {service.label}
                      </p>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {service.body}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Current access
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <TrendPill>
                            {getOperationProfileAccessModeLabel(accessMode)}
                          </TrendPill>
                          <span className="text-xs text-muted-foreground">
                            {getOperationProfileAccessModeSummary(accessMode)}
                          </span>
                        </div>
                      </div>
                      <OpenOperationProfileSettingsSheet
                        serviceKey={service.key}
                        serviceLabel={service.label}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </section>

      <OperationProfileSettingsSheet policy={policy} services={services} />
    </WorkspacePageShell>
  )
}
