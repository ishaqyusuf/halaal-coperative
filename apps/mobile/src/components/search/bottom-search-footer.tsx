// Ported from EWA trade (components/mobile/bottom-search-footer.tsx), T01.
// Design and behaviour unchanged (ADR-20261116 §1). Offline state comes from
// React Query's onlineManager instead of EWA's operational-mode store.
import {
  FloatingSearchField,
  type SearchTrailingAction,
} from "@/components/search/floating-search-field"
import { useColors } from "@/hooks/use-color"
import {
  DOCK_OPACITY_INPUT,
  DOCK_OPACITY_OUTPUT,
  animateDock,
} from "@/lib/dock-motion"
import { shouldShowListSearch } from "@/lib/list-search"
import { useIsOnline } from "@/lib/online-status"
import { resolveSearchFooterKeyboardOffset } from "@/lib/search-footer-keyboard"
import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { View } from "react-native"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export type BottomSearchFooterProps = {
  accessibilityLabel: string
  alwaysShowSearch?: boolean
  autoFocus?: boolean
  bottomOffset?: number
  /** A small note above the search row (a total). Hides while focused. */
  caption?: ReactNode
  children?: ReactNode
  /** Optional step action card above the unchanged search pill. */
  actionsAboveSearch?: boolean
  /** Slides the footer down out of view (see useBottomSearchScroll). It stays
   * visible while the search is focused or has text. */
  floatActions?: boolean
  /** An inline action group that uses the entire row before search opens. */
  fullWidthActions?: boolean
  hidden?: boolean
  includeSafeArea?: boolean
  editable?: boolean
  /** A Gorhom sheet already owns keyboard movement. Keep the same dock UI. */
  keyboardOwner?: "screen" | "sheet"
  position?: "absolute" | "relative"
  label?: string
  layout?: "inline" | "stacked"
  maxLength?: number
  /** Filters already-loaded rows, so it keeps working offline. */
  localSearch?: boolean
  onChangeText: (value: string) => void
  /** Reports search focus, e.g. to fold the screen's top card (useSearchFold). */
  onFocusChange?: (focused: boolean) => void
  onHeightChange?: (height: number) => void
  placeholder: string
  /** See FloatingSearchField. */
  searchFocusRequest?: number
  searchTrailingAction?: SearchTrailingAction
  showDisabledOfflineSearch?: boolean
  searchVisible?: boolean
  totalCount: number
  value: string
  /** action-bar: step actions floating on the page background. Applies only
   * when the footer shows no search; a visible search always floats as a
   * pill with no bar behind it. */
  variant?: "default" | "action-bar"
}

/** Space between the floating search and the safe-area bottom edge. */
export const FLOATING_SEARCH_GAP = 10

export function BottomSearchFooter({
  accessibilityLabel,
  alwaysShowSearch = false,
  autoFocus = false,
  bottomOffset = 0,
  caption,
  children,
  actionsAboveSearch = false,
  floatActions = false,
  fullWidthActions = false,
  hidden = false,
  includeSafeArea = true,
  editable = true,
  keyboardOwner = "screen",
  position = "absolute",
  label = "Search",
  layout = "stacked",
  maxLength,
  localSearch = false,
  onChangeText,
  onFocusChange,
  onHeightChange,
  placeholder,
  searchFocusRequest,
  searchTrailingAction,
  searchVisible = true,
  showDisabledOfflineSearch = false,
  totalCount,
  value,
  variant = "default",
}: BottomSearchFooterProps) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const isOffline = !useIsOnline()
  const paddingBottom = includeSafeArea ? Math.max(insets.bottom, 8) : 8
  const reduceMotion = useReducedMotion()
  const [focused, setFocused] = useState(false)
  const [height, setHeight] = useState(0)

  const effectiveSearchVisible =
    (!isOffline || localSearch || showDisabledOfflineSearch) &&
    searchVisible &&
    (alwaysShowSearch || shouldShowListSearch(totalCount))
  // A field that unmounts while focused never blurs, so only count focus
  // while the search is on screen.
  const searchFocused = focused && effectiveSearchVisible
  const shouldHide = hidden && !searchFocused && !value
  const hiddenProgress = useSharedValue(shouldHide ? 1 : 0)
  const onFocusChangeRef = useRef(onFocusChange)
  onFocusChangeRef.current = onFocusChange

  useEffect(() => {
    hiddenProgress.set(
      animateDock(shouldHide ? 1 : 0, shouldHide, reduceMotion)
    )
  }, [hiddenProgress, reduceMotion, shouldHide])

  useEffect(() => {
    onFocusChangeRef.current?.(searchFocused)
  }, [searchFocused])
  useEffect(() => () => onFocusChangeRef.current?.(false), [])

  const slideStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      hiddenProgress.get(),
      DOCK_OPACITY_INPUT,
      DOCK_OPACITY_OUTPUT
    ),
    transform: [{ translateY: hiddenProgress.get() * (height + 12) }],
  }))

  useEffect(() => {
    if (!localSearch && !showDisabledOfflineSearch && isOffline && value)
      onChangeText("")
  }, [isOffline, localSearch, onChangeText, value, showDisabledOfflineSearch])

  if (!children && !effectiveSearchVisible) return null

  const onLayout = (event: { nativeEvent: { layout: { height: number } } }) => {
    setHeight(event.nativeEvent.layout.height)
    onHeightChange?.(event.nativeEvent.layout.height)
  }

  const containerStyle = {
    bottom: 0,
    left: 0,
    position,
    right: 0,
    zIndex: 20,
  } as const
  const body =
    effectiveSearchVisible || floatActions ? (
      // Floating search: the pill and any step action float over the list
      // with no bar behind them, so touches around them reach the list.
      <Animated.View
        onLayout={onLayout}
        pointerEvents={shouldHide ? "none" : "box-none"}
        style={[
          {
            gap: 10,
            paddingBottom: paddingBottom + FLOATING_SEARCH_GAP,
            paddingHorizontal: floatActions ? 18 : 24,
          },
          slideStyle,
        ]}
      >
        {caption && !searchFocused ? (
          <View className="items-end" pointerEvents="none">
            {caption}
          </View>
        ) : null}
        <View
          className={
            layout === "inline"
              ? "flex-row items-center gap-[10px]"
              : "gap-[10px]"
          }
          pointerEvents="box-none"
        >
          {actionsAboveSearch ? children : null}
          {effectiveSearchVisible ? (
            <View className={layout === "inline" ? "min-w-0 flex-1" : ""}>
              <FloatingSearchField
                accessibilityLabel={accessibilityLabel || label}
                autoFocus={autoFocus}
                editable={editable && (!isOffline || localSearch)}
                focused={searchFocused}
                maxLength={maxLength}
                onBlur={() => setFocused(false)}
                onChangeText={onChangeText}
                onFocus={() => setFocused(true)}
                placeholder={placeholder}
                focusRequest={searchFocusRequest}
                trailingAction={searchTrailingAction}
                value={value}
              />
            </View>
          ) : fullWidthActions ? null : (
            <View className="flex-1" />
          )}
          {actionsAboveSearch || (floatActions && searchFocused)
            ? null
            : children}
        </View>
      </Animated.View>
    ) : (
      <Animated.View
        pointerEvents={shouldHide ? "none" : "auto"}
        onLayout={onLayout}
        style={[{ backgroundColor: colors.background }, slideStyle]}
      >
        <View style={{ paddingBottom, width: "100%" }}>
          <View
            className={
              variant === "action-bar"
                ? "gap-[12px] px-[16px] pt-[12px] pb-[8px]"
                : "gap-[12px] px-[16px] pt-[8px] pb-[8px]"
            }
          >
            <View
              className={
                layout === "inline"
                  ? "flex-row items-center gap-[12px]"
                  : "gap-[12px]"
              }
            >
              {children}
            </View>
          </View>
        </View>
      </Animated.View>
    )

  return keyboardOwner === "sheet" ? (
    <View
      pointerEvents="box-none"
      style={containerStyle}
      testID="bottom-search-footer"
    >
      {body}
    </View>
  ) : (
    <KeyboardStickyView
      offset={resolveSearchFooterKeyboardOffset({
        bottomOffset,
        safeAreaPadding: paddingBottom,
      })}
      pointerEvents="box-none"
      style={containerStyle}
      testID="bottom-search-footer"
    >
      {body}
    </KeyboardStickyView>
  )
}
