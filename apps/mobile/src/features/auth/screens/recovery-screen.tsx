import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { AuthScreenShell } from "@/features/auth/components/auth-screen-shell"
import {
  RecoveryCodeStep,
  RecoveryPasswordStep,
  RecoveryRequestStep,
} from "@/features/auth/components/recovery-step-content"
import {
  getInitialRecoveryStep,
  maskRecoveryEmail,
  normalizeRecoveryCode,
  RECOVERY_CODE_LENGTH,
  type RecoveryStep,
} from "@/features/auth/model/recovery-flow"
import { getRecoveryPresentation } from "@/features/auth/model/recovery-presentation"
import { useAuthContext } from "@/hooks/use-auth"
import {
  completeMobilePasswordRecovery,
  requestMobilePasswordRecovery,
} from "@/lib/mobile-auth-api"
import {
  getOrCreateMobileDeviceId,
  type MobileProfile,
} from "@/lib/session-store"
import { useLocalSearchParams } from "expo-router"
import { useMemo, useState } from "react"

export function RecoveryScreen() {
  const params = useLocalSearchParams<{
    challenge?: string
    cooperativeNumber?: string
    email?: string
  }>()
  const { acceptServerProfile } = useAuthContext()
  const [step, setStep] = useState<RecoveryStep>(() =>
    getInitialRecoveryStep(params.challenge)
  )
  const [cooperativeNumber, setCooperativeNumber] = useState(
    params.cooperativeNumber ?? ""
  )
  const [email, setEmail] = useState(params.email ?? "")
  const [challengeId, setChallengeId] = useState(params.challenge ?? "")
  const [code, setCode] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const normalizedCode = normalizeRecoveryCode(code)
  const presentation = getRecoveryPresentation(step)
  const canRequest = Boolean(
    cooperativeNumber.trim() && email.trim() && !submitting
  )
  const canContinue = Boolean(
    challengeId && normalizedCode.length === RECOVERY_CODE_LENGTH
  )
  const canReset = useMemo(
    () =>
      Boolean(
        cooperativeNumber.trim() &&
        challengeId &&
        normalizedCode.length === RECOVERY_CODE_LENGTH &&
        password.length >= 8 &&
        password === confirmPassword
      ),
    [
      challengeId,
      confirmPassword,
      cooperativeNumber,
      normalizedCode.length,
      password,
    ]
  )

  function moveBack() {
    setError(null)
    if (step === "password") {
      setStep("code")
      return
    }
    if (step === "code") setStep("request")
  }

  async function requestRecovery() {
    if (!canRequest) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await requestMobilePasswordRecovery({
        cooperativeNumber: cooperativeNumber.trim().toUpperCase(),
        deviceId: getOrCreateMobileDeviceId(),
        email: email.trim().toLowerCase(),
      })
      const nextDevCode = response.devCode ?? ""
      setChallengeId(response.challengeId)
      setCode(nextDevCode)
      setStep("code")
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Recovery could not be requested."
      )
    } finally {
      setSubmitting(false)
    }
  }

  function continueToPassword() {
    if (!canContinue) return
    setError(null)
    setStep("password")
  }

  async function resetPassword() {
    if (!canReset || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const response = await completeMobilePasswordRecovery({
        challengeId,
        code: normalizedCode,
        cooperativeNumber: cooperativeNumber.trim().toUpperCase(),
        deviceId: getOrCreateMobileDeviceId(),
        password,
      })
      setCode("")
      setPassword("")
      setConfirmPassword("")
      setChallengeId("")
      await acceptServerProfile(response.profile as MobileProfile)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Password could not be reset."
      )
    } finally {
      setSubmitting(false)
    }
  }

  // Recovery codes and new passwords stay manual (QA Quick Fill exclusion).
  function quickFill() {
    setCooperativeNumber(mobileDevQuickFill.recovery.cooperativeNumber)
    setEmail(mobileDevQuickFill.recovery.email)
  }

  return (
    <AuthScreenShell
      backLabel={presentation.backLabel}
      onBack={step === "request" ? undefined : moveBack}
      stepNumber={presentation.stepNumber}
      title={presentation.title}
    >
      {step === "request" ? (
        <RecoveryRequestStep
          canRequest={canRequest}
          cooperativeNumber={cooperativeNumber}
          email={email}
          error={error}
          onCooperativeNumberChange={setCooperativeNumber}
          onEmailChange={setEmail}
          onRequest={() => void requestRecovery()}
          presentation={presentation}
          submitting={submitting}
        />
      ) : null}

      {step === "code" ? (
        <RecoveryCodeStep
          canContinue={canContinue}
          code={normalizedCode}
          destination={maskRecoveryEmail(email)}
          error={error}
          onCodeChange={setCode}
          onContinue={continueToPassword}
          onResend={() => void requestRecovery()}
          presentation={presentation}
          submitting={submitting}
        />
      ) : null}

      {step === "password" ? (
        <RecoveryPasswordStep
          canReset={canReset}
          confirmPassword={confirmPassword}
          error={error}
          onConfirmPasswordChange={setConfirmPassword}
          onPasswordChange={setPassword}
          onReset={() => void resetPassword()}
          password={password}
          presentation={presentation}
          submitting={submitting}
        />
      ) : null}
      {step === "request" ? (
        <DevQuickFill label="Quick fill recovery" onPress={quickFill} />
      ) : null}
    </AuthScreenShell>
  )
}
