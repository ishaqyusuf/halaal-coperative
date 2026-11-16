import { DockedHeroScreen } from "@/components/app/docked-hero-screen"
import { GateHero, gateIdentityFor } from "@/components/app/gate-hero"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { getRouteRecoveryContent } from "@/features/route-recovery/model/route-recovery-policy"
import { useAuthContext } from "@/hooks/use-auth"
import { useRouter } from "expo-router"
import { View } from "react-native"

/**
 * Route recovery (T03, 02 Brand hero): an unknown or unavailable link opens
 * a gate that names the workspace, says nothing changed, and docks the way
 * back to the role's safe start (and Go back when there is history).
 */
export function NotFoundScreen() {
  const router = useRouter()
  const { profile, role } = useAuthContext()
  const recovery = getRouteRecoveryContent(role)
  const canGoBack = router.canGoBack()

  return (
    <DockedHeroScreen
      footer={
        <>
          <Button
            accessibilityHint="Returns to the safe starting screen for your current account"
            onPress={() => router.replace("/")}
          >
            <Text>{recovery.actionLabel}</Text>
          </Button>
          {canGoBack ? (
            <Button
              accessibilityHint="Returns to the previous screen"
              onPress={() => router.back()}
              size="sm"
              variant="ghost"
            >
              <Text>Go back</Text>
            </Button>
          ) : null}
        </>
      }
      hero={
        <GateHero
          chip={{ icon: "Compass", label: "Link unavailable", tone: "warm" }}
          identity={gateIdentityFor(profile)}
          minHeightRatio={0.4}
          title="This screen isn’t available"
        />
      }
      testID="not-found-screen"
    >
      <Text className="text-foreground-soft" variant="body">
        {recovery.description}
      </Text>
      <View className="flex-row items-start gap-[10px]">
        <Icon className="size-sm text-success" name="ShieldCheck" />
        <Text className="flex-1 text-muted-foreground" variant="small">
          {recovery.reassurance}
        </Text>
      </View>
    </DockedHeroScreen>
  )
}
