import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { motion } from "@/lib/design-tokens"
import { cn } from "@/lib/utils"
import * as Haptics from "expo-haptics"
import { useCallback, useEffect, useState } from "react"
import { type LayoutChangeEvent, ScrollView, View } from "react-native"
import Animated, {
  Easing,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

export type SegmentedOption<T extends string> = {
  value: T
  label: string
  /** Optional count shown after the label ("Ledger 34"). */
  count?: number | string
  accessibilityLabel?: string
  disabled?: boolean
}

type SegmentLayout = { width: number; x: number }

const INDICATOR_EASING = Easing.bezier(...motion.sheet.bezier)

/**
 * The one segmented control (02 Brand native v3): a raised track whose card
 * thumb slides between segments (300ms). Pass `position` (a float index,
 * e.g. from SegmentedPager) to make the thumb follow a swipe. With more than
 * three options, or `scrollable`, the track scrolls horizontally.
 */
export function SegmentedControl<T extends string>({
  accessibilityLabel,
  className,
  onChange,
  options,
  position,
  scrollable,
  value,
}: {
  accessibilityLabel: string
  className?: string
  onChange: (value: T) => void
  options: readonly SegmentedOption<T>[]
  position?: SharedValue<number>
  scrollable?: boolean
  value: T
}) {
  const reduceMotion = useReducedMotion()
  const shouldScroll = scrollable ?? options.length > 3
  const selectedIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )
  const ownPosition = useSharedValue(selectedIndex)
  const indicatorPosition = position ?? ownPosition
  const [layouts, setLayouts] = useState<(SegmentLayout | undefined)[]>(() =>
    options.map(() => undefined)
  )
  const xs = useSharedValue<number[]>([])
  const widths = useSharedValue<number[]>([])

  useEffect(() => {
    if (position) return
    ownPosition.set(
      reduceMotion
        ? selectedIndex
        : withTiming(selectedIndex, {
            duration: 300,
            easing: INDICATOR_EASING,
          })
    )
  }, [ownPosition, position, reduceMotion, selectedIndex])

  useEffect(() => {
    if (layouts.length !== options.length || layouts.some((entry) => !entry))
      return
    xs.set(layouts.map((entry) => entry?.x ?? 0))
    widths.set(layouts.map((entry) => entry?.width ?? 0))
  }, [layouts, options.length, widths, xs])

  const onSegmentLayout = useCallback(
    (index: number) => (event: LayoutChangeEvent) => {
      const { width, x } = event.nativeEvent.layout
      setLayouts((current) => {
        const previous = current[index]
        if (previous && previous.width === width && previous.x === x)
          return current
        const next = [...current]
        next.length = options.length
        next[index] = { width, x }
        return next
      })
    },
    [options.length]
  )

  const indicatorStyle = useAnimatedStyle(() => {
    const positions = xs.get()
    const sizes = widths.get()
    if (positions.length === 0) return { opacity: 0 }
    const input = positions.map((_, index) => index)
    const at = Math.min(
      Math.max(indicatorPosition.get(), 0),
      positions.length - 1
    )
    return {
      opacity: 1,
      transform: [
        {
          translateX:
            positions.length > 1 ? interpolate(at, input, positions) : positions[0],
        },
      ],
      width: sizes.length > 1 ? interpolate(at, input, sizes) : sizes[0],
    }
  })

  const track = (
    <View className="relative flex-row gap-0.5">
      <Animated.View
        accessible={false}
        className="absolute top-0 bottom-0 left-0 rounded-[11px] bg-surface-float"
        pointerEvents="none"
        style={[{ boxShadow: "0 1px 3px rgba(0, 0, 0, 0.10)" }, indicatorStyle]}
      />
      {options.map((option, index) => {
        const selected = option.value === value
        return (
          <Pressable
            accessibilityLabel={
              option.accessibilityLabel ??
              (option.count !== undefined
                ? `${option.label}, ${option.count}`
                : option.label)
            }
            accessibilityRole="tab"
            accessibilityState={{ disabled: option.disabled, selected }}
            className={cn(
              "min-h-9 flex-row items-center justify-center gap-1.5 rounded-[11px] px-3",
              shouldScroll ? "" : "flex-1",
              option.disabled && "opacity-40"
            )}
            disabled={option.disabled}
            key={option.value}
            noRipple
            onLayout={onSegmentLayout(index)}
            onPress={() => {
              if (selected) return
              void Haptics.selectionAsync()
              onChange(option.value)
            }}
          >
            <Text
              className={selected ? "text-foreground" : "text-foreground-soft"}
              numberOfLines={1}
              variant="label"
            >
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <Text
                className="text-muted-foreground"
                style={{ fontVariant: ["tabular-nums"] }}
                variant="caption"
              >
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tablist"
      className={cn("rounded-[14px] bg-surface-raised p-[3px]", className)}
    >
      {shouldScroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {track}
        </ScrollView>
      ) : (
        track
      )}
    </View>
  )
}
