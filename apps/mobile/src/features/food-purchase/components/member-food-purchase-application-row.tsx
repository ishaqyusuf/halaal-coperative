import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { Pressable, View } from "react-native"
import type { MobileFoodPurchaseApplication } from "../model/member-food-purchase-types"
import { presentFoodPurchaseApplication } from "../model/member-food-purchase-presentation"

export function MemberFoodPurchaseApplicationRow({
  application,
  currencyCode,
  isFirst,
  onPress,
}: {
  application: MobileFoodPurchaseApplication
  currencyCode: string
  isFirst: boolean
  onPress: () => void
}) {
  const largeTextLayout = useLargeTextLayout()
  const row = presentFoodPurchaseApplication(application, currencyCode)

  return (
    <Pressable
      accessibilityLabel={row.accessibilityLabel}
      accessibilityRole="button"
      className={cn(
        "min-h-20 gap-3 border-b border-border py-4 active:opacity-70",
        isFirst && "border-t"
      )}
      onPress={onPress}
    >
      <View
        className={cn(
          "gap-3",
          !largeTextLayout && "flex-row items-start justify-between"
        )}
      >
        <View
          className={cn("min-w-0 gap-1", largeTextLayout ? "w-full" : "flex-1")}
        >
          <Text className="text-sm font-bold text-foreground">{row.title}</Text>
          <Text className="text-xs leading-4 font-medium text-muted-foreground">
            {row.cycle} · {row.status}
          </Text>
        </View>

        <View
          className={cn(
            "min-w-0 gap-1",
            largeTextLayout
              ? "w-full items-start pr-8"
              : "max-w-[42%] flex-row items-center gap-2"
          )}
        >
          <View className={cn(!largeTextLayout && "items-end")}>
            <Text className="text-sm font-bold text-foreground">
              {row.remaining}
            </Text>
            <Text className="text-xs font-medium text-muted-foreground">
              {row.remainingLabel}
            </Text>
          </View>
          <Icon
            className={cn(
              "size-sm text-muted-foreground",
              largeTextLayout && "absolute top-0 right-0"
            )}
            name="ChevronRight"
          />
        </View>
      </View>

      {largeTextLayout ? (
        <View className="gap-1">
          <Text className="text-xs font-medium text-muted-foreground">
            {row.amount} {row.amountLabel}
          </Text>
          <Text className="text-xs font-medium text-muted-foreground">
            {row.detail}
          </Text>
        </View>
      ) : (
        <Text className="text-xs font-medium text-muted-foreground">
          {row.amount} {row.amountLabel} · {row.detail}
        </Text>
      )}
    </Pressable>
  )
}
