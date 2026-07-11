import { Text } from "@/components/ui/text"
import { type MobileProfile } from "@/lib/session-store"
import { View } from "react-native"

export function ProfileHeader({ profile }: { profile: MobileProfile }) {
  const fallbackTenantMark =
    profile.tenant.name.trim().slice(0, 2).toUpperCase() || "HC"
  const tenantMark = profile.tenant.branding?.mark || fallbackTenantMark

  return (
    <View className="flex-row items-center justify-between gap-4">
      <View className="flex-1">
        <Text className="text-sm text-muted-foreground">
          {profile.tenant.name}
        </Text>
        <Text className="text-2xl font-bold text-foreground">
          {profile.user.name}
        </Text>
      </View>
      <View className="h-12 w-12 items-center justify-center rounded-md bg-primary">
        <Text className="text-sm font-black text-primary-foreground">
          {tenantMark}
        </Text>
      </View>
    </View>
  )
}
