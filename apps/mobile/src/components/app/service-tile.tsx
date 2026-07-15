import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import type { LinkProps } from "expo-router"
import { View } from "react-native"

const toneClass = {
  accent: "bg-accent",
  primary: "bg-primary",
  success: "bg-success",
}

const iconClass = {
  accent: "text-accent-foreground",
  primary: "text-primary-foreground",
  success: "text-success-foreground",
}

export function ServiceTile({
  accessibilityLabel,
  href,
  icon,
  label,
  tone,
}: {
  accessibilityLabel?: string
  href?: LinkProps["href"]
  icon: string
  label: string
  tone: keyof typeof toneClass
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? `Open ${label}`}
      accessibilityRole="button"
      className="min-h-[112px] w-[23%] min-w-[78px] items-center justify-start gap-2 rounded-md border border-transparent p-2 active:border-border active:bg-secondary/70"
      href={href}
      haptic
      transition
    >
      <View
        className={`h-14 w-14 shrink-0 items-center justify-center rounded-md ${toneClass[tone]}`}
      >
        <Icon name={icon} className={`size-md ${iconClass[tone]}`} />
      </View>
      <Text
        adjustsFontSizeToFit
        className="min-h-8 text-center text-xs leading-4 font-medium text-foreground"
        minimumFontScale={0.82}
        numberOfLines={2}
      >
        {label}
      </Text>
    </Pressable>
  )
}
