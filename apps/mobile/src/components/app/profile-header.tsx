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
        <Text
          className="text-sm leading-5 text-muted-foreground"
          numberOfLines={2}
        >
          {profile.tenant.name}
        </Text>
        <Text
          adjustsFontSizeToFit
          className="text-2xl leading-8 font-bold text-foreground"
          minimumFontScale={0.82}
          numberOfLines={2}
        >
          {profile.user.name}
        </Text>
      </View>
      <View
        accessibilityLabel={`${profile.tenant.name} cooperative mark`}
        className="h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary"
      >
        <Text
          className="text-sm font-black text-primary-foreground"
          numberOfLines={1}
        >
          {tenantMark}
        </Text>
      </View>
    </View>
  )
}
