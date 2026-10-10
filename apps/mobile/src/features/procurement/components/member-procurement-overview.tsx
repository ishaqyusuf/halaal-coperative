import { StatusBadge } from "@/components/app/status-badge"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { Pressable, View } from "react-native"
import type { MobileMemberProcurement } from "../model/member-procurement-types"
import {
  formatProcurementStatus,
  presentMemberProcurementOverview,
} from "../model/member-procurement-presentation"

export function MemberProcurementOverview({
  currencyCode,
  onOpenActiveRequest,
  procurement,
}: {
  currencyCode: string
  onOpenActiveRequest: () => void
  procurement: MobileMemberProcurement
}) {
  const largeTextLayout = useLargeTextLayout()
  const overview = presentMemberProcurementOverview(procurement, currencyCode)
  const activeRequest = overview.activeRequest

  return (
    <View className="gap-5">
      <View className="bg-brand-surface gap-4 rounded-2xl p-5">
        <View
          className={cn(
            "gap-3",
            !largeTextLayout && "flex-row items-end justify-between"
          )}
        >
          <View className={cn("min-w-0 gap-1", !largeTextLayout && "flex-1")}>
            <Text className="text-brand-surface-foreground/75 text-xs font-bold">
              Outstanding
            </Text>
            <Text
              accessibilityRole="header"
              className={cn(
                "text-brand-surface-foreground font-black tracking-[-1px]",
                largeTextLayout
                  ? "text-3xl leading-9"
                  : "text-[40px] leading-[44px]"
              )}
            >
              {overview.balance}
            </Text>
          </View>

          <View className="bg-brand-surface-foreground/15 flex-row items-center gap-2 self-start rounded-full px-3 py-2">
            <View
              className={cn(
                "size-1.5 rounded-full",
                overview.isOnTrack ? "bg-brand-surface-foreground" : "bg-warn"
              )}
            />
            <Text className="text-brand-surface-foreground text-xs font-bold">
              {overview.isOnTrack ? "On track" : "Needs attention"}
            </Text>
          </View>
        </View>

        {activeRequest ? (
          <>
            <View
              accessibilityLabel={`${Math.round(overview.progressPercent)} percent repaid`}
              accessibilityRole="progressbar"
              accessibilityValue={{
                max: 100,
                min: 0,
                now: Math.round(overview.progressPercent),
              }}
              className="bg-brand-surface-foreground/20 h-1.5 overflow-hidden rounded-full"
            >
              <View
                className="bg-brand-surface-foreground h-full rounded-full"
                style={{ width: `${overview.progressPercent}%` }}
              />
            </View>
            <View
              className={cn(
                "gap-1",
                !largeTextLayout &&
                  "flex-row items-center justify-between gap-3"
              )}
            >
              <Text className="text-brand-surface-foreground/80 text-xs font-medium">
                {overview.openPaymentCount} payment
                {overview.openPaymentCount === 1 ? "" : "s"} left
              </Text>
              <Text className="text-brand-surface-foreground text-xs font-bold">
                {overview.monthlyAmount} monthly
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {activeRequest ? (
        <View>
          <View
            className={cn(
              "mb-1 gap-2",
              !largeTextLayout && "flex-row items-center justify-between"
            )}
          >
            <Text className="text-xl font-extrabold tracking-[-0.4px] text-foreground">
              Active purchase
            </Text>
            <StatusBadge
              label={formatProcurementStatus(activeRequest.status)}
              tone="success"
              wrap={largeTextLayout}
            />
          </View>

          <Pressable
            accessibilityLabel={`View ${activeRequest.itemName} procurement details`}
            accessibilityRole="button"
            className="min-h-20 flex-row items-center gap-3 border-b border-border py-4 active:opacity-70"
            onPress={onOpenActiveRequest}
          >
            <View className="size-12 shrink-0 items-center justify-center rounded-2xl bg-accent">
              <Icon
                className="size-base text-accent-foreground"
                name="PackageSearch"
              />
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-bold text-foreground">
                {activeRequest.itemName}
              </Text>
              {activeRequest.vendorName ? (
                <Text className="text-xs font-medium text-muted-foreground">
                  {activeRequest.vendorName}
                </Text>
              ) : null}
            </View>
            <Icon
              className="size-sm text-muted-foreground"
              name="ChevronRight"
            />
          </Pressable>

          <View className={cn(largeTextLayout ? "gap-0" : "flex-row gap-4")}>
            <View className="min-w-0 flex-1 gap-1 border-b border-border py-4">
              <Text className="text-xs font-semibold text-muted-foreground">
                Purchase value
              </Text>
              <Text className="text-base font-extrabold text-foreground">
                {overview.purchaseValue}
              </Text>
            </View>
            <View className="min-w-0 flex-1 gap-1 border-b border-border py-4">
              <Text className="text-xs font-semibold text-muted-foreground">
                Next payment
              </Text>
              <Text className="text-base font-extrabold text-foreground">
                {overview.nextDueDate ?? "No payment due"}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  )
}
