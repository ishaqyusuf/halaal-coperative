import { ConfirmationSheet } from "@/components/app/confirmation-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { ScreenHeader } from "@/components/app/screen-header"
import { StatusBadge } from "@/components/app/status-badge"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Switch } from "@/components/ui/switch"
import { Text } from "@/components/ui/text"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { AppLockPinPad } from "@/features/app-lock/components/app-lock-pin-pad"
import type { AppLockBiometricsStatus } from "@/features/app-lock/platform/app-lock-biometrics"
import type {
  AppLockConfig,
  AppLockRelockAfterMs,
  AppLockVerificationResult,
} from "@/features/app-lock/model/app-lock-types"
import { APP_LOCK_CODE_LENGTH } from "@/features/app-lock/model/app-lock-types"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useCallback, useMemo, useRef, useState } from "react"
import { ScrollView, View } from "react-native"

type PinFlow =
  | "biometrics-verify"
  | "change-confirm"
  | "change-create"
  | "change-verify"
  | "disable-verify"
  | "setup-confirm"
  | "setup-create"

const RELOCK_OPTIONS: readonly {
  compactLabel: string
  description: string
  value: AppLockRelockAfterMs
}[] = [
  {
    compactLabel: "Immediately",
    description: "Require the PIN whenever HalaalVest leaves the foreground.",
    value: 0,
  },
  {
    compactLabel: "1 minute",
    description: "Allow a short return from another app.",
    value: 60_000,
  },
  {
    compactLabel: "5 minutes",
    description: "Useful when switching between trusted work apps.",
    value: 300_000,
  },
]

function getPinFlowCopy(flow: PinFlow) {
  switch (flow) {
    case "setup-create":
      return {
        action: "Continue",
        body: "Choose six digits that are different from your phone unlock code.",
        step: "Step 1 of 2",
        title: "Create your app PIN",
      }
    case "setup-confirm":
      return {
        action: "Enable app lock",
        body: "Enter the same six digits again to confirm them.",
        step: "Step 2 of 2",
        title: "Confirm your app PIN",
      }
    case "change-verify":
      return {
        action: "Verify PIN",
        body: "Enter your current PIN before creating a new one.",
        step: "Security check",
        title: "Verify your current PIN",
      }
    case "change-create":
      return {
        action: "Continue",
        body: "Choose a new six-digit PIN for this phone.",
        step: "Step 1 of 2",
        title: "Create a new PIN",
      }
    case "change-confirm":
      return {
        action: "Save new PIN",
        body: "Enter the new PIN again to confirm it.",
        step: "Step 2 of 2",
        title: "Confirm your new PIN",
      }
    case "disable-verify":
      return {
        action: "Verify PIN",
        body: "Confirm your current PIN before removing local protection.",
        step: "Security check",
        title: "Verify your PIN",
      }
    case "biometrics-verify":
      return {
        action: "Verify and continue",
        body: "Confirm your current PIN before changing biometric unlock.",
        step: "Security check",
        title: "Verify your PIN",
      }
  }
}

function getVerificationMessage(result: AppLockVerificationResult) {
  if (result.ok) return null
  if (result.reason === "locked") {
    return "Too many attempts. Wait briefly before trying again."
  }
  if (result.reason === "storage_error") {
    return "Local protection could not be verified. Sign out securely from the lock screen to recover."
  }
  return "That PIN did not match."
}

export function AppLockScreen({
  biometricsStatus,
  config,
  cooperativeName,
  isHydrated,
  onBack,
  onClearLock,
  onLockNow,
  onRefreshBiometrics,
  onSetBiometricsEnabled,
  onSetCode,
  onSetRelockAfterMs,
  onVerifyCode,
  userName,
}: {
  biometricsStatus: AppLockBiometricsStatus
  config: AppLockConfig | null
  cooperativeName: string
  isHydrated: boolean
  onBack: () => void
  onClearLock: () => Promise<void>
  onLockNow: () => void
  onRefreshBiometrics: () => Promise<AppLockBiometricsStatus>
  onSetBiometricsEnabled: (enabled: boolean) => Promise<AppLockConfig | null>
  onSetCode: (code: string) => Promise<AppLockConfig | null>
  onSetRelockAfterMs: (
    value: AppLockRelockAfterMs
  ) => Promise<AppLockConfig | null>
  onVerifyCode: (code: string) => Promise<AppLockVerificationResult>
  userName: string
}) {
  const largeTextLayout = useLargeTextLayout()
  const colors = useColors()
  const [flow, setFlow] = useState<PinFlow | null>(null)
  const [code, setCode] = useState("")
  const [newCode, setNewCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDisableConfirmationVisible, setIsDisableConfirmationVisible] =
    useState(false)
  const [isDisabling, setIsDisabling] = useState(false)
  const pendingBiometricsEnabledRef = useRef<boolean | null>(null)
  const showDisableAfterDismissRef = useRef(false)
  const pinFlowCopy = useMemo(
    () => (flow ? getPinFlowCopy(flow) : null),
    [flow]
  )
  const selectedRelockOption = config
    ? RELOCK_OPTIONS.find((option) => option.value === config.relockAfterMs)
    : null

  const resetFlow = useCallback(() => {
    setFlow(null)
    setCode("")
    setNewCode("")
    setError(null)
    setIsSubmitting(false)
    pendingBiometricsEnabledRef.current = null
  }, [])

  const beginFlow = useCallback((nextFlow: PinFlow) => {
    setCode("")
    setNewCode("")
    setError(null)
    setNotice(null)
    setFlow(nextFlow)
  }, [])

  const completeCodeSetup = useCallback(
    async (successNotice: string) => {
      const result = await onSetCode(code)
      if (!result) {
        setError("App lock could not be saved on this phone.")
        return
      }
      setNotice(successNotice)
      resetFlow()
    },
    [code, onSetCode, resetFlow]
  )

  const submitPinFlow = useCallback(async () => {
    if (!flow || code.length !== APP_LOCK_CODE_LENGTH || isSubmitting) return
    setIsSubmitting(true)
    setError(null)

    try {
      if (flow === "setup-create" || flow === "change-create") {
        setNewCode(code)
        setCode("")
        setFlow(flow === "setup-create" ? "setup-confirm" : "change-confirm")
        return
      }

      if (flow === "setup-confirm" || flow === "change-confirm") {
        if (code !== newCode) {
          setCode("")
          setError("The PINs do not match. Enter the confirmation again.")
          return
        }
        await completeCodeSetup(
          flow === "setup-confirm"
            ? "App lock is protecting this phone."
            : "Your app PIN was changed."
        )
        return
      }

      const verification = await onVerifyCode(code)
      const verificationMessage = getVerificationMessage(verification)
      if (verificationMessage) {
        setCode("")
        setError(verificationMessage)
        return
      }

      if (flow === "change-verify") {
        setCode("")
        setFlow("change-create")
        return
      }

      if (flow === "disable-verify") {
        showDisableAfterDismissRef.current = true
        resetFlow()
        return
      }

      const enabled = pendingBiometricsEnabledRef.current
      if (flow === "biometrics-verify" && enabled !== null) {
        const result = await onSetBiometricsEnabled(enabled)
        if (!result) {
          setError("Biometric unlock could not be updated.")
          return
        }
        setNotice(
          enabled
            ? `${biometricsStatus.label} unlock is enabled.`
            : `${biometricsStatus.label} unlock is disabled.`
        )
        resetFlow()
      }
    } catch {
      setError("App lock could not be updated. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [
    biometricsStatus.label,
    code,
    completeCodeSetup,
    flow,
    isSubmitting,
    newCode,
    onSetBiometricsEnabled,
    onVerifyCode,
    resetFlow,
  ])

  const handleBiometricsChange = useCallback(
    async (enabled: boolean) => {
      setNotice(null)
      const status = await onRefreshBiometrics()
      if (enabled && !status.isAvailable) {
        setNotice(status.reason ?? "Biometric unlock is unavailable.")
        return
      }
      pendingBiometricsEnabledRef.current = enabled
      beginFlow("biometrics-verify")
    },
    [beginFlow, onRefreshBiometrics]
  )

  const handleRelockChange = useCallback(
    async (value: AppLockRelockAfterMs) => {
      if (!config || value === config.relockAfterMs) return
      setNotice(null)
      const result = await onSetRelockAfterMs(value)
      setNotice(
        result
          ? "Background lock timing updated."
          : "Background lock timing could not be updated."
      )
    },
    [config, onSetRelockAfterMs]
  )

  const handleDisable = useCallback(async () => {
    setIsDisabling(true)
    try {
      await onClearLock()
      setIsDisableConfirmationVisible(false)
      setNotice("App lock was removed from this phone.")
    } catch {
      setNotice("App lock could not be removed. Try again.")
    } finally {
      setIsDisabling(false)
    }
  }, [onClearLock])

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-8 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          leading={
            <Button
              accessibilityLabel="Go back"
              onPress={onBack}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="ArrowLeft" />
            </Button>
          }
          title="App lock"
        />

        <View className="gap-4 border-y border-border py-5">
          <View className="flex-row items-center gap-3">
            <View className="size-12 items-center justify-center rounded-full bg-accent">
              <Icon
                className="size-lg text-accent-foreground"
                name="LockKeyhole"
              />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-2xl font-extrabold tracking-tight text-foreground">
                {config ? "Protection is on" : "Protect this phone"}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {config
                  ? "Your PIN protects this signed-in phone when HalaalVest relocks."
                  : "Create a six-digit PIN before adding biometric unlock."}
              </Text>
            </View>
            {!largeTextLayout ? (
              <StatusBadge
                label={config ? "Protected" : "Not set up"}
                tone={config ? "success" : "muted"}
              />
            ) : null}
          </View>
          {largeTextLayout ? (
            <View className="items-start pl-[60px]">
              <StatusBadge
                label={config ? "Protected" : "Not set up"}
                tone={config ? "success" : "muted"}
              />
            </View>
          ) : null}
          {!config ? (
            <Button
              disabled={!isHydrated}
              onPress={() => beginFlow("setup-create")}
              size="lg"
            >
              <Icon
                className="size-base text-primary-foreground"
                name="LockKeyhole"
              />
              <Text>Set up app lock</Text>
            </Button>
          ) : null}
        </View>

        <View className="gap-3 border-b border-border pb-5">
          <View className="flex-row items-center gap-3">
            <View className="size-11 items-center justify-center rounded-full bg-accent">
              <Icon
                className="size-base text-accent-foreground"
                name="Smartphone"
              />
            </View>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-sm font-bold text-foreground">
                This phone
              </Text>
              <Text className="text-xs leading-4 text-muted-foreground">
                {cooperativeName} · {userName}
              </Text>
            </View>
            {!largeTextLayout ? (
              <Text className="text-xs font-semibold text-muted-foreground">
                Local only
              </Text>
            ) : null}
          </View>
          {largeTextLayout ? (
            <Text className="pl-14 text-xs font-semibold text-muted-foreground">
              Local only
            </Text>
          ) : null}
        </View>

        {notice ? (
          <View
            accessibilityLiveRegion="polite"
            className="flex-row gap-3 border-y border-border py-4"
          >
            <Icon className="size-sm text-brand mt-0.5" name="Info" />
            <Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
              {notice}
            </Text>
          </View>
        ) : null}

        {config ? (
          <>
            <View className="gap-2">
              <Text className="text-lg font-extrabold tracking-tight text-foreground">
                Unlock methods
              </Text>
              <SettingsRow
                detail="Six digits stored securely on this phone"
                icon="LockKeyhole"
                label="App PIN"
                onPress={() => beginFlow("change-verify")}
                trailing={
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs font-semibold text-muted-foreground">
                      Change
                    </Text>
                    <Icon
                      className="size-sm text-muted-foreground"
                      name="ChevronRight"
                    />
                  </View>
                }
              />
              <SettingsRow
                detail={
                  biometricsStatus.isAvailable
                    ? `Use ${biometricsStatus.label.toLowerCase()} after app lock appears`
                    : (biometricsStatus.reason ?? "Unavailable on this phone")
                }
                icon="Fingerprint"
                label={biometricsStatus.label}
                trailing={
                  <Switch
                    accessibilityLabel={`Use ${biometricsStatus.label} for app lock`}
                    checked={config.biometricsEnabled}
                    disabled={!biometricsStatus.isAvailable}
                    onCheckedChange={(value) =>
                      void handleBiometricsChange(Boolean(value))
                    }
                  />
                }
              />
            </View>

            <View className="gap-3">
              <View className="flex-row items-end justify-between gap-4">
                <Text className="text-lg font-extrabold tracking-tight text-foreground">
                  Relock
                </Text>
                <Text className="pb-0.5 text-xs text-muted-foreground">
                  After leaving the app
                </Text>
              </View>
              <View
                accessibilityRole="radiogroup"
                className="flex-row border-y border-border py-2"
              >
                {RELOCK_OPTIONS.map((option) => {
                  const selected = config.relockAfterMs === option.value
                  return (
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      className={
                        selected
                          ? "min-h-11 flex-1 items-center justify-center rounded-full bg-accent px-2"
                          : "min-h-11 flex-1 items-center justify-center px-2"
                      }
                      key={option.value}
                      onPress={() => void handleRelockChange(option.value)}
                    >
                      <Text
                        className={
                          selected
                            ? "text-center text-xs font-bold text-accent-foreground"
                            : "text-center text-xs font-semibold text-muted-foreground"
                        }
                      >
                        {option.compactLabel}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
              <Text className="text-xs leading-5 text-muted-foreground">
                {selectedRelockOption?.description}
              </Text>
            </View>

            <View className="gap-3 border-y border-border py-5">
              <View className="flex-row gap-3">
                <Icon
                  className="size-base text-brand mt-0.5"
                  name="ShieldCheck"
                />
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-sm font-bold text-foreground">
                    Privacy protection is active
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    HalaalVest conceals financial screens in the app switcher
                    and blocks screen capture where the operating system
                    supports it.
                  </Text>
                </View>
              </View>
            </View>

            <View className="gap-3">
              <Button onPress={onLockNow} size="lg">
                <Icon
                  className="size-base text-primary-foreground"
                  name="LockKeyhole"
                />
                <Text>Lock now</Text>
              </Button>
              <Button
                onPress={() => beginFlow("disable-verify")}
                size="lg"
                variant="ghost"
              >
                <Text className="text-destructive">Remove app lock</Text>
              </Button>
            </View>
          </>
        ) : (
          <View className="gap-4 border-y border-border py-5">
            <View className="flex-row gap-3">
              <Icon
                className="size-base text-brand mt-0.5"
                name="ShieldCheck"
              />
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-sm font-bold text-foreground">
                  Separate from your account password
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  The PIN protects only this signed-in phone. Signing out or
                  revoking this device removes its local app lock.
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <FullScreenFormSheet
        dirty={code.length > 0 || newCode.length > 0}
        footer={
          <Button
            disabled={code.length !== APP_LOCK_CODE_LENGTH || isSubmitting}
            onPress={() => void submitPinFlow()}
            size="lg"
          >
            <Text>{isSubmitting ? "Checking" : pinFlowCopy?.action}</Text>
          </Button>
        }
        isSubmitting={isSubmitting}
        onClose={resetFlow}
        onDismissed={() => {
          if (!showDisableAfterDismissRef.current) return
          showDisableAfterDismissRef.current = false
          setIsDisableConfirmationVisible(true)
        }}
        overlay={
          <DevQuickFill
            bottomOffset={84}
            label="Quick fill app PIN"
            onPress={() => setCode(mobileDevQuickFill.appLock.pin)}
            portal={false}
          />
        }
        title={pinFlowCopy?.title ?? "App PIN"}
        visible={flow !== null}
      >
        {flow && pinFlowCopy ? (
          <View className="gap-7">
            <View className="gap-3 border-b border-border pb-5">
              <View className="flex-row items-center gap-2">
                <View className="bg-brand h-1.5 flex-1 rounded-full" />
                <View
                  className={
                    flow === "setup-confirm" || flow === "change-confirm"
                      ? "bg-brand h-1.5 flex-1 rounded-full"
                      : "h-1.5 flex-1 rounded-full bg-muted"
                  }
                />
                <Text className="ml-1 text-xs font-semibold text-muted-foreground">
                  {pinFlowCopy.step}
                </Text>
              </View>
              <Text className="text-sm leading-5 text-muted-foreground">
                {pinFlowCopy.body}
              </Text>
            </View>
            <AppLockPinPad
              disabled={isSubmitting}
              onChange={(value) => {
                setCode(value)
                setError(null)
              }}
              value={code}
            />
            <Text
              accessibilityLiveRegion="polite"
              className={
                error
                  ? "min-h-10 text-center text-xs leading-5 font-semibold text-destructive"
                  : "min-h-10 text-center text-xs leading-5 text-muted-foreground"
              }
            >
              {error ??
                `${code.length} of ${APP_LOCK_CODE_LENGTH} digits entered`}
            </Text>
          </View>
        ) : null}
      </FullScreenFormSheet>

      <ConfirmationSheet
        cancelLabel="Keep app lock"
        confirmLabel="Remove app lock"
        description="This removes the local PIN and biometric unlock from this phone. Your HalaalVest account and device session remain signed in."
        isConfirming={isDisabling}
        onClose={() => setIsDisableConfirmationVisible(false)}
        onConfirm={() => void handleDisable()}
        title="Remove app lock?"
        tone="destructive"
        visible={isDisableConfirmationVisible}
      />
    </SafeArea>
  )
}

function SettingsRow({
  detail,
  icon,
  label,
  onPress,
  trailing,
}: {
  detail: string
  icon: string
  label: string
  onPress?: () => void
  trailing: React.ReactNode
}) {
  const largeTextLayout = useLargeTextLayout()
  const leading = (
    <View className="min-w-0 flex-1 flex-row items-center gap-3">
      <View className="size-10 items-center justify-center rounded-full bg-accent">
        <Icon className="size-sm text-accent-foreground" name={icon} />
      </View>
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-sm font-semibold text-foreground">{label}</Text>
        <Text className="text-xs leading-4 text-muted-foreground">
          {detail}
        </Text>
      </View>
    </View>
  )
  const content = (
    <>
      {leading}
      <View className={largeTextLayout ? "pl-[52px]" : undefined}>
        {trailing}
      </View>
    </>
  )

  const rowClassName = largeTextLayout
    ? "min-h-16 gap-2 border-b border-border py-3"
    : "min-h-16 flex-row items-center gap-3 border-b border-border py-3"

  if (!onPress) {
    return (
      <View className={rowClassName}>
        {content}
      </View>
    )
  }

  return (
    <Pressable
      accessibilityRole="button"
      className={rowClassName}
      onPress={onPress}
    >
      {content}
    </Pressable>
  )
}
