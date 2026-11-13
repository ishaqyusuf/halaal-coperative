"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import type {
  MonthlyRecordDetail,
  MonthlyRecordSettingView,
  MonthlyRecordSummary,
} from "@halaalvest/db"
import { formatCurrency } from "@halaalvest/utils"
import { EllipsisIcon, UsersIcon } from "lucide-react"
import { useMemo } from "react"
import { MonthlyRecordColumnVisibility } from "@/components/monthly-record-column-visibility"
import { MonthlyRecordSearchFilter } from "@/components/monthly-record-search-filter"
import { MonthPicker } from "@/components/monthly-records/month-picker"
import { getWorkplaceOptions } from "@/components/monthly-records/workplace-options"
import { WorkplaceSelect } from "@/components/monthly-records/workplace-select"
import { MonthlyRecordSheet } from "@/components/sheets/monthly-record-sheet"
import { MonthlyRecordsDataView } from "@/components/tables/monthly-records/data-view"
import { useMonthlyRecordFilterParams } from "@/hooks/use-monthly-record-filter-params"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"
import type { TableSettings } from "@/utils/table-settings"

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 py-3 sm:block sm:px-5 sm:py-4 sm:first:pl-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums text-foreground sm:mt-1 sm:text-2xl">
        {value}
      </dd>
    </div>
  )
}

function MonthlyRecordStats({
  record,
  workplaceId,
}: {
  record: MonthlyRecordDetail
  workplaceId: string | null
}) {
  const stats = useMemo(() => {
    const rows = workplaceId
      ? record.rows.filter((row) => row.workplaceId === workplaceId)
      : record.rows
    const paid = rows.filter((row) => row.status === "applied")
    const unpaid = rows.filter((row) => row.status === "pending")

    return {
      paidCount: paid.length,
      received: paid.reduce((sum, row) => sum + row.totalPaidAmount, 0),
      total: rows.length,
      toReceive: unpaid.reduce((sum, row) => sum + row.totalPayableAmount, 0),
    }
  }, [record.rows, workplaceId])

  return (
    <dl className="grid grid-cols-1 divide-y divide-border border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <Stat label="Paid" value={`${stats.paidCount} of ${stats.total}`} />
      <Stat label="Received" value={formatCurrency(stats.received)} />
      <Stat label="Still to receive" value={formatCurrency(stats.toReceive)} />
    </dl>
  )
}

function MoreMenu({ canManageWorkplaces }: { canManageWorkplaces: boolean }) {
  const { setParams } = useMonthlyRecordParams()
  const open = (
    monthlyRecordSheetType: "generate" | "settings" | "workplaces"
  ) =>
    setParams({
      monthlyRecordMemberId: null,
      monthlyRecordSheetType,
      targetMonth: null,
      targetYear: null,
    })

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button aria-label="More options" size="icon" variant="outline" />
        }
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-60">
        {canManageWorkplaces ? (
          <DropdownMenuItem onClick={() => void open("workplaces")}>
            Workplaces
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => void open("settings")}>
          Monthly settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void open("generate")}>
          Start due months now
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function MonthlyRecordsWorkspace({
  canManageWorkplaces,
  monthlyRecordTableSettings,
  records,
  selectedRecord,
  selectedYear,
  settings,
}: {
  canManageWorkplaces: boolean
  monthlyRecordTableSettings?: Partial<TableSettings>
  records: MonthlyRecordSummary[]
  selectedRecord: MonthlyRecordDetail | null
  selectedYear: number
  settings: MonthlyRecordSettingView
}) {
  const { filter, setFilter } = useMonthlyRecordFilterParams()
  const { setParams } = useMonthlyRecordParams()
  const rows = selectedRecord?.rows ?? []
  const workplaces = useMemo(() => getWorkplaceOptions(rows), [rows])
  // With no record selected, the empty state offers to start this month.
  const today = new Date()
  const createTarget = selectedRecord
    ? { month: selectedRecord.periodMonth, year: selectedRecord.periodYear }
    : selectedYear === today.getUTCFullYear()
      ? { month: today.getUTCMonth() + 1, year: selectedYear }
      : undefined

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:max-w-3xl">
          <MonthPicker records={records} selectedRecordId={selectedRecord?.id} />
          {workplaces.length > 0 ? (
            <WorkplaceSelect
              allLabel="All workplaces"
              onChange={(value) => void setFilter({ workplaceId: value })}
              options={workplaces}
              value={filter.workplaceId}
            />
          ) : null}
        </div>
        <div className="flex gap-3">
          {selectedRecord && workplaces.length > 0 ? (
            <Button
              className="flex-1 lg:flex-none"
              onClick={() =>
                void setParams({
                  monthlyRecordMemberId: null,
                  monthlyRecordSheetType: "receive",
                  targetMonth: null,
                  targetYear: null,
                })
              }
              type="button"
            >
              <UsersIcon data-icon="inline-start" />
              Receive from workplace
            </Button>
          ) : null}
          <MoreMenu canManageWorkplaces={canManageWorkplaces} />
        </div>
      </section>

      {selectedRecord ? (
        <MonthlyRecordStats
          record={selectedRecord}
          workplaceId={filter.workplaceId}
        />
      ) : null}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <MonthlyRecordSearchFilter />
          <div className="hidden md:block">
            <MonthlyRecordColumnVisibility />
          </div>
        </div>
        <MonthlyRecordsDataView
          initialSettings={monthlyRecordTableSettings}
          month={createTarget?.month}
          monthlyRecordId={selectedRecord?.id}
          periodLabel={selectedRecord?.periodLabel}
          year={createTarget?.year}
        />
      </section>

      <MonthlyRecordSheet
        monthlyRecordId={selectedRecord?.id}
        periodLabel={selectedRecord?.periodLabel}
        rows={rows}
        settings={settings}
      />
    </div>
  )
}
