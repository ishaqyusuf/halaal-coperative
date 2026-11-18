import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { SignInHero } from "@/features/auth/components/auth-hero"
import { DockedHeroScreen } from "@/components/app/docked-hero-screen"
import { QaAccessPanel } from "@/features/auth/components/qa-access-panel"
import { SignInForm } from "@/features/auth/components/sign-in-form"
import { useSignInController } from "@/features/auth/hooks/use-sign-in-controller"
import { useShortcutSignInCooperative } from "@/features/cooperative-shortcuts/public/shortcut-sign-in"
import { useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"

export function SignInScreen() {
  const router = useRouter()
  // A signed-out tap on a cooperative's home-screen shortcut brands sign-in.
  const shortcut = useShortcutSignInCooperative()
  const signIn = useSignInController(shortcut.cooperative)
  const confirmed = signIn.phase === "confirmed"
  const [dockHeight, setDockHeight] = useState(0)

  return (
    <View className="flex-1">
      <DockedHeroScreen
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
          </>
        }
        hero={
          <SignInHero
            cooperative={shortcut.cooperative}
            profile={signIn.confirmedProfile}
          />
        }
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
          onUseAnotherCooperative={
            shortcut.cooperative
              ? () => {
                  shortcut.clear()
                  signIn.clearError()
                }
              : undefined
          }
          password={signIn.password}
        />
      </DockedHeroScreen>
      <QaAccessPanel bottomInset={dockHeight} />
    </View>
  )
}
