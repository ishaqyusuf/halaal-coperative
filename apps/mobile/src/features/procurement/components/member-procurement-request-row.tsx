import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { Pressable, View } from "react-native"
import type { MobileMemberProcurementRequest } from "../model/member-procurement-types"
import { presentMemberProcurementRequest } from "../model/member-procurement-presentation"

export function MemberProcurementRequestRow({
  currencyCode,
  isFirst,
  onPress,
  request,
}: {
  currencyCode: string
  isFirst: boolean
  onPress: () => void
  request: MobileMemberProcurementRequest
}) {
  const largeTextLayout = useLargeTextLayout()
  const row = presentMemberProcurementRequest(request, currencyCode)

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
          <Text className="text-xs font-medium text-muted-foreground">
            {row.amount} · {row.term}
          </Text>
        </View>
        <View
          className={cn(
            "flex-row items-center gap-2",
            largeTextLayout && "w-full justify-between"
          )}
        >
          <StatusBadge
            label={row.status}
            tone={getStatusBadgeTone(request.status)}
            wrap={largeTextLayout}
          />
          <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
        </View>
      </View>
      <Text className="text-xs font-medium text-muted-foreground">
        {row.date}
        {row.dueCount
          ? ` · ${row.dueCount} payment${row.dueCount === 1 ? "" : "s"} due`
          : ""}
      </Text>
    </Pressable>
  )
}
