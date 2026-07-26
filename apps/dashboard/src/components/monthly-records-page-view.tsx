import Link from "next/link"
import { Badge } from "@halaalvest/ui/components/badge"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import type {
  MonthlyRecordDetail,
  MonthlyRecordChargeBreakdown,
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
  WorkspaceEmptyState,
  WorkspacePageShell,
} from "@/components/dashboard"
import {
  OpenMonthlyRecordCreateSheet,
  OpenMonthlyRecordGenerateSheet,
  OpenMonthlyRecordSettingsSheet,
} from "@/components/open-monthly-record-sheet"
import { MonthlyRecordYearControl } from "@/components/monthly-record-year-control"
import { MonthlyRecordColumnVisibility } from "@/components/monthly-record-column-visibility"
import { MonthlyRecordSheet } from "@/components/sheets/monthly-record-sheet"
import { MonthlyRecordsDataTable } from "@/components/tables/monthly-records/data-table"
import type { TableSettings } from "@/utils/table-settings"

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

export function MonthlyRecordsRuntimeUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Monthly records"
      title="Monthly records"
      description="Review monthly member payments, apply received amounts, and keep contribution and loan servicing records in sync."
    >
      <WorkspaceEmptyState
        title="Monthly records need the database runtime."
        body="Once the database-backed environment is active, this route will create monthly batches and record member payments."
      />
    </WorkspacePageShell>
  )
}

export function MonthlyRecordsAccessUnavailableView() {
  return (
    <WorkspacePageShell
      eyebrow="Monthly records"
      title="Monthly records"
      description="Review monthly member payments, apply received amounts, and keep contribution and loan servicing records in sync."
    >
      <WorkspaceEmptyState
        title="You do not have access to monthly records."
        body="A finance officer, cooperative admin, or super admin role is required to manage monthly records."
      />
    </WorkspacePageShell>
  )
}

function statusVariant(status: string) {
  if (status === "applied" || status === "open") return "default"
  if (status === "cancelled" || status === "closed") return "destructive"
  return "secondary"
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

function MonthlyRecordAutomationSummary({
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
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-muted-foreground">
          Auto-generate is{" "}
          <span className="font-medium text-foreground">
            {settings.autoGenerateEnabled ? "enabled" : "disabled"}
          </span>{" "}
          for day {settings.generationDayOfMonth}.
        </div>
        <div className="flex flex-wrap gap-2">
          <OpenMonthlyRecordSettingsSheet />
          <OpenMonthlyRecordGenerateSheet />
        </div>
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
          <OpenMonthlyRecordCreateSheet
            key={`${selectedYear}-${monthNumber}`}
            month={monthNumber}
            year={selectedYear}
          >
            {content}
          </OpenMonthlyRecordCreateSheet>
        )
      })}
    </ItemGroup>
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
  monthlyRecordTableSettings,
  records,
  selectedRecord,
  selectedYear,
  settings,
}: {
  monthlyRecordTableSettings?: Partial<TableSettings>
  records: MonthlyRecordSummary[]
  selectedRecord: MonthlyRecordDetail | null
  selectedYear: number
  settings: MonthlyRecordSettingView
}) {
  return (
    <div className="flex flex-col gap-6">
      <MonthlyRecordAutomationSummary settings={settings} />

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
            <MonthlyRecordYearControl selectedYear={selectedYear} />
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
                <div className="flex items-center gap-2">
                  <TrendPill>
                    {selectedRecord.cancelledCount} cancelled
                  </TrendPill>
                  <MonthlyRecordColumnVisibility />
                </div>
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
            <MonthlyRecordsDataTable
              initialSettings={monthlyRecordTableSettings}
              monthlyRecordId={selectedRecord?.id}
            />
          </div>
        </DashboardSectionCard>
      </section>

      <MonthlyRecordSheet
        rows={selectedRecord?.rows ?? []}
        settings={settings}
      />
    </div>
  )
}
