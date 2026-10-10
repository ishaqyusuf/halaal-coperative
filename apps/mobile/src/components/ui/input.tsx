import {
  useBottomSheetInput,
  useBottomSheetInputFocus,
} from "@/components/ui/bottom-sheet-input-context"
import { useKeyboardScrollFallback } from "@/components/app/keyboard-aware-scroll-view"
import { cn } from "@/lib/utils"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { BottomSheetTextInput } from "@gorhom/bottom-sheet"
import {
  forwardRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefAttributes,
} from "react"
import { Platform, TextInput, View, type TextInputProps } from "react-native"

const NativeBottomSheetTextInput = BottomSheetTextInput as ComponentType<
  TextInputProps & RefAttributes<TextInput>
>

type InputProps = TextInputProps & {
  leading?: ReactNode
  trailing?: ReactNode
}

const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    className,
    leading,
    maxFontSizeMultiplier,
    secureTextEntry,
    style,
    trailing,
    ...props
  },
  ref
) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const [isFocused, setIsFocused] = useState(false)
  const isBottomSheetInput = useBottomSheetInput()
  const onBottomSheetInputFocus = useBottomSheetInputFocus()
  const scrollInputIntoView = useKeyboardScrollFallback()
  const hasSecureValue =
    secureTextEntry &&
    (typeof props.value === "string"
      ? props.value.length > 0
      : typeof props.defaultValue === "string" && props.defaultValue.length > 0)

  const NativeInput = isBottomSheetInput
    ? NativeBottomSheetTextInput
    : TextInput
  const hasError = className?.includes("border-destructive")

  return (
    <View
      className={cn(
        largeTextLayout ? "h-16" : "h-12",
        "w-full flex-row items-center overflow-hidden rounded-lg border bg-card",
        hasError
          ? "border-destructive"
          : isFocused
            ? "border-2 border-ring"
            : "border-input",
        props.editable === false &&
          cn(
            "opacity-50",
            Platform.select({
              web: "disabled:pointer-events-none disabled:cursor-not-allowed",
            })
          ),
        className
      )}
    >
      {leading ? (
        <View
          accessible={false}
          className="ml-3 items-center justify-center"
          pointerEvents="none"
        >
          {leading}
        </View>
      ) : null}
      <NativeInput
        ref={ref}
        {...props}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        maxFontSizeMultiplier={
          hasSecureValue
            ? Math.min(maxFontSizeMultiplier ?? 1.35, 1.35)
            : maxFontSizeMultiplier
        }
        onFocus={(event) => {
          setIsFocused(true)
          onBottomSheetInputFocus?.(event.nativeEvent.target)
          props.onFocus?.(event)
          scrollInputIntoView?.(event.nativeEvent.target)
        }}
        onBlur={(event) => {
          setIsFocused(false)
          props.onBlur?.(event)
        }}
        secureTextEntry={secureTextEntry}
        style={[
          {
            color: colors.foreground,
            flex: 1,
            fontSize: 16,
            height: "100%",
            paddingHorizontal: 12,
            paddingVertical: props.multiline ? 12 : 0,
            textAlignVertical:
              props.textAlignVertical ?? (props.multiline ? "top" : "center"),
            width: leading || trailing ? undefined : "100%",
          },
          hasSecureValue
            ? {
                fontSize: 32,
                includeFontPadding: false,
                letterSpacing: 5.5,
                lineHeight: 36,
              }
            : undefined,
          style,
        ]}
      />
      {trailing ? (
        <View
          accessible={false}
          className="mr-3 items-center justify-center"
          pointerEvents="none"
        >
          {trailing}
        </View>
      ) : null}
    </View>
  )
})

Input.displayName = "Input"

export { Input }
export type { InputProps }
