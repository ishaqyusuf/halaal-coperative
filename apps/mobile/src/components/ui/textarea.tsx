import {
  useBottomSheetInput,
  useBottomSheetInputFocus,
} from "@/components/ui/bottom-sheet-input-context"
import { useKeyboardScrollFallback } from "@/components/app/keyboard-aware-scroll-view"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { BottomSheetTextInput } from "@gorhom/bottom-sheet"
import { useState, type ComponentType } from "react"
import { Platform, TextInput, type TextInputProps } from "react-native"

const NativeBottomSheetTextInput =
  BottomSheetTextInput as ComponentType<TextInputProps>

function Textarea({
  className,
  multiline = true,
  numberOfLines = Platform.select({ web: 2, native: 8 }), // On web, numberOfLines also determines initial height. On native, it determines the maximum height.
  placeholderClassName,
  ...props
}: TextInputProps & React.RefAttributes<TextInput>) {
  const colors = useColors()
  const isBottomSheetInput = useBottomSheetInput()
  const onBottomSheetInputFocus = useBottomSheetInputFocus()
  const scrollInputIntoView = useKeyboardScrollFallback()
  const [isFocused, setIsFocused] = useState(false)

  if (isBottomSheetInput) {
    return (
      <NativeBottomSheetTextInput
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholderTextColor={colors.mutedForeground}
        selectionColor={colors.primary}
        style={{
          backgroundColor: colors.card,
          borderColor: className?.includes("border-destructive")
            ? colors.destructive
            : isFocused ? colors.ring : colors.input,
          borderRadius: 8,
          borderWidth: isFocused ? 2 : 1,
          color: colors.foreground,
          fontSize: 16,
          minHeight: 96,
          paddingHorizontal: 12,
          paddingVertical: 10,
          textAlignVertical: "top",
        }}
        textAlignVertical="top"
        {...props}
        onBlur={(event) => {
          setIsFocused(false)
          props.onBlur?.(event)
        }}
        onFocus={(event) => {
          setIsFocused(true)
          onBottomSheetInputFocus?.(event.nativeEvent.target)
          props.onFocus?.(event)
          scrollInputIntoView?.(event.nativeEvent.target)
        }}
      />
    )
  }

  return (
    <TextInput
      className={cn(
        "min-h-16 w-full flex-row rounded-lg border border-input bg-card px-3 py-2 text-base text-foreground md:text-sm dark:bg-input/30",
        isFocused && "border-2 border-ring",
        Platform.select({
          web: "field-sizing-content resize-y transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        }),
        props.editable === false && "opacity-50",
        className
      )}
      placeholderTextColor={colors.mutedForeground}
      placeholderClassName={cn("text-muted-foreground", placeholderClassName)}
      multiline={multiline}
      numberOfLines={numberOfLines}
      textAlignVertical="top"
      {...props}
      onBlur={(event) => {
        setIsFocused(false)
        props.onBlur?.(event)
      }}
      onFocus={(event) => {
        setIsFocused(true)
        onBottomSheetInputFocus?.(event.nativeEvent.target)
        props.onFocus?.(event)
        scrollInputIntoView?.(event.nativeEvent.target)
      }}
    />
  )
}

export { Textarea }
