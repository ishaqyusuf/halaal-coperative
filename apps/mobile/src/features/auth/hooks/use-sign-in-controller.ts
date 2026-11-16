import {
  getSignInErrorPresentation,
  type AuthErrorPresentation,
} from "@/features/auth/model/auth-errors"
import {
  getSignInFieldErrors,
  type SignInFieldErrors,
} from "@/features/auth/model/recovery-flow"
import { useAuthContext } from "@/hooks/use-auth"
import { type MobileProfile } from "@/lib/session-store"
import { captureMobileError } from "@/lib/sentry"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useCallback, useRef, useState } from "react"
import { AccessibilityInfo, Keyboard } from "react-native"
import { useReducedMotion } from "react-native-reanimated"

/**
 * How long the confirmed cooperative shows before the app opens. It runs
 * while the session is stored, so it adds at most this much (was a fixed
 * 1.5s wait after every successful sign-in).
 */
export const SIGN_IN_REVEAL_MS = 600

export type SignInPhase = "idle" | "submitting" | "confirmed"

export function useSignInController() {
  const { signInWithPassword } = useAuthContext()
  const { state: runtime } = useMobileRuntime()
  const reduceMotion = useReducedMotion()
  const [cooperativeNumber, setCooperativeNumberValue] = useState("")
  const [password, setPasswordValue] = useState("")
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({})
  const [error, setError] = useState<AuthErrorPresentation | null>(null)
  const [phase, setPhase] = useState<SignInPhase>("idle")
  const [confirmedProfile, setConfirmedProfile] =
    useState<MobileProfile | null>(null)
  const inFlight = useRef(false)
  const offline = runtime.connectivity === "offline"

  const setCooperativeNumber = useCallback((value: string) => {
    setCooperativeNumberValue(value)
    setFieldErrors((current) =>
      current.cooperativeNumber ? { ...current, cooperativeNumber: undefined } : current
    )
    setError(null)
  }, [])

  const setPassword = useCallback((value: string) => {
    setPasswordValue(value)
    setFieldErrors((current) =>
      current.password ? { ...current, password: undefined } : current
    )
    setError(null)
  }, [])

  const submit = useCallback(async () => {
    if (inFlight.current) return
    const nextFieldErrors = getSignInFieldErrors({ cooperativeNumber, password })
    setFieldErrors(nextFieldErrors)
    if (nextFieldErrors.cooperativeNumber || nextFieldErrors.password) return

    inFlight.current = true
    Keyboard.dismiss()
    setError(null)
    setPhase("submitting")
    try {
      await signInWithPassword(
        {
          cooperativeAccessCode: cooperativeNumber.trim().toUpperCase(),
          password,
        },
        async (profile) => {
          setConfirmedProfile(profile)
          setPhase("confirmed")
          AccessibilityInfo.announceForAccessibility(
            `${profile.tenant.name} confirmed. Signing in.`
          )
          if (!reduceMotion) {
            await new Promise((resolve) => setTimeout(resolve, SIGN_IN_REVEAL_MS))
          }
        }
      )
      // The auth stack unmounts once the profile is active.
    } catch (caught) {
      const presentation = getSignInErrorPresentation(caught, { offline })
      // Wrong credentials and limits are expected; report the rest.
      if (presentation.kind === "unknown")
        captureMobileError(caught, "mobile.auth.sign_in")
      setConfirmedProfile(null)
      setError(presentation)
      setPhase("idle")
    } finally {
      inFlight.current = false
    }
  }, [cooperativeNumber, offline, password, reduceMotion, signInWithPassword])

  return {
    confirmedProfile,
    cooperativeNumber,
    error,
    fieldErrors,
    offline,
    password,
    phase,
    setCooperativeNumber,
    setPassword,
    submit,
    submitting: phase !== "idle",
  }
}
