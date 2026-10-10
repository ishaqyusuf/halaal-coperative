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
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react"
import { BackHandler, Keyboard, StyleSheet, View } from "react-native"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"

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
  const wasVisibleRef = useRef(visible)
  const dismissedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onDismissedRef = useRef(onDismissed)
  useEffect(() => {
    if (!visible) setIsDiscardConfirmationVisible(false)
  }, [visible])

  useEffect(() => {
    if (!visible || overlayActive) return
    return registerVisibleForm()
  }, [overlayActive, registerVisibleForm, visible])

  useEffect(() => {
    onDismissedRef.current = onDismissed
  }, [onDismissed])

  useEffect(() => {
    if (dismissedTimerRef.current !== null) {
      clearTimeout(dismissedTimerRef.current)
      dismissedTimerRef.current = null
    }

    if (visible) {
      wasVisibleRef.current = true
      return
    }

    if (!wasVisibleRef.current || !onDismissedRef.current) return

    wasVisibleRef.current = false
    dismissedTimerRef.current = setTimeout(() => {
      dismissedTimerRef.current = null
      onDismissedRef.current?.()
    }, 360)

    return () => {
      if (dismissedTimerRef.current !== null) {
        clearTimeout(dismissedTimerRef.current)
        dismissedTimerRef.current = null
      }
    }
  }, [visible])

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
    if (!visible || overlayActive) return

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        requestClose()
        return true
      }
    )

    return () => subscription.remove()
  }, [overlayActive, requestClose, visible])

  if (!visible) return null

  return (
    <Portal hostName={FULL_SCREEN_FORM_PORTAL_HOST}>
      <View
        accessibilityViewIsModal
        className="bg-background"
        importantForAccessibility="yes"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.background,
            elevation: 1000,
            zIndex: 1000,
          },
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
                  {title}
                </Text>
              </View>
              <Button
                accessibilityLabel={`Close ${title}`}
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
                  {children}
                  <View
                    accessibilityElementsHidden
                    importantForAccessibility="no-hide-descendants"
                    style={{
                      height: footer
                        ? footerHeight + 24
                        : Math.max(insets.bottom, 24),
                    }}
                  />
                </View>
              </AppKeyboardAwareScrollView>
            </View>
            {footer && !overlayActive ? (
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
                    {footer}
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
      </View>
    </Portal>
  )
}
