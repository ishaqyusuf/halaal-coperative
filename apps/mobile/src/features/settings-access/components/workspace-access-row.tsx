import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import {
  formatAccessCount,
  formatAccessMemberships,
  type WorkspaceAccessItem,
} from "@/features/settings-access/presentation/workspace-access-list"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export function WorkspaceAccessRow({ item, onOpenDeviceAccess }: {
  item: WorkspaceAccessItem
  onOpenDeviceAccess: (userId: string) => void
}) {
  const stacked = useLargeTextLayout()

  if (item.type === "heading") {
    return (
      <View className={cn("gap-2 border-b border-border pb-3 pt-7", stacked ? "flex-col" : "flex-row items-center justify-between")}>
        <Text accessibilityRole="header" className={cn("text-lg font-bold tracking-tight text-foreground", !stacked && "min-w-0 flex-1")}>
          {item.title}
        </Text>
        <Text className="text-xs text-muted-foreground">{item.count}</Text>
      </View>
    )
  }
  if (item.type === "empty") {
    return <Text className="py-4 text-sm text-muted-foreground">{item.title}</Text>
  }
  if (item.type === "user") {
    return (
      <Pressable
        accessibilityHint="Reviews and removes mobile device access for this workspace user"
        accessibilityLabel={`Open device access for ${item.user.fullName}`}
        accessibilityRole="button"
        className="min-h-11 flex-row items-center gap-3 border-b border-border py-4 active:bg-accent/40"
        haptic
        onPress={() => onOpenDeviceAccess(item.user.id)}
        testID={`workspace-access-user-${item.user.id}`}
      >
        <View className="min-w-0 flex-1 gap-1.5">
          <Text className="text-sm font-semibold text-foreground">{item.user.fullName}</Text>
          <Text className="text-xs leading-4 text-muted-foreground">{item.user.email}</Text>
          <Text className="text-xs leading-4 text-accent-foreground">{formatAccessMemberships(item.user)}</Text>
        </View>
        <Icon className="size-sm shrink-0 text-muted-foreground" name="ChevronRight" />
      </Pressable>
    )
  }
  return (
    <View className="gap-2 border-b border-border py-4" testID={`workspace-access-role-${item.role.role}`}>
      <View className={cn("gap-2", stacked ? "flex-col" : "flex-row items-start justify-between")}>
        <Text className={cn("text-sm font-semibold text-foreground", !stacked && "min-w-0 flex-1")}>
          {item.role.label}
        </Text>
        <Text className="text-xs leading-4 text-muted-foreground">
          {formatAccessCount(item.role.usersCount, "user")} · {item.role.defaultUsersCount} default
        </Text>
      </View>
      <Text className="text-sm leading-5 text-muted-foreground">{item.role.scope}</Text>
    </View>
  )
}
