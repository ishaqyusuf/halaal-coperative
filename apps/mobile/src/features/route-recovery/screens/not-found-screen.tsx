import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { getRouteRecoveryContent } from "@/features/route-recovery/model/route-recovery-policy"
import { useAuthContext } from "@/hooks/use-auth"
import { useRouter } from "expo-router"
import { ScrollView, View } from "react-native"

export function NotFoundScreen() {
  const router = useRouter()
  const { role } = useAuthContext()
  const recovery = getRouteRecoveryContent(role)
  const canGoBack = router.canGoBack()

  return (
    <SafeArea className="bg-background">
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerClassName="flex-grow px-6 pb-8 pt-6"
      >
        <View className="w-full max-w-lg flex-1 justify-center self-center pb-16">
          <View className="mb-7 size-14 items-center justify-center rounded-full bg-accent">
            <Icon
              className="size-lg text-accent-foreground"
              name="ArrowUpRight"
              strokeWidth={2.4}
            />
          </View>

          <View
            accessibilityLabel="This screen isn’t available"
            accessibilityRole="header"
            accessible
          >
            <Text className="text-[36px] leading-[40px] font-black tracking-tight">
              This screen isn’t
            </Text>
            <Text className="text-[36px] leading-[40px] font-black tracking-tight">
              available
            </Text>
          </View>
          <Text className="mt-4 text-base leading-6 text-muted-foreground">
            {recovery.description}
          </Text>

          <View className="mt-8 gap-3 border-t border-border pt-5">
            <Button
              accessibilityHint="Returns to the safe starting screen for your current account"
              className="h-12 w-full"
              onPress={() => router.replace("/")}
            >
              <Text className="font-bold">{recovery.actionLabel}</Text>
            </Button>

            {canGoBack ? (
              <Button
                accessibilityHint="Returns to the previous screen"
                className="h-12 w-full"
                onPress={() => router.back()}
                variant="outline"
              >
                <Text className="font-bold">Go back</Text>
              </Button>
            ) : null}

            <Text className="mt-2 text-center text-xs leading-5 text-muted-foreground">
              {recovery.reassurance}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeArea>
  )
}
