import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { SegmentedPager, usePagerPosition } from "@/components/ui/segmented-pager"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useMemo, useState } from "react"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { ActivityLane, ReportsLane } from "../components/report-lanes"
import {
  ActivityDetailSheet,
  ActivityFilterSheet,
  GenerateReportSheet,
  ReportFileSheet,
} from "../components/report-sheets"
import type {
  AdminActivityEvent,
  AdminReportActivityFilters,
  AdminReportCard,
  AdminReportFilters,
  AdminReports,
} from "../model/admin-reports-access-types"
import type { GeneratedReportFile } from "../model/generated-report-file"
import { activeFilterCount } from "../model/report-presentation"

export type ReportsLaneKey = "activity" | "reports"

const LANES = [
  { label: "Reports", value: "reports" },
  { label: "Activity", value: "activity" },
] as const satisfies readonly { label: string; value: ReportsLaneKey }[]

/**
 * T23 Admin reports (01 Quiet list on every screen): a quiet title with the
 * cooperative name and the activity filter, the Reports | Activity lanes
 * over a swipeable pager, and the generate, file, filter and detail sheets.
 */
export function AdminReportsScreen({
  activityEnabled,
  activityFilters,
  canUseServerReports,
  cooperativeName,
  currencyCode,
  destinationUnavailable,
  error,
  generatedFiles,
  isLoading,
  lane,
  offline,
  onApplyActivityFilters,
  onCancelGeneratedFile,
  onCloseEvent,
  onDismissDestination,
  onDismissShareError,
  onGenerateReport,
  onLaneChange,
  onOpenEvent,
  onRefresh,
  onRetry,
  onRetryGeneratedFile,
  onShareGeneratedFile,
  openEventId,
  openEventSeed,
  openReport,
  onOpenReport,
  reportActionsEnabled,
  reports,
  shareError,
  stale,
}: {
  activityEnabled: boolean
  activityFilters: AdminReportActivityFilters
  canUseServerReports: boolean
  cooperativeName: string
  currencyCode: string
  destinationUnavailable: boolean
  error: string | null
  generatedFiles: GeneratedReportFile[]
  isLoading: boolean
  lane: ReportsLaneKey
  offline: boolean
  onApplyActivityFilters: (filters: AdminReportActivityFilters) => void
  onCancelGeneratedFile: (file: GeneratedReportFile) => void
  onCloseEvent: () => void
  onDismissDestination: () => void
  onDismissShareError: () => void
  onGenerateReport: (
    report: AdminReportCard,
    filters: AdminReportFilters,
    id: string
  ) => Promise<GeneratedReportFile | null>
  onLaneChange: (lane: ReportsLaneKey) => void
  onOpenEvent: (event: AdminActivityEvent) => void
  onOpenReport: (report: AdminReportCard | null) => void
  onRefresh: () => Promise<unknown>
  onRetry: () => void
  onRetryGeneratedFile: (file: GeneratedReportFile) => void
  onShareGeneratedFile: (file: GeneratedReportFile) => void
  openEventId: string | null
  openEventSeed: AdminActivityEvent | null
  openReport: AdminReportCard | null
  reportActionsEnabled: boolean
  reports: AdminReports | null
  shareError: string | null
  stale: boolean
}) {
  const { top } = useSafeAreaInsets()
  const index = LANES.findIndex(({ value }) => value === lane)
  const position = usePagerPosition(index)
  const [filtering, setFiltering] = useState(false)
  const [openFileId, setOpenFileId] = useState<string | null>(null)
  const openFile = generatedFiles.find((file) => file.id === openFileId) ?? null
  const filterCount = activeFilterCount(activityFilters)

  const pages = useMemo(
    () => [
      function Reports() {
        return (
          <ReportsLane
            active={lane === "reports"}
            currencyCode={currencyCode}
            error={error}
            files={generatedFiles}
            isLoading={isLoading}
            onOpenFile={(file) => setOpenFileId(file.id)}
            onOpenReport={onOpenReport}
            onRefresh={offline ? undefined : onRefresh}
            onRetry={onRetry}
            reports={reports?.reports ?? null}
          />
        )
      },
      function Activity() {
        return (
          <ActivityLane
            active={lane === "activity"}
            enabled={activityEnabled}
            filters={activityFilters}
            offline={offline}
            onChangeFilters={onApplyActivityFilters}
            onOpenEvent={onOpenEvent}
          />
        )
      },
    ],
    [
      activityEnabled,
      activityFilters,
      currencyCode,
      error,
      generatedFiles,
      isLoading,
      lane,
      offline,
      onApplyActivityFilters,
      onOpenEvent,
      onOpenReport,
      onRefresh,
      onRetry,
      reports?.reports,
    ]
  )

  if (!canUseServerReports)
    return (
      <View className="flex-1 bg-background" testID="admin-reports-screen">
        <ScreenStatusBar />
        <View style={{ height: top }} />
        <View className="px-[18px] pt-[12px]">
          <Text accessibilityRole="header" variant="screenTitle">
            Reports
          </Text>
        </View>
        <EmptyState
          description={`Your workspace role doesn’t include report access. Ask an admin of ${cooperativeName} if you need it.`}
          icon="ShieldX"
          title="Reports are restricted"
        />
      </View>
    )

  return (
    <View className="flex-1 bg-background" testID="admin-reports-screen">
      <ScreenStatusBar />
      <View>
        <View style={{ height: top }} />
        <View className="flex-row items-center gap-[12px] px-[18px] pt-[12px]">
          <View className="min-w-0 flex-1">
            <Text accessibilityRole="header" variant="screenTitle">
              Reports
            </Text>
            <Text className="text-muted-foreground" numberOfLines={1} variant="small">
              {cooperativeName}
            </Text>
          </View>
          <View>
            <ScreenHeaderButton
              accessibilityLabel={`Filter activity${filterCount ? `. ${filterCount} filters active` : ""}`}
              icon="SlidersHorizontal"
              onPress={() => setFiltering(true)}
              testID="admin-reports-filter"
            />
            {filterCount ? (
              <View className="absolute -right-[2px] -top-[2px] min-w-[18px] items-center rounded-full bg-primary px-[5px]">
                <Text className="text-primary-foreground" variant="caption">
                  {filterCount}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <View className="gap-[8px] px-[18px] pt-[14px] pb-[6px]">
          <SegmentedControl
            accessibilityLabel="Reports sections"
            onChange={onLaneChange}
            options={LANES}
            position={position}
            value={lane}
          />
          {destinationUnavailable ? (
            <NotificationDestinationNotice onDismiss={onDismissDestination} />
          ) : null}
          {shareError ? (
            <StatusBanner
              description={shareError}
              kind="error"
              onRetry={onDismissShareError}
              retryLabel="Dismiss"
              title="Couldn’t share the file"
            />
          ) : null}
          {offline ? (
            <StatusBanner
              description="Showing saved data. Generating reports needs a connection."
              kind="offline"
              title="Offline"
            />
          ) : stale ? (
            <StatusBanner
              description="Pull down to refresh before generating a report."
              kind="stale"
              onRetry={onRetry}
              retryLabel="Retry reports"
              title="Showing saved reports"
            />
          ) : null}
        </View>
      </View>
      <SegmentedPager
        fill
        index={index}
        onIndexChange={(next) => onLaneChange(LANES[next]!.value)}
        pages={pages}
        position={position}
      />
      <GenerateReportSheet
        offline={!reportActionsEnabled}
        onCancel={(id) => {
          const file = generatedFiles.find((item) => item.id === id)
          if (file) onCancelGeneratedFile(file)
        }}
        onClose={() => onOpenReport(null)}
        onGenerate={onGenerateReport}
        onShare={onShareGeneratedFile}
        report={openReport}
      />
      <ReportFileSheet
        file={openFile}
        offline={!reportActionsEnabled}
        onCancel={onCancelGeneratedFile}
        onClose={() => setOpenFileId(null)}
        onRetry={(file) => {
          setOpenFileId(null)
          onRetryGeneratedFile(file)
        }}
        onShare={onShareGeneratedFile}
      />
      <ActivityFilterSheet
        filters={activityFilters}
        onApply={(filters) => {
          setFiltering(false)
          onApplyActivityFilters(filters)
          onLaneChange("activity")
        }}
        onClose={() => setFiltering(false)}
        visible={filtering}
      />
      <ActivityDetailSheet
        enabled={activityEnabled}
        eventId={openEventId}
        onClose={onCloseEvent}
        seed={openEventSeed}
      />
    </View>
  )
}
