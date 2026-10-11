import {
  checkNativeBuild,
  installedBuild,
  withAppUpdateLock,
} from "@/lib/app-update-client"
import config from "@root/app.config"
import { useLocalSearchParams, useRouter } from "expo-router"
import * as Updates from "expo-updates"
import { useCallback, useMemo, useState } from "react"
import {
  getUpdatePrimaryAction,
  getUpdateScreenStatus,
  type UpdateQaState,
  type UpdateScreenAction,
  type UpdateScreenError,
} from "../model/update-screen-state"
import { UpdatesScreen } from "../screens/updates-screen"

const updateVersion = String(config.extra?.updateVersion ?? "Not set")

function getErrorMessage() {
  return "The update service could not complete the request. Try again."
}

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return [
    "available",
    "check-error",
    "checking",
    "current",
    "disabled",
    "download-error",
    "downloading",
    "pending",
    "restart-error",
    "rollback",
  ].includes(value)
    ? (value as UpdateQaState)
    : null
}

export function UpdatesRouteController() {
  const router = useRouter()
  const { qaState } = useLocalSearchParams<{
    qaState?: string | string[]
  }>()
  const resolvedQaState = getQaState(qaState)
  const {
    checkError,
    currentlyRunning,
    downloadError,
    downloadProgress,
    isChecking,
    isDownloading,
    isRestarting,
    isUpdateAvailable,
    isUpdatePending,
    lastCheckForUpdateTimeSinceRestart,
  } = Updates.useUpdates()
  const [action, setAction] = useState<UpdateScreenAction>(null)
  const [error, setError] = useState<UpdateScreenError>(null)
  const [hasCheckedSuccessfully, setHasCheckedSuccessfully] = useState(
    Boolean(lastCheckForUpdateTimeSinceRestart)
  )
  const [isRollbackAvailable, setIsRollbackAvailable] = useState(false)
  const [message, setMessage] = useState(
    lastCheckForUpdateTimeSinceRestart
      ? "No newer update has been found since this app started."
      : "Check whether a newer published update is ready for this build."
  )

  const qaError: UpdateScreenError =
    resolvedQaState === "check-error"
      ? "check"
      : resolvedQaState === "download-error"
        ? "download"
        : resolvedQaState === "restart-error"
          ? "restart"
          : null
  const nativeError = downloadError ? "download" : checkError ? "check" : null
  const effectiveError = qaError ?? error ?? nativeError
  const effectiveHasCheckedSuccessfully =
    resolvedQaState === "current" ? true : hasCheckedSuccessfully
  const effectiveIsChecking = resolvedQaState === "checking" ? true : isChecking
  const effectiveIsDownloading =
    resolvedQaState === "downloading" ? true : isDownloading
  const effectiveIsRollbackAvailable =
    resolvedQaState === "rollback" ? true : isRollbackAvailable
  const effectiveIsUpdateAvailable =
    resolvedQaState === "available" ? true : isUpdateAvailable
  const effectiveIsUpdatePending =
    resolvedQaState === "pending" ? true : isUpdatePending
  const effectiveUpdatesEnabled =
    resolvedQaState === "disabled"
      ? false
      : Updates.isEnabled || installedBuild() !== null
  const qaMessage =
    resolvedQaState === "available"
      ? "A newer published update is ready to download."
      : resolvedQaState === "current"
        ? "HalaalVest is running the latest available update."
        : resolvedQaState === "disabled"
          ? "Update checks are unavailable in this build."
          : resolvedQaState === "downloading"
            ? "Keep HalaalVest open while the update downloads."
            : resolvedQaState === "checking"
              ? "Checking the matching update channel for this build."
              : resolvedQaState === "pending"
                ? "The downloaded update is ready to apply."
                : resolvedQaState === "rollback"
                  ? "The safe embedded build is available to restore."
                  : qaError
                    ? getErrorMessage()
                    : null
  const stateInput = useMemo(
    () => ({
      action,
      error: effectiveError,
      hasCheckedSuccessfully: effectiveHasCheckedSuccessfully,
      isChecking: effectiveIsChecking,
      isDownloading: effectiveIsDownloading,
      isRestarting,
      isRollbackAvailable: effectiveIsRollbackAvailable,
      isUpdateAvailable: effectiveIsUpdateAvailable,
      isUpdatePending: effectiveIsUpdatePending,
      updatesEnabled: effectiveUpdatesEnabled,
    }),
    [
      action,
      effectiveError,
      effectiveHasCheckedSuccessfully,
      effectiveIsChecking,
      effectiveIsDownloading,
      effectiveIsRollbackAvailable,
      effectiveIsUpdateAvailable,
      effectiveIsUpdatePending,
      effectiveUpdatesEnabled,
      isRestarting,
    ]
  )
  const status = getUpdateScreenStatus(stateInput)
  const primaryAction = getUpdatePrimaryAction(stateInput)
  const isBusy = Boolean(
    action || effectiveIsChecking || effectiveIsDownloading || isRestarting
  )
  const statusIsError = Boolean(effectiveError)
  const statusIsCurrent =
    effectiveHasCheckedSuccessfully &&
    !statusIsError &&
    !effectiveIsUpdateAvailable &&
    !effectiveIsUpdatePending &&
    !isBusy

  const checkForUpdate = useCallback(async () => {
    setAction("checking")
    setError(null)
    setIsRollbackAvailable(false)
    setMessage("Checking the matching update channel for this build.")

    try {
      if (await checkNativeBuild(true)) return
      if (!Updates.isEnabled) {
        setHasCheckedSuccessfully(true)
        setMessage("No newer native build is available.")
        return
      }
      const result = await Updates.checkForUpdateAsync()
      setHasCheckedSuccessfully(true)
      if (result.isAvailable) {
        setMessage("A newer update is available and ready to download.")
      } else if (result.isRollBackToEmbedded) {
        setIsRollbackAvailable(true)
        setMessage("The safe embedded build is available to restore.")
      } else {
        setMessage("HalaalVest is running the latest available update.")
      }
    } catch {
      setError("check")
      setMessage(
        "Update checks require an installed preview or release build with a working connection."
      )
    } finally {
      setAction(null)
    }
  }, [])

  const downloadUpdate = useCallback(async () => {
    setAction("downloading")
    setError(null)
    setMessage("Keep HalaalVest open while the update downloads.")

    try {
      const result = await Updates.fetchUpdateAsync()
      if (result.isNew || result.isRollBackToEmbedded) {
        setMessage("The update is ready. Restart HalaalVest to apply it.")
      } else {
        setMessage("No newer update was available to download.")
      }
    } catch {
      setError("download")
      setMessage(
        "The update was not downloaded. Your current version is unchanged."
      )
    } finally {
      setAction(null)
    }
  }, [])

  const restartIntoUpdate = useCallback(async () => {
    setAction("restarting")
    setError(null)
    setMessage("Restarting HalaalVest into the downloaded update.")

    try {
      await Updates.reloadAsync()
    } catch {
      setAction(null)
      setError("restart")
      setMessage(
        "The app could not restart. The current version remains available."
      )
    }
  }, [])

  const runPrimaryAction = useCallback(() => {
    if (!primaryAction || primaryAction.disabled || resolvedQaState) return
    if (primaryAction.kind === "download") {
      void withAppUpdateLock(downloadUpdate)
      return
    }
    if (primaryAction.kind === "restart") {
      void withAppUpdateLock(restartIntoUpdate)
      return
    }
    void withAppUpdateLock(checkForUpdate)
  }, [
    checkForUpdate,
    downloadUpdate,
    primaryAction,
    resolvedQaState,
    restartIntoUpdate,
  ])
  const primaryIcon =
    primaryAction?.kind === "download"
      ? "Download"
      : primaryAction?.kind === "restart"
        ? "RotateCw"
        : "RefreshCw"

  return (
    <UpdatesScreen
      buildDetails={{
        appVersion: config.version ?? "Not set",
        channel: Updates.channel ?? "Not set",
        createdAt: currentlyRunning.createdAt,
        isEmbeddedLaunch: currentlyRunning.isEmbeddedLaunch,
        lastCheckAt: lastCheckForUpdateTimeSinceRestart,
        runtimeVersion: Updates.runtimeVersion ?? "Not set",
        updateId: Updates.updateId,
        updateVersion,
      }}
      downloadProgressPercent={
        resolvedQaState === "downloading"
          ? 64
          : Math.round((downloadProgress ?? 0) * 100)
      }
      isBusy={isBusy}
      isDownloading={effectiveIsDownloading || action === "downloading"}
      lastCheckAt={lastCheckForUpdateTimeSinceRestart}
      message={qaMessage ?? message}
      onBack={() => router.back()}
      onPrimaryAction={runPrimaryAction}
      primaryAction={primaryAction}
      primaryIcon={primaryIcon}
      status={status}
      statusIsCurrent={statusIsCurrent}
      statusIsError={statusIsError}
      updatesEnabled={effectiveUpdatesEnabled}
    />
  )
}
