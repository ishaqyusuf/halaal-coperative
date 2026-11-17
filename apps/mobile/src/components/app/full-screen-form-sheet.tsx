import { AppKeyboardAwareScrollView } from "@/components/app/keyboard-aware-scroll-view"
import { ConfirmationSheet } from "@/components/app/confirmation-sheet"
import { FULL_SCREEN_FORM_PORTAL_HOST } from "@/components/app/full-screen-form-sheet-layer"
import { useFullScreenFormVisibility } from "@/components/app/full-screen-form-visibility"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useColorScheme } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { THEME } from "@/lib/theme"
import { Portal } from "@gorhom/portal"
import { OverlayStatusBar } from "@/components/app/screen-status-bar"
import { useCardShadow } from "@/components/ui/list-card"
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import {
  BackHandler,
  Keyboard,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { scheduleOnRN } from "react-native-worklets"

const FORM_ENTER = {
  duration: 320,
  easing: Easing.out(Easing.cubic),
  reduceMotion: ReduceMotion.System,
}
const FORM_EXIT = {
  duration: 260,
  easing: Easing.inOut(Easing.cubic),
  reduceMotion: ReduceMotion.System,
}

export function FullScreenFormSheet({
  children,
  contentClassName,
  contentKey,
  dirty = false,
  footer,
  isSubmitting = false,
  onClose,
  onDismissed,
  headerOnCard = false,
  headerTrailing,
  onBack,
  overlay,
  overlayActive = false,
  title,
  visible,
}: {
  children: ReactNode
  contentClassName?: string
  contentKey?: string
  dirty?: boolean
  footer?: ReactNode
  /** Small right-aligned header text, e.g. a step "1 of 2". */
  headerOnCard?: boolean
  headerTrailing?: ReactNode
  isSubmitting?: boolean
  /** Shows a back chevron instead of X (a later step returning to the form). */
  onBack?: () => void
  onClose: () => void
  onDismissed?: () => void
  overlay?: ReactNode
  /** Prevent the parent form from handling Android Back while a nested sheet owns focus. */
  overlayActive?: boolean
  title: string
  visible: boolean
}) {
  const { colorScheme } = useColorScheme()
  const largeTextLayout = useLargeTextLayout()
  const cardShadow = useCardShadow()
  const { registerVisibleForm } = useFullScreenFormVisibility()
  const colors = THEME[colorScheme]
  const insets = useSafeAreaInsets()
  const [footerHeight, setFooterHeight] = useState(0)
  const [isDiscardConfirmationVisible, setIsDiscardConfirmationVisible] =
    useState(false)
  const { height } = useWindowDimensions()
  const progress = useSharedValue(0)
  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * height }],
  }))
  const [retained, setRetained] = useState(visible)
  const presented = visible || retained
  const transition = useRef(0)
  const wasPresented = useRef(visible)
  const onDismissedRef = useRef(onDismissed)
  // Callers can clear the form's intent and fields as soon as they close it.
  // Keep the last displayed form intact while the surface slides away.
  const lastForm = useRef({
    children,
    contentKey,
    footer,
    headerTrailing,
    onBack,
    overlayActive,
    title,
  })
  const form = visible
    ? { children, contentKey, footer, headerTrailing, onBack, overlayActive, title }
    : lastForm.current

  useLayoutEffect(() => {
    onDismissedRef.current = onDismissed
    if (visible)
      lastForm.current = {
        children,
        contentKey,
        footer,
        headerTrailing,
        onBack,
        overlayActive,
        title,
      }
  }, [
    children,
    contentKey,
    footer,
    headerTrailing,
    onBack,
    onDismissed,
    overlayActive,
    title,
    visible,
  ])

  const finishClose = useCallback((id: number) => {
    if (transition.current !== id) return
    wasPresented.current = false
    setRetained(false)
    onDismissedRef.current?.()
  }, [])

  useLayoutEffect(() => {
    const id = ++transition.current
    if (visible) {
      wasPresented.current = true
      setRetained(true)
      progress.set(withTiming(1, FORM_ENTER))
    } else if (wasPresented.current) {
      progress.set(
        withTiming(0, FORM_EXIT, (finished) => {
          "worklet"
          if (finished) scheduleOnRN(finishClose, id)
        })
      )
    }
    return () => {
      transition.current = id + 1
      cancelAnimation(progress)
    }
  }, [finishClose, progress, visible])
  useEffect(() => {
    if (!visible) setIsDiscardConfirmationVisible(false)
  }, [visible])

  useEffect(() => {
    if (presented) return registerVisibleForm()
  }, [presented, registerVisibleForm])

  const requestClose = useCallback(() => {
    if (isSubmitting) return
    Keyboard.dismiss()

    if (!dirty) {
      onClose()
      return
    }

    setIsDiscardConfirmationVisible(true)
  }, [dirty, isSubmitting, onClose])

  const confirmDiscard = useCallback(() => {
    setIsDiscardConfirmationVisible(false)
    Keyboard.dismiss()
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!presented || overlayActive) return

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (visible) requestClose()
        return true
      }
    )

    return () => subscription.remove()
  }, [overlayActive, presented, requestClose, visible])

  if (!presented) return null

  return (
    <Portal hostName={FULL_SCREEN_FORM_PORTAL_HOST}>
      <View
        className="absolute inset-0"
        collapsable={false}
        style={[StyleSheet.absoluteFill, { elevation: 1000, zIndex: 1000 }]}
      >
        <Animated.View
          accessibilityViewIsModal
          className="bg-background"
          accessibilityElementsHidden={!visible}
          importantForAccessibility={visible ? "yes" : "no-hide-descendants"}
          pointerEvents={visible ? "auto" : "none"}
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.background },
            motionStyle,
          ]}
        >
          <View className="flex-1">
            <SafeAreaView style={{ backgroundColor: headerOnCard ? colors.card : colors.background, flex: 1 }}>
              <OverlayStatusBar />
              <View className={cn(
                "min-h-14 flex-row items-center gap-2 px-[14px] pt-1 pb-2",
                headerOnCard && "border-b border-border",
              )}>
                <View style={{ ...cardShadow, borderRadius: 999 }}>
                <Button
                  accessibilityLabel={
                    form.onBack ? "Back" : `Close ${form.title}`
                  }
                  className={headerOnCard ? "bg-surface-raised" : "bg-card"}
                  disabled={isSubmitting}
                  onPress={form.onBack ?? requestClose}
                  size="icon"
                  variant="ghost"
                >
                  <Icon
                    className="size-md text-foreground"
                    name={form.onBack ? "ChevronLeft" : "X"}
                  />
                </Button>
                </View>
                <Text
                  accessibilityRole="header"
                  className={cn("min-w-0 flex-1 text-center font-extrabold text-foreground", headerOnCard ? "text-[16px] leading-[22px]" : "text-base")}
                  maxFontSizeMultiplier={1.5}
                  numberOfLines={largeTextLayout ? 2 : 1}
                >
                  {form.title}
                </Text>
                <View className="min-w-11 items-end">
                  {typeof form.headerTrailing === "string" ? (
                    <Text className="text-muted-foreground" variant="label">
                      {form.headerTrailing}
                    </Text>
                  ) : (
                    form.headerTrailing
                  )}
                </View>
              </View>
              <View className={cn("flex-1 overflow-hidden", headerOnCard && "bg-background")}>
                <AppKeyboardAwareScrollView
                  key={form.contentKey}
                  bottomOffset={Math.max(
                    insets.bottom + 144,
                    footerHeight + 144,
                    largeTextLayout ? 280 : 208
                  )}
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled
                >
                  <View className={cn("gap-5 px-5 pb-8 pt-5", contentClassName)}>
                    {form.children}
                    <View
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      style={{
                        height: form.footer
                          ? footerHeight + 24
                          : Math.max(insets.bottom, 24),
                      }}
                    />
                  </View>
                </AppKeyboardAwareScrollView>
              </View>
              {form.footer && !form.overlayActive ? (
                <KeyboardStickyView
                  offset={{ closed: 0, opened: 0 }}
                  pointerEvents="box-none"
                  style={{
                    bottom: 0,
                    left: 0,
                    position: "absolute",
                    right: 0,
                    zIndex: 4,
                  }}
                >
                  <View
                    onLayout={(event) =>
                      setFooterHeight(event.nativeEvent.layout.height)
                    }
                    style={{
                      backgroundColor: colors.background,
                      elevation: 4,
                      paddingBottom: Math.max(insets.bottom, 12),
                    }}
                  >
                    <View className="border-t border-border bg-background px-5 pt-3">
                      {form.footer}
                    </View>
                  </View>
                </KeyboardStickyView>
              ) : null}
            </SafeAreaView>
          </View>
          {overlay}
          <ConfirmationSheet
            cancelLabel="Keep editing"
            confirmLabel="Close form"
            description="Your saved draft will remain available when you open this form again."
            onClose={() => setIsDiscardConfirmationVisible(false)}
            onConfirm={confirmDiscard}
            title="Discard changes?"
            tone="destructive"
            visible={isDiscardConfirmationVisible}
          />
        </Animated.View>
      </View>
    </Portal>
  )
}
