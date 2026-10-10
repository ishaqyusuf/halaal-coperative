import { formatCurrency } from "@halaalvest/utils"
import { Suspense, type ReactNode } from "react"
import {
  TrendPill,
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import { ChargeViewTabs, type ChargeView } from "@/components/charge-view-tabs"
import { ChargeLibraryColumnVisibility } from "@/components/charge-library-column-visibility"
import {
  OpenChargeApplicationSheet,
  OpenChargeDefinitionSheet,
} from "@/components/open-charge-operation-sheet"
import { ChargeApplicationActionsMenu } from "@/components/charge-application-actions-menu"
import { ChargeOperationSheet } from "@/components/sheets/charge-operation-sheet"
import { ChargeLibraryDataView } from "@/components/tables/charge-library/data-view"
import { ChargeLibraryDataErrorBoundary } from "@/components/tables/charge-library/error-boundary"
import { ChargeLibrarySkeleton } from "@/components/tables/charge-library/skeleton"
import { ChargeLibraryMobileToolbar } from "@/components/charge-library-mobile-toolbar"
import { ChargeSearchFilter } from "@/components/charge-search-filter"
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
  activeView,
  activeChargeCount,
  activeCharges,
  canManageCharges,
  chargeApplications,
  chargeLibraryTableSettings,
  members,
  monthlyLevies,
  postedApplications,
  quickFillEnabled,
  totalChargeDefinitions,
}: {
  activeView: ChargeView
  activeChargeCount: number
  activeCharges: Array<{
    amount: number
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
  members: {
    items: Array<{ fullName: string; id: string; memberNumber: string }>
  }
  monthlyLevies: Array<unknown>
  postedApplications: Array<unknown>
  quickFillEnabled: boolean
  totalChargeDefinitions: number
}) {
  return (
    <WorkspacePageShell
      eyebrow="Charges"
      title="Charges"
      description="Configure charge rules, post eligible charges to members, and review recent applications."
    >
      <section className="hidden divide-x divide-border border-y border-border md:grid md:grid-cols-4">
        <SummaryTile label="Definitions" value={totalChargeDefinitions} />
        <SummaryTile label="Active charges" value={activeChargeCount} />
        <SummaryTile label="Monthly levies" value={monthlyLevies.length} />
        <SummaryTile label="Recent posted" value={postedApplications.length} />
      </section>

      <ChargeViewTabs activeView={activeView} />

      <div
        aria-labelledby={`charges-${activeView}-tab`}
        id="charges-active-view"
        role="tabpanel"
      >
        {activeView === "definitions" ? (
          <section>
            <ChargeSectionHeader
              action={canManageCharges ? <OpenChargeDefinitionSheet /> : null}
              count={`${totalChargeDefinitions} configured`}
              description="Every configured charge, its current dated amount, posting kind, and update history."
              desktopOnlyAction
              eyebrow="Definitions"
              title="Charge library"
            />
            <div className="space-y-4 pt-4">
              <div className="hidden items-center justify-between gap-4 md:flex">
                <ChargeSearchFilter />
                <ChargeLibraryColumnVisibility />
              </div>
              <ChargeLibraryMobileToolbar canManageCharges={canManageCharges} />
              <ChargeLibraryDataErrorBoundary>
                <Suspense fallback={<ChargeLibrarySkeleton />}>
                  <ChargeLibraryDataView
                    canManageCharges={canManageCharges}
                    initialSettings={chargeLibraryTableSettings}
                  />
                </Suspense>
              </ChargeLibraryDataErrorBoundary>
            </div>
          </section>
        ) : (
          <section>
            <ChargeSectionHeader
              action={canManageCharges ? <OpenChargeApplicationSheet /> : null}
              count={`${chargeApplications.length} recent items`}
              description="Track recent member postings and open correction actions from one activity list."
              eyebrow="Applications"
              title="Recent charge applications"
            />
            <div className="divide-y divide-border border-y border-border">
              {chargeApplications.map((application) => (
                <article className="py-4" key={application.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <TrendPill
                        tone={
                          application.status === "posted"
                            ? "positive"
                            : "warning"
                        }
                      >
                        {application.status}
                      </TrendPill>
                      {canManageCharges && application.status === "posted" ? (
                        <ChargeApplicationActionsMenu
                          applicationId={application.id}
                          memberName={application.member.fullName}
                        />
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
              {!chargeApplications.length ? (
                <div className="flex min-h-56 items-center justify-center px-4 py-10 text-center">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      No charge applications yet
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Posted member charges will appear here for review and
                      correction.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        )}
      </div>

      <ChargeOperationSheet
        activeCharges={activeCharges}
        devMode={quickFillEnabled}
        members={members.items}
      />
    </WorkspacePageShell>
  )
}

function ChargeSectionHeader({
  action,
  count,
  description,
  desktopOnlyAction = false,
  eyebrow,
  title,
}: {
  action: ReactNode
  count: string
  description: string
  desktopOnlyAction?: boolean
  eyebrow: string
  title: string
}) {
  return (
    <div className="flex flex-col gap-4 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-base font-semibold text-foreground">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <TrendPill>{count}</TrendPill>
        <div className={desktopOnlyAction ? "hidden md:block" : undefined}>
          {action}
        </div>
      </div>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}
