// Ported from EWA trade (components/mobile/floating-search-field.tsx), T01.
// Design and behaviour unchanged (ADR-20261116 §1); halaalvest tokens.
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColorScheme, useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { shadows } from "@/lib/design-tokens"
import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"
import { TextInput, View } from "react-native"
import { KeyboardEvents } from "react-native-keyboard-controller"

type FloatingSearchFieldProps = {
  accessibilityLabel: string
  autoFocus?: boolean
  editable?: boolean
  focused: boolean
  maxLength?: number
  onBlur: () => void
  onChangeText: (value: string) => void
  onFocus: () => void
  placeholder: string
  /** Changing this number focuses the field (e.g. "Search by name instead"). */
  focusRequest?: number
  /** One tool inside an empty pill, such as Scan; Clear replaces it once typed. */
  trailingAction?: SearchTrailingAction
  value: string
}

export type SearchTrailingAction = {
  accessibilityLabel: string
  icon: string
  onPress: () => void
  testID?: string
}

/** The raised surface shared by the search pill, its caption and button. */
export function useFloatingSurface(focused = false) {
  const colors = useColors()
  const { colorScheme } = useColorScheme()
  const dark = colorScheme === "dark"
  return {
    // A step above the card in dark mode; white in light mode.
    backgroundColor: dark ? colors.surfaceRaised : colors.card,
    borderColor: focused ? colors.primary : colors.border,
    borderRadius: 999,
    borderWidth: 1,
    boxShadow: shadows[colorScheme].float,
  } as const
}

/** A small floating note above the search row, e.g. a sale total. */
export function FloatingSearchCaption({
  label,
  value,
}: {
  label: string
  value?: string
}) {
  const surface = useFloatingSurface()
  return (
    <View
      className="min-h-[34px] flex-row items-center gap-2 px-[14px]"
      style={surface}
    >
      <Text className="text-xs font-bold text-muted-foreground">{label}</Text>
      {value ? (
        <Text className="text-base font-extrabold tabular-nums text-foreground">
          {value}
        </Text>
      ) : null}
    </View>
  )
}

/**
 * The round search button for tab screens: the same raised surface as the
 * pill, shown at rest and opened into the pill on press.
 */
export function FloatingSearchButton({
  accessibilityLabel,
  onPress,
  testID,
}: {
  accessibilityLabel: string
  onPress: () => void
  testID?: string
}) {
  const surface = useFloatingSurface()
  return (
    <View className="size-[52px]" style={surface}>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        className="size-full items-center justify-center rounded-full"
        haptic
        onPress={onPress}
        testID={testID}
      >
        <Icon className="size-[21px] text-foreground" name="Search" />
      </Pressable>
    </View>
  )
}

/**
 * The floating search pill used by BottomSearchFooter: our search icon,
 * placeholder and a clear button, on a raised rounded surface with a hairline
 * border and a soft shadow. It sits over the list with no bar behind it.
 */
export function FloatingSearchField({
  accessibilityLabel,
  autoFocus,
  editable = true,
  focused,
  maxLength,
  onBlur,
  onChangeText,
  onFocus,
  placeholder,
  focusRequest,
  trailingAction,
  value,
}: FloatingSearchFieldProps) {
  const { colorScheme } = useColorScheme()
  const colors = useColors()
  const largeText = useLargeTextLayout()
  const surface = useFloatingSurface(focused)
  const dark = colorScheme === "dark"

  const inputRef = useRef<TextInput>(null)

  // Android's back gesture closes the keyboard but leaves the field focused.
  // Blur with it, so an empty search lets the folded top card open again.
  useEffect(() => {
    if (!focused) return
    const subscription = KeyboardEvents.addListener("keyboardDidHide", () =>
      inputRef.current?.blur()
    )
    return () => subscription.remove()
  }, [focused])

  useEffect(() => {
    if (!focusRequest) return
    // A closing full-screen modal (the scanner) takes focus back; wait it out.
    const timer = setTimeout(() => inputRef.current?.focus(), 450)
    return () => clearTimeout(timer)
  }, [focusRequest])
  const showTrailing = Boolean(trailingAction) && !value && editable

  return (
    <View
      className={cn(
        "flex-row items-center gap-2.5 pl-[18px]",
        largeText ? "min-h-16" : "min-h-[52px]",
        (value && editable) || showTrailing ? "pr-[7px]" : "pr-[18px]"
      )}
      style={surface}
    >
      <Icon
        className={cn(
          "size-sm text-muted-foreground",
          !editable && "opacity-50"
        )}
        name="Search"
      />
      <TextInput
        accessibilityLabel={accessibilityLabel}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        className={cn("min-w-0 flex-1 text-base", largeText ? "h-16" : "h-[50px]")}
        editable={editable}
        maxLength={maxLength}
        numberOfLines={1}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        ref={inputRef}
        returnKeyType="search"
        selectionColor={colors.primary}
        style={{ color: colors.foreground, padding: 0 }}
        value={value}
      />
      {value && editable ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          className={cn(
            "size-9 items-center justify-center rounded-full",
            dark ? "bg-border" : "bg-muted"
          )}
          haptic
          hitSlop={6}
          onPress={() => onChangeText("")}
        >
          <Icon className="size-xs text-foreground" name="X" />
        </Pressable>
      ) : null}
      {showTrailing && trailingAction ? (
        <Pressable
          accessibilityLabel={trailingAction.accessibilityLabel}
          accessibilityRole="button"
          className="size-10 items-center justify-center rounded-full bg-accent"
          haptic
          hitSlop={6}
          onPress={trailingAction.onPress}
          testID={trailingAction.testID}
        >
          <Icon
            className="size-[20px] text-accent-foreground"
            name={trailingAction.icon}
          />
        </Pressable>
      ) : null}
    </View>
  )
}
