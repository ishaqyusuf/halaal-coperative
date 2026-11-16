import { AppKeyboardAwareScrollView } from "@/components/app/keyboard-aware-scroll-view"
import { ConfirmationSheet } from "@/components/app/confirmation-sheet"
import { FULL_SCREEN_FORM_PORTAL_HOST } from "@/components/app/full-screen-form-sheet-layer"
import { useFullScreenFormVisibility } from "@/components/app/full-screen-form-visibility"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useColorScheme } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { THEME } from "@/lib/theme"
import { Portal } from "@gorhom/portal"
import { StatusBar } from "expo-status-bar"
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
  dirty = false,
  footer,
  isSubmitting = false,
  onClose,
  onDismissed,
  overlay,
  overlayActive = false,
  title,
  visible,
}: {
  children: ReactNode
  dirty?: boolean
  footer?: ReactNode
  isSubmitting?: boolean
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
  const lastForm = useRef({ children, footer, overlayActive, title })
  const form = visible
    ? { children, footer, overlayActive, title }
    : lastForm.current

  useLayoutEffect(() => {
    onDismissedRef.current = onDismissed
    if (visible) lastForm.current = { children, footer, overlayActive, title }
  }, [children, footer, onDismissed, overlayActive, title, visible])

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
            <SafeAreaView style={{ backgroundColor: colors.background, flex: 1 }}>
              <StatusBar
                animated
                backgroundColor={colors.background}
                style={colorScheme === "dark" ? "light" : "dark"}
              />
              <View className="flex-row items-start gap-3 border-b border-border px-5 pt-4 pb-4">
                <View className="min-w-0 flex-1">
                  <Text
                    accessibilityRole="header"
                    className="text-2xl font-extrabold tracking-tight text-foreground"
                    maxFontSizeMultiplier={1.5}
                    numberOfLines={2}
                  >
                    {form.title}
                  </Text>
                </View>
                <Button
                  accessibilityLabel={`Close ${form.title}`}
                  disabled={isSubmitting}
                  onPress={requestClose}
                  size="icon"
                  variant="ghost"
                >
                  <Icon className="size-base text-foreground" name="X" />
                </Button>
              </View>
              <View className="flex-1 overflow-hidden">
                <AppKeyboardAwareScrollView
                  bottomOffset={Math.max(
                    insets.bottom + 144,
                    footerHeight + 144,
                    largeTextLayout ? 280 : 208
                  )}
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled
                >
                  <View className="gap-5 px-5 pb-8 pt-5">
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
