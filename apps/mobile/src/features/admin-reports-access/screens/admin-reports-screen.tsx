import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { CalendarDateField } from "@/components/app/calendar-date-field"
import { CalendarPickerSheet } from "@/components/app/calendar-picker-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeader } from "@/components/app/screen-header"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { WorkflowDetailSheet } from "@/components/app/workflow-detail-sheet"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import type { GeneratedReportFile } from "@/features/admin-reports-access/model/generated-report-file"
import type {
  AdminActivityEvent,
  AdminReportActivityFilters,
  AdminReportCard,
  AdminReportFilters,
  AdminReports,
} from "@/features/admin-reports-access/model/admin-reports-access-types"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useColors } from "@/hooks/use-color"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { cn } from "@/lib/utils"
import { useEffect, useMemo, useState } from "react"
import { Pressable, RefreshControl, ScrollView, View } from "react-native"

type ReportsTab = "activity" | "reports"
type FilterMode = ReportsTab | null
type CalendarTarget = "from" | "to" | null

function formatReportMetric(report: AdminReportCard, currencyCode: string) {
  return formatMobileMetricValue(
    {
      detail: report.detail,
      format: report.metricFormat,
      key: report.key,
      label: report.metricLabel,
      value: report.metricValue,
    },
    currencyCode
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Date unavailable"
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function reportIcon(key: string) {
  if (key === "members" || key === "memberStatements") return "UsersRound"
  if (key === "paymentReceipts") return "ReceiptText"
  if (key === "financing" || key === "repayments") return "HandCoins"
  if (key === "shares" || key === "profit") return "PieChart"
  if (key === "procurement") return "PackageSearch"
  if (key === "foodPurchase") return "ShoppingBasket"
  if (key === "projectFinancing") return "BriefcaseBusiness"
  if (key === "support") return "MessagesSquare"
  if (key === "audit") return "History"
  return "FileText"
}

function statusPresentation(status: GeneratedReportFile["status"]) {
  return {
    cancelled: { label: "Cancelled", tone: "bg-muted-foreground" },
    expired: { label: "Expired", tone: "bg-warn" },
    failed: { label: "Failed", tone: "bg-destructive" },
    pending: { label: "Generating", tone: "bg-brand" },
    ready: { label: "Ready", tone: "bg-success" },
  }[status]
}

function SectionHeading({ count, title }: { count?: string; title: string }) {
  return (
    <View className="flex-row items-end justify-between gap-4">
      <Text className="flex-1 text-lg font-extrabold tracking-tight text-foreground">
        {title}
      </Text>
      {count ? (
        <Text className="pb-0.5 text-xs font-semibold text-muted-foreground">
          {count}
        </Text>
      ) : null}
    </View>
  )
}

function SummaryStrip({
  activityCount,
  files,
  reportCount,
}: {
  activityCount: number
  files: GeneratedReportFile[]
  reportCount: number
}) {
  const readyCount = files.filter((file) => file.status === "ready").length
  const items = [
    { label: "Reports", value: reportCount },
    { label: "Ready", value: readyCount },
    { label: "Activity", value: activityCount },
  ]
  return (
    <View className="flex-row border-y border-border">
      {items.map((item, index) => (
        <View
          className={cn(
            "min-w-0 flex-1 gap-1 py-4",
            index > 0 && "border-l border-border pl-3",
            index < items.length - 1 && "pr-3"
          )}
          key={item.label}
        >
          <Text className="text-[10px] font-extrabold tracking-wider text-muted-foreground uppercase">
            {item.label}
          </Text>
          <Text className="text-2xl font-black tracking-tight text-foreground">
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

function TabSwitch({ onChange, value }: { onChange: (value: ReportsTab) => void; value: ReportsTab }) {
  return (
    <View className="flex-row border-b border-border">
      {(["reports", "activity"] as const).map((tab) => {
        const active = value === tab
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={cn(
              "min-h-11 flex-1 items-center justify-center border-b-2 px-3",
              active ? "border-brand" : "border-transparent"
            )}
            key={tab}
            onPress={() => onChange(tab)}
          >
            <Text
              className={cn(
                "text-sm font-bold capitalize",
                active ? "text-brand" : "text-muted-foreground"
              )}
            >
              {tab}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function ReportRow({
  currencyCode,
  isFirst,
  onPress,
  report,
}: {
  currencyCode: string
  isFirst: boolean
  onPress: () => void
  report: AdminReportCard
}) {
  return (
    <Pressable
      accessibilityHint={
        report.available
          ? "Opens private report generation"
          : "Explains the subscription requirement"
      }
      accessibilityLabel={`${report.title}. ${report.metricLabel}: ${formatReportMetric(report, currencyCode)}`}
      accessibilityRole="button"
      className={cn(
        "min-h-16 flex-row items-center gap-3 py-3 active:bg-secondary/60",
        !isFirst && "border-t border-border",
        !report.available && "opacity-60"
      )}
      onPress={onPress}
    >
      <View className="size-9 shrink-0 items-center justify-center rounded-full bg-accent">
        <Icon
          className="size-sm text-accent-foreground"
          name={report.available ? reportIcon(report.key) : "LockKeyhole"}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-bold text-foreground">{report.title}</Text>
      </View>
      <View className="max-w-[32%] items-end gap-0.5">
        <Text
          adjustsFontSizeToFit
          className="text-sm font-extrabold text-foreground"
          minimumFontScale={0.72}
          numberOfLines={1}
        >
          {formatReportMetric(report, currencyCode)}
        </Text>
        <Text className="text-[10px] text-muted-foreground">
          {report.available ? report.metricLabel : "Plan restricted"}
        </Text>
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

function GeneratedFileRow({
  file,
  isFirst,
  onPress,
}: {
  file: GeneratedReportFile
  isFirst: boolean
  onPress: () => void
}) {
  const status = statusPresentation(file.status)
  return (
    <Pressable
      accessibilityLabel={`${file.reportTitle}. ${status.label}. ${file.rowCount ?? 0} rows.`}
      accessibilityRole="button"
      className={cn(
        "min-h-[68px] flex-row items-center gap-3 py-3 active:bg-secondary/60",
        !isFirst && "border-t border-border"
      )}
      onPress={onPress}
    >
      <View className={cn("size-2.5 rounded-full", status.tone)} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-sm font-bold text-foreground">
          {file.reportTitle}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {status.label}
          {file.rowCount !== null ? ` · ${file.rowCount} rows` : ""}
        </Text>
      </View>
      <Text className="text-xs font-semibold text-muted-foreground">
        {formatDate(file.generatedAt)}
      </Text>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

function ActivityRow({
  event,
  isFirst,
  onPress,
}: {
  event: AdminActivityEvent
  isFirst: boolean
  onPress: () => void
}) {
  const evidence = [
    event.actorLabel,
    event.authorizerLabel,
    event.entityType.replace(/_/g, " "),
  ].filter(Boolean)
  return (
    <Pressable
      accessibilityLabel={`${event.actionLabel}. ${evidence.join(". ")}. ${formatDate(event.occurredAt)}`}
      accessibilityRole="button"
      className={cn("min-h-[80px] gap-2 py-4", !isFirst && "border-t border-border")}
      onPress={onPress}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-start gap-2">
          <View className="mt-1.5 size-2 rounded-full bg-success" />
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {event.actionLabel}
          </Text>
        </View>
        <Text className="text-xs font-semibold text-muted-foreground">
          {formatDate(event.occurredAt)}
        </Text>
      </View>
      <Text className="pl-4 text-xs leading-4 text-muted-foreground">
        {evidence.join(" · ")}
      </Text>
      {event.metadataSummary.length ? (
        <Text className="pl-4 text-xs leading-4 text-muted-foreground">
          {event.metadataSummary.slice(0, 3).join(" · ")}
        </Text>
      ) : null}
    </Pressable>
  )
}

function FilterChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        "min-h-10 items-center justify-center rounded-full border px-4",
        active ? "border-brand bg-accent" : "border-border bg-card"
      )}
      onPress={onPress}
    >
      <Text className={cn("text-xs font-bold", active ? "text-brand" : "text-foreground")}>
        {label}
      </Text>
    </Pressable>
  )
}

function ReportFilterSheet({
  activityFilters,
  mode,
  onApplyActivity,
  onApplyReports,
  onClose,
  reportFilters,
}: {
  activityFilters: AdminReportActivityFilters
  mode: FilterMode
  onApplyActivity: (filters: AdminReportActivityFilters) => void
  onApplyReports: (filters: AdminReportFilters) => void
  onClose: () => void
  reportFilters: AdminReportFilters
}) {
  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>(null)
  const [draftReport, setDraftReport] = useState(reportFilters)
  const [draftActivity, setDraftActivity] = useState(activityFilters)
  useEffect(() => {
    if (!mode) return
    setDraftReport(reportFilters)
    setDraftActivity(activityFilters)
    setCalendarTarget(null)
  }, [activityFilters, mode, reportFilters])
  const active = mode === "activity" ? draftActivity : draftReport
  const setDate = (key: "fromDate" | "toDate", value: string) => {
    if (mode === "activity") {
      setDraftActivity((current) => ({ ...current, [key]: value }))
    } else {
      setDraftReport((current) => ({ ...current, [key]: value }))
    }
  }
  const clear = () => {
    if (mode === "activity") {
      setDraftActivity({
        action: null,
        entityType: null,
        fromDate: null,
        search: null,
        toDate: null,
      })
    } else {
      setDraftReport({ fromDate: null, toDate: null })
    }
  }
  return (
    <>
      <FloatingBottomSheet
        accessibilityLabel={`${mode ?? "report"} filters`}
      footer={
        <View className="flex-row gap-3 px-5 py-4">
          <Button className="flex-1" onPress={clear} variant="outline">
            <Text>Clear</Text>
          </Button>
          <Button
            className="flex-1"
            onPress={() => {
              if (mode === "activity") onApplyActivity(draftActivity)
              else onApplyReports(draftReport)
              onClose()
            }}
          >
            <Text>Apply</Text>
          </Button>
        </View>
      }
        keyboardExpandable={mode === "activity"}
        onClose={onClose}
        presentation="large"
        scrollable="auto"
        title={mode === "activity" ? "Activity filters" : "Report filters"}
        visible={mode !== null}
      >
        <View className="gap-5 px-5 pb-5">
        {mode === "activity" ? (
          <View className="gap-2">
            <Text className="text-sm font-bold text-foreground">Search</Text>
            <Input
              accessibilityLabel="Search audit activity"
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(search) =>
                setDraftActivity((current) => ({
                  ...current,
                  search: search || null,
                }))
              }
              placeholder="Actor, action, or entity"
              returnKeyType="done"
              value={draftActivity.search ?? ""}
            />
          </View>
        ) : null}
        <View className="gap-2">
          <Text className="text-sm font-bold text-foreground">Date range</Text>
          <View className="flex-row gap-3">
            <CalendarDateField
              accessibilityLabel="Choose report start date"
              className="flex-1"
              onPress={() => setCalendarTarget("from")}
              placeholder="Start date"
              value={active.fromDate ?? ""}
            />
            <CalendarDateField
              accessibilityLabel="Choose report end date"
              className="flex-1"
              onPress={() => setCalendarTarget("to")}
              placeholder="End date"
              value={active.toDate ?? ""}
            />
          </View>
        </View>
        {mode === "activity" ? (
          <>
            <View className="gap-2">
              <Text className="text-sm font-bold text-foreground">Action</Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  [null, "All"],
                  ["approve", "Approved"],
                  ["update", "Updated"],
                  ["create", "Created"],
                ].map(([value, label]) => (
                  <FilterChip
                    active={draftActivity.action === value}
                    key={label}
                    label={label ?? "All"}
                    onPress={() =>
                      setDraftActivity((current) => ({
                        ...current,
                        action: value,
                      }))
                    }
                  />
                ))}
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-sm font-bold text-foreground">Entity</Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  [null, "All"],
                  ["member", "Members"],
                  ["payment_receipt", "Receipts"],
                  ["ReportExport", "Reports"],
                ].map(([value, label]) => (
                  <FilterChip
                    active={draftActivity.entityType === value}
                    key={label}
                    label={label ?? "All"}
                    onPress={() =>
                      setDraftActivity((current) => ({
                        ...current,
                        entityType: value,
                      }))
                    }
                  />
                ))}
              </View>
            </View>
          </>
        ) : null}
        </View>
      </FloatingBottomSheet>
      <CalendarPickerSheet
        label={calendarTarget === "from" ? "Start date" : "End date"}
        maximumDate={
          calendarTarget === "from" ? active.toDate ?? undefined : undefined
        }
        minimumDate={
          calendarTarget === "to" ? active.fromDate ?? undefined : undefined
        }
        onChange={(value) =>
          setDate(calendarTarget === "from" ? "fromDate" : "toDate", value)
        }
        onClose={() => setCalendarTarget(null)}
        testID={`reports-${mode ?? "report"}-${calendarTarget ?? "date"}-calendar`}
        value={
          calendarTarget === "from"
            ? active.fromDate ?? ""
            : active.toDate ?? ""
        }
        visible={calendarTarget !== null}
      />
    </>
  )
}

function ReportActionSheet({
  actionsEnabled,
  filters,
  onClose,
  onGenerate,
  report,
}: {
  actionsEnabled: boolean
  filters: AdminReportFilters
  onClose: () => void
  onGenerate: () => void
  report: AdminReportCard | null
}) {
  return (
    <FloatingBottomSheet
      accessibilityLabel="Generate private report"
      footer={
        report ? (
          <View className="px-5 py-4">
            <Button
              accessibilityLabel={`Generate ${report.title}`}
              className="w-full"
              disabled={!actionsEnabled || !report.available}
              onPress={onGenerate}
            >
              <Icon className="size-sm" name="Download" />
              <Text>Generate</Text>
            </Button>
          </View>
        ) : undefined
      }
      onClose={onClose}
      presentation="compact"
      scrollable="auto"
      title="Generate report"
      visible={report !== null}
    >
      {report ? (
        <View className="gap-4 px-5 pb-5">
          <View className="gap-1">
            <Text className="text-xl font-black tracking-tight text-foreground">
              {report.title}
            </Text>
            <Text className="text-sm leading-5 text-muted-foreground">
              {report.detail}
            </Text>
          </View>
          <View className="border-y border-border py-4">
            <Text className="text-sm font-bold text-foreground">
              {filters.fromDate || filters.toDate
                ? `${filters.fromDate ? formatDate(filters.fromDate) : "First record"} – ${filters.toDate ? formatDate(filters.toDate) : "Today"}`
                : "All available records"}
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              Maximum {report.rowLimit.toLocaleString("en")} rows
            </Text>
          </View>
          <View className="flex-row items-start gap-2">
            <Icon
              className={cn("mt-0.5 size-sm", report.available ? "text-success" : "text-warn")}
              name={report.available ? "ShieldCheck" : "LockKeyhole"}
            />
            <Text className="flex-1 text-xs leading-5 text-muted-foreground">
              {report.available
                ? "Saved privately for 15 minutes."
                : "Requires a higher reporting plan."}
            </Text>
          </View>
        </View>
      ) : null}
    </FloatingBottomSheet>
  )
}

function GeneratedFileSheet({
  file,
  onCancel,
  onClose,
  onRetry,
  onShare,
}: {
  file: GeneratedReportFile | null
  onCancel: () => void
  onClose: () => void
  onRetry: () => void
  onShare: () => void
}) {
  const status = file ? statusPresentation(file.status) : null
  const retryable = file && ["cancelled", "expired", "failed"].includes(file.status)
  return (
    <FloatingBottomSheet
      accessibilityLabel="Generated report file"
      footer={
        file ? (
          <View className="flex-row gap-3 px-5 py-4">
            {file.status === "pending" ? (
              <Button className="flex-1" onPress={onCancel} variant="outline">
                <Text>Cancel</Text>
              </Button>
            ) : null}
            {file.status === "ready" ? (
              <Button className="flex-1" onPress={onShare}>
                <Icon className="size-sm" name="Share2" />
                <Text>Share</Text>
              </Button>
            ) : null}
            {retryable ? (
              <Button className="flex-1" onPress={onRetry}>
                <Icon className="size-sm" name="RefreshCw" />
                <Text>Retry</Text>
              </Button>
            ) : null}
            <Button className="flex-1" onPress={onClose} variant="outline">
              <Text>Close</Text>
            </Button>
          </View>
        ) : undefined
      }
      onClose={onClose}
      presentation="compact"
      scrollable="auto"
      title="Report file"
      visible={file !== null}
    >
      {file && status ? (
        <View className="gap-4 px-5 pb-5">
          <View className="flex-row items-center gap-3">
            <View className={cn("size-3 rounded-full", status.tone)} />
            <View className="min-w-0 flex-1">
              <Text className="text-xl font-black tracking-tight text-foreground">
                {file.reportTitle}
              </Text>
              <Text className="mt-1 text-sm font-semibold text-muted-foreground">
                {status.label}
                {file.rowCount !== null ? ` · ${file.rowCount} rows` : ""}
              </Text>
            </View>
          </View>
          {file.status === "pending" ? <LoadingSpinner /> : null}
          {file.error ? (
            <Text className="text-sm leading-5 text-destructive">{file.error}</Text>
          ) : null}
          <Text className="text-xs leading-5 text-muted-foreground">
            {file.status === "ready"
              ? "Available for 15 minutes."
              : file.status === "expired"
                ? "Expired. Generate a new copy."
                : file.status === "cancelled"
                  ? "No file was saved."
                  : file.status === "failed"
                    ? "Generation failed. Try again."
                    : "You can cancel while this runs."}
          </Text>
        </View>
      ) : null}
    </FloatingBottomSheet>
  )
}

export function AdminReportsScreen({
  activityError,
  activityEvents,
  activityFilters,
  canUseServerReports,
  currencyCode,
  error,
  generatedFiles,
  hasMoreActivity,
  initialEntityId,
  isActivityLoadingMore,
  isLoading,
  isRefreshing,
  onApplyActivityFilters,
  onApplyReportFilters,
  onCancelGeneratedFile,
  onGenerateReport,
  onLoadMoreActivity,
  onRefresh,
  onRetry,
  onRetryGeneratedFile,
  onShareGeneratedFile,
  reportActionsEnabled,
  reportFilters,
  reports,
}: {
  activityError: string | null
  activityEvents: AdminActivityEvent[]
  activityFilters: AdminReportActivityFilters
  canUseServerReports: boolean
  currencyCode: string
  error: string | null
  generatedFiles: GeneratedReportFile[]
  hasMoreActivity: boolean
  initialEntityId: string | null
  isActivityLoadingMore: boolean
  isLoading: boolean
  isRefreshing: boolean
  onApplyActivityFilters: (filters: AdminReportActivityFilters) => void
  onApplyReportFilters: (filters: AdminReportFilters) => void
  onCancelGeneratedFile: (file: GeneratedReportFile) => void
  onGenerateReport: (report: AdminReportCard) => void
  onLoadMoreActivity: () => void
  onRefresh: () => void
  onRetry: () => void
  onRetryGeneratedFile: (file: GeneratedReportFile) => void
  onShareGeneratedFile: (file: GeneratedReportFile) => void
  reportActionsEnabled: boolean
  reportFilters: AdminReportFilters
  reports: AdminReports | null
}) {
  const colors = useColors()
  const [tab, setTab] = useState<ReportsTab>("reports")
  const [filterMode, setFilterMode] = useState<FilterMode>(null)
  const [selectedReport, setSelectedReport] = useState<AdminReportCard | null>(null)
  const [selectedFile, setSelectedFile] = useState<GeneratedReportFile | null>(null)
  const [selectedActivity, setSelectedActivity] =
    useState<AdminActivityEvent | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const [handledEntityId, setHandledEntityId] = useState<string | null>(null)
  const activeFilterCount = useMemo(() => {
    const filters = tab === "activity" ? activityFilters : reportFilters
    return Object.values(filters).filter(Boolean).length
  }, [activityFilters, reportFilters, tab])

  useEffect(() => {
    if (!canUseServerReports) {
      setSelectedReport(null)
      setSelectedFile(null)
      setFilterMode(null)
    }
  }, [canUseServerReports])

  useEffect(() => {
    if (!selectedFile) return
    const current = generatedFiles.find((file) => file.id === selectedFile.id)
    if (current) setSelectedFile(current)
  }, [generatedFiles, selectedFile])

  useEffect(() => {
    if (!initialEntityId || !reports || handledEntityId === initialEntityId) {
      return
    }
    setHandledEntityId(initialEntityId)
    const activity = activityEvents.find(
      (event) =>
        event.id === initialEntityId || event.entityId === initialEntityId
    )
    if (activity) {
      setIsDestinationUnavailable(false)
      setTab("activity")
      setSelectedActivity(activity)
      return
    }
    const report = reports.reports.find(
      (item) => item.key === initialEntityId
    )
    if (report) {
      setIsDestinationUnavailable(false)
      setTab("reports")
      setSelectedReport(report)
      return
    }
    setIsDestinationUnavailable(true)
  }, [activityEvents, handledEntityId, initialEntityId, reports])

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10 pt-5"
        refreshControl={
          canUseServerReports ? (
            <RefreshControl
              onRefresh={onRefresh}
              refreshing={isRefreshing}
              tintColor={colors.brand}
            />
          ) : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          action={
            canUseServerReports ? (
              <Button
                accessibilityLabel={`Filter ${tab}${activeFilterCount ? `. ${activeFilterCount} filters active` : ""}`}
                onPress={() => setFilterMode(tab)}
                size="icon"
                variant="outline"
              >
                <Icon className="size-base text-foreground" name="SlidersHorizontal" />
              </Button>
            ) : undefined
          }
          title="Reports"
        />

        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={() => setIsDestinationUnavailable(false)}
          />
        ) : null}

        {!canUseServerReports ? (
          <EmptyState
            description="Your workspace role does not include report access."
            icon="ShieldX"
            title="Reports are restricted"
          />
        ) : null}

        {canUseServerReports ? (
          <>
            <CachedReadBanner
              action="generating reports"
              cache={reports?.cache}
              label="report data"
            />
            {error ? (
              <View className="gap-3 border-y border-border py-4">
                <Text className="text-sm leading-5 text-destructive">{error}</Text>
                <Button accessibilityLabel="Retry reports" className="self-start" disabled={isLoading} onPress={onRetry} size="sm" variant="outline">
                  <Icon className="size-sm" name="RefreshCw" />
                  <Text>Retry</Text>
                </Button>
              </View>
            ) : null}
            {isLoading && !reports ? <LoadingSpinner /> : null}
            {reports ? (
              <>
                <SummaryStrip
                  activityCount={activityEvents.length}
                  files={generatedFiles}
                  reportCount={reports.reports.length}
                />
                <TabSwitch onChange={setTab} value={tab} />
                {tab === "reports" ? (
                  <>
                    {generatedFiles.length ? (
                      <View className="gap-2">
                        <SectionHeading count={`${generatedFiles.length}`} title="Generated files" />
                        <View>
                          {generatedFiles.map((file, index) => (
                            <GeneratedFileRow
                              file={file}
                              isFirst={index === 0}
                              key={file.id}
                              onPress={() => setSelectedFile(file)}
                            />
                          ))}
                        </View>
                      </View>
                    ) : null}
                    <View className="gap-2">
                      <SectionHeading
                        count={`${reports.reports.filter((report) => report.available).length}`}
                        title="Available reports"
                      />
                      <VirtualizedCardList
                        data={reports.reports}
                        empty={
                          <EmptyState
                            description="Reports will appear when workspace data is available."
                            icon="FileText"
                            title="No reports"
                          />
                        }
                        estimatedItemSize={64}
                        keyExtractor={(report) => report.key}
                        maxHeight={900}
                        renderItem={({ index, item }) => (
                          <ReportRow
                            currencyCode={currencyCode}
                            isFirst={index === 0}
                            onPress={() => setSelectedReport(item)}
                            report={item}
                          />
                        )}
                      />
                    </View>
                  </>
                ) : (
                  <View className="gap-3">
                    <SectionHeading count={`${activityEvents.length}`} title="Governance activity" />
                    <VirtualizedCardList
                      data={activityEvents}
                      empty={
                        <EmptyState
                          description="Try clearing the active filters."
                          icon="History"
                          title="No matching activity"
                        />
                      }
                      estimatedItemSize={90}
                      keyExtractor={(event) => event.id}
                      maxHeight={760}
                      renderItem={({ index, item }) => (
                        <ActivityRow
                          event={item}
                          isFirst={index === 0}
                          onPress={() => setSelectedActivity(item)}
                        />
                      )}
                    />
                    {activityError ? (
                      <Text className="text-sm text-destructive">{activityError}</Text>
                    ) : null}
                    {hasMoreActivity ? (
                      <Button disabled={isActivityLoadingMore} onPress={onLoadMoreActivity} variant="outline">
                        {isActivityLoadingMore ? <LoadingSpinner /> : <Text>Load more</Text>}
                      </Button>
                    ) : null}
                  </View>
                )}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <ReportFilterSheet
        activityFilters={activityFilters}
        mode={filterMode}
        onApplyActivity={(filters) => {
          onApplyActivityFilters(filters)
        }}
        onApplyReports={onApplyReportFilters}
        onClose={() => setFilterMode(null)}
        reportFilters={reportFilters}
      />
      <ReportActionSheet
        actionsEnabled={reportActionsEnabled}
        filters={reportFilters}
        onClose={() => setSelectedReport(null)}
        onGenerate={() => {
          if (!selectedReport) return
          onGenerateReport(selectedReport)
          setSelectedReport(null)
        }}
        report={selectedReport}
      />
      <GeneratedFileSheet
        file={selectedFile}
        onCancel={() => {
          if (selectedFile) onCancelGeneratedFile(selectedFile)
        }}
        onClose={() => setSelectedFile(null)}
        onRetry={() => {
          if (selectedFile) onRetryGeneratedFile(selectedFile)
          setSelectedFile(null)
        }}
        onShare={() => {
          if (selectedFile) onShareGeneratedFile(selectedFile)
        }}
      />
      <WorkflowDetailSheet
        onClose={() => setSelectedActivity(null)}
        rows={
          selectedActivity
            ? [
                {
                  detail: formatDate(selectedActivity.occurredAt),
                  icon: "History",
                  label: "Action",
                  value: selectedActivity.actionLabel,
                },
                {
                  detail: selectedActivity.authorizationRole,
                  icon: "UserRoundCheck",
                  label: "Actor",
                  value: selectedActivity.actorLabel,
                },
                {
                  detail: selectedActivity.entityId ?? undefined,
                  icon: "FileText",
                  label: "Record",
                  value: selectedActivity.entityType.replace(/_/g, " "),
                },
                ...(selectedActivity.metadataSummary.length
                  ? [
                      {
                        detail: selectedActivity.metadataSummary.join(" · "),
                        icon: "ShieldCheck",
                        label: "Evidence",
                      },
                    ]
                  : []),
              ]
            : []
        }
        title={selectedActivity?.actionLabel ?? "Activity"}
        visible={Boolean(selectedActivity)}
      />
    </SafeArea>
  )
}
