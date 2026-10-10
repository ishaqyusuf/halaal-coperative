import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { forwardRef } from "react"
import { View, type TextInput, type TextInputProps } from "react-native"

export const AuthField = forwardRef<
  TextInput,
  TextInputProps & { inputClassName?: string; label: string }
>(function AuthField({ inputClassName, label, ...props }, ref) {
  return (
    <View className="gap-2">
      <Text
        className="text-sm leading-5 font-semibold text-foreground"
        maxFontSizeMultiplier={1.5}
      >
        {label}
      </Text>
      <Input
        ref={ref}
        accessibilityLabel={label}
        className={inputClassName}
        {...props}
      />
    </View>
  )
})

AuthField.displayName = "AuthField"
