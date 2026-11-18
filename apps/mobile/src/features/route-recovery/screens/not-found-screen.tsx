import { CenteredStatus, GateStatusBadge } from "@/components/app/gate-status"
import { ScreenShell } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { getRouteRecoveryContent } from "@/features/route-recovery/model/route-recovery-policy"
import { useAuthContext } from "@/hooks/use-auth"
import { useRouter } from "expo-router"
import { View } from "react-native"

/**
 * Route recovery (T03, owner pick 03 Docked action): a centred compass badge,
 * the reason and that nothing changed, with the way back to the role's safe
 * start (and Go back when there is history) docked at the bottom.
 */
export function NotFoundScreen() {
  const router = useRouter()
  const { role } = useAuthContext()
  const recovery = getRouteRecoveryContent(role)
  const canGoBack = router.canGoBack()

  return (
    <ScreenShell
      back={false}
      contentClassName="pt-[120px]"
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
      testID="not-found-screen"
    >
      <CenteredStatus
        badge={<GateStatusBadge icon="Compass" tone="sky" />}
        body={recovery.description}
        title="This screen isn’t available"
      >
        <View className="mt-[10px] max-w-[320px] flex-row items-start gap-[10px]">
          <Icon className="size-sm text-success" name="ShieldCheck" />
          <Text className="flex-1 text-muted-foreground" variant="small">
            {recovery.reassurance}
          </Text>
        </View>
      </CenteredStatus>
    </ScreenShell>
  )
}
