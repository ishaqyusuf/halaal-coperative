import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { ChargeLibraryColumnVisibility } from "@/components/charge-library-column-visibility"
import {
  OpenChargeApplicationSheet,
  OpenChargeDefinitionSheet,
  OpenChargeReverseSheet,
  OpenChargeVersionSheet,
  OpenChargeWaiveSheet,
} from "@/components/open-charge-operation-sheet"
import { ChargeOperationSheet } from "@/components/sheets/charge-operation-sheet"
import {
  ChargeLibraryDataTable,
  type ChargeLibraryRow,
} from "@/components/tables/charge-library/data-table"
import type { TableSettings } from "@/utils/table-settings"

export function ChargesUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Charges"
      title="Charge definitions"
      description="Standard cooperative levies and charge rules for onboarding, contributions, lending, and corrective finance actions."
    >
      <WorkspaceEmptyState
        title="Charge definitions need the database runtime."
        body="This workspace is wired into the new dashboard shell and will show cooperative charge definitions once the database-backed environment is active."
      />
    </WorkspacePageShell>
  )
}

function formatChargeApplicationSource(application: {
  chargeApplicability?: {
    trigger: string
    workflow: string
  } | null
  foodPurchaseApplication?: { status: string } | null
  loanRequest?: { status: string } | null
  procurementRequest?: { itemName: string; status: string } | null
  projectFinancingRequest?: { businessName: string; status: string } | null
}) {
  const workflow = application.chargeApplicability?.workflow

  if (application.procurementRequest) {
    return `Procurement · ${application.procurementRequest.itemName} · ${application.procurementRequest.status}`
  }

  if (application.foodPurchaseApplication) {
    return `Foodstuff Purchase · ${application.foodPurchaseApplication.status}`
  }

  if (application.projectFinancingRequest) {
    return `Project Financing · ${application.projectFinancingRequest.businessName} · ${application.projectFinancingRequest.status}`
  }

  if (application.loanRequest) {
    return `Loan request · ${application.loanRequest.status}`
  }

  return workflow ? workflow.replace(/_/g, " ") : "Manual charge"
}

export function ChargesPageView({
  activeCharges,
  canManageCharges,
  chargeApplications,
  chargeLibraryTableSettings,
  charges,
  members,
  monthlyLevies,
  postedApplications,
  quickFillEnabled,
}: {
  activeCharges: Array<{
    amount: number | string | { toString(): string }
    code: string
    id: string
    isActive: boolean
    isMonthlyLevy: boolean
    kind: string
    name: string
  }>
  canManageCharges: boolean
  chargeApplications: Array<{
    amount: number | string | { toString(): string }
    chargeApplicability?: { trigger: string; workflow: string } | null
    chargeDefinition: { name: string }
    collectionMode?: string
    foodPurchaseApplication?: { status: string } | null
    id: string
    loanRequest?: { status: string } | null
    member: { fullName: string }
    procurementRequest?: { itemName: string; status: string } | null
    projectFinancingRequest?: { businessName: string; status: string } | null
    status: string
  }>
  chargeLibraryTableSettings?: Partial<TableSettings>
  charges: ChargeLibraryRow[]
  members: {
    items: Array<{ fullName: string; id: string; memberNumber: string }>
  }
  monthlyLevies: Array<unknown>
  postedApplications: Array<unknown>
  quickFillEnabled: boolean
}) {
  return (
    <WorkspacePageShell
      eyebrow="Charges"
      title="Charge definitions"
      description="A Midday-style finance control surface for charge setup, active levy monitoring, and recent charge application corrections."
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <DashboardStatCard
          label="Charge definitions"
          value={charges.length.toString()}
          detail="Total configured levy and charge rules for this cooperative."
        />
        <DashboardStatCard
          label="Active charges"
          value={activeCharges.length.toString()}
          detail="Charge rules currently eligible for posting or assignment."
          tone="positive"
        />
        <DashboardStatCard
          label="Monthly levies"
          value={monthlyLevies.length.toString()}
          detail="Recurring levy rules used in monthly cooperative collections."
        />
        <DashboardStatCard
          label="Recent posted applications"
          value={postedApplications.length.toString()}
          detail="Recent posted items that may need waiver or reversal follow-up."
          tone={postedApplications.length > 0 ? "warning" : "default"}
        />
      </section>

      {canManageCharges ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <DashboardSectionCard>
            <DashboardSectionHeader
              actions={<OpenChargeDefinitionSheet />}
              eyebrow="Create"
              title="New charge definition"
              description="Configure a reusable cooperative charge and keep the posting rules centralized."
            />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Create charge definitions from a focused sheet so the definitions
              table remains easy to scan.
            </p>
          </DashboardSectionCard>

          <DashboardSectionCard>
            <DashboardSectionHeader
              actions={<OpenChargeApplicationSheet />}
              eyebrow="Apply"
              title="Post charge to a member"
              description="Assign an active charge to a member and push it into the recent activity lane."
            />
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Apply an active charge to a member from the same sheet workflow as
              the other finance actions.
            </p>
          </DashboardSectionCard>
        </section>
      ) : null}

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Definitions"
          title="Charge library"
          description="Every configured charge, its current dated amount, posting kind, and full update history."
          actions={
            <div className="flex items-center gap-2">
              <TrendPill>{charges.length} configured</TrendPill>
              <ChargeLibraryColumnVisibility />
            </div>
          }
        />

        <div className="mt-5 space-y-4">
          <ChargeLibraryDataTable
            canManageCharges={canManageCharges}
            initialSettings={chargeLibraryTableSettings}
          />

          {charges.map((charge) => (
            <DashboardSurfaceCard as="article" key={`${charge.id}-history`}>
              <details>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{charge.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Current cost {formatCurrency(Number(charge.amount))}
                      {charge.currentEffectiveFrom
                        ? ` from ${charge.currentEffectiveFrom}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <TrendPill>
                      {charge.versions.length} dated updates
                    </TrendPill>
                    <TrendPill tone="neutral">View history</TrendPill>
                  </div>
                </summary>

                <div className="mt-5 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Charge update history
                    </p>
                    <div className="mt-4 space-y-3">
                      {charge.versions.map((version) => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between rounded-lg border border-border/70 bg-background/80 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {version.effectiveFrom}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {version.notes ?? "No note"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-foreground">
                              {formatCurrency(Number(version.amount))}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {version.status === "current"
                                ? "Current cost"
                                : version.status === "scheduled"
                                  ? "Scheduled cost"
                                  : "Historical cost"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {canManageCharges ? (
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Add dated charge update
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Schedule a live charge amount change from today or a
                        future effective date.
                      </p>
                      <div className="mt-4">
                        <OpenChargeVersionSheet
                          chargeDefinitionId={charge.id}
                          chargeKind={charge.kind}
                          chargeValueType={charge.chargeValueType}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </details>
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Applications"
          title="Recent charge applications"
          description="Track recent charge postings and quickly handle waivers or reversals for posted items."
          actions={
            <TrendPill>{chargeApplications.length} recent items</TrendPill>
          }
        />

        <div className="mt-5 space-y-3">
          {chargeApplications.map((application) => (
            <DashboardSurfaceCard as="article" key={application.id}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {application.member.fullName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application.chargeDefinition.name} ·{" "}
                    {formatCurrency(Number(application.amount))}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatChargeApplicationSource(application)} ·{" "}
                    {(
                      application.collectionMode ?? "deduct_from_savings"
                    ).replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TrendPill
                    tone={
                      application.status === "posted" ? "positive" : "warning"
                    }
                  >
                    {application.status}
                  </TrendPill>
                  {canManageCharges && application.status === "posted" ? (
                    <>
                      <OpenChargeWaiveSheet
                        chargeApplicationId={application.id}
                      />
                      <OpenChargeReverseSheet
                        chargeApplicationId={application.id}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            </DashboardSurfaceCard>
          ))}
        </div>
      </DashboardSectionCard>

      <ChargeOperationSheet
        activeCharges={activeCharges}
        devMode={quickFillEnabled}
        members={members.items}
      />
    </WorkspacePageShell>
  )
}
