import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { APP_LOCK_CODE_LENGTH } from "@/features/app-lock/model/app-lock-types"
import { useColors, useColorScheme } from "@/hooks/use-color"
import * as Haptics from "expo-haptics"
import { memo, useCallback, useEffect, useRef } from "react"
import {
  Pressable,
  useWindowDimensions,
  View,
  type PressableStateCallbackType,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated"

const PIN_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
] as const

/** Below this window height the keys shrink from 58 to 48pt. */
const COMPACT_WINDOW_HEIGHT = 700

function useKeyHeight() {
  const { height } = useWindowDimensions()
  return height < COMPACT_WINDOW_HEIGHT ? 48 : 58
}

/**
 * Six PIN dots (02 Brand hero): 14pt, 16pt apart, filled in ink. `error`
 * turns the ring danger and shakes the row once (400ms, off under reduce
 * motion). `errorKey` changes on every new error so a repeat mistake shakes
 * again.
 */
export function AppLockPinDots({
  error = false,
  errorKey = 0,
  value,
}: {
  error?: boolean
  errorKey?: number
  value: string
}) {
  const colors = useColors()
  const reduceMotion = useReducedMotion()
  const offset = useSharedValue(0)

  useEffect(() => {
    if (!error || reduceMotion) return
    offset.set(
      withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 80 }),
        withTiming(-8, { duration: 80 }),
        withTiming(6, { duration: 80 }),
        withTiming(-3, { duration: 60 }),
        withTiming(0, { duration: 50 })
      )
    )
  }, [error, errorKey, offset, reduceMotion])

  const shake = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.get() }],
  }))

  return (
    <Animated.View
      accessibilityLabel={`${value.length} of ${APP_LOCK_CODE_LENGTH} PIN digits entered`}
      accessible
      style={[
        { flexDirection: "row", gap: 16, justifyContent: "center" },
        shake,
      ]}
    >
      {Array.from({ length: APP_LOCK_CODE_LENGTH }, (_, index) => {
        const filled = index < value.length
        return (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            key={`app-lock-pin-dot-${index + 1}`}
            style={{
              backgroundColor: filled ? colors.foreground : "transparent",
              borderColor: error
                ? colors.destructive
                : filled
                  ? colors.foreground
                  : colors.mutedForeground,
              borderRadius: 7,
              borderWidth: 2,
              height: 14,
              opacity: filled || error ? 1 : 0.6,
              width: 14,
            }}
          />
        )
      })}
    </Animated.View>
  )
}

type AppLockPinPadProps = {
  biometricLabel?: string
  disabled?: boolean
  onBiometricPress?: () => void
  onChange: (value: string) => void
  showBiometric?: boolean
  value: string
}

/**
 * Native 3×4 PIN pad (02 Brand hero, workshop 03): full width inside the
 * gutter, 10pt gaps, 58pt keys (48 on small phones) with radius 18. Light keys
 * are cards with a hairline shadow, dark keys the raised surface; a pressed
 * key turns tint and scales to .94. Biometric (bottom left, only when on) and
 * delete (bottom right) are transparent. Press styles come from Pressable's
 * own state, not className `active:` (T02: it stuck after disabled toggles).
 */
export const AppLockPinPad = memo(function AppLockPinPad({
  biometricLabel = "biometrics",
  disabled = false,
  onBiometricPress,
  onChange,
  showBiometric = false,
  value,
}: AppLockPinPadProps) {
  // Fast taps can land before the parent re-renders with the new value, so
  // each key builds on the latest value it produced, not the last render's
  // (otherwise two quick taps overwrite each other and digits go missing).
  const latest = useRef(value)
  useEffect(() => {
    latest.current = value
  }, [value])
  const appendDigit = useCallback(
    (digit: string) => {
      if (disabled || latest.current.length >= APP_LOCK_CODE_LENGTH) return
      latest.current = `${latest.current}${digit}`
      onChange(latest.current)
    },
    [disabled, onChange]
  )
  const removeDigit = useCallback(() => {
    if (disabled || latest.current.length === 0) return
    latest.current = latest.current.slice(0, -1)
    onChange(latest.current)
  }, [disabled, onChange])

  return (
    <View style={{ gap: 10, opacity: disabled ? 0.38 : 1, width: "100%" }}>
      {PIN_ROWS.map((row) => (
        <View key={row.join("-")} style={{ flexDirection: "row", gap: 10 }}>
          {row.map((digit) => (
            <PinKey
              accessibilityLabel={`Enter digit ${digit}`}
              disabled={disabled}
              key={digit}
              onPress={() => appendDigit(digit)}
            >
              <Text className="text-[26px] font-bold text-foreground" tabular>
                {digit}
              </Text>
            </PinKey>
          ))}
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 10 }}>
        {showBiometric && onBiometricPress ? (
          <PinKey
            accessibilityLabel={`Unlock with ${biometricLabel}`}
            disabled={disabled}
            onPress={onBiometricPress}
            plain
          >
            <Icon
              className="size-xl text-foreground"
              name={/face/i.test(biometricLabel) ? "ScanFace" : "Fingerprint"}
            />
          </PinKey>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <PinKey
          accessibilityLabel="Enter digit 0"
          disabled={disabled}
          onPress={() => appendDigit("0")}
        >
          <Text className="text-[26px] font-bold text-foreground" tabular>
            0
          </Text>
        </PinKey>
        <PinKey
          accessibilityLabel="Delete last PIN digit"
          disabled={disabled}
          onPress={removeDigit}
          plain
        >
          <Icon className="size-lg text-foreground" name="Delete" />
        </PinKey>
      </View>
    </View>
  )
})

function PinKey({
  accessibilityLabel,
  children,
  disabled,
  onPress,
  plain = false,
}: {
  accessibilityLabel: string
  children: React.ReactNode
  disabled: boolean
  onPress: () => void
  /** Transparent key (biometric, delete). */
  plain?: boolean
}) {
  const colors = useColors()
  const { colorScheme } = useColorScheme()
  const reduceMotion = useReducedMotion()
  const height = useKeyHeight()
  const dark = colorScheme === "dark"

  const style = useCallback(
    ({ pressed }: PressableStateCallbackType): StyleProp<ViewStyle> => {
      const active = pressed && !disabled
      return {
        alignItems: "center",
        backgroundColor: active
          ? colors.accent
          : plain
            ? "transparent"
            : dark
              ? colors.surfaceRaised
              : colors.card,
        borderRadius: 18,
        flex: 1,
        height,
        justifyContent: "center",
        // Always an array: switching transform to undefined crashes the
        // native style diff ("forEach of null") on release of a press.
        transform: [{ scale: active && !reduceMotion ? 0.94 : 1 }],
        ...(plain || dark
          ? null
          : {
              borderBottomColor: colors.border,
              borderBottomWidth: 1,
              elevation: 1,
              shadowColor: colors.foreground,
              shadowOffset: { height: 1, width: 0 },
              shadowOpacity: 0.06,
              shadowRadius: 2,
            }),
      }
    },
    [colors, dark, disabled, height, plain, reduceMotion]
  )

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={() => {
        if (disabled) return
        void Haptics.selectionAsync().catch(() => undefined)
        onPress()
      }}
      style={style}
    >
      {children}
    </Pressable>
  )
}
