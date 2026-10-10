import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { resolveDisplayTextScale } from "@/lib/mobile-accessibility-layout"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { useWindowDimensions, View } from "react-native"

export function ScreenHeader({
  action,
  className,
  description,
  leading,
  size = "default",
  tone = "default",
  title,
}: {
  action?: ReactNode
  className?: string
  description?: string
  leading?: ReactNode
  size?: "compact" | "default"
  tone?: "default" | "inverse"
  title: string
}) {
  const largeTextLayout = useLargeTextLayout()
  const colors = useColors()
  const { fontScale } = useWindowDimensions()
  const bodyTextScale = Number.isFinite(fontScale) ? Math.max(fontScale, 1) : 1
  const displayTextScale = resolveDisplayTextScale(fontScale)

  return (
    <View
      className={cn("flex-row items-start justify-between gap-4", className)}
    >
      {leading ? <View className="shrink-0">{leading}</View> : null}
      <View className="min-w-0 flex-1">
        <Text
          allowFontScaling={false}
          accessibilityRole="header"
          className={cn(
            size === "compact"
              ? "text-[25px] leading-[30px] font-extrabold tracking-tight"
              : "text-[32px] leading-[34px] font-extrabold tracking-tight",
            tone === "inverse"
              ? "text-brand-surface-foreground"
              : "text-foreground"
          )}
          style={{
            color:
              tone === "inverse"
                ? colors.brandSurfaceForeground
                : colors.foreground,
            fontSize: (size === "compact" ? 25 : 32) * displayTextScale,
            fontWeight: "800",
            lineHeight: (size === "compact" ? 30 : 34) * displayTextScale,
          }}
        >
          {title}
        </Text>
        {description ? (
          <Text
            allowFontScaling={false}
            className={cn(
              "mt-2 max-w-[520px] text-sm leading-5",
              tone === "inverse"
                ? "text-brand-surface-foreground/70"
                : "text-muted-foreground"
            )}
            style={{
              color:
                tone === "inverse"
                  ? colors.brandSurfaceForeground
                  : colors.mutedForeground,
              opacity: tone === "inverse" ? 0.7 : 1,
              fontSize: 14 * bodyTextScale,
              lineHeight: 20 * bodyTextScale,
            }}
          >
            {description}
          </Text>
        ) : null}
      </View>
      {action ? (
        <View className={cn("shrink-0", largeTextLayout && "mt-1")}>
          {action}
        </View>
      ) : null}
    </View>
  )
}
