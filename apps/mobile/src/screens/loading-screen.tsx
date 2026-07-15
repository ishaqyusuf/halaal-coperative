import { StatusBadge } from "@/components/app/status-badge"
import { SafeArea } from "@/components/safe-area"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { ActivityIndicator, View } from "react-native"

export function LoadingScreen() {
  const colors = useColors()

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <View className="flex-1 items-center justify-center gap-5 px-8">
        <View className="h-16 w-16 items-center justify-center rounded-md bg-primary">
          <Text className="text-3xl font-black text-primary-foreground">H</Text>
        </View>
        <View className="items-center gap-2">
          <ActivityIndicator color={colors.primary} />
          <Text className="text-base font-semibold text-foreground">
            Preparing workspace
          </Text>
          <Text className="text-center text-sm leading-5 text-muted-foreground">
            Verifying your session, cooperative, and member or staff role.
          </Text>
        </View>
        <StatusBadge label="Server-scoped access" tone="muted" />
      </View>
    </SafeArea>
  )
}
