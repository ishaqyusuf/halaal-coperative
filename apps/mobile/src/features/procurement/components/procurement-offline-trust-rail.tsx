import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export function ProcurementOfflineTrustRail({
  isChecking = false,
  onCheckConnection,
}: {
  isChecking?: boolean
  onCheckConnection: () => void
}) {
  const largeTextLayout = useLargeTextLayout()

  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn(
        "gap-3 border-y border-border py-4",
        !largeTextLayout && "flex-row items-center"
      )}
    >
      <View className="bg-brand-warm/20 size-11 shrink-0 items-center justify-center rounded-full">
        <Icon className="size-base text-warn" name="WifiOff" />
      </View>
      <View className={cn("min-w-0 gap-1", !largeTextLayout && "flex-1")}>
        <Text className="text-base font-extrabold text-foreground">
          Offline · Saved history
        </Text>
        <Text className="text-sm leading-5 text-muted-foreground">
          New requests resume when you reconnect.
        </Text>
      </View>
      <Button
        accessibilityLabel="Check connection"
        accessibilityState={{ busy: isChecking }}
        className={cn(
          "h-11 bg-foreground px-4 active:bg-foreground/90",
          largeTextLayout && "self-start"
        )}
        disabled={isChecking}
        onPress={onCheckConnection}
        size="sm"
      >
        <Icon
          className="size-sm text-background"
          name={isChecking ? "RefreshCw" : "WifiOff"}
        />
        <Text className="font-bold text-background">
          {isChecking ? "Checking" : "Check"}
        </Text>
      </Button>
    </View>
  )
}
