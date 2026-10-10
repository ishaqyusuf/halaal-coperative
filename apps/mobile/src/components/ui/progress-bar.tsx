import { cn } from "@/lib/utils"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { View } from "react-native"

import { Text } from "./text"

const progressTrackVariants = cva(
  "w-full overflow-hidden rounded-full bg-muted",
  {
    variants: {
      size: {
        sm: "h-1.5",
        md: "h-2.5",
        lg: "h-3.5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

type ProgressBarProps = Omit<React.ComponentProps<typeof View>, "children"> &
  VariantProps<typeof progressTrackVariants> & {
    value: number
    label: string
    info?: string
    min?: number
    max?: number
    trackClassName?: string
    fillClassName?: string
    fillColor?: string
    labelClassName?: string
    valueClassName?: string
  }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function ProgressBar({
  value,
  label,
  info,
  min = 0,
  max = 100,
  size,
  className,
  trackClassName,
  fillClassName,
  fillColor,
  labelClassName,
  valueClassName,
  ...props
}: ProgressBarProps) {
  const useStackedLayout = useLargeTextLayout()
  const safeMax = Math.max(max, min)
  const safeValue = clamp(value, min, safeMax)
  const total = safeMax - min
  const percent = total > 0 ? ((safeValue - min) / total) * 100 : 0
  const visualPercent = total > 0 && percent > 0 ? Math.max(percent, 6) : 0
  const progressTones = [
    "bg-destructive",
    "bg-warn",
    "bg-accent",
    "bg-success",
    "bg-primary",
  ]
  const colorIndex = Math.min(4, Math.floor(percent / 20))
  const fillTone = progressTones[colorIndex]
  const baseValue = Math.round(safeValue - min)
  const totalValue = Math.round(total)
  const infoText = info ? `${baseValue}/${totalValue} ${info}` : null

  return (
    <View className={cn("w-full gap-2", className)} {...props}>
      <View
        className={cn(
          "justify-between",
          useStackedLayout ? "items-start gap-1" : "flex-row items-center gap-3"
        )}
      >
        <Text
          className={cn("text-sm font-medium text-foreground", labelClassName)}
        >
          {label}
        </Text>
        {infoText ? (
          <Text
            className={cn(
              "text-sm font-semibold text-foreground",
              valueClassName
            )}
            numberOfLines={1}
          >
            {infoText}
          </Text>
        ) : null}
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min, max: safeMax, now: safeValue }}
        className={cn(progressTrackVariants({ size }), trackClassName)}
      >
        {fillTone ? (
          <View
            className={cn("h-full rounded-full", fillTone, fillClassName)}
            style={{
              backgroundColor: fillColor,
              height: "100%",
              width: `${visualPercent}%`,
            }}
          />
        ) : (
          <View
            className="h-full"
            style={{ height: "100%", width: `${visualPercent}%` }}
          >
            <View className={cn("h-full rounded-full", fillClassName)} />
          </View>
        )}
      </View>
    </View>
  )
}

export { ProgressBar }
export type { ProgressBarProps }
