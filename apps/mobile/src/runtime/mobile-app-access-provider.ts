import { useAuthContext } from "@/hooks/use-auth"
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

type AccessState = {
  accessAllowed: boolean
  checking: boolean
  error: boolean
  snapshot: MobileAppAccessSnapshot | null
  refresh: () => Promise<boolean>
}

const MobileAppAccessContext = createContext<AccessState | null>(null)

function currentAccess(snapshot: MobileAppAccessSnapshot | null, now: number) {
  const ends = snapshot?.accessEndsAt
  return Boolean(
    snapshot?.accessAllowed &&
    ends &&
    new Date(ends).getTime() > now &&
    Number.isFinite(new Date(ends).getTime())
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
  const refresh = useCallback(async () => {
    if (!scope || !role) return false
    const id = ++request.current
    setState((previous) => ({
      scope,
      snapshot: previous.scope === scope ? previous.snapshot : null,
      checking: true,
      error: false,
    }))
    try {
      const snapshot = await getMobileAppAccessSnapshot()
      if (!active.current || id !== request.current) return false
      if (snapshot.userBinding.toLowerCase() !== profile?.user.id.toLowerCase())
        throw new Error("Account binding mismatch")
      setNow(Date.now())
      setState({ scope, snapshot, checking: false, error: false })
      return currentAccess(snapshot, Date.now())
    } catch {
      if (active.current && id === request.current)
        setState({ scope, snapshot: null, checking: false, error: true })
      return false
    }
  }, [profile?.user.id, role, scope])
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
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active" && scope && role) void refresh()
    })
    return () => subscription.remove()
  }, [refresh, role, scope])
  const snapshot = state.scope === scope ? state.snapshot : null
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
      checking: Boolean(role) && (!snapshot || state.checking) && !state.error,
      error: state.scope === scope && state.error,
      snapshot,
      refresh,
    }),
    [
      now,
      refresh,
      role,
      scope,
      snapshot,
      state.checking,
      state.error,
      state.scope,
    ]
  )
  return createElement(MobileAppAccessContext.Provider, { value }, children)
}

export function useMobileAppAccess() {
  const value = useContext(MobileAppAccessContext)
  if (!value)
    throw new Error("MobileAppAccessProvider is required for access checks")
  return value
}
