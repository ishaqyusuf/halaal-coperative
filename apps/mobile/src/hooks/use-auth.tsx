import {
  clearSession,
  createMockProfile,
  getSessionProfile,
  setSessionProfile,
  setToken,
  type MobileProfile,
  type MobileRole,
} from "@/lib/session-store"
import {
  signInWithMobileAuth,
  signOutMobileAuth,
  type MobileSignInCredentials,
} from "@/lib/mobile-auth-api"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

type AuthContextValue = {
  initializing: boolean
  profile: MobileProfile | null
  signInWithPassword: (input: MobileSignInCredentials) => Promise<void>
  role: MobileRole | null
  signInAs: (role: MobileRole) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [initializing, setInitializing] = useState(true)
  const [profile, setProfile] = useState<MobileProfile | null>(null)

  useEffect(() => {
    setProfile(getSessionProfile())
    setInitializing(false)
  }, [])

  const signInAs = useCallback(async (role: MobileRole) => {
    const nextProfile = createMockProfile(role)
    await setToken(nextProfile.token)
    await setSessionProfile(nextProfile)
    setProfile(nextProfile)
  }, [])

  const signInWithPassword = useCallback(
    async (input: MobileSignInCredentials) => {
      const response = await signInWithMobileAuth(input)
      await setToken(response.profile.token)
      await setSessionProfile(response.profile)
      setProfile(response.profile)
    },
    []
  )

  const signOut = useCallback(async () => {
    try {
      await signOutMobileAuth()
    } finally {
      await clearSession()
      setProfile(null)
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      initializing,
      profile,
      role: profile?.role ?? null,
      signInWithPassword,
      signInAs,
      signOut,
    }),
    [initializing, profile, signInAs, signInWithPassword, signOut]
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
