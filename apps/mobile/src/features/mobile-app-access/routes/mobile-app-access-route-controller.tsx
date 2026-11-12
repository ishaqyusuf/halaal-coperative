import { LegalLinks } from "@/components/app/legal-links"
import { ScreenHeader } from "@/components/app/screen-header"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { QaAccessPanel } from "@/features/auth/public/qa-access"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"
import { Redirect, useRouter } from "expo-router"
import { ScrollView, View } from "react-native"

export function MobileAppAccessRouteController() {
  const { profile, role, signOut } = useAuthContext()
  const router = useRouter()
  const access = useMobileAppAccess()

  if (!profile || !role) return <Redirect href="/(auth)/sign-in" />
  if (access.accessAllowed) return <Redirect href="/" />

  const message = access.error
    ? "We couldn’t check your access. Try again when you’re online."
    : access.snapshot?.status === "pending"
      ? "Your cooperative is reviewing your request."
      : "Contact your cooperative to request mobile access."

  return (
    <SafeArea className="bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 py-6"
      >
        <ScreenHeader title="Mobile access" />
        <Text
          accessibilityLiveRegion="polite"
          className="text-muted-foreground"
        >
          {access.checking ? "Checking your access…" : message}
        </Text>
        <View className="gap-2">
          <Button
            disabled={access.checking}
            onPress={() => void access.refresh()}
            variant="outline"
          >
            <Text>Refresh access</Text>
          </Button>
          <Button
            onPress={() => router.push("/cooperative-shortcuts")}
            variant="ghost"
          >
            <Text>Cooperatives & shortcuts</Text>
          </Button>
          <Button onPress={() => void signOut()} variant="ghost">
            <Text>Sign out</Text>
          </Button>
        </View>
        <QaAccessPanel inline />
        <LegalLinks />
      </ScrollView>
    </SafeArea>
  )
}
