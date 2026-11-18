import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import {
  normalizeRecoveryCode,
  RECOVERY_CODE_LENGTH,
} from "@/features/auth/model/recovery-flow"
import { cn } from "@/lib/utils"
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"
import { Pressable, View, type TextInput } from "react-native"

/**
 * Six 52pt digit boxes over one hidden input, so paste and SMS/email
 * autofill (`oneTimeCode`) fill every box at once. The next box is
 * outlined in primary while focused; all boxes turn destructive on error.
 */
export const OtpField = forwardRef<
  Pick<TextInput, "focus" | "blur">,
  {
    autoFocus?: boolean
    editable?: boolean
    error?: string | null
    label: string
    onChangeText: (value: string) => void
    onSubmitEditing?: () => void
    value: string
  }
>(function OtpField(
  {
    autoFocus = false,
    editable = true,
    error,
    label,
    onChangeText,
    onSubmitEditing,
    value,
  },
  ref
) {
  const inputRef = useRef<TextInput>(null)
  const [focused, setFocused] = useState(false)
  const normalized = normalizeRecoveryCode(value)
  const invalid = Boolean(error)
  // Android ignores autoFocus while the step transition runs, leaving the
  // field focused without a keyboard; focus once the screen has settled.
  useEffect(() => {
    if (!autoFocus) return
    const timer = setTimeout(() => inputRef.current?.focus(), 350)
    return () => clearTimeout(timer)
  }, [autoFocus])
  useImperativeHandle(ref, () => ({
    blur: () => inputRef.current?.blur(),
    focus: () => inputRef.current?.focus(),
  }))

  return (
    <View className="gap-[8px]">
      <Text
        className={
          invalid
            ? "text-destructive"
            : focused
              ? "text-primary"
              : "text-foreground-soft"
        }
        variant="label"
      >
        {label}
      </Text>
      <Pressable
        accessible={false}
        className="relative flex-row gap-[8px]"
        onPress={() => inputRef.current?.focus()}
      >
        {Array.from({ length: RECOVERY_CODE_LENGTH }, (_, index) => {
          const active =
            focused &&
            index === Math.min(normalized.length, RECOVERY_CODE_LENGTH - 1)
          return (
            <View
              className={cn(
                "h-[56px] flex-1 items-center justify-center rounded-[14px] bg-card",
                invalid
                  ? "border border-destructive"
                  : active
                    ? "border-2 border-ring"
                    : "border border-input"
              )}
              key={index}
            >
              <Text
                className={invalid ? "text-destructive" : "text-foreground"}
                maxFontSizeMultiplier={1.35}
                variant="title"
              >
                {normalized[index] ?? ""}
              </Text>
            </View>
          )
        })}
        <View className="absolute inset-0 opacity-0">
          <Input
            accessibilityHint="Enter the six-digit code"
            accessibilityLabel={`${label}, ${normalized.length} of ${RECOVERY_CODE_LENGTH} digits entered`}
            autoComplete="one-time-code"
            caretHidden
            editable={editable}
            keyboardType="number-pad"
            maxLength={RECOVERY_CODE_LENGTH}
            onBlur={() => setFocused(false)}
            onChangeText={(next) => onChangeText(normalizeRecoveryCode(next))}
            onFocus={() => setFocused(true)}
            onSubmitEditing={onSubmitEditing}
            ref={inputRef}
            returnKeyType="done"
            textContentType="oneTimeCode"
            value={normalized}
          />
        </View>
      </Pressable>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          className="text-destructive"
          variant="small"
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
})

OtpField.displayName = "OtpField"
