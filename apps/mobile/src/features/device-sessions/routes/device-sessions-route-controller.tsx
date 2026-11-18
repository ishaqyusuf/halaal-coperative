import {
  getManagedMobileDeviceSessions,
  getOwnMobileDeviceSessions,
  revokeAllManagedMobileDeviceSessions,
  revokeAllOwnMobileDeviceSessions,
  revokeManagedMobileDeviceSession,
  revokeOwnMobileDeviceSession,
} from "@/features/device-sessions/api/device-session-api"
import {
  canManageMobileDeviceSessions,
  type MobileDeviceSessionCollection,
} from "@/features/device-sessions/model/device-session-types"
import {
  DeviceSessionsScreen,
  type DeviceAccessBlock,
} from "@/features/device-sessions/screens/device-sessions-screen"
import { useAuthContext } from "@/hooks/use-auth"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useRouter } from "expo-router"
import { appQueryKey, useAppQuery, useInvalidateAppQueries } from "@/hooks/use-app-query"
import { useCallback, useState } from "react"

function getDeviceSessionError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback
  const normalized = error.message.toLowerCase()
  if (
    normalized.includes("permission") ||
    normalized.includes("manage_roles")
  ) {
    return "Cooperative Admin access is required to manage another user's devices."
  }
  if (normalized.includes("not found")) {
    return "This workspace user is unavailable."
  }
  if (normalized.includes("offline")) {
    return "Reconnect before changing device access."
  }
  return fallback
}

export function DeviceSessionsRouteController({
  invalidTarget,
  targetUserId,
}: {
  invalidTarget: boolean
  targetUserId?: string
}) {
  const { invalidateLocalSession, profile } = useAuthContext()
  const router = useRouter()
  const runtime = useMobileRuntime()
  const [writeError, setWriteError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const invalidate = useInvalidateAppQueries()
  const managed = Boolean(
    targetUserId && profile && targetUserId !== profile.user.id
  )
  const allowedToManage = canManageMobileDeviceSessions(
    profile?.cooperativeRole
  )
  const canLoad = profile
    ? canUseMobileFeatureData(profile, profile.role)
    : false
  const isOffline = runtime.state.connectivity === "offline"
  // Reasons the read must not run; shown as a block card, not a fetch error.
  const blocked: DeviceAccessBlock | null = invalidTarget
    ? {
        body: "This device-access link is invalid. Open Device access from the member’s profile instead.",
        icon: "Link2Off",
        title: "This link doesn’t work",
      }
    : !profile || !canLoad
      ? {
          body: "Sign in with your QA or production account to review device access.",
          icon: "Lock",
          title: "Sign in to see device access",
        }
      : managed && !allowedToManage
        ? {
            body: "Cooperative Admin access is required to manage another user’s devices.",
            icon: "Lock",
            title: "Admin access needed",
          }
        : null
  const sessionsKey = appQueryKey(
    "device-sessions",
    managed ? { managedUserId: targetUserId } : { ownUserId: profile?.user.id }
  )

  // T01 reference read: react-query with focus/reconnect/screen-focus
  // refresh, previous data kept between refreshes, no auth/validation
  // retries. Writes invalidate this exact key instead of reloading by hand.
  const sessionsQuery = useAppQuery<MobileDeviceSessionCollection>({
    enabled: blocked === null && !isOffline,
    queryFn: () =>
      managed
        ? getManagedMobileDeviceSessions(targetUserId!)
        : getOwnMobileDeviceSessions({
            ownerId: profile!.user.id,
            ownerName: profile!.user.name,
          }),
    queryKey: sessionsKey,
  })
  const collection = sessionsQuery.data ?? null
  const readError = sessionsQuery.error
    ? getDeviceSessionError(
        sessionsQuery.error,
        "Device access could not be loaded. Try again."
      )
    : isOffline && !collection
      ? "The current device list loads when you’re back online."
      : null
  const refetchSessions = sessionsQuery.refetch
  const loadSessions = useCallback(
    () => invalidate(sessionsKey),
    // sessionsKey is derived from the two ids below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invalidate, managed, targetUserId, profile?.user.id]
  )

  const handleRefresh = useCallback(() => {
    setNotice(null)
    setWriteError(null)
    void refetchSessions()
  }, [refetchSessions])

  const handleRevoke = useCallback(
    async (sessionId: string) => {
      if (!profile || isSubmitting) return false
      setIsSubmitting(true)
      setWriteError(null)
      setNotice(null)
      try {
        if (managed) {
          await runtime.runOnlineOperation("command", () =>
            revokeManagedMobileDeviceSession({
              sessionId,
              userId: targetUserId!,
            })
          )
        } else {
          const result = await runtime.runOnlineOperation("command", () =>
            revokeOwnMobileDeviceSession(sessionId)
          )
          if (result.revokedCurrent) {
            await invalidateLocalSession()
            return true
          }
        }
        setNotice("Device access removed.")
        await loadSessions()
        return true
      } catch (revokeError) {
        setWriteError(
          getDeviceSessionError(
            revokeError,
            "Device access couldn’t be removed. Check your connection and try again."
          )
        )
        return false
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      invalidateLocalSession,
      isSubmitting,
      loadSessions,
      managed,
      profile,
      runtime,
      targetUserId,
    ]
  )

  const handleRevokeAll = useCallback(async () => {
    if (!profile || isSubmitting) return false
    setIsSubmitting(true)
    setWriteError(null)
    setNotice(null)
    try {
      if (managed) {
        await runtime.runOnlineOperation("command", () =>
          revokeAllManagedMobileDeviceSessions(targetUserId!)
        )
        setNotice("All device access removed for this workspace user.")
        await loadSessions()
      } else {
        await runtime.runOnlineOperation("command", () =>
          revokeAllOwnMobileDeviceSessions()
        )
        await invalidateLocalSession()
      }
      return true
    } catch (revokeError) {
      setWriteError(
        getDeviceSessionError(
          revokeError,
          "Device access couldn’t be removed. Check your connection and try again."
        )
      )
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [
    invalidateLocalSession,
    isSubmitting,
    loadSessions,
    managed,
    profile,
    runtime,
    targetUserId,
  ])

  return (
    <DeviceSessionsScreen
      blocked={blocked}
      collection={collection}
      isLoading={sessionsQuery.isFetching && !collection}
      isOffline={isOffline}
      isSubmitting={isSubmitting}
      managed={managed}
      notice={notice}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      onDismissWriteError={() => setWriteError(null)}
      onRefresh={handleRefresh}
      onRevoke={handleRevoke}
      onRevokeAll={handleRevokeAll}
      readError={readError}
      refreshing={sessionsQuery.isRefetching && Boolean(collection)}
      writeError={writeError}
    />
  )
}
