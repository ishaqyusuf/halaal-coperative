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
import { type MobileAppAccessSnapshot } from "@/features/mobile-app-access/api/mobile-app-access-api"
import {
  clearPrimedMobileAppAccessSnapshot,
  primeMobileAppAccessSnapshot,
} from "@/features/mobile-app-access/model/primed-access-snapshot"
import {
  clearInvalidatedMobileSessionState,
  registerMobileSessionInvalidationHandler,
} from "@/lib/mobile-session-invalidation"
import { clearMobileReadCache } from "@/lib/read-cache"
import { clearPrivateReportFiles } from "@/platform/private-report-file"
import { persistMobileSessionAtomically } from "@/lib/mobile-session-persistence"
import { transitionMobileContext } from "@/lib/mobile-context-transition"
import { isUnauthorizedMobileSessionError } from "@/runtime/mobile-runtime-state"
import { createBackgroundResumeTracker } from "@/runtime/app-resume"
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
  ) => Promise<MobileProfile>
  role: MobileRole | null
  signInAs: (role: MobileRole) => Promise<void>
  signOut: () => Promise<void>
  switchRole: (membershipId: string) => Promise<MobileProfile>
  acceptServerProfile: (
    profile: MobileProfile,
    accessSnapshot?: MobileAppAccessSnapshot
  ) => Promise<void>
  invalidateLocalSession: () => Promise<void>
  refreshSession: (force?: boolean) => Promise<MobileProfile | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const canUseDevelopmentMockSession = process.env.NODE_ENV !== "production"
// Local sign-out must not wait indefinitely for an unreachable server.
const SERVER_SIGN_OUT_BUDGET_MS = 5000

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
  // Bumped by every invalidation so an in-flight workspace switch can never
  // persist its replacement session after sign-out.
  const authGenerationRef = useRef(0)
  const contextTransitionRef = useRef<Promise<unknown>>(Promise.resolve())

  const invalidateLocalSession = useCallback(() => {
    if (invalidationPromiseRef.current) return invalidationPromiseRef.current
    authGenerationRef.current += 1

    const invalidation = (async () => {
      clearPrimedMobileAppAccessSnapshot()
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
    // Report-file cleanup is local and independent of the profile read, so it
    // runs alongside it instead of delaying the cold-start request (T03).
    const cleanup = clearPrivateReportFiles()
    const token = getToken()
    const cachedProfile = getSessionProfile()

    if (!token || (canUseDevelopmentMockSession && isMockSessionToken(token))) {
      await cleanup
    }

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
      const [response] = await Promise.all([getCurrentMobileProfile(), cleanup])
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
      // Cold start: the profile read carries the app-access snapshot, so the
      // access gate opens the workspace without a second request. A refreshed
      // session has a new token, so the gate reads the snapshot itself.
      if (nextProfile.token === response.profile.token) {
        primeMobileAppAccessSnapshot(nextProfile.token, response.accessSnapshot)
      }
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
    // Only a background -> active return; refreshSession itself calls the
    // server only when the stored session is close to expiry.
    const isResume = createBackgroundResumeTracker(AppState.currentState)
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (isResume(nextState)) void refreshSession()
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
    async (
      nextProfile: MobileProfile,
      accessSnapshot?: MobileAppAccessSnapshot
    ) => {
      await Promise.all([
        clearMobileFormDrafts(),
        clearPrivateReportFiles(),
        clearMobileReadCache(),
      ])
      await persistMobileSessionAtomically({
        clearSession,
        persistProfile: setSessionProfile,
        persistToken: setToken,
        profile: nextProfile,
      })
      primeMobileAppAccessSnapshot(nextProfile.token, accessSnapshot)
      setProfile(nextProfile)
    },
    []
  )

  const signInWithPassword = useCallback(
    async (
      input: MobileSignInCredentials,
      beforeActivate?: (profile: MobileProfile) => Promise<void> | void
    ) => {
      // The previous account's local data is cleared while the request is in
      // flight instead of before it; both finish before the new session is
      // stored.
      const [response] = await Promise.all([
        signInWithMobileAuth(input),
        clearMobileFormDrafts(),
        clearPrivateReportFiles(),
        clearMobileReadCache(),
      ])
      await Promise.all([
        beforeActivate?.(response.profile),
        persistMobileSessionAtomically({
          clearSession,
          persistProfile: setSessionProfile,
          persistToken: setToken,
          profile: response.profile,
        }),
      ])
      primeMobileAppAccessSnapshot(
        response.profile.token,
        response.accessSnapshot
      )
      setProfile(response.profile)
      return response.profile
    },
    []
  )

  const signOut = useCallback(async () => {
    const shouldRevokeServerSession = Boolean(
      profile?.token && !isMockSessionToken(profile.token)
    )

    if (shouldRevokeServerSession) {
      // Local session cleanup still wins when the server session is already
      // gone or unreachable; revocation may remain unconfirmed offline.
      await Promise.race([
        signOutMobileAuth().catch(() => undefined),
        new Promise((resolve) =>
          setTimeout(resolve, SERVER_SIGN_OUT_BUDGET_MS)
        ),
      ])
    }

    await invalidateLocalSession()
  }, [invalidateLocalSession, profile?.token])

  const switchRoleNow = useCallback(
    async (membershipId: string) => {
      const generation = authGenerationRef.current
      const assertCurrentGeneration = async () => {
        if (generation !== authGenerationRef.current) {
          // Sign-out raced this switch: never leave its replacement token.
          await clearSession()
          throw new Error("The session changed before the switch completed.")
        }
      }
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
            await assertCurrentGeneration()
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
          await assertCurrentGeneration()
          await persistMobileSessionAtomically({
            clearSession,
            persistProfile: setSessionProfile,
            persistToken: setToken,
            profile: next,
          })
        },
      })
      await assertCurrentGeneration()
      setProfile(nextProfile)

      return nextProfile
    },
    [profile?.token]
  )

  // Manual role switching and shortcut launches share one serialized
  // context-transition lane.
  const switchRole = useCallback(
    (membershipId: string) => {
      const run = contextTransitionRef.current.then(() =>
        switchRoleNow(membershipId)
      )
      contextTransitionRef.current = run.catch(() => undefined)
      return run
    },
    [switchRoleNow]
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
