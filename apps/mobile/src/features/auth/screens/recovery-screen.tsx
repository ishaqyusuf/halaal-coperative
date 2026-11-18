import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { ResultScreen } from "@/components/app/result-screen"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { RecoveryHero } from "@/features/auth/components/auth-hero"
import { DockedHeroScreen } from "@/components/app/docked-hero-screen"
import {
  RecoveryCodeStep,
  RecoveryPasswordStep,
  RecoveryRequestStep,
} from "@/features/auth/components/recovery-step-content"
import { useRecoveryController } from "@/features/auth/hooks/use-recovery-controller"
import { getRecoveryPresentation } from "@/features/auth/model/recovery-presentation"
import { useFocusEffect } from "@react-navigation/native"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { BackHandler, View } from "react-native"

export function RecoveryScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{
    challenge?: string
    cooperativeNumber?: string
    email?: string
  }>()
  const recovery = useRecoveryController(params)
  const [dockHeight, setDockHeight] = useState(0)

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back()
    else router.replace("/(auth)/sign-in")
  }, [router])
  const goBack = useCallback(() => {
    if (!recovery.back()) leave()
  }, [leave, recovery])

  // Android Back walks the steps before leaving; on Done it continues.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (recovery.step === "done") {
            void recovery.finish()
            return true
          }
          return recovery.back()
        }
      )
      return () => subscription.remove()
    }, [recovery])
  )

  if (recovery.step === "done") {
    return (
      <View className="flex-1" testID="recovery-done">
        <ScreenStatusBar tone="background" />
        <ResultScreen
          description="You're signed in on this phone. Other devices were signed out."
          primary={{
            label: "Continue",
            loading: recovery.submitting,
            onPress: () => void recovery.finish(),
          }}
          title="Password updated"
          tone="success"
        />
      </View>
    )
  }

  const presentation = getRecoveryPresentation(recovery.step)
  const busy = recovery.submitting
  const action =
    recovery.step === "request"
      ? recovery.request
      : recovery.step === "code"
        ? recovery.continueToPassword
        : recovery.reset

  // Recovery codes and new passwords stay manual (QA Quick Fill exclusion).
  function quickFill() {
    recovery.setCooperativeNumber(mobileDevQuickFill.recovery.cooperativeNumber)
    recovery.setEmail(mobileDevQuickFill.recovery.email)
  }

  return (
    <View className="flex-1">
      <DockedHeroScreen
        footer={
          <Button
            accessibilityLabel={presentation.actionLabel}
            disabled={recovery.step === "code" && recovery.code.length < 6}
            loading={busy}
            onPress={action}
            testID="recovery-submit"
          >
            <Text>{busy ? presentation.busyLabel : presentation.actionLabel}</Text>
          </Button>
        }
        hero={
          <RecoveryHero
            backLabel={presentation.backLabel}
            onBack={goBack}
            step={presentation.stepNumber}
            title={presentation.title}
          />
        }
        onFooterHeightChange={setDockHeight}
        testID={`recovery-${recovery.step}`}
      >
        {recovery.step === "request" ? (
          <RecoveryRequestStep
            cooperativeNumber={recovery.cooperativeNumber}
            cooperativeNumberError={recovery.cooperativeNumberError}
            disabled={busy}
            email={recovery.email}
            emailError={recovery.emailError}
            error={recovery.error}
            onCooperativeNumberChange={recovery.setCooperativeNumber}
            onEmailChange={recovery.setEmail}
            onRequest={recovery.request}
          />
        ) : null}
        {recovery.step === "code" ? (
          <RecoveryCodeStep
            code={recovery.code}
            codeError={recovery.codeError}
            destination={recovery.destination}
            disabled={busy}
            onCodeChange={recovery.setCode}
            onContinue={recovery.continueToPassword}
            onDifferentEmail={() => recovery.back()}
            onResend={recovery.resend}
            resendRemaining={recovery.resendRemaining}
            resending={recovery.resending}
          />
        ) : null}
        {recovery.step === "password" ? (
          <RecoveryPasswordStep
            confirmPassword={recovery.confirmPassword}
            disabled={busy}
            error={recovery.error}
            mismatch={recovery.mismatch}
            onConfirmBlur={recovery.showMismatchNow}
            onConfirmPasswordChange={recovery.setConfirmPassword}
            onPasswordChange={recovery.setPassword}
            onReset={recovery.reset}
            password={recovery.password}
          />
        ) : null}
      </DockedHeroScreen>
      {recovery.step === "request" ? (
        <DevQuickFill
          bottomOffset={dockHeight}
          label="Quick fill recovery"
          onPress={quickFill}
        />
      ) : null}
    </View>
  )
}
