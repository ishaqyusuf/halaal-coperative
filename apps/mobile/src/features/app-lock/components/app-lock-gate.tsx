import { DockedFooter } from "@/components/app/docked-footer"
import { gateIdentityFor } from "@/components/app/gate-hero"
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
import { OverlayStatusBar } from "@/components/app/screen-status-bar"
import { SPLASH_LOGO, SPLASH_LOGO_SIZE } from "@/lib/splash-logo"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { Image, StyleSheet, View } from "react-native"
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
  const appLock = useAppLockContext()
  const { shouldBlock, shouldConceal } = useAppLockCover()

  if (!shouldBlock && !shouldConceal) return null
  // Reading the lock state takes a moment on launch. Until it is known, keep
  // the splash surface up (same canvas, same centred logo) instead of a PIN
  // pad that most people never see; the app stays covered either way.
  const hydrating =
    shouldBlock && !appLock.isHydrated && !appLock.hydrationError

  return (
    <View
      accessibilityViewIsModal
      className="bg-background"
      importantForAccessibility="yes"
      style={[StyleSheet.absoluteFill, { elevation: 5000, zIndex: 5000 }]}
    >
      {hydrating ? (
        <SplashCover />
      ) : shouldConceal && !shouldBlock ? (
        <PrivacyCurtain />
      ) : (
        <AppLockUnlockScreen />
      )}
    </View>
  )
}

/** Launch cover while the lock state loads: the splash canvas and logo. */
function SplashCover() {
  return (
    <View className="flex-1 bg-background" testID="app-lock-hydrating">
      <OverlayStatusBar />
      {/* Style-only: absolute centring that matches the splash logo. */}
      <View
        style={{
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          accessibilityIgnoresInvertColors
          accessible={false}
          fadeDuration={0}
          source={SPLASH_LOGO}
          style={{ height: SPLASH_LOGO_SIZE, width: SPLASH_LOGO_SIZE }}
        />
      </View>
    </View>
  )
}

/** App-switcher curtain (02 Brand hero): full gradient, shield, one line. */
function PrivacyCurtain() {
  return (
    <View className="flex-1 items-center justify-center gap-[16px] bg-background px-[28px]">
      <OverlayStatusBar />
      <View className="size-[72px] items-center justify-center rounded-[24px] bg-accent">
        <Icon className="size-xl text-accent-foreground" name="ShieldCheck" />
      </View>
      <Text className="text-center" variant="screenTitle">
        HalaalVest is private
      </Text>
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
  const mark =
    identity.kind === "cooperative" ? identity.mark : "HV"
  const hasError = Boolean(message) || isTemporarilyLocked

  return (
    <View className="flex-1 bg-background" testID="app-lock-unlock">
      <OverlayStatusBar />
      {/* Style-only: the top padding follows the runtime safe-area inset. */}
      <View style={{ alignItems: "center", gap: 8, paddingHorizontal: 28, paddingTop: insets.top + 28 }}>
        <View className="mb-[6px] size-[64px] items-center justify-center rounded-full bg-brand">
          <Text
            className="text-[20px] font-extrabold text-brand-foreground"
            maxFontSizeMultiplier={1}
          >
            {mark}
          </Text>
        </View>
        <Text accessibilityRole="header" className="text-center" variant="screenTitle">
          {appLock.hydrationError
            ? "App lock needs attention"
            : "Unlock HalaalVest"}
        </Text>
        <Text
          className="text-center text-muted-foreground"
          numberOfLines={2}
          variant="small"
        >
          {[auth.profile?.tenant.name, auth.profile?.user.name]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>

      {appLock.hydrationError ? (
        <>
          <View className="flex-1 items-center justify-center gap-[14px] px-[28px]">
            <View className="size-[60px] items-center justify-center rounded-full bg-tint-danger">
              <Icon
                className="size-xl text-tint-danger-foreground"
                name="ShieldAlert"
              />
            </View>
            <Text
              accessibilityLiveRegion="polite"
              className="max-w-[320px] text-center text-foreground-soft"
              variant="small"
            >
              {helperMessage}
            </Text>
          </View>
          <DockedFooter>
            <Button onPress={() => void signOutSecurely()}>
              <Icon className="size-base text-primary-foreground" name="LogOut" />
              <Text>Sign out securely</Text>
            </Button>
          </DockedFooter>
        </>
      ) : (
        <>
          <View className="flex-1 items-center justify-center gap-[14px] py-[12px]">
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
          {/* Style-only: bottom padding follows the runtime safe-area inset. */}
          <View style={{ paddingBottom: Math.max(insets.bottom, 12) + 8, paddingTop: 10 }}>
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
        </>
      )}
    </View>
  )
}
