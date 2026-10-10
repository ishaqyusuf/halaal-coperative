import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import {
  normalizeRecoveryCode,
  RECOVERY_CODE_LENGTH,
} from "@/features/auth/model/recovery-flow"
import { useRef } from "react"
import { Pressable, View, type TextInput } from "react-native"

export function OtpField({
  autoFocus = false,
  label,
  onChangeText,
  onSubmitEditing,
  value,
}: {
  autoFocus?: boolean
  label: string
  onChangeText: (value: string) => void
  onSubmitEditing?: () => void
  value: string
}) {
  const inputRef = useRef<TextInput>(null)
  const normalized = normalizeRecoveryCode(value)

  return (
    <View className="gap-2">
      <Text
        className="text-sm leading-5 font-semibold text-foreground"
        maxFontSizeMultiplier={1.5}
      >
        {label}
      </Text>
      <Pressable
        className="relative flex-row gap-1.5"
        accessible={false}
        onPress={() => inputRef.current?.focus()}
      >
        {Array.from({ length: RECOVERY_CODE_LENGTH }, (_, index) => (
          <View
            className={
              index === normalized.length
                ? "border-brand h-14 flex-1 items-center justify-center rounded-xl border-2 bg-card"
                : "h-14 flex-1 items-center justify-center rounded-xl border border-input bg-card"
            }
            key={index}
          >
            <Text
              className="text-xl font-black text-foreground"
              maxFontSizeMultiplier={1.35}
            >
              {normalized[index] ?? ""}
            </Text>
          </View>
        ))}
        <Input
          accessibilityHint="Enter the six-digit code"
          accessibilityLabel={`${label}, ${normalized.length} of ${RECOVERY_CODE_LENGTH} digits entered`}
          autoComplete="one-time-code"
          autoFocus={autoFocus}
          className="absolute h-14 w-full opacity-0"
          keyboardType="number-pad"
          maxLength={RECOVERY_CODE_LENGTH}
          onChangeText={(next) => onChangeText(normalizeRecoveryCode(next))}
          onSubmitEditing={onSubmitEditing}
          ref={inputRef}
          returnKeyType="done"
          textContentType="oneTimeCode"
          value={normalized}
        />
      </Pressable>
    </View>
  )
}
