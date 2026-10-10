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
import { DeviceSessionsScreen } from "@/features/device-sessions/screens/device-sessions-screen"
import { useAuthContext } from "@/hooks/use-auth"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useRef, useState } from "react"

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
  const [collection, setCollection] =
    useState<MobileDeviceSessionCollection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const loadRequestIdRef = useRef(0)
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

  const loadSessions = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current
    if (invalidTarget) {
      setError("This device-access link is invalid.")
      setIsLoading(false)
      return
    }
    if (!profile || !canLoad) {
      setError(
        "Sign in with your QA or production account to review device access."
      )
      setIsLoading(false)
      return
    }
    if (managed && !allowedToManage) {
      setError(
        "Cooperative Admin access is required to manage another user's devices."
      )
      setIsLoading(false)
      return
    }
    if (isOffline) {
      setError("Reconnect to review current device access.")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const nextCollection = managed
        ? await getManagedMobileDeviceSessions(targetUserId!)
        : await getOwnMobileDeviceSessions({
            ownerId: profile.user.id,
            ownerName: profile.user.name,
          })
      if (requestId === loadRequestIdRef.current) {
        setCollection(nextCollection)
      }
    } catch (loadError) {
      if (requestId === loadRequestIdRef.current) {
        setError(
          getDeviceSessionError(
            loadError,
            "Device access could not be loaded. Try again."
          )
        )
      }
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [
    allowedToManage,
    canLoad,
    invalidTarget,
    isOffline,
    managed,
    profile,
    targetUserId,
  ])

  useEffect(() => {
    void loadSessions()
    return () => {
      loadRequestIdRef.current += 1
    }
  }, [loadSessions])

  const handleRefresh = useCallback(() => {
    setNotice(null)
    void loadSessions()
  }, [loadSessions])

  const handleRevoke = useCallback(
    async (sessionId: string) => {
      if (!profile || isSubmitting) return
      setIsSubmitting(true)
      setError(null)
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
            return
          }
        }
        setNotice("Device access removed.")
        await loadSessions()
      } catch (revokeError) {
        setError(
          getDeviceSessionError(
            revokeError,
            "Device access could not be removed. Try again."
          )
        )
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
    if (!profile || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
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
    } catch (revokeError) {
      setError(
        getDeviceSessionError(
          revokeError,
          "Device access could not be removed. Try again."
        )
      )
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
      collection={collection}
      error={error}
      isLoading={isLoading}
      isOffline={isOffline}
      isSubmitting={isSubmitting}
      managed={managed}
      notice={notice}
      onBack={() => router.back()}
      onRefresh={handleRefresh}
      onRevoke={handleRevoke}
      onRevokeAll={handleRevokeAll}
    />
  )
}
