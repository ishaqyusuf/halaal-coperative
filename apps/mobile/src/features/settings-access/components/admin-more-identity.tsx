import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export function AdminMoreIdentity({
  name,
  roleLabel,
  tenantName,
}: {
  name: string
  roleLabel: string
  tenantName: string
}) {
  const stacked = useLargeTextLayout()

  return (
    <View
      className={cn(
        "items-start gap-3 border-b border-border pb-5",
        stacked ? "flex-col" : "flex-row"
      )}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className="bg-brand h-11 w-11 shrink-0 items-center justify-center rounded-full"
      >
        <Text
          allowFontScaling={false}
          className="text-brand-foreground text-base font-extrabold"
        >
          {name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part.charAt(0).toUpperCase())
            .join("")}
        </Text>
      </View>
      <View className={cn("min-w-0 gap-1", stacked ? "w-full" : "flex-1")}>
        <Text
          selectable
          className="text-base leading-6 font-bold text-foreground"
        >
          {name}
        </Text>
        <Text selectable className="text-xs leading-5 text-muted-foreground">
          {tenantName}
        </Text>
        <Text className="text-xs leading-5 font-semibold text-accent-foreground">
          {roleLabel}
        </Text>
      </View>
    </View>
  )
}
