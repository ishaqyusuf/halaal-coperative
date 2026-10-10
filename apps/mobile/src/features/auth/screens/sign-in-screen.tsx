import { LegalLinks } from "@/components/app/legal-links"
import { AppKeyboardAwareScrollView } from "@/components/app/keyboard-aware-scroll-view"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { SafeArea } from "@/components/safe-area"
import { LivingCooperativeHero } from "@/features/auth/components/living-cooperative-hero"
import { QaAccessPanel } from "@/features/auth/components/qa-access-panel"
import { SignInForm } from "@/features/auth/components/sign-in-form"
import { getLivingCooperativePresentation } from "@/features/auth/model/living-cooperative-presentation"
import { useAuthContext } from "@/hooks/use-auth"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { type MobileProfile } from "@/lib/session-store"
import { captureMobileError } from "@/lib/sentry"
import { useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  useWindowDimensions,
  View,
} from "react-native"
import { useReducedMotion } from "react-native-reanimated"

const COOPERATIVE_HANDSHAKE_MS = 1_500

function waitForHandshake() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, COOPERATIVE_HANDSHAKE_MS)
  })
}

export function SignInScreen() {
  const { signInWithPassword } = useAuthContext()
  const router = useRouter()
  const largeTextLayout = useLargeTextLayout()
  const reduceMotion = useReducedMotion()
  const { height } = useWindowDimensions()
  const identityOpacity = useRef(new Animated.Value(1)).current
  const [cooperativeNumber, setCooperativeNumber] = useState("")
  const [password, setPassword] = useState("")
  const [verifiedProfile, setVerifiedProfile] = useState<MobileProfile | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canSubmit = Boolean(cooperativeNumber.trim() && password)
  const presentation = getLivingCooperativePresentation({
    hasVerifiedProfile: Boolean(verifiedProfile),
    isSubmitting,
    largeTextLayout,
    tenantName: verifiedProfile?.tenant.name,
  })

  useEffect(() => {
    if (!verifiedProfile) return

    identityOpacity.setValue(0)
    Animated.timing(identityOpacity, {
      duration: reduceMotion ? 0 : 260,
      toValue: 1,
      useNativeDriver: true,
    }).start()
  }, [identityOpacity, reduceMotion, verifiedProfile])

  async function revealCooperative(profile: MobileProfile) {
    setVerifiedProfile(profile)
    AccessibilityInfo.announceForAccessibility(
      `${profile.tenant.name} confirmed. Signing in.`
    )
    await waitForHandshake()
  }

  async function handleSubmit() {
    if (!canSubmit || isSubmitting) return

    Keyboard.dismiss()
    setError(null)
    setVerifiedProfile(null)
    setIsSubmitting(true)

    try {
      await signInWithPassword(
        {
          cooperativeAccessCode: cooperativeNumber.trim().toUpperCase(),
          password,
        },
        revealCooperative
      )
    } catch (signInError) {
      captureMobileError(signInError, "mobile.auth.sign_in")
      setVerifiedProfile(null)
      setError("The cooperative number or account details were invalid.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeArea className="bg-brand-surface">
      <ScreenStatusBar tone="brand" />
      <AppKeyboardAwareScrollView
        bottomOffset={224}
        className="bg-brand-surface"
        contentContainerClassName="flex-grow bg-brand-surface"
        contentContainerStyle={{ minHeight: height }}
      >
        <LivingCooperativeHero
          identityOpacity={identityOpacity}
          largeTextLayout={largeTextLayout}
          presentation={presentation}
          profile={verifiedProfile}
        />

        <View
          accessibilityLabel="Sign in to mobile workspace"
          className={
            largeTextLayout
              ? "-mt-5 min-h-[620px] flex-1 rounded-t-[34px] border-t border-border/60 bg-background px-6 pt-8 pb-6"
              : "-mt-7 min-h-[470px] flex-1 rounded-t-[34px] border-t border-border/60 bg-background px-6 pt-8 pb-6"
          }
        >
          <SignInForm
            actionLabel={presentation.actionLabel}
            canSubmit={canSubmit}
            cooperativeNumber={cooperativeNumber}
            cooperativeVerified={Boolean(verifiedProfile)}
            error={error}
            formTitle={presentation.formTitle}
            isSubmitting={isSubmitting}
            onCooperativeNumberChange={setCooperativeNumber}
            onForgotPassword={() => router.push("/(auth)/recovery")}
            onPasswordChange={setPassword}
            onSubmit={() => void handleSubmit()}
            password={password}
          />
          <LegalLinks />
        </View>
      </AppKeyboardAwareScrollView>
      <QaAccessPanel />
    </SafeArea>
  )
}
