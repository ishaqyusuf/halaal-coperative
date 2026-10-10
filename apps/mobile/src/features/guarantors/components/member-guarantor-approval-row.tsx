import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { Pressable, View } from "react-native"
import type { MobileGuarantorRequest } from "../model/member-guarantor-types"
import { presentGuarantorApproval } from "../model/member-guarantor-presentation"

export function MemberGuarantorApprovalRow({
  approval,
  currencyCode,
  isActionBlocked,
  isFirst,
  isSubmitting,
  onOpenDetail,
  onOpenResponse,
}: {
  approval: MobileGuarantorRequest
  currencyCode: string
  isActionBlocked: boolean
  isFirst: boolean
  isSubmitting: boolean
  onOpenDetail: () => void
  onOpenResponse: () => void
}) {
  const largeTextLayout = useLargeTextLayout()
  const row = presentGuarantorApproval(approval, currencyCode)
  const isPending = approval.status === "pending"

  if (!isPending) {
    return (
      <Pressable
        accessibilityLabel={`View ${row.accessibilityLabel}`}
        accessibilityRole="button"
        className={cn(
          "border-b border-border py-4 active:bg-muted/40",
          isFirst && "border-t"
        )}
        onPress={onOpenDetail}
      >
        <View
          className={cn(
            "gap-3",
            !largeTextLayout && "flex-row items-center justify-between"
          )}
        >
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-base font-extrabold text-foreground">
              {row.borrower}
            </Text>
            <Text className="text-xs leading-4 text-muted-foreground">
              {row.resolvedContext}
            </Text>
          </View>
          <View
            className={cn(
              "gap-3",
              largeTextLayout ? "flex-row items-center" : "items-end"
            )}
          >
            <View className={cn("gap-1", !largeTextLayout && "items-end")}>
              <StatusBadge
                label={row.status}
                tone={getStatusBadgeTone(approval.status)}
                wrap={largeTextLayout}
              />
              <Text className="text-xs font-semibold text-muted-foreground">
                {row.respondedDate}
              </Text>
            </View>
            <Icon
              className="size-sm text-muted-foreground"
              name="ChevronRight"
            />
          </View>
        </View>
      </Pressable>
    )
  }

  return (
    <View
      className={cn(
        "gap-3 border-b border-border py-4",
        "border-l-warn border-l-[3px] pl-3",
        isFirst && "border-t"
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-base font-extrabold text-foreground">
            {row.borrower}
          </Text>
          <Text className="text-xs leading-4 text-muted-foreground">
            {row.borrowerContext}
          </Text>
        </View>
        <View className="self-start">
          <StatusBadge
            label={row.status}
            tone={getStatusBadgeTone(approval.status)}
            wrap={largeTextLayout}
          />
        </View>
      </View>

      <View
        className={cn(
          "border-y border-border py-3",
          largeTextLayout ? "gap-3" : "flex-row"
        )}
      >
        {[
          ["Requested", row.requestedAmount],
          ["Monthly", row.monthlyServicing],
          ["Term", row.term],
        ].map(([label, value], index) => (
          <View
            className={cn(
              "min-w-0 gap-1",
              largeTextLayout
                ? index > 0 && "border-t border-border pt-3"
                : [
                    index === 0 ? "flex-[1.25] pr-2" : "flex-1 px-2",
                    index < 2 && "border-r border-border",
                    index === 2 && "pr-0 pl-2",
                  ]
            )}
            key={label}
          >
            <Text className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
              {label}
            </Text>
            <Text className="text-sm leading-5 font-extrabold text-foreground">
              {value}
            </Text>
          </View>
        ))}
      </View>

      {row.purpose ? (
        <View className="gap-1">
          <Text className="text-xs font-bold text-muted-foreground">
            Purpose
          </Text>
          <Text className="text-sm leading-5 text-foreground">
            {row.purpose}
          </Text>
        </View>
      ) : null}

      <View
        className={cn(
          "gap-3",
          !largeTextLayout && "flex-row items-center justify-between"
        )}
      >
        <Text
          className={cn(
            "text-xs font-semibold text-muted-foreground",
            !largeTextLayout && "min-w-0 flex-1"
          )}
        >
          Requested {row.requestedDate}
        </Text>
        <Button
          accessibilityLabel={`Review guarantor response for ${row.borrower}`}
          className={cn(
            "min-h-11 py-2",
            largeTextLayout ? "w-full" : "self-start"
          )}
          disabled={isActionBlocked || isSubmitting}
          onPress={onOpenResponse}
        >
          <Icon
            className="size-base text-primary-foreground"
            name="ShieldCheck"
          />
          <Text>Review</Text>
        </Button>
      </View>
    </View>
  )
}
