import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import type { MobileFoodPurchaseApplication } from "../model/member-food-purchase-types"
import { presentFoodPurchaseObligation } from "../model/member-food-purchase-presentation"

export function MemberFoodPurchaseOverview({
  application,
  currencyCode,
}: {
  application: MobileFoodPurchaseApplication
  currencyCode: string
}) {
  const largeTextLayout = useLargeTextLayout()
  const obligation = presentFoodPurchaseObligation(application, currencyCode)

  return (
    <View className="gap-3 border-y border-border py-5">
      <View
        className={cn(
          "gap-2",
          !largeTextLayout && "flex-row items-start justify-between gap-4"
        )}
      >
        <View
          className={cn("min-w-0 gap-1", largeTextLayout ? "w-full" : "flex-1")}
        >
          <Text className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Outstanding
          </Text>
          <Text
            accessibilityRole="header"
            className="text-3xl font-extrabold tracking-tight text-foreground"
          >
            {obligation.remaining}
          </Text>
        </View>
        <View className="self-start">
          <StatusBadge
            label={obligation.status}
            tone={getStatusBadgeTone(application.status)}
          />
        </View>
      </View>

      {largeTextLayout ? (
        <View className="gap-1">
          <Text className="text-sm font-medium text-muted-foreground">
            {obligation.paid} paid
          </Text>
          <Text className="text-sm font-medium text-muted-foreground">
            of {obligation.approved}
          </Text>
        </View>
      ) : (
        <Text className="text-sm font-medium text-muted-foreground">
          {obligation.paidSummary}
        </Text>
      )}

      <View
        accessibilityLabel={`${Math.round(obligation.progressPercent)} percent paid`}
        accessibilityRole="progressbar"
        accessibilityValue={obligation.accessibilityValue}
        className="h-1.5 overflow-hidden rounded-full bg-secondary"
      >
        <View
          className="bg-brand h-full rounded-full"
          style={{ width: `${obligation.progressPercent}%` }}
        />
      </View>

      <View
        className={cn(
          "gap-2",
          !largeTextLayout && "flex-row items-start justify-between gap-4"
        )}
      >
        <Text
          className={cn(
            "min-w-0 text-sm font-semibold text-foreground",
            largeTextLayout ? "w-full" : "flex-1"
          )}
        >
          {obligation.item}
        </Text>
        <Text className="text-sm font-semibold text-muted-foreground">
          {obligation.payback}
        </Text>
      </View>
    </View>
  )
}
