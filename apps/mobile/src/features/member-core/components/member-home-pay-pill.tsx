import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useColors, useColorScheme } from "@/hooks/use-color"
import { shadows } from "@/lib/design-tokens"
import { newPaymentHref } from "@/features/receipts/public/member-payables"
import { useRouter } from "expo-router"
import { useEffect, useState } from "react"
import { Pressable } from "@/components/ui/pressable"
import { View } from "react-native"
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/** Scroll clearance so the last row lifts above the pill (36 + 20). */
export const PAY_PILL_CONTENT_CLEARANCE = 56

/**
 * Home's floating Add payment pill (T31, workshop 31-home-ask · 04): the
 * 36pt card pill with "+ Add payment", bottom-right above the safe area.
 * It folds to a "+" circle while scrolled down and opens again near the top
 * (220ms; Reduce Motion swaps instantly). Its label stays "Add payment" and
 * the hit area is 44pt. It opens Record payment (T30) in its default mode.
 */
export function MemberHomePayPill({ expanded }: { expanded: boolean }) {
  const router = useRouter()
  const colors = useColors()
  const { colorScheme } = useColorScheme()
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()
  const [labelWidth, setLabelWidth] = useState(0)
  const progress = useSharedValue(expanded ? 1 : 0)

  useEffect(() => {
    const target = expanded ? 1 : 0
    progress.set(
      reduceMotion
        ? target
        : withTiming(target, { duration: 220, easing: Easing.out(Easing.quad) })
    )
  }, [expanded, progress, reduceMotion])

  const pillStyle = useAnimatedStyle(() => ({
    paddingLeft: interpolate(progress.get(), [0, 1], [9.5, 10]),
    paddingRight: interpolate(progress.get(), [0, 1], [9.5, 14]),
  }))
  const labelStyle = useAnimatedStyle(() => ({
    marginLeft: 6 * progress.get(),
    opacity: interpolate(progress.get(), [0, 0.6, 1], [0, 0.2, 1]),
    width: labelWidth ? labelWidth * progress.get() : undefined,
  }))

  return (
    // A strip across the bottom that lets touches through; the pill sits at
    // its end, above the safe area (runtime inset).
    // Position in style: absolute classes with a runtime bottom stayed in flow
    // on iOS (see qa/mobile-native-style-exceptions.json).
    <View
      pointerEvents="box-none"
      style={{
        alignItems: "flex-end",
        bottom: insets.bottom > 0 ? insets.bottom : 16,
        left: 0,
        position: "absolute",
        right: 18,
      }}
    >
      {/* Surface and shadow outside the pressable, which clips its children. */}
      <View
        style={{
          backgroundColor: colorScheme === "dark" ? colors.surfaceFloat : colors.card,
          borderColor: colorScheme === "dark" ? colors.border : "transparent",
          borderRadius: 999,
          borderWidth: 1,
          boxShadow: shadows[colorScheme].float,
        }}
      >
        <Pressable
          accessibilityLabel="Add payment"
          accessibilityRole="button"
          className="rounded-full"
          haptic
          hitSlop={4}
          onPress={() => router.push(newPaymentHref() as never)}
          testID="member-home-add-payment"
        >
          <Animated.View
            style={[
              { alignItems: "center", flexDirection: "row", minHeight: 34, opacity: 1, paddingVertical: 4 },
              pillStyle,
            ]}
          >
            <Icon className="size-[17px] text-primary" name="Plus" strokeWidth={2.5} />
            <Animated.View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              // Opacity, margin and width are driven by labelStyle.
              style={[{ opacity: 1, overflow: "hidden" }, labelStyle]}
            >
              <View style={{ width: labelWidth || undefined }}>
                <Text
                  className="text-primary"
                  numberOfLines={1}
                  onLayout={(event) => {
                    const width = Math.ceil(event.nativeEvent.layout.width)
                    if (width && !labelWidth) setLabelWidth(width)
                  }}
                  variant="label"
                >
                  Add payment
                </Text>
              </View>
            </Animated.View>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  )
}
