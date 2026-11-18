import { Input, type InputProps } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import {
  formatNigerianPhone,
  NIGERIA_DIAL_CODE,
  normalizeNigerianPhone,
} from "@/lib/phone-number"
import { forwardRef } from "react"
import type { TextInput } from "react-native"

export type PhoneFieldProps = Omit<
  InputProps,
  "keyboardType" | "leading" | "onChangeText" | "value"
> & {
  /** National digits without the leading 0, e.g. "8030000000". */
  value: string
  onChangeValue: (national: string) => void
}

/** +234 prefix, phone pad, 3-3-4 grouping as the member types. */
export const PhoneField = forwardRef<TextInput, PhoneFieldProps>(
  function PhoneField(
    { onChangeValue, placeholder = "803 000 0000", style, value, ...props },
    ref
  ) {
    return (
      <Input
        ref={ref}
        autoComplete="tel"
        {...props}
        inputMode="tel"
        keyboardType="phone-pad"
        leading={
          <Text className="text-foreground-soft" variant="body">
            {NIGERIA_DIAL_CODE}
          </Text>
        }
        maxLength={12}
        onChangeText={(text) => onChangeValue(normalizeNigerianPhone(text))}
        placeholder={placeholder}
        style={[{ fontVariant: ["tabular-nums"], paddingLeft: 8 }, style]}
        textContentType="telephoneNumber"
        value={formatNigerianPhone(value)}
      />
    )
  }
)
