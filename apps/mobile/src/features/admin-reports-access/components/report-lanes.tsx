import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { Icon } from "@/components/ui/icon"
import { RecordRow, type RowPosition } from "@/components/ui/list-card"
import { SectionHeader } from "@/components/ui/section-header"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useAppInfiniteQuery } from "@/hooks/use-app-query"
import { formatCompactMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ActivityIndicator, View } from "react-native"
import { getAdminReportActivity } from "../api/admin-reports-access-api"
import type {
  AdminActivityEvent,
  AdminReportActivityFilters,
  AdminReportActivityPage,
  AdminReportCard,
} from "../model/admin-reports-access-types"
import type { GeneratedReportFile } from "../model/generated-report-file"
import {
  ACTION_CHIPS,
  actionTone,
  activeFilterCount,
  activityRows,
  actorRole,
  FILE_LOOK,
  fileSubtitle,
  groupReports,
  recordLine,
  reportLook,
  timeLabel,
  type ActivityListRow,
  type TileTone,
} from "../model/report-presentation"
import { reportKeys, useNow, usePullRefresh } from "../model/report-queries"

const TILE: Record<TileTone, [string, string]> = {
  brand: ["bg-accent", "text-accent-foreground"],
  danger: ["bg-tint-danger", "text-tint-danger-foreground"],
  lilac: ["bg-tint-lilac", "text-tint-lilac-foreground"],
  neutral: ["bg-surface-raised", "text-foreground-soft"],
  rose: ["bg-tint-vivid", "text-tint-vivid-foreground"],
  sky: ["bg-tint-sky", "text-tint-sky-foreground"],
  success: ["bg-tint-success", "text-tint-success-foreground"],
  warm: ["bg-tint-warm", "text-tint-warm-foreground"],
}

/** 44pt tinted icon tile (02 Brand native). */
export function ReportTile({ icon, tone }: { icon: string; tone: TileTone }) {
  const [surface, text] = TILE[tone]
  return (
    <View className={cn("size-[44px] items-center justify-center rounded-[14px]", surface)}>
      <Icon className={cn("size-[20px]", text)} name={icon} />
    </View>
  )
}

const DOT: Record<TileTone, string> = {
  brand: "bg-primary",
  danger: "bg-destructive",
  lilac: "bg-tint-lilac-foreground",
  neutral: "bg-muted-foreground",
  rose: "bg-tint-vivid-foreground",
  sky: "bg-tint-sky-foreground",
  success: "bg-tint-success-foreground",
  warm: "bg-tint-warm-foreground",
}

export function reportMetric(report: AdminReportCard, currencyCode: string) {
  if (report.metricFormat === "currency")
    return formatCompactMoney(report.metricValue, currencyCode)
  if (report.metricFormat === "percent") return `${Math.round(report.metricValue * 100)}%`
  return report.metricValue.toLocaleString("en-NG")
}

function positionOf(index: number, count: number): RowPosition {
  if (count === 1) return "only"
  if (index === 0) return "first"
  return index === count - 1 ? "last" : "middle"
}

type ReportsRow =
  | { key: string; kind: "header"; title: string; value?: string }
  | { key: string; kind: "note" }
  | { file: GeneratedReportFile; key: string; kind: "file"; position: RowPosition }
  | { key: string; kind: "report"; position: RowPosition; report: AdminReportCard }

function FileRow({
  file,
  now,
  onPress,
  position,
}: {
  file: GeneratedReportFile
  now: number
  onPress: () => void
  position: RowPosition
}) {
  const look = FILE_LOOK[file.status]
  return (
    <RecordRow
      accessibilityLabel={`${file.reportTitle}, ${look.label}, ${fileSubtitle(file, now)}`}
      leading={<ReportTile icon={look.icon} tone={look.tone} />}
      meta={fileSubtitle(file, now)}
      onPress={onPress}
      position={position}
      testID={`report-file-${file.status}`}
      title={file.reportTitle}
      trailing={
        file.status === "pending" ? (
          <ActivityIndicator accessibilityLabel="Generating" />
        ) : (
          <StatusPill label={look.label} tone={look.pill} />
        )
      }
    />
  )
}

function ReportRow({
  currencyCode,
  onPress,
  position,
  report,
}: {
  currencyCode: string
  onPress: () => void
  position: RowPosition
  report: AdminReportCard
}) {
  const look = reportLook(report.key)
  if (!report.available)
    return (
      <RecordRow
        leading={<ReportTile icon={look.icon} tone="neutral" />}
        position={position}
        title={report.title}
        trailing={<StatusPill label="Not available" tone="neutral" />}
      />
    )
  const metric = reportMetric(report, currencyCode)
  return (
    <RecordRow
      accessibilityLabel={`${report.title}. ${report.metricLabel} ${metric}. Generate report`}
      chevron
      leading={<ReportTile icon={look.icon} tone={look.tone} />}
      meta={report.detail}
      onPress={onPress}
      position={position}
      testID={`report-${report.key}`}
      title={report.title}
      trailing={
        <View className="items-end">
          <Text numberOfLines={1} variant="money">
            {metric}
          </Text>
          <Text className="text-muted-foreground" numberOfLines={1} variant="caption">
            {report.metricLabel}
          </Text>
        </View>
      }
    />
  )
}

/** T23 screen 1 (01 Quiet list): generated files, then reports by category. */
export function ReportsLane({
  active,
  currencyCode,
  error,
  files,
  isLoading,
  onOpenFile,
  onOpenReport,
  onRefresh,
  onRetry,
  reports,
}: {
  active: boolean
  currencyCode: string
  error: string | null
  files: GeneratedReportFile[]
  isLoading: boolean
  onOpenFile: (file: GeneratedReportFile) => void
  onOpenReport: (report: AdminReportCard) => void
  onRefresh?: () => Promise<unknown>
  onRetry: () => void
  reports: AdminReportCard[] | null
}) {
  const ticking = active && files.some((file) => file.status === "ready")
  const now = useNow(ticking)
  const pull = usePullRefresh(onRefresh ?? (() => Promise.resolve()))
  const rows = useMemo(() => {
    if (!reports) return []
    const out: ReportsRow[] = []
    if (files.length) {
      out.push({ key: "files", kind: "header", title: "Generated files", value: String(files.length) })
      files.forEach((file, index) =>
        out.push({ file, key: `file-${file.id}`, kind: "file", position: positionOf(index, files.length) })
      )
      out.push({ key: "files-note", kind: "note" })
    }
    for (const group of groupReports(reports)) {
      out.push({ key: `group-${group.category}`, kind: "header", title: group.label, value: String(group.reports.length) })
      group.reports.forEach((report, index) =>
        out.push({ key: `report-${report.key}`, kind: "report", position: positionOf(index, group.reports.length), report })
      )
    }
    return out
  }, [files, reports])

  return (
    <AppList
      active={active}
      back={false}
      data={rows}
      embedded
      // The list keeps its anchor when rows are inserted above it, which hid
      // the first generated file off the top (T23 QA): start over instead.
      key={files.length ? "with-files" : "no-files"}
      empty={
        <EmptyState
          description="Reports appear here once your cooperative has records."
          icon="FileText"
          title="No reports yet"
        />
      }
      error={error}
      errorTitle="Reports didn’t load"
      estimatedItemSize={72}
      extraData={`${currencyCode}-${now}`}
      isLoading={isLoading}
      keyExtractor={(row) => row.key}
      onRefresh={active && onRefresh ? pull.onRefresh : undefined}
      onRetry={onRetry}
      refreshing={active && pull.refreshing}
      renderItem={({ item }) => {
        if (item.kind === "header")
          return (
            <View className="px-[18px] pt-[8px]">
              <SectionHeader title={item.title} value={item.value} />
            </View>
          )
        if (item.kind === "note")
          return (
            <View className="flex-row items-center gap-[6px] px-[22px] pt-[8px]">
              <Icon className="size-[14px] text-muted-foreground" name="Lock" />
              <Text className="flex-1 text-muted-foreground" variant="caption">
                Files stay private on this phone for 15 minutes.
              </Text>
            </View>
          )
        if (item.kind === "file")
          return (
            <FileRow file={item.file} now={now} onPress={() => onOpenFile(item.file)} position={item.position} />
          )
        return (
          <ReportRow
            currencyCode={currencyCode}
            onPress={() => onOpenReport(item.report)}
            position={item.position}
            report={item.report}
          />
        )
      }}
      testID="admin-reports-lane"
    />
  )
}

function ActivityRow({
  event,
  onPress,
  position,
}: {
  event: AdminActivityEvent
  onPress: () => void
  position: RowPosition
}) {
  return (
    <RecordRow
      accessibilityLabel={`${event.actionLabel}, ${event.actorLabel}, ${recordLine(event)}, ${timeLabel(event.occurredAt)}`}
      compact
      leading={
        <View className="w-[14px] items-center self-start pt-[7px]">
          <View className={cn("size-[8px] rounded-full", DOT[actionTone(event.action)])} />
        </View>
      }
      meta={`${event.actorLabel} · ${actorRole(event)}`}
      onPress={onPress}
      position={position}
      supporting={
        <Text className="text-muted-foreground" numberOfLines={1} variant="small">
          {recordLine(event)}
        </Text>
      }
      title={event.actionLabel}
      trailing={
        <Text className="text-muted-foreground" variant="caption">
          {timeLabel(event.occurredAt)}
        </Text>
      }
    />
  )
}

/**
 * T23 screen 4 (01 Quiet list): action chips, day groups, paging on scroll
 * and the floating search pill. Each filter set is its own cached page set,
 * so changing a filter reads activity only.
 */
export function ActivityLane({
  active,
  enabled,
  filters,
  offline,
  onChangeFilters,
  onOpenEvent,
}: {
  active: boolean
  enabled: boolean
  filters: AdminReportActivityFilters
  offline: boolean
  onChangeFilters: (filters: AdminReportActivityFilters) => void
  onOpenEvent: (event: AdminActivityEvent) => void
}) {
  const [draft, setDraft] = useState(filters.search ?? "")
  useEffect(() => setDraft(filters.search ?? ""), [filters.search])
  useEffect(() => {
    const next = draft.trim().slice(0, 160) || null
    if (next === (filters.search || null)) return
    const timer = setTimeout(() => onChangeFilters({ ...filters, search: next }), 300)
    return () => clearTimeout(timer)
  }, [draft, filters, onChangeFilters])

  const query = useAppInfiniteQuery({
    enabled,
    getNextPageParam: (page: AdminReportActivityPage) => page.nextCursor ?? undefined,
    initialPageParam: null as string | null,
    networkMode: "always",
    queryFn: ({ pageParam }) =>
      getAdminReportActivity({ cursor: pageParam, filters, limit: 25 }),
    queryKey: reportKeys().activity(filters),
    selectItems: (page) => page.items,
  })
  const pull = usePullRefresh(() => query.refetch())
  const seen = new Set<string>()
  const events = query.items.filter((event) => {
    if (seen.has(event.id)) return false
    seen.add(event.id)
    return true
  })
  const rows = useMemo(() => activityRows(events), [events])
  const filtering = activeFilterCount(filters) > 0
  const clear = () =>
    onChangeFilters({ action: null, area: null, entityType: null, fromDate: null, search: null, toDate: null })

  let footer: ReactNode = null
  if (query.isFetchNextPageError)
    footer = (
      <StatusBanner
        className="mx-[18px]"
        kind="error"
        onRetry={() => void query.fetchNextPage()}
        retryLabel="Retry"
        title="More activity didn’t load."
      />
    )
  else if (!query.hasNextPage && events.length > 0)
    footer = (
      <View className="flex-row items-center justify-center gap-[6px]">
        <Icon className="size-[14px] text-muted-foreground" name="Check" />
        <Text className="text-muted-foreground" variant="caption">
          {filtering ? "That’s all activity for these filters" : "That’s all activity"}
        </Text>
      </View>
    )

  return (
    <AppList
      active={active}
      back={false}
      data={rows}
      embedded
      empty={
        filtering ? (
          <EmptyState
            action={{ label: "Clear filters", onPress: clear }}
            description="Try another name or action, or clear the filters."
            icon="Search"
            title="No matching activity"
          />
        ) : (
          <EmptyState
            description="Approvals, postings and reports appear here as staff work."
            icon="History"
            title="No activity yet"
          />
        )
      }
      error={query.isError && !query.isFetchNextPageError ? "Check your connection and try again." : null}
      errorTitle="Activity didn’t load"
      estimatedItemSize={78}
      header={
        <SegmentedControl
          accessibilityLabel="Action"
          onChange={(value) => onChangeFilters({ ...filters, action: value || null })}
          options={ACTION_CHIPS.map(([value, label]) => ({ label, value: value ?? "" }))}
          scrollable
          value={filters.action ?? ""}
          variant="pills"
        />
      }
      isFetchingNextPage={query.isFetchingNextPage}
      isLoading={enabled && query.isPending}
      keyExtractor={(row: ActivityListRow) => row.key}
      listFooter={footer}
      onEndReached={active && !offline ? query.onEndReached : undefined}
      onRefresh={active && !offline ? pull.onRefresh : undefined}
      onRetry={() => void query.refetch()}
      refreshing={active && pull.refreshing}
      renderItem={({ item }) =>
        item.kind === "day" ? (
          <View className="px-[18px] pt-[8px]">
            <SectionHeader title={item.label} value={String(item.count)} />
          </View>
        ) : (
          <ActivityRow event={item.event} onPress={() => onOpenEvent(item.event)} position={item.position} />
        )
      }
      search={
        active
          ? {
              accessibilityLabel: "Search activity",
              onChangeText: setDraft,
              placeholder: "Search actor or action",
              totalCount: draft || filtering ? 11 : events.length + (query.hasNextPage ? 11 : 0),
              value: draft,
            }
          : undefined
      }
      testID="admin-reports-activity"
    />
  )
}
