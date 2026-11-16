import { useAuthContext } from "@/hooks/use-auth"
import {
  createBackgroundResumeTracker,
  shouldRefreshAccessOnResume,
} from "@/runtime/app-resume"
import { getToken } from "@/lib/session-store"
import { AppState } from "react-native"
import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  getMobileAppAccessSnapshot,
  type MobileAppAccessSnapshot,
} from "@/features/mobile-app-access/api/mobile-app-access-api"
import { takePrimedMobileAppAccessSnapshot } from "@/features/mobile-app-access/model/primed-access-snapshot"

type AccessState = {
  accessAllowed: boolean
  checking: boolean
  error: boolean
  snapshot: MobileAppAccessSnapshot | null
  refresh: () => Promise<boolean>
}

const MobileAppAccessContext = createContext<AccessState | null>(null)

function currentAccess(snapshot: MobileAppAccessSnapshot | null, now: number) {
  if (!snapshot?.accessAllowed) return false
  return (
    snapshot.accessEndsAt === null ||
    new Date(snapshot.accessEndsAt).getTime() > now
  )
}

export function MobileAppAccessProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, role } = useAuthContext()
  const scope = profile
    ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}:${getToken()}`
    : null
  const [state, setState] = useState<{
    scope: string | null
    snapshot: MobileAppAccessSnapshot | null
    checking: boolean
    error: boolean
  }>({ scope: null, snapshot: null, checking: false, error: false })
  const [now, setNow] = useState(Date.now())
  const request = useRef(0)
  const active = useRef(true)
  const lastCheckedAt = useRef<number | null>(null)
  const refresh = useCallback(async () => {
    if (!scope || !role) return false
    const id = ++request.current
    lastCheckedAt.current = Date.now()
    setState((previous) => ({
      scope,
      snapshot: previous.scope === scope ? previous.snapshot : null,
      checking: true,
      error: false,
    }))
    try {
      // Sign-in and recovery hand over the snapshot with the new session,
      // so the first check after sign-in needs no extra round trip.
      const snapshot =
        takePrimedMobileAppAccessSnapshot(getToken()) ??
        (await getMobileAppAccessSnapshot())
      if (!active.current || id !== request.current) return false
      if (
        snapshot.userBinding !== profile?.user.id ||
        snapshot.tenantId !== profile?.tenant.id ||
        snapshot.membershipId !== profile?.activeMembershipId
      ) {
        throw new Error("Workspace binding mismatch")
      }
      setNow(Date.now())
      setState({ scope, snapshot, checking: false, error: false })
      return currentAccess(snapshot, Date.now())
    } catch {
      if (active.current && id === request.current)
        setState({ scope, snapshot: null, checking: false, error: true })
      return false
    }
  }, [
    profile?.activeMembershipId,
    profile?.tenant.id,
    profile?.user.id,
    role,
    scope,
  ])
  useEffect(() => {
    active.current = true
    if (scope && role) void refresh()
    return () => {
      active.current = false
      // Invalidate the in-flight request for the previous account scope.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      request.current++
    }
  }, [refresh, role, scope])
  const current = state.scope === scope ? state : null
  const snapshot = current?.snapshot ?? null
  const resumeInputs = useRef<{
    accessEndsAt: Date | string | null
    failed: boolean
  }>({ accessEndsAt: null, failed: false })
  resumeInputs.current = {
    accessEndsAt: snapshot?.accessEndsAt ?? null,
    failed: current?.error ?? false,
  }
  useEffect(() => {
    if (!scope || !role) return
    // Only a background -> active return, and only when the snapshot is
    // older than the window, failed, or its access end passed meanwhile.
    const isResume = createBackgroundResumeTracker(AppState.currentState)
    const subscription = AppState.addEventListener("change", (next) => {
      if (!isResume(next)) return
      if (
        shouldRefreshAccessOnResume({
          ...resumeInputs.current,
          lastCheckedAt: lastCheckedAt.current,
          now: Date.now(),
        })
      ) {
        void refresh()
      }
    })
    return () => subscription.remove()
  }, [refresh, role, scope])
  useEffect(() => {
    const ends = snapshot?.accessEndsAt
    if (!ends) return
    const remaining = new Date(ends).getTime() - Date.now()
    if (remaining <= 0) {
      setNow(Date.now())
      return
    }
    const timer = setTimeout(
      () => {
        setNow(Date.now())
        void refresh()
      },
      Math.min(remaining + 100, 2_147_483_647)
    )
    return () => clearTimeout(timer)
  }, [refresh, snapshot])
  const value = useMemo<AccessState>(
    () => ({
      accessAllowed: currentAccess(snapshot, now),
      checking: Boolean(role) && (!current || current.checking),
      error: current?.error ?? false,
      snapshot,
      refresh,
    }),
    [current, now, refresh, role, snapshot]
  )
  return createElement(MobileAppAccessContext.Provider, { value }, children)
}

export function useMobileAppAccess() {
  const value = useContext(MobileAppAccessContext)
  if (!value)
    throw new Error("MobileAppAccessProvider is required for access checks")
  return value
}
