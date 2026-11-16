import { AppSheet } from "@/components/app/app-sheet"
import { ConfirmSheet } from "@/components/app/confirm-sheet"
import { CenteredStatus, GateStatusBadge } from "@/components/app/gate-status"
import { GroupedRow, GroupedSection } from "@/components/app/grouped-section"
import { ScreenShell } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { Button } from "@/components/ui/button"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Text } from "@/components/ui/text"
import {
  AppLockPinDots,
  AppLockPinPad,
} from "@/features/app-lock/components/app-lock-pin-pad"
import type { AppLockBiometricsStatus } from "@/features/app-lock/platform/app-lock-biometrics"
import type {
  AppLockConfig,
  AppLockRelockAfterMs,
  AppLockVerificationResult,
} from "@/features/app-lock/model/app-lock-types"
import { APP_LOCK_CODE_LENGTH } from "@/features/app-lock/model/app-lock-types"
import {
  getPinFlowCopy,
  getVerificationMessage,
  RELOCK_OPTIONS,
  type PinFlow,
} from "@/features/app-lock/model/app-lock-settings-copy"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Switch, useWindowDimensions, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/** Delay after the sixth digit before a step advances (02 Brand hero). */
const AUTO_ADVANCE_MS = 160

type Notice = { text: string; tone: "ok" | "error" }

/**
 * App lock settings (T03, 02 Brand hero): ScreenShell title, a hero status
 * card with Lock now / Set up, then grouped rows (unlock methods, relock,
 * privacy, this phone, remove). PIN steps run in a full-screen form sheet
 * with the native pad; each step advances on the sixth digit, no footer.
 */
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
  const colors = useColors()
  const [flow, setFlow] = useState<PinFlow | null>(null)
  const [code, setCode] = useState("")
  const [newCode, setNewCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)
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

  const fail = useCallback((message: string) => {
    setCode("")
    setError(message)
    setErrorKey((value) => value + 1)
  }, [])

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
          fail("The PINs do not match. Enter the confirmation again.")
          return
        }
        const result = await onSetCode(code)
        if (!result) {
          fail("App lock could not be saved on this phone.")
          return
        }
        setNotice({
          text:
            flow === "setup-confirm"
              ? "App lock is protecting this phone."
              : "Your app PIN was changed.",
          tone: "ok",
        })
        resetFlow()
        return
      }

      const verification = await onVerifyCode(code)
      const verificationMessage = getVerificationMessage(verification)
      if (verificationMessage) {
        fail(verificationMessage)
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
          fail("Biometric unlock could not be updated.")
          return
        }
        setNotice({
          text: enabled
            ? `${biometricsStatus.label} unlock is on.`
            : `${biometricsStatus.label} unlock is off.`,
          tone: "ok",
        })
        resetFlow()
      }
    } catch {
      fail("App lock could not be updated. Try again.")
    } finally {
      setIsSubmitting(false)
    }
  }, [
    biometricsStatus.label,
    code,
    fail,
    flow,
    isSubmitting,
    newCode,
    onSetBiometricsEnabled,
    onSetCode,
    onVerifyCode,
    resetFlow,
  ])

  // Each step advances on the sixth digit: no Continue tap (02 Brand hero).
  useEffect(() => {
    if (!flow || code.length !== APP_LOCK_CODE_LENGTH) return
    const timer = setTimeout(() => void submitPinFlow(), AUTO_ADVANCE_MS)
    return () => clearTimeout(timer)
  }, [code.length, flow, submitPinFlow])

  const handleBiometricsChange = useCallback(
    async (enabled: boolean) => {
      setNotice(null)
      const status = await onRefreshBiometrics()
      if (enabled && !status.isAvailable) {
        setNotice({
          text: status.reason ?? "Biometric unlock is unavailable.",
          tone: "error",
        })
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
          ? { text: "Background lock timing updated.", tone: "ok" }
          : { text: "Background lock timing could not be updated.", tone: "error" }
      )
    },
    [config, onSetRelockAfterMs]
  )

  const handleDisable = useCallback(async () => {
    setIsDisabling(true)
    try {
      await onClearLock()
      setIsDisableConfirmationVisible(false)
      setNotice({ text: "App lock was removed from this phone.", tone: "ok" })
    } catch {
      setNotice({ text: "App lock could not be removed. Try again.", tone: "error" })
    } finally {
      setIsDisabling(false)
    }
  }, [onClearLock])

  return (
    <>
      <ScreenShell
        back={onBack}
        contentClassName="gap-[22px]"
        footer={
          config ? (
            <Button onPress={onLockNow}>
              <Icon className="size-base text-primary-foreground" name="LockKeyhole" />
              <Text>Lock now</Text>
            </Button>
          ) : (
            <Button
              disabled={!isHydrated}
              onPress={() => beginFlow("setup-create")}
            >
              <Icon className="size-base text-primary-foreground" name="LockKeyhole" />
              <Text>Set up app lock</Text>
            </Button>
          )
        }
        testID="app-lock-screen"
        title="App lock"
      >
        {notice ? (
          <View
            accessibilityLiveRegion="polite"
            className={cn(
              "flex-row items-center gap-[10px] rounded-[14px] px-[14px] py-[12px]",
              notice.tone === "ok" ? "bg-tint-success" : "bg-tint-danger"
            )}
          >
            <Icon
              className={cn(
                "size-base",
                notice.tone === "ok"
                  ? "text-tint-success-foreground"
                  : "text-tint-danger-foreground"
              )}
              name={notice.tone === "ok" ? "CircleCheck" : "CircleAlert"}
            />
            <Text
              className={cn(
                "flex-1",
                notice.tone === "ok"
                  ? "text-tint-success-foreground"
                  : "text-tint-danger-foreground"
              )}
              variant="small"
            >
              {notice.text}
            </Text>
          </View>
        ) : null}

        <CenteredStatus
          badge={
            <GateStatusBadge
              icon={config ? "ShieldCheck" : "LockKeyhole"}
              size={76}
              tone={config ? "ok" : "neutral"}
            />
          }
          body={
            config
              ? "Your PIN protects this signed-in phone when HalaalVest relocks."
              : "Create a six-digit PIN before adding biometric unlock."
          }
          pill={
            config
              ? { label: "Protected", tone: "ok" }
              : { label: "Not set up", tone: "neutral" }
          }
          title={config ? "Protection is on" : "Protect this phone"}
        />

        {config ? (
          <View className="gap-[16px]">
            <GroupedSection caption="Unlock methods">
              <GroupedRow
                accessibilityLabel="App PIN, change"
                chevron
                detail="Six digits stored securely on this phone"
                icon="LockKeyhole"
                onPress={() => beginFlow("change-verify")}
                title="App PIN"
                value="Change"
              />
              <GroupedRow
                detail={
                  biometricsStatus.isAvailable
                    ? `Use ${biometricsStatus.label} after app lock appears`
                    : (biometricsStatus.reason ?? "Unavailable on this phone")
                }
                icon={/face/i.test(biometricsStatus.label) ? "ScanFace" : "Fingerprint"}
                title={biometricsStatus.label}
                tone="sky"
                trailing={
                  <Switch
                    accessibilityLabel={`Use ${biometricsStatus.label} for app lock`}
                    disabled={!biometricsStatus.isAvailable}
                    ios_backgroundColor={colors.surfaceRaised}
                    onValueChange={(value) =>
                      void handleBiometricsChange(value)
                    }
                    thumbColor={colors.card}
                    trackColor={{ false: colors.surfaceRaised, true: colors.primary }}
                    value={config.biometricsEnabled}
                  />
                }
              />
            </GroupedSection>

            <GroupedSection
              caption="Relock after leaving the app"
              footnote={selectedRelockOption?.description}
            >
              <View className="px-[12px] py-[10px]">
                <SegmentedControl
                  accessibilityLabel="Relock after leaving the app"
                  onChange={(value) =>
                    void handleRelockChange(Number(value) as AppLockRelockAfterMs)
                  }
                  options={RELOCK_OPTIONS.map((option) => ({
                    label: option.compactLabel,
                    value: String(option.value),
                  }))}
                  value={String(config.relockAfterMs)}
                />
              </View>
            </GroupedSection>

            <GroupedSection>
              <GroupedRow
                detail="HalaalVest hides financial screens in the app switcher and blocks screen capture where the phone supports it."
                icon="ShieldCheck"
                title="Privacy protection is active"
              />
              <GroupedRow
                detail={`${cooperativeName} · ${userName}`}
                icon="Smartphone"
                title="This phone"
                tone="neutral"
                value="Local only"
              />
            </GroupedSection>

            <GroupedSection>
              <GroupedRow
                destructive
                detail="Removes the PIN and biometric unlock from this phone"
                icon="LockKeyhole"
                onPress={() => beginFlow("disable-verify")}
                title="Remove app lock"
              />
            </GroupedSection>
          </View>
        ) : (
          <GroupedSection caption="This phone">
            <GroupedRow
              detail={`${cooperativeName} · ${userName}`}
              icon="Smartphone"
              title="This phone"
              tone="neutral"
              value="Local only"
            />
            <GroupedRow
              detail="The PIN protects only this signed-in phone. Signing out or revoking this device removes its local app lock."
              icon="ShieldCheck"
              title="Separate from your account password"
            />
          </GroupedSection>
        )}
      </ScreenShell>

      <AppSheet
        dirty={code.length > 0 || newCode.length > 0}
        headerTrailing={pinFlowCopy?.step}
        isSubmitting={isSubmitting}
        onClose={resetFlow}
        onDismissed={() => {
          if (!showDisableAfterDismissRef.current) return
          showDisableAfterDismissRef.current = false
          setIsDisableConfirmationVisible(true)
        }}
        title={pinFlowCopy?.title ?? "App PIN"}
        variant="form"
        visible={flow !== null}
      >
        {flow && pinFlowCopy ? (
          <PinStep
            body={pinFlowCopy.body}
            code={code}
            error={error}
            errorKey={errorKey}
            isSubmitting={isSubmitting}
            onChange={(value) => {
              setCode(value)
              setError(null)
            }}
          />
        ) : null}
      </AppSheet>

      <ConfirmSheet
        cancelLabel="Keep app lock"
        confirmLabel="Remove app lock"
        description="This removes the local PIN and biometric unlock from this phone. Your HalaalVest account and device session remain signed in."
        icon="LockKeyhole"
        isConfirming={isDisabling}
        onCancel={() => setIsDisableConfirmationVisible(false)}
        onConfirm={() => void handleDisable()}
        title="Remove app lock?"
        tone="destructive"
        visible={isDisableConfirmationVisible}
      />
    </>
  )
}

/** One PIN step (01 Calm title): centred copy, dots and helper, round pad. */
function PinStep({
  body,
  code,
  error,
  errorKey,
  isSubmitting,
  onChange,
}: {
  body: string
  code: string
  error: string | null
  errorKey: number
  isSubmitting: boolean
  onChange: (value: string) => void
}) {
  const insets = useSafeAreaInsets()
  const { height } = useWindowDimensions()
  // The sheet body scrolls; size the step to the visible area so the pad
  // sits at the bottom (header 56, sheet paddings 20 + 32 + bottom spacer).
  const minHeight = Math.max(
    460,
    height - insets.top - 56 - 52 - Math.max(insets.bottom, 24) - 8
  )

  return (
    <View style={{ gap: 16, justifyContent: "space-between", minHeight }}>
      <Text className="px-[10px] text-center text-foreground-soft" variant="body">
        {body}
      </Text>
      <View className="items-center gap-[14px]">
        <AppLockPinDots error={Boolean(error)} errorKey={errorKey} value={code} />
        <Text
          accessibilityLiveRegion="polite"
          className={
            error
              ? "min-h-[40px] text-center font-semibold text-destructive"
              : "min-h-[40px] text-center text-muted-foreground"
          }
          variant="small"
        >
          {error ??
            (isSubmitting
              ? "Checking…"
              : `${code.length} of ${APP_LOCK_CODE_LENGTH} digits entered`)}
        </Text>
      </View>
      <AppLockPinPad disabled={isSubmitting} onChange={onChange} value={code} />
    </View>
  )
}
