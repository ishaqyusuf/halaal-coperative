import {
  GateHeroSurface,
  GateMark,
  gateIdentityFor,
} from "@/components/app/gate-hero"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import {
  AppLockPinDots,
  AppLockPinPad,
} from "@/features/app-lock/components/app-lock-pin-pad"
import { useAppLockContext } from "@/features/app-lock/hooks/use-app-lock"
import { APP_LOCK_CODE_LENGTH } from "@/features/app-lock/model/app-lock-types"
import { useAuthContext } from "@/hooks/use-auth"
import { resolveDockedFooterInset } from "@/lib/docked-footer-inset"
import { OverlayStatusBar } from "@/components/app/screen-status-bar"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Platform, StyleSheet, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

function formatLockout(value?: string | null) {
  if (!value) return "Try again in a few seconds."
  const remaining = new Date(value).getTime() - Date.now()
  if (!Number.isFinite(remaining) || remaining <= 0) return "Try again now."
  const seconds = Math.max(1, Math.ceil(remaining / 1_000))
  return `Too many attempts. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`
}

function useAppLockCover() {
  const auth = useAuthContext()
  const appLock = useAppLockContext()
  const shouldBlock = Boolean(
    auth.profile &&
    (!appLock.isHydrated || appLock.isLocked || appLock.hydrationError)
  )
  const shouldConceal = Boolean(auth.profile && appLock.isPrivacyCurtainVisible)
  return { shouldBlock, shouldConceal }
}

/**
 * Hides the app behind the lock cover from accessibility services. The cover
 * is drawn on top, but without this TalkBack can still read the balances
 * underneath while the PIN screen is up.
 */
export function AppLockContentIsolation({ children }: { children: ReactNode }) {
  const { shouldBlock, shouldConceal } = useAppLockCover()
  const hidden = shouldBlock || shouldConceal

  return (
    <View
      aria-hidden={hidden}
      accessibilityElementsHidden={hidden}
      className="flex-1"
      collapsable={false}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
    >
      {children}
    </View>
  )
}

export function AppLockGate() {
  const { shouldBlock, shouldConceal } = useAppLockCover()

  if (!shouldBlock && !shouldConceal) return null

  return (
    <View
      accessibilityViewIsModal
      className="bg-background"
      importantForAccessibility="yes"
      style={[StyleSheet.absoluteFill, { elevation: 5000, zIndex: 5000 }]}
    >
      {shouldConceal && !shouldBlock ? (
        <PrivacyCurtain />
      ) : (
        <AppLockUnlockScreen />
      )}
    </View>
  )
}

/** App-switcher curtain (02 Brand hero): full gradient, shield, one line. */
function PrivacyCurtain() {
  return (
    <View className="flex-1">
      <OverlayStatusBar tone="hero" />
      <GateHeroSurface fill>
        <View className="flex-1 items-center justify-center gap-[18px]">
          <View className="size-[72px] items-center justify-center rounded-[24px] bg-hero-foreground/15">
            <Icon className="size-xl text-hero-foreground" name="ShieldCheck" />
          </View>
          <Text
            className="text-center text-hero-foreground"
            variant="screenTitle"
          >
            HalaalVest is private
          </Text>
        </View>
      </GateHeroSurface>
    </View>
  )
}

function AppLockUnlockScreen() {
  const auth = useAuthContext()
  const appLock = useAppLockContext()
  const insets = useSafeAreaInsets()
  const [code, setCode] = useState("")
  const [errorKey, setErrorKey] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<string | null>(null)
  const promptedEpochRef = useRef<number | null>(null)
  const canUseBiometrics = Boolean(
    appLock.config?.biometricsEnabled &&
    appLock.biometricsStatus.isAvailable &&
    appLock.isHydrated &&
    !appLock.hydrationError
  )
  const isTemporarilyLocked = Boolean(
    lockedUntil && new Date(lockedUntil).getTime() > Date.now()
  )

  const runBiometricUnlock = useCallback(async () => {
    if (!canUseBiometrics) return
    const result = await appLock.unlockWithBiometrics()
    if (!result.ok && result.error) setMessage(result.error)
  }, [appLock, canUseBiometrics])

  const submitCode = useCallback(async () => {
    if (
      code.length !== APP_LOCK_CODE_LENGTH ||
      isSubmitting ||
      isTemporarilyLocked
    ) {
      return
    }
    setIsSubmitting(true)
    const result = await appLock.unlockWithCode(code)
    setIsSubmitting(false)
    setCode("")
    if (result.ok) {
      setMessage(null)
      setLockedUntil(null)
      return
    }
    setErrorKey((value) => value + 1)
    if (result.reason === "locked") {
      setLockedUntil(result.lockedUntil ?? null)
      setMessage(formatLockout(result.lockedUntil))
      return
    }
    setMessage(
      result.reason === "storage_error"
        ? "App lock storage is unavailable. Sign out securely to recover."
        : "That PIN did not match."
    )
  }, [appLock, code, isSubmitting, isTemporarilyLocked])

  useEffect(() => {
    if (code.length === APP_LOCK_CODE_LENGTH) void submitCode()
  }, [code.length, submitCode])

  useEffect(() => {
    if (!canUseBiometrics || promptedEpochRef.current === appLock.lockEpoch) {
      return
    }
    promptedEpochRef.current = appLock.lockEpoch
    void runBiometricUnlock()
  }, [appLock.lockEpoch, canUseBiometrics, runBiometricUnlock])

  useEffect(() => {
    if (!lockedUntil) return
    const remaining = new Date(lockedUntil).getTime() - Date.now()
    if (!Number.isFinite(remaining) || remaining <= 0) {
      setLockedUntil(null)
      setMessage(null)
      return
    }
    const timeout = setTimeout(() => {
      setLockedUntil(null)
      setMessage(null)
    }, remaining)
    return () => clearTimeout(timeout)
  }, [lockedUntil])

  const signOutSecurely = useCallback(async () => {
    try {
      await appLock.clearLock()
    } catch {
      // Account sign-out must remain available when local storage is damaged.
    }
    await auth.signOut()
  }, [appLock, auth])

  const helperMessage = useMemo(() => {
    if (!appLock.isHydrated) return "Checking app lock on this phone."
    if (appLock.hydrationError) {
      return "Local protection could not be verified. Sign out securely to reset it."
    }
    if (message) return message
    if (
      appLock.config?.biometricsEnabled &&
      !appLock.biometricsStatus.isAvailable
    ) {
      return appLock.biometricsStatus.reason ?? "Enter your PIN to continue."
    }
    return canUseBiometrics
      ? `Enter your PIN or use ${appLock.biometricsStatus.label.toLowerCase()}.`
      : "Enter your six-digit PIN."
  }, [
    appLock.biometricsStatus.isAvailable,
    appLock.biometricsStatus.label,
    appLock.biometricsStatus.reason,
    appLock.config?.biometricsEnabled,
    appLock.hydrationError,
    appLock.isHydrated,
    canUseBiometrics,
    message,
  ])

  const identity = gateIdentityFor(auth.profile)
  const hasError = Boolean(message) || isTemporarilyLocked

  return (
    <View className="flex-1 bg-background" testID="app-lock-unlock">
      <OverlayStatusBar tone="hero" />
      <GateHeroSurface minHeightRatio={0.3}>
        <View />
        <View className="gap-[12px]">
          <GateMark identity={identity} size={56} />
          <View className="gap-[4px]">
            <Text
              accessibilityRole="header"
              className="text-hero-foreground"
              variant="screenTitle"
            >
              {appLock.hydrationError
                ? "App lock needs attention"
                : "Unlock HalaalVest"}
            </Text>
            <Text
              className="text-hero-foreground/80"
              numberOfLines={2}
              variant="small"
            >
              {[auth.profile?.tenant.name, auth.profile?.user.name]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
        </View>
      </GateHeroSurface>

      {appLock.hydrationError ? (
        <View className="flex-1 justify-between px-[18px] pt-[28px]">
          <View className="items-center gap-[14px]">
            <View className="size-[64px] items-center justify-center rounded-full bg-tint-danger">
              <Icon
                className="size-xl text-tint-danger-foreground"
                name="ShieldAlert"
              />
            </View>
            <Text
              accessibilityLiveRegion="polite"
              className="max-w-[320px] text-center text-foreground-soft"
              variant="body"
            >
              {helperMessage}
            </Text>
          </View>
          <View
            style={{
              paddingBottom: resolveDockedFooterInset(insets.bottom, Platform.OS),
            }}
          >
            <Button onPress={() => void signOutSecurely()}>
              <Icon className="size-base text-primary-foreground" name="LogOut" />
              <Text>Sign out securely</Text>
            </Button>
          </View>
        </View>
      ) : (
        <View className="flex-1 px-[18px]">
          <View className="flex-1 items-center justify-center gap-[14px] py-[16px]">
            <AppLockPinDots
              error={hasError}
              errorKey={errorKey}
              value={code}
            />
            <Text
              accessibilityLiveRegion="polite"
              className={
                hasError
                  ? "min-h-[40px] max-w-[320px] text-center font-semibold text-destructive"
                  : "min-h-[40px] max-w-[320px] text-center text-muted-foreground"
              }
              variant="small"
            >
              {helperMessage}
            </Text>
          </View>
          <AppLockPinPad
            biometricLabel={appLock.biometricsStatus.label}
            disabled={!appLock.isHydrated || isSubmitting || isTemporarilyLocked}
            onBiometricPress={() => void runBiometricUnlock()}
            onChange={(value) => {
              setCode(value)
              setMessage(null)
            }}
            showBiometric={canUseBiometrics}
            value={code}
          />
          <View
            style={{
              paddingBottom: Math.max(insets.bottom, 12),
              paddingTop: 6,
            }}
          >
            <Pressable
              accessibilityLabel="Forgot PIN? Sign out securely"
              accessibilityRole="button"
              className="min-h-[44px] items-center justify-center px-[16px]"
              onPress={() => void signOutSecurely()}
            >
              <Text className="text-center text-foreground-soft" variant="label">
                Forgot PIN? Sign out securely
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}
