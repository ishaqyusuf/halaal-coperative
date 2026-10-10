import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import type { LinkProps } from "expo-router"
import { View } from "react-native"

const toneClass = {
  accent: "bg-accent",
  brand: "bg-brand",
  primary: "bg-primary",
  success: "bg-success",
}

const iconClass = {
  accent: "text-accent-foreground",
  brand: "text-brand-foreground",
  primary: "text-primary-foreground",
  success: "text-success-foreground",
}

export function ServiceTile({
  accessibilityLabel,
  href,
  icon,
  label,
  layout = "compact",
  tone,
}: {
  accessibilityLabel?: string
  href?: LinkProps["href"]
  icon: string
  label: string
  layout?: "compact" | "full" | "wide"
  tone: keyof typeof toneClass
}) {
  const isCompact = layout === "compact"

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? `Open ${label}`}
      accessibilityRole="button"
      className={cn(
        "justify-start active:bg-secondary/70",
        isCompact
          ? "min-h-[112px] w-[23%] min-w-[78px] items-center gap-2 rounded-lg border border-transparent p-2 active:border-border"
          : cn(
              "min-h-[88px] flex-row items-center gap-3 border-b border-border py-3",
              layout === "full" ? "w-full" : "w-[48%]"
            )
      )}
      href={href}
      haptic
      transition
    >
      <View
        className={cn(
          "shrink-0 items-center justify-center rounded-lg",
          isCompact ? "h-14 w-14" : "h-10 w-10",
          toneClass[tone]
        )}
      >
        <Icon
          name={icon}
          className={cn(isCompact ? "size-md" : "size-sm", iconClass[tone])}
        />
      </View>
      <Text
        adjustsFontSizeToFit={isCompact}
        className={cn(
          "font-medium text-foreground",
          isCompact
            ? "min-h-8 text-center text-xs leading-4"
            : "min-w-0 flex-1 text-sm leading-5"
        )}
        minimumFontScale={isCompact ? 0.82 : undefined}
        numberOfLines={isCompact ? 2 : undefined}
      >
        {label}
      </Text>
    </Pressable>
  )
}
