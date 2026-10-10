import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import {
  presentWorkspaceRole,
  type WorkspaceRole,
} from "@/features/settings-access/presentation/workspace-role-presentation"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"

export function WorkspaceRoleSection({
  activeMembershipId,
  disabled,
  onSwitchWorkspace,
  roles,
  switchingMembershipId,
  tenantName,
  workspaceError,
}: {
  activeMembershipId: string
  disabled: boolean
  onSwitchWorkspace: (membershipId: string) => void
  roles: WorkspaceRole[]
  switchingMembershipId: string | null
  tenantName: string
  workspaceError: string | null
}) {
  const largeTextLayout = useLargeTextLayout()

  return (
    <View className="gap-2">
      <View
        className={cn(
          "gap-1",
          !largeTextLayout && "flex-row items-end justify-between gap-4"
        )}
      >
        <Text className="text-sm font-extrabold tracking-tight text-foreground">
          Workspace
        </Text>
        <Text
          className={cn(
            "text-xs font-semibold text-muted-foreground",
            !largeTextLayout && "max-w-[58%] text-right"
          )}
          numberOfLines={largeTextLayout ? undefined : 1}
        >
          {tenantName}
        </Text>
      </View>

      <View className="border-t border-border">
        {roles.map((role) => {
          const presentation = presentWorkspaceRole({
            activeMembershipId,
            role,
            switchingMembershipId,
          })
          const row = (
            <>
              <View
                className={cn(
                  "size-10 shrink-0 items-center justify-center rounded-xl",
                  presentation.isActive ? "bg-brand-surface" : "bg-accent",
                  largeTextLayout && "mt-0.5"
                )}
              >
                <Icon
                  className={cn(
                    "size-sm",
                    presentation.isActive
                      ? "text-brand-surface-foreground"
                      : "text-accent-foreground"
                  )}
                  name={presentation.isActive ? "Check" : presentation.icon}
                />
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-left text-sm font-bold text-foreground">
                  {presentation.label}
                </Text>
                <Text className="text-left text-xs leading-4 text-muted-foreground">
                  {presentation.detail}
                </Text>
              </View>
              <Text
                className={cn(
                  "shrink-0 text-xs font-bold",
                  presentation.isActive
                    ? "text-success"
                    : "text-muted-foreground"
                )}
              >
                {presentation.stateLabel}
              </Text>
              {!presentation.isActive ? (
                <Icon
                  className="size-sm shrink-0 text-muted-foreground"
                  name="ChevronRight"
                />
              ) : null}
            </>
          )

          return presentation.isActive ? (
            <View
              accessible
              accessibilityLabel={presentation.accessibilityLabel}
              accessibilityRole="text"
              accessibilityState={{ selected: true }}
              className={cn(
                "min-h-16 flex-row gap-3 border-b border-border bg-accent/60 px-2 py-3",
                largeTextLayout ? "items-start" : "items-center"
              )}
              key={role.id}
            >
              {row}
            </View>
          ) : (
            <Pressable
              accessibilityLabel={presentation.accessibilityLabel}
              className={cn(
                "min-h-16 flex-row gap-3 border-b border-border px-2 py-3 active:bg-accent/30",
                largeTextLayout ? "items-start" : "items-center"
              )}
              disabled={disabled}
              haptic
              key={role.id}
              onPress={() => onSwitchWorkspace(role.id)}
            >
              {row}
            </Pressable>
          )
        })}
      </View>

      {workspaceError ? (
        <Text className="text-sm font-medium text-destructive">
          {workspaceError}
        </Text>
      ) : null}
    </View>
  )
}
