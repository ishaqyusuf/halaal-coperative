import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { AppLockPinPad } from "@/features/app-lock/components/app-lock-pin-pad"
import { useAppLockContext } from "@/features/app-lock/hooks/use-app-lock"
import { APP_LOCK_CODE_LENGTH } from "@/features/app-lock/model/app-lock-types"
import { useAuthContext } from "@/hooks/use-auth"
import { useColorScheme, useColors } from "@/hooks/use-color"
import { StatusBar } from "expo-status-bar"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { StyleSheet, View } from "react-native"

function formatLockout(value?: string | null) {
  if (!value) return "Try again in a few seconds."
  const remaining = new Date(value).getTime() - Date.now()
  if (!Number.isFinite(remaining) || remaining <= 0) return "Try again now."
  const seconds = Math.max(1, Math.ceil(remaining / 1_000))
  return `Too many attempts. Try again in ${seconds} second${seconds === 1 ? "" : "s"}.`
}

function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
}

export function AppLockGate() {
  const auth = useAuthContext()
  const appLock = useAppLockContext()
  const shouldBlock = Boolean(
    auth.profile &&
    (!appLock.isHydrated || appLock.isLocked || appLock.hydrationError)
  )
  const shouldConceal = Boolean(auth.profile && appLock.isPrivacyCurtainVisible)

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

function PrivacyCurtain() {
  const colors = useColors()
  return (
    <SafeArea
      className="items-center justify-center bg-background px-8"
      style={{ backgroundColor: colors.background }}
    >
      <View className="size-16 items-center justify-center rounded-full bg-accent">
        <Icon className="size-xl text-accent-foreground" name="ShieldCheck" />
      </View>
      <Text className="mt-5 text-center text-2xl font-extrabold tracking-tight text-foreground">
        HalaalVest is private
      </Text>
    </SafeArea>
  )
}

function AppLockUnlockScreen() {
  const auth = useAuthContext()
  const appLock = useAppLockContext()
  const colors = useColors()
  const { colorScheme } = useColorScheme()
  const [code, setCode] = useState("")
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

  return (
    <SafeArea
      className="bg-background"
      style={{ backgroundColor: colors.background }}
    >
      <StatusBar
        backgroundColor={colors.background}
        style={colorScheme === "dark" ? "light" : "dark"}
      />
      <View className="flex-1 justify-between px-7 pt-8 pb-5">
        <View className="items-center gap-3">
          <View className="bg-brand size-16 items-center justify-center rounded-full">
            <Text className="text-brand-foreground text-lg font-extrabold">
              {initials(auth.profile?.tenant.name ?? "HalaalVest")}
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            className="mt-2 text-center text-[28px] leading-8 font-extrabold tracking-tight text-foreground"
          >
            {appLock.hydrationError
              ? "App lock needs attention"
              : "Unlock HalaalVest"}
          </Text>
          <Text className="max-w-[290px] text-center text-xs leading-5 text-muted-foreground">
            {auth.profile?.tenant.name}
            {auth.profile?.user.name ? ` · ${auth.profile.user.name}` : ""}
          </Text>
        </View>

        {appLock.hydrationError ? (
          <View className="gap-5 border-y border-border py-6">
            <View className="items-center gap-3">
              <Icon className="size-xl text-destructive" name="ShieldAlert" />
              <Text className="text-center text-sm leading-5 text-muted-foreground">
                {helperMessage}
              </Text>
            </View>
            <Button onPress={() => void signOutSecurely()} size="lg">
              <Icon
                className="size-base text-primary-foreground"
                name="LogOut"
              />
              <Text>Sign out securely</Text>
            </Button>
          </View>
        ) : (
          <View className="items-center gap-5">
            <AppLockPinPad
              biometricLabel={appLock.biometricsStatus.label}
              disabled={
                !appLock.isHydrated || isSubmitting || isTemporarilyLocked
              }
              onBiometricPress={() => void runBiometricUnlock()}
              onChange={(value) => {
                setCode(value)
                setMessage(null)
              }}
              showBiometric={canUseBiometrics}
              value={code}
            />
            <Text
              accessibilityLiveRegion="polite"
              className={
                message
                  ? "min-h-10 max-w-[300px] text-center text-xs leading-5 font-semibold text-destructive"
                  : "min-h-10 max-w-[300px] text-center text-xs leading-5 text-muted-foreground"
              }
            >
              {helperMessage}
            </Text>
          </View>
        )}

        {appLock.hydrationError ? (
          <View className="min-h-11" />
        ) : (
          <Pressable
            accessibilityLabel="Forgot PIN? Sign out securely"
            accessibilityRole="button"
            className="min-h-11 items-center justify-center px-4"
            onPress={() => void signOutSecurely()}
          >
            <Text className="text-center text-xs font-semibold text-muted-foreground">
              Forgot PIN? Sign out securely
            </Text>
          </Pressable>
        )}
      </View>
    </SafeArea>
  )
}
