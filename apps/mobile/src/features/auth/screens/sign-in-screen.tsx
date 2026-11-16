import { LegalLinks } from "@/components/app/legal-links"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { SignInHero } from "@/features/auth/components/auth-hero"
import { AuthScreenShell } from "@/features/auth/components/auth-screen-shell"
import { QaAccessPanel } from "@/features/auth/components/qa-access-panel"
import { SignInForm } from "@/features/auth/components/sign-in-form"
import { useSignInController } from "@/features/auth/hooks/use-sign-in-controller"
import { useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import { useKeyboardState } from "react-native-keyboard-controller"

export function SignInScreen() {
  const router = useRouter()
  const signIn = useSignInController()
  const keyboardVisible = useKeyboardState((state) => state.isVisible)
  const confirmed = signIn.phase === "confirmed"
  const [dockHeight, setDockHeight] = useState(0)

  return (
    <View className="flex-1">
      <AuthScreenShell
        footer={
          <>
            <Button
              accessibilityLabel={confirmed ? "Opening cooperative" : "Sign in"}
              loading={signIn.submitting}
              onPress={() => void signIn.submit()}
              testID="sign-in-submit"
            >
              <Text>
                {confirmed
                  ? "Opening cooperative"
                  : signIn.submitting
                    ? "Signing in"
                    : "Sign in"}
              </Text>
            </Button>
            {keyboardVisible ? null : <LegalLinks variant="inline" />}
          </>
        }
        hero={<SignInHero profile={signIn.confirmedProfile} />}
        onFooterHeightChange={setDockHeight}
        testID="sign-in-screen"
      >
        <SignInForm
          confirmed={confirmed}
          cooperativeNumber={signIn.cooperativeNumber}
          disabled={signIn.submitting}
          error={signIn.error}
          fieldErrors={signIn.fieldErrors}
          onCooperativeNumberChange={signIn.setCooperativeNumber}
          onForgotPassword={() =>
            router.push({
              params: signIn.cooperativeNumber.trim()
                ? { cooperativeNumber: signIn.cooperativeNumber.trim().toUpperCase() }
                : {},
              pathname: "/(auth)/recovery",
            })
          }
          onPasswordChange={signIn.setPassword}
          onRetry={() => void signIn.submit()}
          onSubmit={() => void signIn.submit()}
          password={signIn.password}
        />
      </AuthScreenShell>
      <QaAccessPanel bottomInset={dockHeight} />
    </View>
  )
}
