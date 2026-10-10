import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export function MemberGuarantorSummary({
  approved,
  pending,
  rejected,
}: {
  approved: number
  pending: number
  rejected: number
}) {
  const largeTextLayout = useLargeTextLayout()
  const resolved = approved + rejected

  return (
    <View
      accessibilityLabel={`${pending} guarantor ${pending === 1 ? "response" : "responses"} waiting. ${resolved} resolved.`}
      className={cn(
        "gap-4 border-y border-border py-5",
        !largeTextLayout && "flex-row items-end justify-between"
      )}
    >
      <View className="gap-1">
        <Text className="text-4xl leading-[40px] font-extrabold tracking-tight text-foreground">
          {pending}
        </Text>
        <Text className="text-sm text-muted-foreground">
          {pending === 1 ? "response waiting" : "responses waiting"}
        </Text>
      </View>
      <View className={cn("gap-1", !largeTextLayout && "items-end")}>
        <Text className="text-sm font-extrabold text-foreground">
          {resolved} resolved
        </Text>
        <Text className="text-xs text-muted-foreground">
          {approved} approved{rejected ? ` · ${rejected} rejected` : ""}
        </Text>
      </View>
    </View>
  )
}
