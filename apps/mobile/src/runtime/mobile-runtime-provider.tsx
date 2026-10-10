import { useAuthContext } from "@/hooks/use-auth"
import {
  canDeliverMobileOperation,
  initialMobileRuntimeState,
  mobileRuntimeReducer,
  MobileOfflineOperationError,
  resolveOnlineState,
  shouldRefreshMobileReads,
  type MobileDeliveryKind,
  type MobileRuntimeState,
} from "@/runtime/mobile-runtime-state"
import NetInfo from "@react-native-community/netinfo"
import {
  focusManager,
  onlineManager,
  useQueryClient,
} from "@tanstack/react-query"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react"
import { AppState, type AppStateStatus } from "react-native"

type MobileRuntimeContextValue = {
  runOnlineOperation: <T>(
    kind: Exclude<MobileDeliveryKind, "read">,
    operation: () => Promise<T>
  ) => Promise<T>
  retry: () => Promise<void>
  state: MobileRuntimeState
}

const MobileRuntimeContext = createContext<MobileRuntimeContextValue | null>(
  null
)

export function MobileRuntimeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const auth = useAuthContext()
  const queryClient = useQueryClient()
  const [state, dispatch] = useReducer(
    mobileRuntimeReducer,
    initialMobileRuntimeState
  )
  const retryPromiseRef = useRef<Promise<void> | null>(null)
  const lastRefreshAtRef = useRef(0)
  const previousOnlineRef = useRef<boolean | null>(null)
  const previousScopeRef = useRef<string | null>(null)

  const refreshActiveReads = useCallback(async () => {
    const now = Date.now()
    if (now - lastRefreshAtRef.current < 1_000) return
    lastRefreshAtRef.current = now
    await queryClient.refetchQueries({ type: "active" })
  }, [queryClient])

  useEffect(() => {
    dispatch({
      error: Boolean(auth.hydrationError),
      hasProfile: Boolean(auth.profile),
      hydrating: auth.initializing,
      type: "auth",
    })
  }, [auth.hydrationError, auth.initializing, auth.profile])

  useEffect(() => {
    const scope = auth.profile
      ? [
          auth.profile.tenant.id,
          auth.profile.user.id,
          auth.profile.activeMembershipId,
          auth.profile.cooperativeRole ?? auth.profile.role,
        ].join(":")
      : null

    if (previousScopeRef.current && previousScopeRef.current !== scope) {
      queryClient.clear()
    }
    previousScopeRef.current = scope
  }, [auth.profile, queryClient])

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((network) => {
      const online = resolveOnlineState(
        network.isConnected,
        network.isInternetReachable
      )
      if (online !== null) onlineManager.setOnline(online)
      dispatch({
        occurredAt: new Date().toISOString(),
        online,
        type: "connectivity",
      })

      if (
        shouldRefreshMobileReads({
          becameActive: false,
          online: online === true,
          reconnected: previousOnlineRef.current === false,
        })
      ) {
        void refreshActiveReads()
      }
      previousOnlineRef.current = online
    })

    return unsubscribe
  }, [refreshActiveReads])

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      const lifecycle =
        nextState === "active"
          ? "active"
          : nextState === "background"
            ? "background"
            : "inactive"
      focusManager.setFocused(lifecycle === "active")
      dispatch({ lifecycle, type: "lifecycle" })
      if (
        shouldRefreshMobileReads({
          becameActive: lifecycle === "active",
          online: previousOnlineRef.current === true,
          reconnected: false,
        })
      ) {
        void refreshActiveReads()
      }
    }

    handleAppState(AppState.currentState)
    const subscription = AppState.addEventListener("change", handleAppState)
    return () => subscription.remove()
  }, [refreshActiveReads])

  const retry = useCallback(() => {
    if (retryPromiseRef.current) return retryPromiseRef.current

    const retryPromise = (async () => {
      dispatch({ recovery: "retrying", type: "recovery" })
      try {
        if (auth.hydrationError) await auth.retryHydration()
        if (previousOnlineRef.current === true) await refreshActiveReads()
      } finally {
        retryPromiseRef.current = null
        dispatch({ recovery: "idle", type: "recovery" })
      }
    })()
    retryPromiseRef.current = retryPromise
    return retryPromise
  }, [auth, refreshActiveReads])

  const runOnlineOperation = useCallback(
    async <T,>(
      kind: Exclude<MobileDeliveryKind, "read">,
      operation: () => Promise<T>
    ) => {
      if (!canDeliverMobileOperation(kind, state.connectivity)) {
        throw new MobileOfflineOperationError(kind)
      }
      return operation()
    },
    [state.connectivity]
  )

  const value = useMemo<MobileRuntimeContextValue>(
    () => ({ retry, runOnlineOperation, state }),
    [retry, runOnlineOperation, state]
  )

  return (
    <MobileRuntimeContext.Provider value={value}>
      {children}
    </MobileRuntimeContext.Provider>
  )
}

export function useMobileRuntime() {
  const value = useContext(MobileRuntimeContext)
  if (!value) {
    throw new Error(
      "useMobileRuntime must be used within MobileRuntimeProvider"
    )
  }
  return value
}
