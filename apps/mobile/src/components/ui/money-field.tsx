import { Input, type InputProps } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
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
  display?: "large"
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
      className,
      display,
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
        className={cn(display === "large" && "h-[52px] rounded-none border-0 border-b-2 bg-card", className)}
        inputMode={allowDecimals ? "decimal" : "numeric"}
        keyboardType={allowDecimals ? "decimal-pad" : "number-pad"}
        leading={
          <Text className={cn("text-muted-foreground", display === "large" && "text-[28px] leading-[34px]")} variant="money">
            {currencySymbol(currencyCode).trim()}
          </Text>
        }
        onChangeText={(text) => {
          const next = parseMoneyInput(text, { allowDecimals })
          onChangeValue(next.raw, next.value)
        }}
        placeholder={placeholder}
        returnKeyType="done"
        style={[
          { fontVariant: ["tabular-nums"], paddingLeft: 8 },
          display === "large" ? { fontSize: 36, fontWeight: "800", lineHeight: 42 } : null,
          style,
        ]}
        value={formatMoneyInput(value, allowDecimals)}
      />
    )
  }
)
