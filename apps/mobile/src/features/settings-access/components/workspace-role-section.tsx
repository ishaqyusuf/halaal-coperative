import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type { MobileProfile } from "@/lib/session-store"
import { presentWorkspaceRole } from "../presentation/workspace-role-presentation"
import { GroupedRow, SettingsGroup } from "./grouped-settings"

export function WorkspaceRoleSection({
  onSwitchWorkspace,
  profile,
  switchingMembershipId,
  workspaceError,
}: {
  onSwitchWorkspace: (membershipId: string) => void
  profile: MobileProfile
  switchingMembershipId: string | null
  workspaceError: string | null
}) {
  if ((profile.availableRoles?.length ?? 0) < 2) return null
  return (
    <>
      <SettingsGroup title="Workspace">
        {profile.availableRoles?.map((role) => {
          const presentation = presentWorkspaceRole({
            activeMembershipId: profile.activeMembershipId,
            role,
            switchingMembershipId,
          })
          const member = role.role === "member"
          return (
            <GroupedRow
              accessibilityLabel={presentation.accessibilityLabel}
              detail={presentation.detail}
              disabled={Boolean(switchingMembershipId)}
              icon={member ? "UserRound" : "ShieldCheck"}
              key={role.id}
              onPress={
                presentation.isActive
                  ? undefined
                  : () => onSwitchWorkspace(role.id)
              }
              title={presentation.label}
              tone={member ? "mint" : "sky"}
              trailing={
                presentation.isActive ? (
                  <Icon
                    accessibilityLabel="Current workspace"
                    className="size-sm text-primary"
                    name="Check"
                  />
                ) : undefined
              }
              value={
                switchingMembershipId === role.id ? "Switching…" : undefined
              }
            />
          )
        })}
      </SettingsGroup>
      {workspaceError ? (
        <Text
          accessibilityRole="alert"
          className="text-destructive"
          variant="small"
        >
          {workspaceError}
        </Text>
      ) : null}
    </>
  )
}
