import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAuthContext } from "@/hooks/use-auth"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import {
  deletePrivateReportFile,
  savePrivateReportFile,
  sharePrivateReportFile,
} from "@/platform/private-report-file"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useLocalSearchParams } from "expo-router"
import { getNotificationEntityIdParam } from "@/features/notifications/public/notification-destination-param"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  generateAdminReport,
  getAdminReportActivity,
  getAdminReports,
} from "../api/admin-reports-access-api"
import {
  canUseMobileReportActions,
  canViewMobileAdminReports,
} from "../model/admin-reports-access-policy"
import {
  cancelReportFile,
  completeReportFile,
  createPendingReportFile,
  expireGeneratedReportFile,
  failReportFile,
  type GeneratedReportFile,
} from "../model/generated-report-file"
import type {
  AdminActivityEvent,
  AdminReportActivityFilters,
  AdminReportCard,
  AdminReportFilters,
  AdminReports,
  AdminReportsQaState,
} from "../model/admin-reports-access-types"
import { presentAdminReportsForQa } from "../model/admin-reports-qa"
import { AdminReportsScreen } from "../screens/admin-reports-screen"

const initialReportFilters: AdminReportFilters = {
  fromDate: null,
  toDate: null,
}

const initialActivityFilters: AdminReportActivityFilters = {
  ...initialReportFilters,
  action: null,
  entityType: null,
  search: null,
}

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return ["denied", "empty", "error", "loading", "offline", "stale"].includes(
    value
  )
    ? (value as AdminReportsQaState)
    : null
}

function reportErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback
}

export function AdminReportsRouteController() {
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const { notificationEntityId, qaState } = useLocalSearchParams<{
    notificationEntityId?: string | string[]
    qaState?: string | string[]
  }>()
  const resolvedQaState = getQaState(qaState)
  const loadRequestIdRef = useRef(0)
  const cancelledIdsRef = useRef(new Set<string>())
  const generatedFilesRef = useRef<GeneratedReportFile[]>([])
  const [reports, setReports] = useState<AdminReports | null>(null)
  const [activityEvents, setActivityEvents] = useState<AdminActivityEvent[]>([])
  const [activityNextCursor, setActivityNextCursor] = useState<string | null>(
    null
  )
  const [reportFilters, setReportFilters] =
    useState<AdminReportFilters>(initialReportFilters)
  const [activityFilters, setActivityFilters] =
    useState<AdminReportActivityFilters>(initialActivityFilters)
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedReportFile[]>(
    []
  )
  const generationEpochRef = useRef(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isActivityLoadingMore, setIsActivityLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activityError, setActivityError] = useState<string | null>(null)
  const canUseServerReports =
    resolvedQaState !== "denied" &&
    canUseMobileFeatureData(profile, "admin") &&
    canViewMobileAdminReports(profile?.cooperativeRole)
  const reportActionsEnabled =
    canUseMobileReportActions(reports?.cache?.status) &&
    resolvedQaState !== "offline" &&
    runtime.state.connectivity === "online"

  useEffect(() => {
    generatedFilesRef.current = generatedFiles
  }, [generatedFiles])

  useEffect(() => {
    generationEpochRef.current += 1
    for (const file of generatedFilesRef.current) {
      deletePrivateReportFile(file.uri)
    }
    setGeneratedFiles([])
    return () => {
      generationEpochRef.current += 1
      for (const file of generatedFilesRef.current) {
        deletePrivateReportFile(file.uri)
      }
    }
  }, [profile?.token])

  useEffect(() => {
    const interval = setInterval(() => {
      setGeneratedFiles((current) =>
        current.map((file) => {
          const next = expireGeneratedReportFile(file)
          if (next !== file && file.uri) deletePrivateReportFile(file.uri)
          return next
        })
      )
    }, 30_000)
    return () => clearInterval(interval)
  }, [])

  const load = useCallback(
    async (refreshing = false) => {
      const requestId = ++loadRequestIdRef.current
      if (!canUseServerReports) {
        setReports(null)
        setActivityEvents([])
        setActivityNextCursor(null)
        setError(null)
        setActivityError(null)
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }
      if (resolvedQaState === "error") {
        setReports(null)
        setActivityEvents([])
        setError("Reports are unavailable.")
        setIsLoading(false)
        setIsRefreshing(false)
        return
      }
      if (resolvedQaState === "loading") {
        setReports(null)
        setActivityEvents([])
        setError(null)
        setIsLoading(true)
        setIsRefreshing(false)
        return
      }

      if (refreshing) setIsRefreshing(true)
      else setIsLoading(true)
      setError(null)
      setActivityError(null)
      try {
        const [overview, activity] = await Promise.all([
          getAdminReports(),
          getAdminReportActivity({
            cursor: null,
            filters: activityFilters,
            limit: 25,
          }),
        ])
        if (requestId !== loadRequestIdRef.current) return
        setReports(presentAdminReportsForQa(overview, resolvedQaState))
        setActivityEvents(resolvedQaState === "empty" ? [] : activity.items)
        setActivityNextCursor(
          resolvedQaState === "empty" ? null : activity.nextCursor
        )
      } catch (loadError) {
        if (requestId === loadRequestIdRef.current) {
          setError(reportErrorMessage(loadError, "Reports are unavailable."))
        }
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    [activityFilters, canUseServerReports, resolvedQaState]
  )

  useEffect(() => {
    if (!canUseServerReports) {
      generationEpochRef.current += 1
      loadRequestIdRef.current += 1
      for (const file of generatedFilesRef.current) {
        deletePrivateReportFile(file.uri)
      }
      setGeneratedFiles([])
      cancelledIdsRef.current.clear()
    }
    void load()
    return () => {
      loadRequestIdRef.current += 1
    }
  }, [load, profile?.token, canUseServerReports])

  const generateReport = useCallback(
    async (
      report: AdminReportCard,
      filters: AdminReportFilters = reportFilters
    ) => {
      if (!report.available || !reportActionsEnabled) return
      const id = createClientSubmissionKey()
      const generationEpoch = generationEpochRef.current
      const pending = createPendingReportFile({
        filterSnapshot: filters,
        id,
        reportKey: report.key,
        reportTitle: report.title,
      })
      cancelledIdsRef.current.delete(id)
      setGeneratedFiles((current) => [pending, ...current].slice(0, 8))
      setError(null)

      try {
        const generated = await runtime.runOnlineOperation("command", () =>
          generateAdminReport({ filters, key: report.key, requestId: id })
        )
        if (
          generationEpoch !== generationEpochRef.current ||
          cancelledIdsRef.current.has(id)
        )
          return
        const saved = savePrivateReportFile({
          content: generated.content,
          filename: generated.filename,
        })
        if (
          generationEpoch !== generationEpochRef.current ||
          cancelledIdsRef.current.has(id)
        ) {
          deletePrivateReportFile(saved.uri)
          return
        }
        setGeneratedFiles((current) =>
          current.map((file) =>
            file.id === id
              ? completeReportFile(file, {
                  expiresAt: generated.expiresAt,
                  filename: generated.filename,
                  generatedAt: generated.generatedAt,
                  mimeType: generated.mimeType,
                  rowCount: generated.rowCount,
                  uri: saved.uri,
                })
              : file
          )
        )
      } catch (generationError) {
        if (
          generationEpoch !== generationEpochRef.current ||
          cancelledIdsRef.current.has(id)
        )
          return
        const message = reportErrorMessage(
          generationError,
          "The report could not be generated."
        )
        setGeneratedFiles((current) =>
          current.map((file) =>
            file.id === id ? failReportFile(file, message) : file
          )
        )
      }
    },
    [reportActionsEnabled, reportFilters, runtime]
  )

  const cancelGeneration = useCallback((file: GeneratedReportFile) => {
    cancelledIdsRef.current.add(file.id)
    deletePrivateReportFile(file.uri)
    setGeneratedFiles((current) =>
      current.map((item) =>
        item.id === file.id ? cancelReportFile(item) : item
      )
    )
  }, [])

  const shareGeneratedFile = useCallback(async (file: GeneratedReportFile) => {
    const current = expireGeneratedReportFile(file)
    if (current.status !== "ready" || !current.uri || !current.filename) {
      setGeneratedFiles((files) =>
        files.map((item) => (item.id === file.id ? current : item))
      )
      return
    }
    try {
      await sharePrivateReportFile({
        filename: current.filename,
        mimeType: current.mimeType ?? "text/csv",
        uri: current.uri,
      })
    } catch (shareError) {
      setError(
        reportErrorMessage(shareError, "The report could not be shared.")
      )
    }
  }, [])

  const retryGeneratedFile = useCallback(
    (file: GeneratedReportFile) => {
      const report = reports?.reports.find(
        (item) => item.key === file.reportKey
      )
      if (!report) return
      void generateReport(report, file.filterSnapshot ?? reportFilters)
    },
    [generateReport, reportFilters, reports?.reports]
  )

  const loadMoreActivity = useCallback(async () => {
    if (!activityNextCursor || isActivityLoadingMore) return
    setIsActivityLoadingMore(true)
    setActivityError(null)
    try {
      const page = await getAdminReportActivity({
        cursor: activityNextCursor,
        filters: activityFilters,
        limit: 25,
      })
      setActivityEvents((current) => [
        ...current,
        ...page.items.filter(
          (item) => !current.some((existing) => existing.id === item.id)
        ),
      ])
      setActivityNextCursor(page.nextCursor)
    } catch (loadError) {
      setActivityError(
        reportErrorMessage(loadError, "More activity could not be loaded.")
      )
    } finally {
      setIsActivityLoadingMore(false)
    }
  }, [activityFilters, activityNextCursor, isActivityLoadingMore])

  return (
    <AdminReportsScreen
      activityError={activityError}
      activityEvents={activityEvents}
      activityFilters={activityFilters}
      canUseServerReports={canUseServerReports}
      currencyCode={profile?.tenant.currencyCode ?? "NGN"}
      error={error}
      generatedFiles={generatedFiles}
      hasMoreActivity={Boolean(activityNextCursor)}
      isActivityLoadingMore={isActivityLoadingMore}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      onApplyActivityFilters={setActivityFilters}
      onApplyReportFilters={setReportFilters}
      onCancelGeneratedFile={cancelGeneration}
      onGenerateReport={(report) => void generateReport(report)}
      onLoadMoreActivity={() => void loadMoreActivity()}
      onRefresh={() => void load(true)}
      onRetry={() => void load()}
      onRetryGeneratedFile={retryGeneratedFile}
      onShareGeneratedFile={(file) => void shareGeneratedFile(file)}
      reportActionsEnabled={reportActionsEnabled}
      reportFilters={reportFilters}
      reports={reports}
      initialEntityId={getNotificationEntityIdParam(notificationEntityId)}
    />
  )
}
