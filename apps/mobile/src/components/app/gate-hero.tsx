import { Text } from "@/components/ui/text"
import type { MobileProfile } from "@/lib/session-store"
import { Image, View } from "react-native"

const halaalvestLogo = require("../../../assets/icons/app-icon.png")

export type GateIdentity =
  | { kind: "brand" }
  | { kind: "cooperative"; mark: string; name: string; detail?: string }

/** The signed-in cooperative's mark and the user line, or HalaalVest. */
export function gateIdentityFor(
  profile: MobileProfile | null | undefined
): GateIdentity {
  if (!profile) return { kind: "brand" }
  const mark =
    profile.tenant.branding.mark?.trim() ||
    profile.tenant.name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("")
  return {
    detail: [profile.user.name, profile.member?.code].filter(Boolean).join(" · "),
    kind: "cooperative",
    mark,
    name: profile.tenant.name,
  }
}

/** HalaalVest logo tile, or the cooperative's warm mark. */
export function GateMark({
  identity,
  size = 44,
}: {
  identity: GateIdentity
  size?: 44 | 56 | 72
}) {
  const radius = size === 44 ? 14 : size === 56 ? 18 : 22
  const tile =
    size === 44
      ? "size-[44px] rounded-[14px]"
      : size === 56
        ? "size-[56px] rounded-[18px]"
        : "size-[72px] rounded-[22px]"
  if (identity.kind === "brand") {
    return (
      <View
        className={`${tile} items-center justify-center bg-hero-foreground`}
      >
        <Image
          accessible={false}
          resizeMode="contain"
          source={halaalvestLogo}
          style={{ borderRadius: radius / 2, height: size * 0.76, width: size * 0.76 }}
        />
      </View>
    )
  }
  return (
    <View className={`${tile} items-center justify-center bg-brand-warm`}>
      <Text
        className="text-hero-mark-foreground"
        maxFontSizeMultiplier={1}
        variant={size === 44 ? "section" : "title"}
      >
        {identity.mark}
      </Text>
    </View>
  )
}
