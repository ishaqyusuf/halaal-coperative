import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useAppQuery, useInvalidateAppQueries } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import {
  deletePrivateReportFile,
  savePrivateReportFile,
  sharePrivateReportFile,
} from "@/platform/private-report-file"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useLocalSearchParams } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { generateAdminReport, getAdminReports } from "../api/admin-reports-access-api"
import {
  canUseMobileReportActions,
  canViewMobileAdminReports,
} from "../model/admin-reports-access-policy"
import type {
  AdminActivityEvent,
  AdminReportActivityFilters,
  AdminReportCard,
  AdminReportFilters,
  AdminReportsQaState,
} from "../model/admin-reports-access-types"
import { presentAdminReportsForQa } from "../model/admin-reports-qa"
import {
  cancelReportFile,
  completeReportFile,
  createPendingReportFile,
  expireGeneratedReportFile,
  failReportFile,
  type GeneratedReportFile,
} from "../model/generated-report-file"
import { reportKeys } from "../model/report-queries"
import { reportsLaneFromParams, reportsParamsKey } from "../model/report-route-params"
import { AdminReportsScreen, type ReportsLaneKey } from "../screens/admin-reports-screen"

const initialActivityFilters: AdminReportActivityFilters = {
  action: null,
  area: null,
  entityType: null,
  fromDate: null,
  search: null,
  toDate: null,
}

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return ["denied", "empty", "error", "loading", "offline", "stale"].includes(value)
    ? (value as AdminReportsQaState)
    : null
}

function reportErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim() ? error.message : fallback
}

/**
 * T23 reports tab. The overview (report cards) is one cached read per visit,
 * refreshed on focus, reconnect and pull; activity pages separately per
 * filter set, so a filter change never refetches the overview. Generated
 * CSVs stay private on the phone and expire after 15 minutes.
 */
export function AdminReportsRouteController() {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const invalidate = useInvalidateAppQueries()
  const params = useLocalSearchParams<{
    lane?: string | string[]
    notificationEntityId?: string | string[]
    qaState?: string | string[]
    tab?: string | string[]
  }>()
  const { notificationEntityId, qaState } = params
  const qa = getQaState(qaState)
  const cancelledIdsRef = useRef(new Set<string>())
  const generatedFilesRef = useRef<GeneratedReportFile[]>([])
  const generationEpochRef = useRef(0)
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedReportFile[]>([])
  const [activityFilters, setActivityFilters] = useState(initialActivityFilters)
  const [lane, setLane] = useState<ReportsLaneKey>(() => reportsLaneFromParams(params) ?? "reports")
  // A deep link that changes params on the mounted tab re-syncs the lane
  // and remounts the pager (see reportsParamsKey).
  const paramsKey = reportsParamsKey(params)
  const [syncedParamsKey, setSyncedParamsKey] = useState(paramsKey)
  if (syncedParamsKey !== paramsKey) {
    setSyncedParamsKey(paramsKey)
    const paramLane = reportsLaneFromParams(params)
    if (paramLane) setLane(paramLane)
  }
  const [openReport, setOpenReport] = useState<AdminReportCard | null>(null)
  const [openEvent, setOpenEvent] = useState<{ id: string; seed: AdminActivityEvent | null } | null>(null)
  const [handledEntityId, setHandledEntityId] = useState<string | null>(null)
  const [destinationUnavailable, setDestinationUnavailable] = useState(false)
  const [shareError, setShareError] = useState<string | null>(null)

  const canUseServerReports =
    qa !== "denied" &&
    canUseMobileFeatureData(profile, "admin") &&
    canViewMobileAdminReports(profile?.cooperativeRole)
  const forcedState = qa === "error" || qa === "loading"
  const overview = useAppQuery({
    enabled: canUseServerReports && !forcedState,
    networkMode: "always",
    queryFn: getAdminReports,
    queryKey: reportKeys().overview,
  })
  const reports =
    overview.data && !forcedState ? presentAdminReportsForQa(overview.data, qa) : null
  const offline = qa === "offline" || runtime.state.connectivity !== "online"
  const stale = canUseMobileReportActions(reports?.cache?.status) === false
  const reportActionsEnabled = !stale && !offline

  useEffect(() => {
    generatedFilesRef.current = generatedFiles
  }, [generatedFiles])

  // A new session (or losing report access) removes every private file.
  useEffect(() => {
    generationEpochRef.current += 1
    for (const file of generatedFilesRef.current) deletePrivateReportFile(file.uri)
    setGeneratedFiles([])
    cancelledIdsRef.current.clear()
    return () => {
      generationEpochRef.current += 1
      for (const file of generatedFilesRef.current) deletePrivateReportFile(file.uri)
    }
  }, [profile?.token, canUseServerReports])

  const hasReadyFiles = generatedFiles.some((file) => file.status === "ready")
  useEffect(() => {
    // Local expiry only; no timer runs while nothing can expire.
    if (!hasReadyFiles) return
    const interval = setInterval(() => {
      setGeneratedFiles((current) =>
        current.map((file) => {
          const next = expireGeneratedReportFile(file)
          if (next !== file && file.uri) deletePrivateReportFile(file.uri)
          return next
        })
      )
    }, 15_000)
    return () => clearInterval(interval)
  }, [hasReadyFiles])

  const generateReport = useCallback(
    async (
      report: AdminReportCard,
      filters: AdminReportFilters,
      id: string
    ): Promise<GeneratedReportFile | null> => {
      if (!report.available || !reportActionsEnabled) return null
      const epoch = generationEpochRef.current
      const cancelled = () =>
        epoch !== generationEpochRef.current || cancelledIdsRef.current.has(id)
      const pending = createPendingReportFile({
        filterSnapshot: filters,
        id,
        reportKey: report.key,
        reportTitle: report.title,
      })
      cancelledIdsRef.current.delete(id)
      setGeneratedFiles((current) => [pending, ...current].slice(0, 8))
      try {
        const generated = await runtime.runOnlineOperation("command", () =>
          generateAdminReport({ filters, key: report.key, requestId: id })
        )
        if (cancelled()) return null
        const saved = savePrivateReportFile({
          content: generated.content,
          filename: generated.filename,
        })
        if (cancelled()) {
          deletePrivateReportFile(saved.uri)
          return null
        }
        const ready = completeReportFile(pending, {
          expiresAt: generated.expiresAt,
          filename: generated.filename,
          generatedAt: generated.generatedAt,
          mimeType: generated.mimeType,
          rowCount: generated.rowCount,
          uri: saved.uri,
        })
        setGeneratedFiles((current) => current.map((file) => (file.id === id ? ready : file)))
        // The server logs a "report generated" event: refresh activity pages.
        void invalidate(reportKeys().activityAll)
        return ready
      } catch (generationError) {
        if (cancelled()) return null
        const failed = failReportFile(
          pending,
          reportErrorMessage(generationError, "The report could not be generated.")
        )
        setGeneratedFiles((current) => current.map((file) => (file.id === id ? failed : file)))
        return failed
      }
    },
    [invalidate, reportActionsEnabled, runtime]
  )

  const cancelGeneration = useCallback((file: GeneratedReportFile) => {
    cancelledIdsRef.current.add(file.id)
    deletePrivateReportFile(file.uri)
    setGeneratedFiles((current) =>
      current.map((item) => (item.id === file.id ? cancelReportFile(item) : item))
    )
  }, [])

  const shareGeneratedFile = useCallback(async (file: GeneratedReportFile) => {
    const current = expireGeneratedReportFile(file)
    setShareError(null)
    if (current.status !== "ready" || !current.uri || !current.filename) {
      setGeneratedFiles((files) => files.map((item) => (item.id === file.id ? current : item)))
      return
    }
    try {
      await sharePrivateReportFile({
        filename: current.filename,
        mimeType: current.mimeType ?? "text/csv",
        uri: current.uri,
      })
    } catch (shareError) {
      setShareError(reportErrorMessage(shareError, "The report could not be shared."))
    }
  }, [])

  const retryGeneratedFile = useCallback(
    (file: GeneratedReportFile) => {
      const report = reports?.reports.find((item) => item.key === file.reportKey)
      if (report) setOpenReport(report)
    },
    [reports?.reports]
  )

  // Notification deep link: a report key opens Generate; otherwise the id is
  // an activity event, opened from its own detail read.
  const entityId = getNotificationEntityIdParam(notificationEntityId)
  useEffect(() => {
    if (!entityId || !reports || handledEntityId === entityId) return
    setHandledEntityId(entityId)
    const report = reports.reports.find((item) => item.key === entityId)
    if (report) {
      setLane("reports")
      setOpenReport(report)
      return
    }
    if (/^[\w-]{8,}$/.test(entityId)) {
      setLane("activity")
      setOpenEvent({ id: entityId, seed: null })
      return
    }
    setDestinationUnavailable(true)
  }, [entityId, handledEntityId, reports])

  const refresh = useCallback(() => overview.refetch(), [overview])
  const openEventFromRow = useCallback(
    (event: AdminActivityEvent) => setOpenEvent({ id: event.id, seed: event }),
    []
  )

  return (
    <AdminReportsScreen
      activityEnabled={canUseServerReports && !forcedState && qa !== "empty"}
      activityFilters={activityFilters}
      canUseServerReports={canUseServerReports}
      cooperativeName={profile?.tenant.name ?? "your cooperative"}
      currencyCode={profile?.tenant.currencyCode ?? "NGN"}
      destinationUnavailable={destinationUnavailable}
      error={
        qa === "error"
          ? "Check your connection and try again."
          : overview.isError && !overview.data
            ? reportErrorMessage(overview.error, "Check your connection and try again.")
            : null
      }
      generatedFiles={generatedFiles}
      isLoading={qa === "loading" || (canUseServerReports && overview.isPending && !overview.isError)}
      lane={lane}
      layoutKey={paramsKey}
      offline={offline}
      onApplyActivityFilters={setActivityFilters}
      onCancelGeneratedFile={cancelGeneration}
      onCloseEvent={() => setOpenEvent(null)}
      onDismissDestination={() => setDestinationUnavailable(false)}
      onDismissShareError={() => setShareError(null)}
      onGenerateReport={generateReport}
      onLaneChange={setLane}
      onOpenEvent={openEventFromRow}
      onOpenReport={setOpenReport}
      onRefresh={refresh}
      onRetry={() => void overview.refetch()}
      onRetryGeneratedFile={retryGeneratedFile}
      onShareGeneratedFile={(file) => void shareGeneratedFile(file)}
      openEventId={openEvent?.id ?? null}
      openEventSeed={openEvent?.seed ?? null}
      openReport={openReport}
      reportActionsEnabled={reportActionsEnabled}
      reports={reports}
      shareError={shareError}
      stale={stale}
    />
  )
}
