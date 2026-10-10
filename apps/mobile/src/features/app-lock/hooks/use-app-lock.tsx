import { loadAppLockState } from "@/features/app-lock/model/app-lock-hydration"
import type {
  AppLockConfig,
  AppLockIdentity,
  AppLockReadResult,
  AppLockRelockAfterMs,
  AppLockVerificationResult,
} from "@/features/app-lock/model/app-lock-types"
import {
  shouldClearAppLockForIdentityChange,
  shouldRelockApp,
} from "@/features/app-lock/model/app-lock-types"
import {
  type AppLockBiometricsStatus,
  authenticateAppLockBiometrics,
  readAppLockBiometricsStatus,
} from "@/features/app-lock/platform/app-lock-biometrics"
import {
  disableAppLockPrivacy,
  enableAppLockPrivacy,
} from "@/features/app-lock/platform/app-lock-privacy"
import { appLockStore } from "@/features/app-lock/platform/app-lock-store"
import { useAuthContext } from "@/hooks/use-auth"
import { registerMobileLocalSecurityClearer } from "@/lib/mobile-session-invalidation"
import { getOrCreateMobileDeviceId } from "@/lib/session-store"
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { AppState, type AppStateStatus } from "react-native"

type AppLockReadErrorReason = Extract<
  AppLockReadResult,
  { status: "error" }
>["reason"]

type AppLockContextValue = {
  biometricsStatus: AppLockBiometricsStatus
  clearLock: () => Promise<void>
  config: AppLockConfig | null
  hydrationError: AppLockReadErrorReason | null
  isConfigured: boolean
  isHydrated: boolean
  isLocked: boolean
  isPrivacyCurtainVisible: boolean
  lockEpoch: number
  lockNow: () => void
  refreshBiometrics: () => Promise<AppLockBiometricsStatus>
  setBiometricsEnabled: (enabled: boolean) => Promise<AppLockConfig | null>
  setCode: (code: string) => Promise<AppLockConfig | null>
  setRelockAfterMs: (
    relockAfterMs: AppLockRelockAfterMs
  ) => Promise<AppLockConfig | null>
  unlockWithBiometrics: () => Promise<{ error?: string; ok: boolean }>
  unlockWithCode: (code: string) => Promise<AppLockVerificationResult>
}

const DEFAULT_BIOMETRICS_STATUS: AppLockBiometricsStatus = {
  hasHardware: false,
  isAvailable: false,
  isEnrolled: false,
  label: "Biometrics",
  reason: "Biometric unlock is not available on this device.",
  securityLevel: 0,
  supportedTypes: [],
}

const AppLockContext = createContext<AppLockContextValue | null>(null)
const allowQaScreenshots =
  __DEV__ && process.env.EXPO_PUBLIC_QA_ALLOW_APP_LOCK_SCREENSHOTS === "true"

function identityKey(identity: AppLockIdentity | null) {
  return identity ? `${identity.deviceId}:${identity.userId}` : null
}

export function AppLockProvider({ children }: { children: ReactNode }) {
  const auth = useAuthContext()
  const userId = auth.profile?.user.id ?? null
  const deviceId = useMemo(getOrCreateMobileDeviceId, [userId])
  const identity = useMemo<AppLockIdentity | null>(
    () => (userId ? { deviceId, userId } : null),
    [deviceId, userId]
  )
  const currentIdentityKey = identityKey(identity)
  const [biometricsStatus, setBiometricsStatus] =
    useState<AppLockBiometricsStatus>(DEFAULT_BIOMETRICS_STATUS)
  const [config, setConfig] = useState<AppLockConfig | null>(null)
  const [hydratedIdentityKey, setHydratedIdentityKey] = useState<string | null>(
    null
  )
  const [hydrationError, setHydrationError] =
    useState<AppLockReadErrorReason | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [isPrivacyCurtainVisible, setIsPrivacyCurtainVisible] = useState(false)
  const [lockEpoch, setLockEpoch] = useState(0)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)
  const backgroundedAtRef = useRef<number | null>(null)
  const biometricPromptActiveRef = useRef(false)
  const identityRef = useRef(identity)
  const previousIdentityRef = useRef<AppLockIdentity | null>(null)
  const hydrationGenerationRef = useRef(0)
  identityRef.current = identity

  const refreshBiometrics = useCallback(async () => {
    const next = await readAppLockBiometricsStatus()
    setBiometricsStatus(next)
    return next
  }, [])

  const applyReadResult = useCallback(
    (result: AppLockReadResult, key: string, lockIfConfigured: boolean) => {
      setHydratedIdentityKey(key)
      if (result.status === "error") {
        setConfig(null)
        setHydrationError(result.reason)
        setIsLocked(true)
        setLockEpoch((value) => value + 1)
        return
      }

      setHydrationError(null)
      setConfig(result.config)
      if (result.status === "missing") {
        setIsLocked(false)
      } else if (lockIfConfigured) {
        setIsLocked(true)
        setLockEpoch((value) => value + 1)
      }
    },
    []
  )

  const hydrateIdentity = useCallback(
    async (nextIdentity: AppLockIdentity, lockIfConfigured: boolean) => {
      const generation = ++hydrationGenerationRef.current
      const key = identityKey(nextIdentity)
      if (!key) return
      const result = await loadAppLockState(() =>
        appLockStore.read(nextIdentity)
      )
      if (generation !== hydrationGenerationRef.current) return
      applyReadResult(result, key, lockIfConfigured)
    },
    [applyReadResult]
  )

  useEffect(() => {
    const previousIdentity = previousIdentityRef.current
    previousIdentityRef.current = identity
    hydrationGenerationRef.current += 1

    if (
      previousIdentity &&
      shouldClearAppLockForIdentityChange({
        nextIdentity: identity,
        previousIdentity,
      })
    ) {
      void appLockStore.clear(previousIdentity).catch(() => undefined)
    }

    if (!identity || !currentIdentityKey) {
      setConfig(null)
      setHydrationError(null)
      setHydratedIdentityKey(null)
      setIsLocked(false)
      setIsPrivacyCurtainVisible(false)
      return
    }

    setHydratedIdentityKey(null)
    setHydrationError(null)
    setIsPrivacyCurtainVisible(true)
    void Promise.all([
      hydrateIdentity(identity, true),
      refreshBiometrics(),
    ]).finally(() => {
      if (
        identityRef.current === identity &&
        AppState.currentState === "active"
      ) {
        setIsPrivacyCurtainVisible(false)
      }
    })
  }, [currentIdentityKey, hydrateIdentity, identity, refreshBiometrics])

  useEffect(
    () =>
      registerMobileLocalSecurityClearer(async () => {
        const current = identityRef.current
        if (current) await appLockStore.clear(current)
        setConfig(null)
        setHydrationError(null)
        setHydratedIdentityKey(null)
        setIsLocked(false)
      }),
    []
  )

  useEffect(() => {
    const shouldProtect = Boolean(
      identity && (config?.enabled || hydrationError)
    )
    if (!shouldProtect || allowQaScreenshots) {
      void disableAppLockPrivacy()
      return
    }

    void enableAppLockPrivacy()
    return () => {
      void disableAppLockPrivacy()
    }
  }, [config?.enabled, hydrationError, identity])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      const previousState = appStateRef.current
      appStateRef.current = nextState

      if (!identityRef.current || biometricPromptActiveRef.current) return

      if (nextState !== "active") {
        setIsPrivacyCurtainVisible(true)
        if (backgroundedAtRef.current === null) {
          backgroundedAtRef.current = Date.now()
        }
        if (config?.enabled && config.relockAfterMs === 0) {
          setIsLocked(true)
          setLockEpoch((value) => value + 1)
        }
        return
      }

      const wasBackgrounded =
        previousState === "background" || previousState === "inactive"
      if (!wasBackgrounded) {
        setIsPrivacyCurtainVisible(false)
        return
      }

      const currentIdentity = identityRef.current
      if (!currentIdentity) return
      const backgroundedAt = backgroundedAtRef.current
      backgroundedAtRef.current = null
      setIsPrivacyCurtainVisible(true)

      void Promise.all([
        loadAppLockState(() => appLockStore.read(currentIdentity)),
        refreshBiometrics(),
      ]).then(([result]) => {
        const key = identityKey(currentIdentity)
        if (!key || identityRef.current !== currentIdentity) return

        const shouldLock =
          result.status === "configured" &&
          shouldRelockApp({
            backgroundedAt,
            now: Date.now(),
            relockAfterMs: result.config.relockAfterMs,
          })
        applyReadResult(result, key, shouldLock)
        setIsPrivacyCurtainVisible(false)
      })
    })

    return () => subscription.remove()
  }, [
    applyReadResult,
    config?.enabled,
    config?.relockAfterMs,
    refreshBiometrics,
  ])

  const setCode = useCallback(async (code: string) => {
    const current = identityRef.current
    if (!current) return null
    const next = await appLockStore.setCode(current, code)
    setConfig(next)
    setHydrationError(null)
    setHydratedIdentityKey(identityKey(current))
    setIsLocked(false)
    return next
  }, [])

  const setBiometricsEnabled = useCallback(async (enabled: boolean) => {
    const current = identityRef.current
    if (!current) return null
    const next = await appLockStore.setBiometricsEnabled(current, enabled)
    setConfig(next)
    return next
  }, [])

  const setRelockAfterMs = useCallback(
    async (relockAfterMs: AppLockRelockAfterMs) => {
      const current = identityRef.current
      if (!current) return null
      const next = await appLockStore.setRelockAfterMs(current, relockAfterMs)
      setConfig(next)
      return next
    },
    []
  )

  const unlockWithCode = useCallback(async (code: string) => {
    const current = identityRef.current
    if (!current) {
      return {
        config: null,
        ok: false,
        reason: "missing",
      } satisfies AppLockVerificationResult
    }
    const result = await appLockStore.verifyCode(current, code)
    setConfig(result.config)
    if (result.ok) {
      setHydrationError(null)
      setIsLocked(false)
    }
    return result
  }, [])

  const unlockWithBiometrics = useCallback(async () => {
    const current = identityRef.current
    if (!current || !config?.enabled || !config.biometricsEnabled) {
      return { ok: false }
    }

    const status = await refreshBiometrics()
    if (!status.isAvailable) {
      return {
        error: status.reason ?? "Biometric unlock is unavailable.",
        ok: false,
      }
    }

    biometricPromptActiveRef.current = true
    try {
      const result = await authenticateAppLockBiometrics({
        cooperativeName: auth.profile?.tenant.name ?? "your cooperative",
        label: status.label,
      })
      if (!result.success) {
        if (
          result.error === "user_cancel" ||
          result.error === "system_cancel"
        ) {
          return { ok: false }
        }
        return {
          error:
            result.warning ??
            `${status.label} did not unlock the app. Enter your PIN to continue.`,
          ok: false,
        }
      }

      const next = await appLockStore.recordUnlock(current)
      setConfig(next)
      setIsLocked(false)
      return { ok: true }
    } finally {
      biometricPromptActiveRef.current = false
      appStateRef.current = AppState.currentState
      backgroundedAtRef.current = null
      if (AppState.currentState === "active") {
        setIsPrivacyCurtainVisible(false)
      }
    }
  }, [auth.profile?.tenant.name, config, refreshBiometrics])

  const clearLock = useCallback(async () => {
    const current = identityRef.current
    if (!current) return
    await appLockStore.clear(current)
    setConfig(null)
    setHydrationError(null)
    setIsLocked(false)
  }, [])

  const lockNow = useCallback(() => {
    if (!config?.enabled) return
    setIsLocked(true)
    setLockEpoch((value) => value + 1)
  }, [config?.enabled])

  const isHydrated =
    !identity ||
    (currentIdentityKey !== null && hydratedIdentityKey === currentIdentityKey)
  const value = useMemo<AppLockContextValue>(
    () => ({
      biometricsStatus,
      clearLock,
      config,
      hydrationError,
      isConfigured: Boolean(config?.enabled),
      isHydrated,
      isLocked,
      isPrivacyCurtainVisible,
      lockEpoch,
      lockNow,
      refreshBiometrics,
      setBiometricsEnabled,
      setCode,
      setRelockAfterMs,
      unlockWithBiometrics,
      unlockWithCode,
    }),
    [
      biometricsStatus,
      clearLock,
      config,
      hydrationError,
      isHydrated,
      isLocked,
      isPrivacyCurtainVisible,
      lockEpoch,
      lockNow,
      refreshBiometrics,
      setBiometricsEnabled,
      setCode,
      setRelockAfterMs,
      unlockWithBiometrics,
      unlockWithCode,
    ]
  )

  return (
    <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>
  )
}

export function useAppLockContext() {
  const value = useContext(AppLockContext)
  if (!value) {
    throw new Error("useAppLockContext must be used inside AppLockProvider")
  }
  return value
}
