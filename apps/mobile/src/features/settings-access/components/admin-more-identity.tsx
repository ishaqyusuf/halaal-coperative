import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import type { MobileProfile } from "@/lib/session-store"
import { View } from "react-native"
import { formatWorkspaceRoleLabel } from "../presentation/workspace-role-presentation"
import { GroupedRow } from "./grouped-settings"

export function MoreIdentity({
  profile,
  memberNumber,
  onPress,
}: {
  profile: MobileProfile
  memberNumber?: string
  onPress: () => void
}) {
  const admin = profile.role === "admin"
  return (
    <GroupedRow
      avatar={profile.user.name}
      detail={profile.tenant.name}
      large
      onPress={onPress}
      supporting={
        <View className="mt-[3px] flex-row flex-wrap items-center gap-[8px]">
          <StatusPill
            label={formatWorkspaceRoleLabel(
              profile.cooperativeRole ?? profile.role
            )}
            tone={admin ? "info" : "brand"}
          />
          {memberNumber ? (
            <Text className="text-muted-foreground" variant="caption">
              {memberNumber}
            </Text>
          ) : null}
        </View>
      }
      title={profile.user.name}
    />
  )
}
