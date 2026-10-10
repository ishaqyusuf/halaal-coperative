import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"

export function MobileRuntimeBanner() {
  const { retry, state } = useMobileRuntime()
  const isRetrying = state.recovery === "retrying"
  const isOffline = state.connectivity === "offline"
  const isFatal = state.session === "fatal"

  if (!isOffline && !isRetrying && !isFatal) return null

  return (
    <SafeAreaView className="bg-warn/10" edges={["top"]}>
      <View
        accessibilityLiveRegion="polite"
        className="border-warn/40 bg-warn/10 flex-row items-center gap-3 border-b px-4 py-2"
        role="alert"
      >
        <Icon
          className="size-sm text-warn"
          name={isRetrying ? "RefreshCw" : "WifiOff"}
        />
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-semibold text-foreground">
            {isFatal
              ? "Workspace verification failed"
              : isRetrying
                ? "Refreshing workspace"
                : "Offline — saved reads only"}
          </Text>
          <Text className="text-xs text-muted-foreground" numberOfLines={2}>
            {isOffline
              ? "Drafts remain available. Financial and privileged actions require a live connection."
              : "Restoring your signed cooperative session and fresh data."}
          </Text>
        </View>
        {!isRetrying ? (
          <Button
            accessibilityLabel="Retry mobile workspace connection"
            className="h-11 px-3"
            onPress={() => void retry()}
            size="sm"
            variant="outline"
          >
            <Text>Retry</Text>
          </Button>
        ) : null}
      </View>
    </SafeAreaView>
  )
}
