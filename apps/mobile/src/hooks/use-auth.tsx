import {
  clearSession,
  clearMobileDeviceId,
  createMockProfile,
  getMockRoleForMembership,
  getSessionProfile,
  getToken,
  isMockSessionToken,
  setSessionProfile,
  setToken,
  type MobileProfile,
  type MobileRole,
} from "@/lib/session-store"
import {
  getCurrentMobileProfile,
  signInWithMobileAuth,
  signOutMobileAuth,
  switchMobileRole,
  type MobileSignInCredentials,
} from "@/lib/mobile-auth-api"
import { refreshMobileDeviceSession } from "@/features/device-sessions/api/device-session-api"
import { shouldRefreshMobileDeviceSession } from "@/features/device-sessions/model/device-session-types"
import { clearMobileFormDrafts } from "@/hooks/use-mobile-form-draft"
import {
  clearInvalidatedMobileSessionState,
  registerMobileSessionInvalidationHandler,
} from "@/lib/mobile-session-invalidation"
import { clearMobileReadCache } from "@/lib/read-cache"
import { clearPrivateReportFiles } from "@/platform/private-report-file"
import { persistMobileSessionAtomically } from "@/lib/mobile-session-persistence"
import { transitionMobileContext } from "@/lib/mobile-context-transition"
import { isUnauthorizedMobileSessionError } from "@/runtime/mobile-runtime-state"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AppState } from "react-native"

type AuthContextValue = {
  hydrationError: unknown | null
  initializing: boolean
  profile: MobileProfile | null
  retryHydration: () => Promise<void>
  signInWithPassword: (
    input: MobileSignInCredentials,
    beforeActivate?: (profile: MobileProfile) => Promise<void> | void
  ) => Promise<void>
  role: MobileRole | null
  signInAs: (role: MobileRole) => Promise<void>
  signOut: () => Promise<void>
  switchRole: (membershipId: string) => Promise<MobileProfile>
  acceptServerProfile: (profile: MobileProfile) => Promise<void>
  invalidateLocalSession: () => Promise<void>
  refreshSession: (force?: boolean) => Promise<MobileProfile | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const canUseDevelopmentMockSession = process.env.NODE_ENV !== "production"

function isSessionRefreshConflict(error: unknown) {
  if (!error || typeof error !== "object") return false
  const candidate = error as {
    data?: { code?: string }
    shape?: { data?: { code?: string } }
  }
  return (
    candidate.data?.code === "CONFLICT" ||
    candidate.shape?.data?.code === "CONFLICT"
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [hydrationError, setHydrationError] = useState<unknown | null>(null)
  const [initializing, setInitializing] = useState(true)
  const [profile, setProfile] = useState<MobileProfile | null>(null)
  const invalidationPromiseRef = useRef<Promise<void> | null>(null)
  const refreshPromiseRef = useRef<Promise<MobileProfile | null> | null>(null)

  const invalidateLocalSession = useCallback(() => {
    if (invalidationPromiseRef.current) return invalidationPromiseRef.current

    const invalidation = (async () => {
      try {
        await clearInvalidatedMobileSessionState({
          clearDrafts: clearMobileFormDrafts,
          clearFiles: clearPrivateReportFiles,
          clearReads: clearMobileReadCache,
          clearSession,
          clearDeviceId: clearMobileDeviceId,
        })
      } finally {
        setProfile(null)
        setHydrationError(null)
      }
    })().finally(() => {
      invalidationPromiseRef.current = null
    })
    invalidationPromiseRef.current = invalidation
    return invalidation
  }, [])

  const refreshSession = useCallback(
    (force = false) => {
      if (refreshPromiseRef.current) return refreshPromiseRef.current

      const storedProfile = getSessionProfile()
      const storedToken = getToken()
      if (
        !storedProfile ||
        !storedToken ||
        isMockSessionToken(storedToken) ||
        (!force &&
          !shouldRefreshMobileDeviceSession(
            storedProfile.sessionExpiresAt,
            Date.now(),
            storedProfile.qaAuthorized
          ))
      ) {
        return Promise.resolve(storedProfile)
      }

      const refresh = (async () => {
        try {
          const response = await refreshMobileDeviceSession()
          await persistMobileSessionAtomically({
            clearSession,
            persistProfile: setSessionProfile,
            persistToken: setToken,
            profile: response.profile,
          })
          setProfile(response.profile)
          return response.profile
        } catch (error) {
          if (
            isUnauthorizedMobileSessionError(error) ||
            isSessionRefreshConflict(error)
          ) {
            await invalidateLocalSession()
            return null
          }
          throw error
        }
      })().finally(() => {
        refreshPromiseRef.current = null
      })
      refreshPromiseRef.current = refresh
      return refresh
    },
    [invalidateLocalSession]
  )

  const hydrateSession = useCallback(async () => {
    setInitializing(true)
    setHydrationError(null)
    await clearPrivateReportFiles()
    const token = getToken()
    const cachedProfile = getSessionProfile()

    if (!token) {
      if (cachedProfile) await clearSession()
      setProfile(null)
      setInitializing(false)
      return
    }

    if (canUseDevelopmentMockSession && isMockSessionToken(token)) {
      if (!cachedProfile) {
        await clearSession()
        setProfile(null)
        setInitializing(false)
        return
      }

      const refreshedMockProfile = createMockProfile(cachedProfile.role)
      await setSessionProfile(refreshedMockProfile)
      setProfile(refreshedMockProfile)
      setInitializing(false)
      return
    }

    try {
      const response = await getCurrentMobileProfile()
      const nextProfile = shouldRefreshMobileDeviceSession(
        response.profile.sessionExpiresAt,
        Date.now(),
        response.profile.qaAuthorized
      )
        ? await refreshSession(true)
        : response.profile
      if (!nextProfile) return
      await persistMobileSessionAtomically({
        clearSession,
        persistProfile: setSessionProfile,
        persistToken: setToken,
        profile: nextProfile,
      })
      setProfile(nextProfile)
    } catch (error) {
      if (isUnauthorizedMobileSessionError(error)) {
        await invalidateLocalSession()
      } else {
        setProfile(cachedProfile)
        setHydrationError(error)
      }
    } finally {
      setInitializing(false)
    }
  }, [invalidateLocalSession, refreshSession])

  useEffect(() => {
    let mounted = true

    void hydrateSession().catch((error) => {
      if (!mounted) return
      setHydrationError(error)
      setInitializing(false)
    })

    return () => {
      mounted = false
    }
  }, [hydrateSession])

  useEffect(
    () => registerMobileSessionInvalidationHandler(invalidateLocalSession),
    [invalidateLocalSession]
  )

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refreshSession()
    })
    return () => subscription.remove()
  }, [refreshSession])

  const signInAs = useCallback(async (role: MobileRole) => {
    await clearMobileFormDrafts()
    await clearPrivateReportFiles()
    await clearMobileReadCache()
    const nextProfile = createMockProfile(role)
    await persistMobileSessionAtomically({
      clearSession,
      persistProfile: setSessionProfile,
      persistToken: setToken,
      profile: nextProfile,
    })
    setProfile(nextProfile)
  }, [])

  const acceptServerProfile = useCallback(
    async (nextProfile: MobileProfile) => {
      await clearMobileFormDrafts()
      await clearPrivateReportFiles()
      await clearMobileReadCache()
      await persistMobileSessionAtomically({
        clearSession,
        persistProfile: setSessionProfile,
        persistToken: setToken,
        profile: nextProfile,
      })
      setProfile(nextProfile)
    },
    []
  )

  const signInWithPassword = useCallback(
    async (
      input: MobileSignInCredentials,
      beforeActivate?: (profile: MobileProfile) => Promise<void> | void
    ) => {
      await clearMobileFormDrafts()
      await clearPrivateReportFiles()
      await clearMobileReadCache()
      const response = await signInWithMobileAuth(input)
      await beforeActivate?.(response.profile)
      await persistMobileSessionAtomically({
        clearSession,
        persistProfile: setSessionProfile,
        persistToken: setToken,
        profile: response.profile,
      })
      setProfile(response.profile)
    },
    []
  )

  const signOut = useCallback(async () => {
    const shouldRevokeServerSession = Boolean(
      profile?.token && !isMockSessionToken(profile.token)
    )

    if (shouldRevokeServerSession) {
      try {
        await signOutMobileAuth()
      } catch {
        // Local session cleanup still wins when the server session is already gone.
      }
    }

    await invalidateLocalSession()
  }, [invalidateLocalSession, profile?.token])

  const switchRole = useCallback(
    async (membershipId: string) => {
      const mockRole = getMockRoleForMembership(membershipId)

      if (
        canUseDevelopmentMockSession &&
        isMockSessionToken(profile?.token) &&
        mockRole
      ) {
        const nextProfile = await transitionMobileContext({
          clearDrafts: clearMobileFormDrafts,
          clearFiles: clearPrivateReportFiles,
          clearReads: clearMobileReadCache,
          loadNextContext: async () => createMockProfile(mockRole),
          persistNextContext: async (next) => {
            await persistMobileSessionAtomically({
              clearSession,
              persistProfile: setSessionProfile,
              persistToken: setToken,
              profile: next,
            })
          },
        })
        setProfile(nextProfile)
        return nextProfile
      }

      const nextProfile = await transitionMobileContext({
        clearDrafts: clearMobileFormDrafts,
        clearFiles: clearPrivateReportFiles,
        clearReads: clearMobileReadCache,
        loadNextContext: async () =>
          (await switchMobileRole({ membershipId })).profile,
        persistNextContext: async (next) => {
          await persistMobileSessionAtomically({
            clearSession,
            persistProfile: setSessionProfile,
            persistToken: setToken,
            profile: next,
          })
        },
      })
      setProfile(nextProfile)

      return nextProfile
    },
    [profile?.token]
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      hydrationError,
      acceptServerProfile,
      invalidateLocalSession,
      initializing,
      profile,
      refreshSession,
      retryHydration: hydrateSession,
      role: profile?.role ?? null,
      signInWithPassword,
      signInAs,
      signOut,
      switchRole,
    }),
    [
      hydrateSession,
      acceptServerProfile,
      hydrationError,
      invalidateLocalSession,
      initializing,
      profile,
      refreshSession,
      signInAs,
      signInWithPassword,
      signOut,
      switchRole,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error("useAuthContext must be used within AuthProvider")
  }
  return value
}
