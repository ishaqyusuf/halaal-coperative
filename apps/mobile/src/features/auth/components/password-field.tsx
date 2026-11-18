import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Pressable } from "@/components/ui/pressable"
import { forwardRef, useState } from "react"
import { View, type TextInput, type TextInputProps } from "react-native"

/**
 * A password Input with a visible Show/Hide control. Place it inside a
 * FormField (label, focus and error come from the field). The control sits
 * over the input's right edge because Input's trailing slot is not pressable.
 */
export const PasswordField = forwardRef<
  TextInput,
  Omit<TextInputProps, "secureTextEntry"> & {
    /** Spoken name for the Show/Hide control, e.g. "password". */
    label: string
  }
>(function PasswordField({ label, placeholder, ...props }, ref) {
  const [visible, setVisible] = useState(false)

  return (
    <View className="relative w-full">
      <Input
        ref={ref}
        {...props}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder={placeholder}
        secureTextEntry={!visible}
        style={{ paddingRight: 56 }}
      />
      <View className="absolute top-0 right-0 bottom-0 w-[52px] items-center justify-center">
        <Pressable
          accessibilityLabel={visible ? `Hide ${label}` : `Show ${label}`}
          accessibilityRole="button"
          className="size-[44px] items-center justify-center rounded-full"
          disabled={props.editable === false}
          hitSlop={4}
          onPress={() => setVisible((current) => !current)}
        >
          <Icon
            className="size-md text-muted-foreground"
            name={visible ? "EyeOff" : "Eye"}
          />
        </Pressable>
      </View>
    </View>
  )
})

PasswordField.displayName = "PasswordField"
