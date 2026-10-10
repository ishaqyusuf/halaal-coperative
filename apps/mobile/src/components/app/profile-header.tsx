import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { resolveDisplayTextScale } from "@/lib/mobile-accessibility-layout"
import { type MobileProfile } from "@/lib/session-store"
import type { LinkProps } from "expo-router"
import { useWindowDimensions, View } from "react-native"

export function ProfileHeader({
  notificationHref,
  profile,
}: {
  notificationHref?: LinkProps["href"]
  profile: MobileProfile
}) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const displayTextScale = resolveDisplayTextScale(fontScale)
  const fallbackTenantMark =
    profile.tenant.name.trim().slice(0, 2).toUpperCase() || "HC"
  const tenantMark = profile.tenant.branding?.mark || fallbackTenantMark
  const firstName = profile.user.name.trim().split(/\s+/)[0] || "Member"

  return (
    <View className="flex-row items-center gap-3">
      <View
        accessibilityLabel={`${profile.user.name} profile`}
        className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground"
      >
        <Text
          allowFontScaling={false}
          className="text-xs font-black text-background"
        >
          {profile.user.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0]?.toUpperCase())
            .join("") || tenantMark}
        </Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text
          adjustsFontSizeToFit={!largeTextLayout}
          allowFontScaling={false}
          accessibilityRole="header"
          className="text-xl leading-7 font-extrabold tracking-tight text-foreground"
          minimumFontScale={largeTextLayout ? undefined : 0.82}
          numberOfLines={largeTextLayout ? 2 : 1}
          style={{
            color: colors.foreground,
            fontSize: 20 * displayTextScale,
            fontWeight: "800",
            lineHeight: 28 * displayTextScale,
          }}
        >
          Hi, {firstName}
        </Text>
        <Text
          className="mt-0.5 text-xs text-muted-foreground"
          numberOfLines={largeTextLayout ? 2 : 1}
        >
          {profile.tenant.name}
        </Text>
      </View>
      {notificationHref ? (
        <Pressable
          accessibilityLabel="Open notifications"
          accessibilityRole="button"
          className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent active:bg-accent/70"
          href={notificationHref}
          haptic
          transition
        >
          <Icon className="size-base text-accent-foreground" name="Bell" />
        </Pressable>
      ) : (
        <View
          accessibilityLabel={`${profile.tenant.name} cooperative mark`}
          className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary"
        >
          <Text
            className="text-xs font-black text-primary-foreground"
            numberOfLines={1}
          >
            {tenantMark}
          </Text>
        </View>
      )}
    </View>
  )
}
