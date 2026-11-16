import { useResendCountdown } from "@/features/auth/hooks/use-resend-countdown"
import {
  getRecoveryCompleteErrorPresentation,
  getRecoveryRequestErrorPresentation,
  type AuthErrorPresentation,
} from "@/features/auth/model/auth-errors"
import {
  getInitialRecoveryStep,
  isAcceptablePassword,
  isLikelyEmail,
  maskRecoveryEmail,
  normalizeRecoveryCode,
  RECOVERY_CODE_LENGTH,
  type RecoveryStep,
} from "@/features/auth/model/recovery-flow"
import { type MobileAppAccessSnapshot } from "@/features/mobile-app-access/public/access-snapshot"
import { useAuthContext } from "@/hooks/use-auth"
import {
  completeMobilePasswordRecovery,
  requestMobilePasswordRecovery,
} from "@/lib/mobile-auth-api"
import { captureMobileError } from "@/lib/sentry"
import {
  getOrCreateMobileDeviceId,
  type MobileProfile,
} from "@/lib/session-store"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useCallback, useRef, useState } from "react"
import { Keyboard } from "react-native"

/**
 * Email → 6-digit code → new password → done. The code is only checked by
 * the server on the last step, so a rejected code returns to the code step.
 * The recovered session is held until the member presses Continue on the
 * done step, then activated (which leaves the auth stack).
 */
export function useRecoveryController(params: {
  challenge?: string
  cooperativeNumber?: string
  email?: string
}) {
  const { acceptServerProfile } = useAuthContext()
  const { state: runtime } = useMobileRuntime()
  const offline = runtime.connectivity === "offline"
  const [step, setStep] = useState<RecoveryStep>(() =>
    getInitialRecoveryStep(params.challenge)
  )
  const [cooperativeNumber, setCooperativeNumberValue] = useState(
    params.cooperativeNumber ?? ""
  )
  const [email, setEmailValue] = useState(params.email ?? "")
  const [challengeId, setChallengeId] = useState(params.challenge ?? "")
  const [code, setCodeValue] = useState("")
  const [password, setPasswordValue] = useState("")
  const [confirmPassword, setConfirmPasswordValue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<AuthErrorPresentation | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [cooperativeNumberError, setCooperativeNumberError] = useState<
    string | null
  >(null)
  const [showMismatch, setShowMismatch] = useState(false)
  const [recovered, setRecovered] = useState<{
    accessSnapshot?: MobileAppAccessSnapshot
    profile: MobileProfile
  } | null>(null)
  const countdown = useResendCountdown()
  const inFlight = useRef(false)

  const normalizedCode = normalizeRecoveryCode(code)
  const passwordsMatch = password === confirmPassword
  const mismatch =
    showMismatch && confirmPassword.length > 0 && !passwordsMatch
  const canReset =
    Boolean(cooperativeNumber.trim() && challengeId) &&
    normalizedCode.length === RECOVERY_CODE_LENGTH &&
    isAcceptablePassword(password) &&
    passwordsMatch

  const setCooperativeNumber = useCallback((value: string) => {
    setCooperativeNumberValue(value)
    setCooperativeNumberError(null)
    setError(null)
  }, [])
  const setEmail = useCallback((value: string) => {
    setEmailValue(value)
    setEmailError(null)
    setError(null)
  }, [])
  const setCode = useCallback((value: string) => {
    setCodeValue(normalizeRecoveryCode(value))
    setCodeError(null)
    setError(null)
  }, [])
  const setPassword = useCallback((value: string) => {
    setPasswordValue(value)
    setError(null)
  }, [])
  const setConfirmPassword = useCallback((value: string) => {
    setConfirmPasswordValue(value)
    setError(null)
  }, [])

  const sendCode = useCallback(
    async (mode: "request" | "resend") => {
      if (inFlight.current) return
      const coop = cooperativeNumber.trim()
      const address = email.trim()
      if (mode === "request") {
        const coopMissing = coop ? null : "Enter your cooperative number"
        const emailInvalid = !address
          ? "Enter your email address"
          : isLikelyEmail(address)
            ? null
            : "Enter a valid email address"
        setCooperativeNumberError(coopMissing)
        setEmailError(emailInvalid)
        if (coopMissing || emailInvalid) return
      }
      // A deep-linked challenge has no email to resend to: ask for it.
      if (mode === "resend" && (!coop || !isLikelyEmail(address))) {
        setStep("request")
        return
      }
      inFlight.current = true
      Keyboard.dismiss()
      setError(null)
      if (mode === "request") setSubmitting(true)
      else setResending(true)
      try {
        const response = await requestMobilePasswordRecovery({
          cooperativeNumber: coop.toUpperCase(),
          deviceId: getOrCreateMobileDeviceId(),
          email: address.toLowerCase(),
        })
        setChallengeId(response.challengeId)
        // OTP evidence stays manual (Quick Fill exclusion): a non-production
        // `devCode` in the response is never copied into the field.
        setCodeValue("")
        setCodeError(null)
        countdown.restart()
        setStep("code")
      } catch (caught) {
        const presentation = getRecoveryRequestErrorPresentation(caught, {
          offline,
        })
        if (presentation.kind === "unknown")
          captureMobileError(caught, "mobile.auth.sign_in")
        setError(presentation)
      } finally {
        inFlight.current = false
        setSubmitting(false)
        setResending(false)
      }
    },
    [cooperativeNumber, countdown, email, offline]
  )

  const continueToPassword = useCallback(() => {
    if (normalizedCode.length !== RECOVERY_CODE_LENGTH) {
      setCodeError("Enter the 6-digit code")
      return
    }
    setError(null)
    setStep("password")
  }, [normalizedCode.length])

  const reset = useCallback(async () => {
    setShowMismatch(true)
    if (!canReset || inFlight.current) return
    inFlight.current = true
    Keyboard.dismiss()
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
      setCodeValue("")
      setPasswordValue("")
      setConfirmPasswordValue("")
      setChallengeId("")
      setRecovered({
        accessSnapshot: response.accessSnapshot,
        profile: response.profile,
      })
      setStep("done")
    } catch (caught) {
      const presentation = getRecoveryCompleteErrorPresentation(caught, {
        offline,
      })
      if (presentation.kind === "code") {
        setCodeError(presentation.message)
        setStep("code")
      } else {
        if (presentation.kind === "unknown")
          captureMobileError(caught, "mobile.auth.sign_in")
        setError(presentation)
      }
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }, [
    canReset,
    challengeId,
    cooperativeNumber,
    normalizedCode,
    offline,
    password,
  ])

  const finish = useCallback(async () => {
    if (!recovered || inFlight.current) return
    inFlight.current = true
    setSubmitting(true)
    try {
      await acceptServerProfile(recovered.profile, recovered.accessSnapshot)
    } finally {
      inFlight.current = false
      setSubmitting(false)
    }
  }, [acceptServerProfile, recovered])

  /** Returns false when the screen should leave (first step). */
  const back = useCallback(() => {
    setError(null)
    if (step === "password") {
      setStep("code")
      return true
    }
    if (step === "code") {
      setStep("request")
      return true
    }
    return false
  }, [step])

  return {
    back,
    canReset,
    code: normalizedCode,
    codeError,
    confirmPassword,
    continueToPassword,
    cooperativeNumber,
    cooperativeNumberError,
    destination: maskRecoveryEmail(email),
    email,
    emailError,
    error,
    finish,
    mismatch,
    offline,
    password,
    request: () => void sendCode("request"),
    resend: () => void sendCode("resend"),
    resendRemaining: countdown.remaining,
    resending,
    reset: () => void reset(),
    setCode,
    setConfirmPassword,
    setCooperativeNumber,
    setEmail,
    setPassword,
    showMismatchNow: () => setShowMismatch(true),
    step,
    submitting,
  }
}
