import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { forwardRef, useState } from "react"
import { View, type TextInput, type TextInputProps } from "react-native"

export const PasswordField = forwardRef<
  TextInput,
  Omit<TextInputProps, "secureTextEntry"> & {
    fieldSize?: "default" | "large"
    hideLabel?: boolean
    inputClassName?: string
    label: string
    leadingIconName?: string
  }
>(function PasswordField(
  {
    fieldSize = "default",
    hideLabel = false,
    inputClassName,
    label,
    leadingIconName,
    placeholder = "Enter password",
    ...props
  },
  ref
) {
  const [visible, setVisible] = useState(false)
  const largeTextLayout = useLargeTextLayout()
  const fieldHeight = largeTextLayout
    ? "h-16"
    : fieldSize === "large"
      ? "h-14"
      : "h-12"

  return (
    <View className="gap-2">
      {hideLabel ? null : (
        <Text
          className="text-sm leading-5 font-semibold text-foreground"
          maxFontSizeMultiplier={1.5}
        >
          {label}
        </Text>
      )}
      <View className={cn("relative", fieldHeight)}>
        <Input
          ref={ref}
          {...props}
          accessibilityLabel={label}
          className={cn(
            "absolute inset-0 pr-14 text-base",
            fieldHeight,
            inputClassName
          )}
          maxFontSizeMultiplier={1.35}
          leading={
            leadingIconName ? (
              <Icon className="size-base text-brand" name={leadingIconName} />
            ) : undefined
          }
          placeholder={placeholder}
          secureTextEntry={!visible}
          style={{ paddingRight: 56 }}
        />
        <Button
          accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
          className={cn("absolute top-0 right-0 w-12", fieldHeight)}
          disabled={props.editable === false}
          onPress={() => setVisible((current) => !current)}
          size="icon"
          variant="ghost"
        >
          <Icon
            className="size-base text-muted-foreground"
            name={visible ? "EyeOff" : "Eye"}
          />
        </Button>
      </View>
    </View>
  )
})

PasswordField.displayName = "PasswordField"
