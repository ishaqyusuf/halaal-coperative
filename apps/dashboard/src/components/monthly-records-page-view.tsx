import Link from "next/link"
import { Badge } from "@halaalvest/ui/components/badge"
import { Button } from "@halaalvest/ui/components/button"
import { Input } from "@halaalvest/ui/components/input"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import {
  NativeSelect,
  NativeSelectOption,
} from "@halaalvest/ui/components/native-select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@halaalvest/ui/components/table"
import type {
  MonthlyRecordDetail,
  MonthlyRecordChargeBreakdown,
  MonthlyRecordMemberRow,
  MonthlyRecordSettingView,
  MonthlyRecordSummary,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import {
  DashboardSectionCard,
  DashboardSectionHeader,
  DashboardStatCard,
  DashboardSurfaceCard,
  TrendPill,
} from "@/components/dashboard"
import {
  applyMonthlyRecordMemberAction,
  cancelMonthlyRecordMemberAction,
  createMonthlyRecordAction,
  generateMonthlyRecordsNowAction,
  updateMonthlyRecordSettingsAction,
} from "@/lib/dashboard-actions"

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

function statusVariant(status: string) {
  if (status === "applied" || status === "open") return "default"
  if (status === "cancelled" || status === "closed") return "destructive"
  return "secondary"
}

function loanStatusLabel(status: string) {
  return status === "none" ? "No loan" : status.replace(/_/g, " ")
}

function monthlyRecordMemberStatusLabel(status: string) {
  return status === "pending" ? "staged" : status
}

function AmountWithCalculatedDifference({
  actual,
  calculated,
  hasDifference,
}: {
  actual: number
  calculated: number
  hasDifference: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span>{formatCurrency(actual)}</span>
      {hasDifference ? (
        <span className="text-muted-foreground line-through">
          {formatCurrency(calculated)}
        </span>
      ) : null}
    </span>
  )
}

function YearSelectForm({ selectedYear }: { selectedYear: number }) {
  const currentYear = new Date().getUTCFullYear()
  const startYear = Math.min(selectedYear, currentYear) - 3
  const years = Array.from({ length: 8 }, (_, index) => startYear + index)

  return (
    <form className="flex w-full items-center gap-2">
      <NativeSelect
        name="year"
        defaultValue={String(selectedYear)}
        className="w-full"
      >
        {years.map((year) => (
          <NativeSelectOption key={year} value={String(year)}>
            {year}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <Button type="submit" size="sm" variant="outline">
        View
      </Button>
    </form>
  )
}

function MonthlyRecordSettingsForm({
  settings,
}: {
  settings: MonthlyRecordSettingView
}) {
  return (
    <DashboardSectionCard>
      <DashboardSectionHeader
        eyebrow="Automation"
        title="Monthly record generation"
        description="Choose when this workspace should create the month’s pending commitment roll."
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <form
          action={updateMonthlyRecordSettingsAction}
          className="grid gap-3 sm:grid-cols-[auto_minmax(10rem,14rem)_auto] sm:items-end"
        >
          <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <input
              className="size-4"
              defaultChecked={settings.autoGenerateEnabled}
              name="autoGenerateEnabled"
              type="checkbox"
            />
            Auto-generate
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            Day of month
            <Input
              defaultValue={settings.generationDayOfMonth}
              max={28}
              min={1}
              name="generationDayOfMonth"
              type="number"
            />
          </label>
          <Button size="sm" type="submit">
            Save settings
          </Button>
        </form>
        <form action={generateMonthlyRecordsNowAction}>
          <Button size="sm" type="submit" variant="outline">
            Generate due records now
          </Button>
        </form>
      </div>
    </DashboardSectionCard>
  )
}

function MonthlyRecordSideList({
  records,
  selectedRecord,
  selectedYear,
}: {
  records: MonthlyRecordSummary[]
  selectedRecord: MonthlyRecordDetail | null
  selectedYear: number
}) {
  const recordsByMonth = new Map(
    records
      .filter((record) => record.periodYear === selectedYear)
      .map((record) => [record.periodMonth, record])
  )
  const today = new Date()
  const currentYear = today.getUTCFullYear()
  const currentMonth = today.getUTCMonth() + 1

  return (
    <ItemGroup data-size="sm" className="gap-2">
      {months.map((month, index) => {
        const monthNumber = index + 1
        const record = recordsByMonth.get(monthNumber)
        const isSelected = record?.id === selectedRecord?.id
        const isFutureMonth =
          selectedYear > currentYear ||
          (selectedYear === currentYear && monthNumber > currentMonth)
        const countLabel = isFutureMonth
          ? "Future month"
          : record
            ? `${record.recordedCount} recorded of ${record.totalMembers}`
            : "No record yet"
        const amountLabel = isFutureMonth
          ? "Available when the month starts"
          : record
            ? `${formatCurrency(record.totalReceivedAmount)} received`
            : "Click to create this month"
        const content = (
          <Item
            aria-disabled={isFutureMonth}
            variant={isSelected ? "outline" : "muted"}
            className={[
              isSelected ? "bg-background" : undefined,
              isFutureMonth ? "cursor-not-allowed opacity-50" : undefined,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <ItemContent>
              <ItemTitle>
                {month} {selectedYear}
              </ItemTitle>
              <ItemDescription>{countLabel}</ItemDescription>
              <ItemDescription>{amountLabel}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Badge
                variant={record ? statusVariant(record.status) : "secondary"}
              >
                {isFutureMonth ? "future" : (record?.status ?? "new")}
              </Badge>
            </ItemActions>
          </Item>
        )

        if (isFutureMonth) {
          return <div key={`${selectedYear}-${monthNumber}`}>{content}</div>
        }

        return record ? (
          <Link key={record.id} href={`/monthly-records?recordId=${record.id}`}>
            {content}
          </Link>
        ) : (
          <form
            key={`${selectedYear}-${monthNumber}`}
            action={createMonthlyRecordAction}
          >
            <input type="hidden" name="year" value={selectedYear} />
            <input type="hidden" name="month" value={monthNumber} />
            <button type="submit" className="block w-full text-left">
              {content}
            </button>
          </form>
        )
      })}
    </ItemGroup>
  )
}

function MonthlyRecordMembersTable({
  rows,
}: {
  rows: MonthlyRecordMemberRow[]
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No members were found for this monthly record.
      </p>
    )
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border/70">
      <Table className="min-w-[1360px]">
        <TableHeader>
          <TableRow>
            <TableHead>Member ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Current balance</TableHead>
            <TableHead>Loan status</TableHead>
            <TableHead>Savings due</TableHead>
            <TableHead>Share charge</TableHead>
            <TableHead>Loan due</TableHead>
            <TableHead>Total payable</TableHead>
            <TableHead>Total paid</TableHead>
            <TableHead>All charges</TableHead>
            <TableHead>Final income</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const formId = `apply-monthly-record-${row.id}`
            const canApply = row.status !== "applied"
            const canEditPaidAmount = row.status !== "applied"
            const canCancel = row.status !== "cancelled"

            return (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {row.memberNumber}
                </TableCell>
                <TableCell>{row.memberName}</TableCell>
                <TableCell>{formatCurrency(row.currentBalance)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.loanStatus === "none" ? "secondary" : "outline"
                    }
                  >
                    {loanStatusLabel(row.loanStatus)}
                  </Badge>
                </TableCell>
                <TableCell>{formatCurrency(row.contributionAmount)}</TableCell>
                <TableCell>{formatCurrency(row.shareChargeAmount)}</TableCell>
                <TableCell>{formatCurrency(row.loanRepaymentAmount)}</TableCell>
                <TableCell>{formatCurrency(row.totalPayableAmount)}</TableCell>
                <TableCell>
                  <Input
                    aria-label={`Total paid for ${row.memberName}`}
                    defaultValue={row.totalPaidAmount.toFixed(2)}
                    disabled={!canEditPaidAmount}
                    form={formId}
                    min="0"
                    name="totalPaidAmount"
                    step="0.01"
                    type="number"
                    className="w-32"
                  />
                </TableCell>
                <TableCell>
                  <AmountWithCalculatedDifference
                    actual={row.allChargesAmount}
                    calculated={row.calculatedChargesAmount}
                    hasDifference={row.hasChargeDifference}
                  />
                </TableCell>
                <TableCell>
                  <AmountWithCalculatedDifference
                    actual={row.finalIncomeAmount}
                    calculated={row.calculatedFinalIncomeAmount}
                    hasDifference={row.hasFinalIncomeDifference}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant(row.status)}>
                    {monthlyRecordMemberStatusLabel(row.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <form id={formId} action={applyMonthlyRecordMemberAction}>
                      <input
                        name="monthlyRecordMemberId"
                        type="hidden"
                        value={row.id}
                      />
                      <Button type="submit" size="sm" disabled={!canApply}>
                        Apply
                      </Button>
                    </form>
                    <form action={cancelMonthlyRecordMemberAction}>
                      <input
                        name="monthlyRecordMemberId"
                        type="hidden"
                        value={row.id}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        disabled={!canCancel}
                      >
                        Cancel
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function ChargeBreakdown({
  charges,
  totalChargeAmount,
}: {
  charges: MonthlyRecordChargeBreakdown[]
  totalChargeAmount: number
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {charges.length ? (
        charges.map((charge) => (
          <DashboardSurfaceCard key={charge.id} className="rounded-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{charge.name}</p>
                <p className="text-xs text-muted-foreground">{charge.code}</p>
              </div>
              <Badge variant="outline">{charge.kind}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Per member</p>
                <p className="font-medium text-foreground">
                  {charge.kind === "percentage"
                    ? `${charge.amount}%`
                    : formatCurrency(charge.amount)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="font-medium text-foreground">
                  <AmountWithCalculatedDifference
                    actual={charge.appliedTotalAmount}
                    calculated={charge.totalAmount}
                    hasDifference={charge.hasDifference}
                  />
                </p>
              </div>
            </div>
          </DashboardSurfaceCard>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          No active member charges are configured for this period.
        </p>
      )}
      {charges.length ? (
        <DashboardSurfaceCard className="rounded-lg">
          <p className="text-xs text-muted-foreground">Total charges</p>
          <p className="mt-1 text-xl font-semibold text-foreground">
            {formatCurrency(totalChargeAmount)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Applied across all members in this monthly record.
          </p>
        </DashboardSurfaceCard>
      ) : null}
    </div>
  )
}

export function MonthlyRecordsPageView({
  records,
  selectedRecord,
  selectedYear,
  settings,
}: {
  records: MonthlyRecordSummary[]
  selectedRecord: MonthlyRecordDetail | null
  selectedYear: number
  settings: MonthlyRecordSettingView
}) {
  return (
    <div className="flex flex-col gap-6">
      <MonthlyRecordSettingsForm settings={settings} />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          detail="Members applied in the selected month."
          label="Recorded"
          value={`${selectedRecord?.recordedCount ?? 0}/${selectedRecord?.totalMembers ?? 0}`}
        />
        <DashboardStatCard
          detail="Total received from applied member rows."
          label="Total received"
          value={formatCurrency(selectedRecord?.totalReceivedAmount ?? 0)}
        />
        <DashboardStatCard
          detail="Calculated payable amount for the selected month."
          label="Total payable"
          value={formatCurrency(selectedRecord?.totalPayableAmount ?? 0)}
        />
        <DashboardStatCard
          detail="Rows still staged for apply or cancel action."
          label="Staged"
          tone={(selectedRecord?.pendingCount ?? 0) > 0 ? "warning" : "default"}
          value={(selectedRecord?.pendingCount ?? 0).toString()}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <DashboardSectionCard className="xl:sticky xl:top-4 xl:self-start">
          <DashboardSectionHeader
            eyebrow="Months"
            title="Month list"
            actions={<TrendPill>{selectedYear}</TrendPill>}
          />
          <div className="mt-5 flex flex-col gap-4">
            <YearSelectForm selectedYear={selectedYear} />
            <div className="max-h-[36rem] overflow-y-auto pr-1">
              <MonthlyRecordSideList
                records={records}
                selectedRecord={selectedRecord}
                selectedYear={selectedYear}
              />
            </div>
          </div>
        </DashboardSectionCard>

        <DashboardSectionCard>
          <DashboardSectionHeader
            eyebrow="Members"
            title={selectedRecord?.periodLabel ?? "No monthly record"}
            description="Edit the total paid amount before applying a staged member row. Cancel is available while the row is still staged."
            actions={
              selectedRecord ? (
                <TrendPill>{selectedRecord.cancelledCount} cancelled</TrendPill>
              ) : undefined
            }
          />
          <div className="mt-5">
            <div className="mb-5">
              <ChargeBreakdown
                charges={selectedRecord?.chargeBreakdown ?? []}
                totalChargeAmount={selectedRecord?.totalChargeAmount ?? 0}
              />
            </div>
            <MonthlyRecordMembersTable rows={selectedRecord?.rows ?? []} />
          </div>
        </DashboardSectionCard>
      </section>
    </div>
  )
}
