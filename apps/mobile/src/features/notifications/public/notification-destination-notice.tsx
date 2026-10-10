import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { View } from "react-native"

export function NotificationDestinationNotice({
  message = "This item is no longer available.",
  onDismiss,
}: {
  message?: string
  onDismiss: () => void
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className="flex-row items-center gap-3 border-y border-border py-4"
    >
      <View className="size-9 items-center justify-center rounded-full bg-secondary">
        <Icon className="size-base text-muted-foreground" name="Info" />
      </View>
      <Text className="flex-1 text-sm font-semibold text-foreground">
        {message}
      </Text>
      <Pressable
        accessibilityLabel="Dismiss unavailable item notice"
        className="size-11 items-center justify-center rounded-full"
        hitSlop={4}
        onPress={onDismiss}
      >
        <Icon className="size-sm text-muted-foreground" name="X" />
      </Pressable>
    </View>
  )
}
