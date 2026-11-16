import { Input, type InputProps } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { currencySymbol, formatMoneyInput, parseMoneyInput } from "@/lib/money"
import { forwardRef } from "react"
import type { TextInput } from "react-native"

export type MoneyFieldProps = Omit<
  InputProps,
  "keyboardType" | "leading" | "onChangeText" | "value"
> & {
  /** Canonical raw amount, e.g. "25000" (no grouping, no symbol). */
  value: string
  onChangeValue: (raw: string, amount: number | null) => void
  allowDecimals?: boolean
  currencyCode?: string
}

/**
 * Amount input with a ₦ prefix and live thousands grouping. The form keeps
 * the raw digits; the field only displays them grouped.
 */
export const MoneyField = forwardRef<TextInput, MoneyFieldProps>(
  function MoneyField(
    {
      allowDecimals = false,
      currencyCode = "NGN",
      onChangeValue,
      placeholder = "0",
      style,
      value,
      ...props
    },
    ref
  ) {
    return (
      <Input
        ref={ref}
        {...props}
        inputMode={allowDecimals ? "decimal" : "numeric"}
        keyboardType={allowDecimals ? "decimal-pad" : "number-pad"}
        leading={
          <Text className="text-muted-foreground" variant="money">
            {currencySymbol(currencyCode).trim()}
          </Text>
        }
        onChangeText={(text) => {
          const next = parseMoneyInput(text, { allowDecimals })
          onChangeValue(next.raw, next.value)
        }}
        placeholder={placeholder}
        returnKeyType="done"
        style={[{ fontVariant: ["tabular-nums"], paddingLeft: 8 }, style]}
        value={formatMoneyInput(value, allowDecimals)}
      />
    )
  }
)
