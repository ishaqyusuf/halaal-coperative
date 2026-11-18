// Ported from EWA trade (components/mobile/tab-search-bubble.tsx), T01.
// Seats against the 02 floating dock (resolveDockGeometry).
import {
  BottomSearchFooter,
  FLOATING_SEARCH_GAP,
} from "@/components/search/bottom-search-footer"
import { FloatingSearchButton } from "@/components/search/floating-search-field"
import { animateDock } from "@/lib/dock-motion"
import { resolveDockGeometry } from "@/lib/tab-bar-geometry"
import { useEffect, useRef, useState } from "react"
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Platform } from "react-native"

type TabSearchBubbleProps = {
  accessibilityLabel: string
  /** The tab dock is sunk; the bubble drops to the safe-area position. */
  dockHidden: boolean
  /** Sink the button with the dock while scrolling down. */
  hideWhenDockHidden?: boolean
  maxLength?: number
  onChangeText: (value: string) => void
  /** Reports search focus, e.g. to fold the screen's top card (useSearchFold). */
  onFocusChange?: (focused: boolean) => void
  placeholder: string
  /** Room kept on the right for a FAB beside the bubble. */
  rightInset?: number
  testID?: string
  value: string
}

function bubbleBottom(bottomInset: number, dockHidden: boolean) {
  return dockHidden
    ? Math.max(bottomInset + 16, 24)
    : resolveDockGeometry(bottomInset, Platform.OS).fabBottom
}

/**
 * Search on tab screens with the floating dock: a round search button above
 * the dock that opens into the floating search pill on the same line. The
 * pill folds back into the button once the field is empty and blurred.
 */
export function TabSearchBubble({
  accessibilityLabel,
  dockHidden,
  hideWhenDockHidden = false,
  maxLength = 160,
  onChangeText,
  onFocusChange,
  placeholder,
  rightInset = 0,
  testID,
  value,
}: TabSearchBubbleProps) {
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()
  const [open, setOpen] = useState(false)
  const wasFocused = useRef(false)
  const expanded = open || value.length > 0
  const aboveDock = bubbleBottom(insets.bottom, false)
  const hidden = hideWhenDockHidden && dockHidden
  const targetBottom = hidden ? -52 : bubbleBottom(insets.bottom, dockHidden)
  const targetRight = 20 + rightInset
  const bottom = useSharedValue(targetBottom)
  const right = useSharedValue(targetRight)

  // Follow the dock motion, or sink off-screen when the caller hides the button.
  useEffect(() => {
    bottom.set(
      animateDock(targetBottom, targetBottom < bottom.get(), reduceMotion)
    )
  }, [bottom, reduceMotion, targetBottom])
  useEffect(() => {
    right.set(animateDock(targetRight, false, reduceMotion))
  }, [reduceMotion, right, targetRight])

  const buttonStyle = useAnimatedStyle(() => ({
    bottom: bottom.get(),
    right: right.get(),
  }))

  if (expanded)
    return (
      <BottomSearchFooter
        accessibilityLabel={accessibilityLabel}
        alwaysShowSearch
        autoFocus={open && !value}
        // The pill sits on the same line the button did, above the dock.
        bottomOffset={Math.max(
          0,
          aboveDock - Math.max(insets.bottom, 8) - FLOATING_SEARCH_GAP
        )}
        localSearch
        maxLength={maxLength}
        onChangeText={onChangeText}
        onFocusChange={(focused) => {
          onFocusChange?.(focused)
          if (focused) {
            wasFocused.current = true
            return
          }
          if (!wasFocused.current) return
          wasFocused.current = false
          if (!value.trim()) setOpen(false)
        }}
        placeholder={placeholder}
        totalCount={0}
        value={value}
      />
    )

  return (
    <Animated.View
      pointerEvents={hidden ? "none" : "box-none"}
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? "no-hide-descendants" : "auto"}
      style={[{ position: "absolute", zIndex: 900 }, buttonStyle]}
    >
      <FloatingSearchButton
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
        testID={testID}
      />
    </Animated.View>
  )
}
