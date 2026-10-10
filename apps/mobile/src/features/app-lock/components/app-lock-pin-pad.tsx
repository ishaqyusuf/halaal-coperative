import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { APP_LOCK_CODE_LENGTH } from "@/features/app-lock/model/app-lock-types"
import { cn } from "@/lib/utils"
import { memo, useCallback } from "react"
import { View } from "react-native"

const PIN_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
] as const

type AppLockPinPadProps = {
  biometricLabel?: string
  disabled?: boolean
  onBiometricPress?: () => void
  onChange: (value: string) => void
  showBiometric?: boolean
  value: string
}

export const AppLockPinPad = memo(function AppLockPinPad({
  biometricLabel = "biometrics",
  disabled = false,
  onBiometricPress,
  onChange,
  showBiometric = false,
  value,
}: AppLockPinPadProps) {
  const appendDigit = useCallback(
    (digit: string) => {
      if (disabled || value.length >= APP_LOCK_CODE_LENGTH) return
      onChange(`${value}${digit}`)
    },
    [disabled, onChange, value]
  )
  const removeDigit = useCallback(() => {
    if (disabled || value.length === 0) return
    onChange(value.slice(0, -1))
  }, [disabled, onChange, value])

  return (
    <View className="w-full items-center gap-8">
      <View
        accessible
        accessibilityLabel={`${value.length} of ${APP_LOCK_CODE_LENGTH} PIN digits entered`}
        className="flex-row justify-center gap-3"
      >
        {Array.from({ length: APP_LOCK_CODE_LENGTH }, (_, index) => (
          <View
            accessibilityElementsHidden
            className={cn(
              "size-4 rounded-full border-2 border-border",
              index < value.length && "border-foreground bg-foreground"
            )}
            importantForAccessibility="no-hide-descendants"
            key={`app-lock-pin-dot-${index + 1}`}
          />
        ))}
      </View>

      <View className="w-full max-w-[280px] gap-3">
        {PIN_ROWS.map((row) => (
          <View className="flex-row justify-between" key={row.join("-")}>
            {row.map((digit) => (
              <PinDigit
                disabled={disabled}
                key={digit}
                onPress={() => appendDigit(digit)}
                value={digit}
              />
            ))}
          </View>
        ))}
        <View className="flex-row justify-between">
          {showBiometric && onBiometricPress ? (
            <PinIcon
              accessibilityLabel={`Unlock with ${biometricLabel}`}
              disabled={disabled}
              icon="Fingerprint"
              onPress={onBiometricPress}
            />
          ) : (
            <View className="size-14" />
          )}
          <PinDigit
            disabled={disabled}
            onPress={() => appendDigit("0")}
            value="0"
          />
          <PinIcon
            accessibilityLabel="Delete last PIN digit"
            disabled={disabled}
            icon="Delete"
            onPress={removeDigit}
          />
        </View>
      </View>
    </View>
  )
})

function PinDigit({
  disabled,
  onPress,
  value,
}: {
  disabled: boolean
  onPress: () => void
  value: string
}) {
  return (
    <Pressable
      accessibilityLabel={`Enter digit ${value}`}
      accessibilityRole="button"
      className={cn(
        "size-14 items-center justify-center rounded-full active:bg-accent",
        disabled && "opacity-40"
      )}
      disabled={disabled}
      haptic
      onPress={onPress}
      transition
    >
      <Text className="text-2xl font-semibold text-foreground">{value}</Text>
    </Pressable>
  )
}

function PinIcon({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
}: {
  accessibilityLabel: string
  disabled: boolean
  icon: "Delete" | "Fingerprint"
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className={cn(
        "size-14 items-center justify-center rounded-full bg-secondary active:bg-accent",
        disabled && "opacity-40"
      )}
      disabled={disabled}
      haptic
      onPress={onPress}
      transition
    >
      <Icon className="size-base text-foreground" name={icon} />
    </Pressable>
  )
}
