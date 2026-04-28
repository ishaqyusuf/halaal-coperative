import { Button } from "@halaal-vest/ui/components/button"
import { formatCurrency } from "@halaal-vest/utils"
import {
  DashboardDataTable,
  DashboardTable,
  DashboardTableBody,
  DashboardTableCell,
  DashboardTableHead,
  DashboardTableHeaderCell,
  DashboardTableRow,
} from "@/components/tables/core"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
  WorkspacePageShell,
} from "@/components/dashboard"

type MemberAmountLogRow = {
  id: string
  effectiveFrom: string
  amount: number
  notes?: string | null
}

type MemberShareOverrideRow = {
  id: string
  effectiveFrom: string
  amount: number
  notes?: string | null
}

type BackfillActivityRow = {
  id: string
  activityType: string
  activityDate: string
  amount: number
  notes?: string | null
}

type BackfillMonthRow = {
  id: string
  label: string
  amount: number
  charge: number
  loanCollected: number
  loanServiceAmount: number
  monthlyTopup: number
  pendingLoanPayment: number
  share: number
  totalShare: number
  total: number
  isEdited?: boolean
  activities: BackfillActivityRow[]
}

export function BackfillWorkspacePageView({
  amountLogs,
  memberName,
  memberNumber,
  monthRows,
  shareOverrides,
}: {
  amountLogs: MemberAmountLogRow[]
  memberName: string
  memberNumber: string
  monthRows: BackfillMonthRow[]
  shareOverrides: MemberShareOverrideRow[]
}) {
  const totalAmount = monthRows.reduce((sum, row) => sum + row.amount, 0)
  const totalCharge = monthRows.reduce((sum, row) => sum + row.charge, 0)
  const totalShare = monthRows.reduce((sum, row) => sum + row.share, 0)
  const totalLoanCollected = monthRows.reduce((sum, row) => sum + row.loanCollected, 0)

  return (
    <WorkspacePageShell
      eyebrow="Finance"
      title="Member backfill workspace"
      description="Generate, review, and edit monthly historical finance rows before applying them to the live ledger flows."
    >
      <section className="grid gap-4 xl:grid-cols-4">
        <DashboardStatCard
          label="Member"
          value={memberName}
          detail={memberNumber}
        />
        <DashboardStatCard
          label="Amount history"
          value={amountLogs.length.toString()}
          detail="Dated member remittance defaults used during generation."
        />
        <DashboardStatCard
          label="Share overrides"
          value={shareOverrides.length.toString()}
          detail="Member-specific share replacements over time."
        />
        <DashboardStatCard
          label="Months generated"
          value={monthRows.length.toString()}
          detail="Editable row count in the current draft backfill batch."
          tone="positive"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Member defaults"
            title="Amount history"
            description="The latest row effective for a month becomes the default amount during backfill generation."
            actions={<Button className="rounded-full">Add amount update</Button>}
          />
          <div className="mt-5 space-y-3">
            {amountLogs.map((log) => (
              <DashboardSurfaceCard key={log.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{log.effectiveFrom}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{log.notes ?? "No note"}</p>
                  </div>
                  <p className="font-medium text-foreground">{formatCurrency(log.amount)}</p>
                </div>
              </DashboardSurfaceCard>
            ))}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Member defaults"
            title="Share override history"
            description="When present, member-specific share values override the cooperative default for matching months."
            actions={<Button variant="outline" className="rounded-full">Add share override</Button>}
          />
          <div className="mt-5 space-y-3">
            {shareOverrides.length ? (
              shareOverrides.map((override) => (
                <DashboardSurfaceCard key={override.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{override.effectiveFrom}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{override.notes ?? "No note"}</p>
                    </div>
                    <p className="font-medium text-foreground">{formatCurrency(override.amount)}</p>
                  </div>
                </DashboardSurfaceCard>
              ))
            ) : (
              <DashboardSurfaceCard>
                <p className="text-sm text-muted-foreground">
                  No member override has been recorded yet. This member currently uses the cooperative-wide default share structure.
                </p>
              </DashboardSurfaceCard>
            )}
          </div>
        </DashboardSectionCard>
      </section>

      <DashboardSectionCard>
        <DashboardSectionHeader
          eyebrow="Backfill"
          title="Generated monthly rows"
          description="Each row starts from member amount, share, charge, and loan history defaults, then remains editable before apply."
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-full">Generate backfill</Button>
              <Button variant="outline" className="rounded-full">Save draft</Button>
              <Button className="rounded-full">Apply backfill</Button>
            </div>
          }
        />
        <div className="mt-5">
          <DashboardDataTable>
            <DashboardTable>
              <DashboardTableHead>
                <DashboardTableHeaderCell>Month</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Amount</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Charge</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Loan collected</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Loan service</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Topup</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Pending loan</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Share</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Total share</DashboardTableHeaderCell>
                <DashboardTableHeaderCell align="right">Total</DashboardTableHeaderCell>
              </DashboardTableHead>
              <DashboardTableBody>
                {monthRows.map((row) => (
                  <DashboardTableRow key={row.id}>
                    <DashboardTableCell>
                      <div>
                        <p className="font-medium text-foreground">{row.label}</p>
                        {row.isEdited ? (
                          <p className="mt-1 text-xs text-amber-700">Manually edited</p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">Generated from history</p>
                        )}
                      </div>
                    </DashboardTableCell>
                    <DashboardTableCell align="right">{formatCurrency(row.amount)}</DashboardTableCell>
                    <DashboardTableCell align="right">{formatCurrency(row.charge)}</DashboardTableCell>
                    <DashboardTableCell align="right">{formatCurrency(row.loanCollected)}</DashboardTableCell>
                    <DashboardTableCell align="right">{formatCurrency(row.loanServiceAmount)}</DashboardTableCell>
                    <DashboardTableCell align="right">{formatCurrency(row.monthlyTopup)}</DashboardTableCell>
                    <DashboardTableCell align="right">{formatCurrency(row.pendingLoanPayment)}</DashboardTableCell>
                    <DashboardTableCell align="right">{formatCurrency(row.share)}</DashboardTableCell>
                    <DashboardTableCell align="right">{formatCurrency(row.totalShare)}</DashboardTableCell>
                    <DashboardTableCell align="right" className="font-medium">{formatCurrency(row.total)}</DashboardTableCell>
                  </DashboardTableRow>
                ))}
              </DashboardTableBody>
            </DashboardTable>
          </DashboardDataTable>
        </div>
      </DashboardSectionCard>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Activities"
            title="Monthly activity detail"
            description="Expanded activities support loan taken, profit dividend, extra charges, extra share, and manual adjustments per month."
          />
          <div className="mt-5 space-y-3">
            {monthRows
              .filter((row) => row.activities.length > 0)
              .map((row) => (
                <DashboardSurfaceCard key={`${row.id}-activities`}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground">{row.label}</p>
                    <Button variant="outline" className="rounded-full">
                      Add activity
                    </Button>
                  </div>
                  <div className="mt-4 space-y-2">
                    {row.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium capitalize text-foreground">
                            {activity.activityType.replace(/_/g, " ")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {activity.activityDate} · {activity.notes ?? "No note"}
                          </p>
                        </div>
                        <p className="font-medium text-foreground">{formatCurrency(activity.amount)}</p>
                      </div>
                    ))}
                  </div>
                </DashboardSurfaceCard>
              ))}
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Review"
            title="Draft review and apply"
            description="Use the final review state to confirm totals, highlight warnings, and gate the apply step."
          />
          <div className="mt-5 space-y-3">
            <DashboardSurfaceCard>
              <p className="text-sm text-muted-foreground">Total amount remitted</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(totalAmount)}</p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="text-sm text-muted-foreground">Total charge</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(totalCharge)}</p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="text-sm text-muted-foreground">Total share posted</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(totalShare)}</p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <p className="text-sm text-muted-foreground">Loan collected</p>
              <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(totalLoanCollected)}</p>
            </DashboardSurfaceCard>
            <DashboardSurfaceCard>
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-foreground">Warnings</p>
                <TrendPill tone="warning">2 checks</TrendPill>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>April 2025 loan collected is below the scheduled service amount.</li>
                <li>January 2024 was generated from the earliest known member amount log.</li>
              </ul>
            </DashboardSurfaceCard>
          </div>
        </DashboardSectionCard>
      </section>
    </WorkspacePageShell>
  )
}
