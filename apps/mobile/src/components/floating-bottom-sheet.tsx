import {
  type BottomSheetBackdropProps,
  type BottomSheetBackgroundProps,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  type BottomSheetModalProps,
  BottomSheetScrollView,
  BottomSheetView,
  useBottomSheetInternal,
} from "@gorhom/bottom-sheet"
import { BottomSheetKeyboardAwareScrollView } from "@/components/app/bottom-sheet-keyboard-aware-scroll-view"
import { useKeyboardEditingSheetGestures } from "@/components/app/use-keyboard-editing-sheet-gestures"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native"
import { useKeyboardState } from "react-native-keyboard-controller"
import {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  APP_BOTTOM_SHEET_ELEVATION,
  AppBottomSheetBackdrop,
} from "@/components/app/bottom-sheet-backdrop"
import { useModalAccessibility } from "@/components/app/modal-accessibility-isolation"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { resolveDisplayTextScale } from "@/lib/mobile-accessibility-layout"
import { BottomSheetInputProvider } from "@/components/ui/bottom-sheet-input-context"

const SHEET_RADIUS = 32

function FloatingSheetBackground({
  pointerEvents,
  style,
  surfaceColor,
  borderColor,
  clipHeight,
}: BottomSheetBackgroundProps & {
  surfaceColor: string
  borderColor: string
  clipHeight: SharedValue<number>
}) {
  const { animatedLayoutState, animatedPosition } = useBottomSheetInternal()
  useAnimatedReaction(
    () => {
      const containerHeight = animatedLayoutState.get().containerHeight
      return containerHeight > 0
        ? Math.max(0, containerHeight - animatedPosition.get())
        : null
    },
    (height) => {
      if (height !== null) clipHeight.set(height)
    },
    [clipHeight]
  )
  return (
    <View
      pointerEvents={pointerEvents}
      style={[
        style,
        styles.background,
        { backgroundColor: surfaceColor, borderColor },
      ]}
    />
  )
}

export type FloatingBottomSheetProps = {
  visible: boolean
  onClose: () => void
  onDismissed?: () => void
  children: ReactNode
  presentation?: "compact" | "large"
  scrollable?: boolean | "auto"
  snapPoints?: BottomSheetModalProps["snapPoints"]
  enableDynamicSizing?: boolean
  maxDynamicContentSize?: number
  title?: string
  hideHandle?: boolean
  bottomInset?: number
  sideInset?: number
  overlay?: ReactNode
  /** A child calendar/review owns Back while it is visible. */
  overlayActive?: boolean
  accessibilityLabel?: string
  dismissible?: boolean
  footer?: ReactNode
  header?: ReactNode
  keyboardExpandable?: boolean
  enableContentPanningGesture?: boolean
}

export function FloatingBottomSheet({
  visible,
  onClose,
  onDismissed,
  children,
  presentation = "large",
  scrollable = false,
  snapPoints,
  enableDynamicSizing = true,
  maxDynamicContentSize,
  title,
  hideHandle = false,
  bottomInset,
  sideInset = 8,
  overlay,
  overlayActive = false,
  accessibilityLabel,
  dismissible = true,
  footer,
  header,
  keyboardExpandable = false,
  enableContentPanningGesture = true,
}: FloatingBottomSheetProps) {
  "use no memo"

  const sheetRef = useRef<BottomSheetModal | null>(null)
  const visibleRef = useRef(visible)
  // Form edits replace inline callbacks. Keep their latest behavior without
  // treating a callback identity change as another open/snap-to-compact event.
  const onDismissedRef = useRef(onDismissed)
  const wasPresentedRef = useRef(false)
  const hasOpenedRef = useRef(false)
  const dismissedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dismissedFallbackTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const dismissedNotifiedRef = useRef(false)
  const accessibilityReleaseRef = useRef<null | (() => void)>(null)
  const accessibilityFallbackTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [measuredContentHeight, setMeasuredContentHeight] = useState(0)
  const [measuredFooterHeight, setMeasuredFooterHeight] = useState(0)
  const [measuredHeaderHeight, setMeasuredHeaderHeight] = useState(0)
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible)
  const { registerFloatingSheet } = useModalAccessibility()
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const safeAreaInsets = useSafeAreaInsets()
  const { fontScale, height } = useWindowDimensions()
  const sheetClipHeight = useSharedValue(height)
  const shouldClipFloatingContent = keyboardExpandable && Boolean(footer)
  const sheetClipStyle = useAnimatedStyle(
    () =>
      shouldClipFloatingContent
        ? {
            maxHeight: sheetClipHeight.get(),
            justifyContent: "flex-end" as const,
          }
        : {},
    [shouldClipFloatingContent]
  )
  const titleTextScale = resolveDisplayTextScale(fontScale)
  visibleRef.current = visible
  onDismissedRef.current = onDismissed

  const releaseAccessibilityIsolation = useCallback(() => {
    if (accessibilityFallbackTimerRef.current !== null) {
      clearTimeout(accessibilityFallbackTimerRef.current)
      accessibilityFallbackTimerRef.current = null
    }
    accessibilityReleaseRef.current?.()
    accessibilityReleaseRef.current = null
  }, [])
  // Size detached sheets against the usable app window. The physical screen
  // includes Android system UI (notably the tablet taskbar), which can place a
  // fixed footer beneath the visible and accessible window.
  const viewportHeight = height
  const resolvedBottomInset =
    bottomInset ??
    Math.max(Platform.OS === "android" ? 20 : 28, safeAreaInsets.bottom + 8)
  const resolvedMaxDynamicContentSize =
    maxDynamicContentSize ??
    (presentation === "compact"
      ? Math.max(220, viewportHeight * 0.44)
      : Math.max(240, viewportHeight - resolvedBottomInset - sideInset * 2))
  const handleHeight = hideHandle ? 0 : title ? (largeTextLayout ? 72 : 60) : 28
  const measuredSheetContentHeight =
    measuredContentHeight + measuredFooterHeight + measuredHeaderHeight
  const reservedFooterHeight =
    footer && (!keyboardExpandable || !isKeyboardVisible)
      ? measuredFooterHeight
      : 0
  const shouldEnableScroll =
    scrollable === true ||
    measuredSheetContentHeight + handleHeight > resolvedMaxDynamicContentSize
  const shouldUseScrollableContainer =
    scrollable === true || scrollable === "auto"
  const scrollBodyMaxHeight = Math.max(
    120,
    resolvedMaxDynamicContentSize -
      reservedFooterHeight -
      measuredHeaderHeight -
      handleHeight
  )
  const keyboardExpandedHeightLimit = Math.min(
    viewportHeight - resolvedBottomInset - 16,
    viewportHeight * 0.88
  )
  // Expansion at rest reveals the content without creating an empty full-height
  // panel. An open keyboard still gets the larger viewport for input scrolling.
  const keyboardExpandedSnapPoint =
    isKeyboardVisible || measuredSheetContentHeight === 0
      ? keyboardExpandedHeightLimit
      : Math.min(
          keyboardExpandedHeightLimit,
          Math.max(
            resolvedMaxDynamicContentSize,
            measuredSheetContentHeight + handleHeight
          )
        )
  const keyboardCompactSnapPoint = Math.min(
    resolvedMaxDynamicContentSize,
    Math.max(
      220,
      measuredSheetContentHeight > 0
        ? measuredSheetContentHeight + handleHeight
        : resolvedMaxDynamicContentSize
    )
  )
  const resolvedSnapPoints = useMemo(
    () =>
      keyboardExpandable && snapPoints === undefined
        ? keyboardExpandedSnapPoint > keyboardCompactSnapPoint
          ? [keyboardCompactSnapPoint, keyboardExpandedSnapPoint]
          : [keyboardCompactSnapPoint]
        : snapPoints,
    [
      keyboardCompactSnapPoint,
      keyboardExpandedSnapPoint,
      keyboardExpandable,
      snapPoints,
    ]
  )
  const resolvedEnableDynamicSizing =
    keyboardExpandable && snapPoints === undefined ? false : enableDynamicSizing

  const notifyDismissed = useCallback(() => {
    if (!onDismissedRef.current || dismissedNotifiedRef.current) return
    dismissedNotifiedRef.current = true
    if (dismissedFallbackTimerRef.current !== null) {
      clearTimeout(dismissedFallbackTimerRef.current)
      dismissedFallbackTimerRef.current = null
    }
    dismissedTimerRef.current = setTimeout(() => {
      dismissedTimerRef.current = null
      onDismissedRef.current?.()
    }, 120)
  }, [])

  useEffect(() => {
    if (visible) {
      if (accessibilityFallbackTimerRef.current !== null) {
        clearTimeout(accessibilityFallbackTimerRef.current)
        accessibilityFallbackTimerRef.current = null
      }
      accessibilityReleaseRef.current ??= registerFloatingSheet()
      hasOpenedRef.current = false
      dismissedNotifiedRef.current = false
      wasPresentedRef.current = true
      sheetRef.current?.present()
      const compactFrame = requestAnimationFrame(() =>
        sheetRef.current?.snapToIndex(0)
      )
      return () => cancelAnimationFrame(compactFrame)
    }

    if (wasPresentedRef.current) {
      sheetRef.current?.dismiss()
      accessibilityFallbackTimerRef.current = setTimeout(
        releaseAccessibilityIsolation,
        600
      )
      if (onDismissedRef.current) {
        // Reanimated/Gorhom may omit onDismiss when a controlled sheet closes
        // during a modal-stack transition. Keep a deduplicated fallback so the
        // queued sheet still opens after the close animation.
        dismissedFallbackTimerRef.current = setTimeout(notifyDismissed, 500)
      }
    }
  }, [
    notifyDismissed,
    registerFloatingSheet,
    releaseAccessibilityIsolation,
    visible,
  ])

  useEffect(
    () => () => {
      if (dismissedTimerRef.current !== null) {
        clearTimeout(dismissedTimerRef.current)
      }
      if (dismissedFallbackTimerRef.current !== null) {
        clearTimeout(dismissedFallbackTimerRef.current)
      }
      releaseAccessibilityIsolation()
    },
    [releaseAccessibilityIsolation]
  )

  useEffect(() => {
    if (!keyboardExpandable || !visible) return

    const frame = requestAnimationFrame(() => {
      if (isKeyboardVisible && snapPoints === undefined) {
        sheetRef.current?.snapToPosition(keyboardExpandedSnapPoint)
        return
      }
      sheetRef.current?.snapToIndex(0)
    })
    return () => cancelAnimationFrame(frame)
  }, [
    isKeyboardVisible,
    keyboardExpandable,
    keyboardExpandedSnapPoint,
    snapPoints,
    visible,
  ])

  useEffect(() => {
    if (!footer) setMeasuredFooterHeight(0)
  }, [footer])

  useEffect(() => {
    if (!header) setMeasuredHeaderHeight(0)
  }, [header])

  useEffect(() => {
    if (!visible || overlayActive) return

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (dismissible) onClose()
        return true
      }
    )

    return () => subscription.remove()
  }, [dismissible, onClose, overlayActive, visible])

  const handleContentHeight = useCallback((contentHeight: number) => {
    const roundedHeight = Math.ceil(contentHeight)
    setMeasuredContentHeight((currentHeight) =>
      Math.abs(currentHeight - roundedHeight) > 1
        ? roundedHeight
        : currentHeight
    )
  }, [])

  const handleBottomSheetInputFocus = useCallback(() => {
    // BottomSheetTextInput and the keyboard-aware scroll container share
    // focus ownership. Avoid an imperative scrollToEnd here: short forms can
    // otherwise overscroll their title and focused field out of view.
  }, [])

  const handleDismiss = useCallback(() => {
    const wasPresented = wasPresentedRef.current
    const didOpen = hasOpenedRef.current

    // BottomSheetModal may emit an initialization dismissal while its portal
    // is registering. It is not a user dismissal until the sheet has reached
    // an open index at least once.
    if (!wasPresented || !didOpen) return

    wasPresentedRef.current = false
    hasOpenedRef.current = false
    releaseAccessibilityIsolation()
    // Gorhom can retain the callback from the open render while a controlled
    // close is animating. Read the current prop from a ref so a programmatic
    // close does not fire onClose again and erase a queued sheet transition.
    if (visibleRef.current) onClose()
    notifyDismissed()
  }, [notifyDismissed, onClose, releaseAccessibilityIsolation])

  const handleSheetChange = useCallback((index: number) => {
    if (index >= 0) hasOpenedRef.current = true
  }, [])

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <AppBottomSheetBackdrop {...props} dismissible={dismissible} />
    ),
    [dismissible]
  )

  const renderBackground = useCallback(
    (props: BottomSheetBackgroundProps) => (
      <FloatingSheetBackground
        {...props}
        surfaceColor={colors.card}
        borderColor={colors.border}
        clipHeight={sheetClipHeight}
      />
    ),
    [colors.border, colors.card, sheetClipHeight]
  )

  const renderHandle = useCallback(() => {
    if (hideHandle) return null

    return (
      <View style={styles.handleContainer}>
        <View
          style={[styles.handle, { backgroundColor: colors.mutedForeground }]}
        />
        {title ? (
          <Text
            allowFontScaling={false}
            accessibilityRole="header"
            numberOfLines={largeTextLayout ? 2 : 1}
            style={[
              styles.title,
              largeTextLayout
                ? {
                    fontSize: 16 * titleTextScale,
                    lineHeight: 22 * titleTextScale,
                  }
                : undefined,
              { color: colors.foreground },
            ]}
          >
            {title}
          </Text>
        ) : null}
      </View>
    )
  }, [
    colors.foreground,
    colors.mutedForeground,
    hideHandle,
    largeTextLayout,
    title,
    titleTextScale,
  ])

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer ? (
        <BottomSheetFooter {...props} bottomInset={0}>
          <View
            onLayout={({ nativeEvent }) =>
              setMeasuredFooterHeight(Math.ceil(nativeEvent.layout.height))
            }
            style={[
              styles.footer,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
              },
            ]}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [colors.border, colors.card, footer]
  )

  const containerStyle = useMemo(
    () => [
      styles.container,
      {
        marginHorizontal: sideInset,
        shadowColor: colors.foreground,
      },
    ],
    [colors.foreground, sideInset]
  )
  const contentContainerStyle = useMemo(
    () => [
      styles.content,
      reservedFooterHeight > 0
        ? { paddingBottom: reservedFooterHeight }
        : undefined,
    ],
    [reservedFooterHeight]
  )

  return (
    <BottomSheetModal
      ref={sheetRef}
      index={0}
      snapPoints={resolvedSnapPoints}
      enableDynamicSizing={resolvedEnableDynamicSizing}
      maxDynamicContentSize={
        keyboardExpandable
          ? keyboardExpandedSnapPoint
          : resolvedMaxDynamicContentSize
      }
      enableContentPanningGesture={enableContentPanningGesture}
      gestureEventsHandlersHook={useKeyboardEditingSheetGestures}
      enablePanDownToClose={dismissible}
      keyboardBehavior={keyboardExpandable ? "extend" : "interactive"}
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      detached
      bottomInset={resolvedBottomInset}
      containerStyle={containerStyle}
      // Clip the detached outer boundary at its current detent. Keep Gorhom's
      // largest-detent scroll viewport intact so compact clipping cannot create
      // a new scroll offset that hides the focused input label on expansion.
      // Its column-reverse body must stay top-anchored while being clipped.
      style={[styles.sheet, sheetClipStyle]}
      backgroundComponent={renderBackground}
      backdropComponent={renderBackdrop}
      handleComponent={renderHandle}
      footerComponent={
        footer && (!keyboardExpandable || !isKeyboardVisible)
          ? renderFooter
          : undefined
      }
      onDismiss={handleDismiss}
      onChange={handleSheetChange}
      accessibilityLabel={accessibilityLabel}
    >
      {header ? (
        <View
          onLayout={({ nativeEvent }) =>
            setMeasuredHeaderHeight(Math.ceil(nativeEvent.layout.height))
          }
        >
          {header}
        </View>
      ) : null}
      {shouldUseScrollableContainer ? (
        keyboardExpandable ? (
          <BottomSheetKeyboardAwareScrollView
            // The action footer is hidden while typing. Reserve only a small
            // input gap, not a second footer-sized scroll region above the IME.
            bottomOffset={16}
            contentContainerStyle={contentContainerStyle}
            extraKeyboardSpace={0}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            onInputFocus={handleBottomSheetInputFocus}
            scrollEnabled
            showsVerticalScrollIndicator={false}
            // Gorhom owns the viewport at each snap point. A compact maxHeight
            // here clips the scroll surface even after the sheet expands.
            style={[styles.scrollViewport, { flex: 1 }]}
          >
            <View
              onLayout={({ nativeEvent }) =>
                handleContentHeight(nativeEvent.layout.height)
              }
            >
              {children}
            </View>
          </BottomSheetKeyboardAwareScrollView>
        ) : (
          <BottomSheetScrollView
            contentContainerStyle={contentContainerStyle}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            scrollEnabled={scrollable === "auto" || shouldEnableScroll}
            showsVerticalScrollIndicator={false}
            style={[
              styles.scrollViewport,
              shouldEnableScroll
                ? {
                    maxHeight: footer
                      ? scrollBodyMaxHeight
                      : resolvedMaxDynamicContentSize - handleHeight,
                  }
                : undefined,
            ]}
          >
            <BottomSheetInputProvider
              onInputFocus={handleBottomSheetInputFocus}
            >
              <View
                onLayout={({ nativeEvent }) =>
                  handleContentHeight(nativeEvent.layout.height)
                }
              >
                {children}
              </View>
            </BottomSheetInputProvider>
          </BottomSheetScrollView>
        )
      ) : (
        <BottomSheetView style={contentContainerStyle}>
          <View
            onLayout={({ nativeEvent }) =>
              handleContentHeight(nativeEvent.layout.height)
            }
          >
            <BottomSheetInputProvider
              onInputFocus={handleBottomSheetInputFocus}
            >
              {children}
            </BottomSheetInputProvider>
          </View>
        </BottomSheetView>
      )}
      {overlay ? (
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          {overlay}
        </View>
      ) : null}
    </BottomSheetModal>
  )
}

const styles = StyleSheet.create({
  background: {
    borderRadius: SHEET_RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
  },
  container: {
    elevation: APP_BOTTOM_SHEET_ELEVATION,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    zIndex: APP_BOTTOM_SHEET_ELEVATION,
  },
  content: { overflow: "hidden" },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
  handle: { borderRadius: 999, height: 6, opacity: 0.25, width: 48 },
  handleContainer: { alignItems: "center", paddingBottom: 8, paddingTop: 12 },
  sheet: { borderRadius: SHEET_RADIUS, overflow: "hidden" },
  scrollViewport: { overflow: "hidden" },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
    maxWidth: "86%",
    textAlign: "center",
  },
})
