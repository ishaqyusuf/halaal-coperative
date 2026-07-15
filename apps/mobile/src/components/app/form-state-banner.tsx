import { StatusBadge } from "@/components/app/status-badge"
import { Text } from "@/components/ui/text"
import { View } from "react-native"

export function FormStateBanner({
  hasDraft,
  isStale,
}: {
  hasDraft: boolean
  isStale: boolean
}) {
  if (!hasDraft && !isStale) return null

  return (
    <View className="gap-2 rounded-md border border-border bg-card p-3">
      <View className="flex-row flex-wrap items-center gap-2">
        {hasDraft ? <StatusBadge label="Draft saved" tone="muted" /> : null}
        {isStale ? (
          <StatusBadge label="Refresh required" tone="warning" />
        ) : null}
      </View>
      <Text className="text-xs leading-5 text-muted-foreground">
        {isStale
          ? "This form can stay drafted on this device, but it cannot be submitted until fresh server data is loaded."
          : "Changes are saved on this device until the server confirms a submission."}
      </Text>
    </View>
  )
}
