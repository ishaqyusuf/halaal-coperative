import { FULL_SCREEN_FORM_PORTAL_HOST } from "@/components/app/full-screen-form-sheet-layer"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { Portal } from "@gorhom/portal"
import { useEffect } from "react"
import { ActivityIndicator, BackHandler, Keyboard, View } from "react-native"
import { KeyboardStickyView } from "react-native-keyboard-controller"

/**
 * QA Domain entry: one input bar docked above the keyboard with a send button
 * beside it. It opens only from a QA control and closes with the keyboard or
 * once authorization succeeds.
 */
export function QaDomainComposer({
  errorText,
  loading,
  onChangeText,
  onClose,
  onRetry,
  onSubmit,
  value,
  visible,
}: {
  errorText: string | null
  loading: boolean
  onChangeText: (value: string) => void
  onClose: () => void
  /** Present when the server could not be reached; the button retries. */
  onRetry?: () => void
  onSubmit: () => void
  value: string
  visible: boolean
}) {
  const colors = useColors()
  const canSubmit = !loading && (onRetry ? true : value.trim().length >= 3)

  useEffect(() => {
    if (!visible) return
    // Only a hide after this composer raised the keyboard closes it, so a
    // stale hide from the field that just lost focus cannot.
    let shown = false
    const show = Keyboard.addListener("keyboardDidShow", () => {
      shown = true
    })
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      if (shown) onClose()
    })
    const back = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose()
      return true
    })
    return () => {
      show.remove()
      hide.remove()
      back.remove()
    }
  }, [onClose, visible])

  if (!visible) return null

  const submit = () => {
    if (!canSubmit) return
    if (onRetry) onRetry()
    else onSubmit()
  }

  return (
    <Portal hostName={FULL_SCREEN_FORM_PORTAL_HOST}>
      <KeyboardStickyView
        offset={{ closed: 0, opened: 0 }}
        pointerEvents="box-none"
        style={{
          bottom: 0,
          left: 0,
          position: "absolute",
          right: 0,
          zIndex: 100,
        }}
      >
        <View className="gap-2 border-t border-border bg-background px-4 pt-2 pb-3">
          <Text className="text-brand text-xs font-extrabold tracking-[1.4px] uppercase">
            QA access
          </Text>
          {errorText ? (
            <Text
              accessibilityLiveRegion="polite"
              className="px-1 text-xs font-medium text-destructive"
            >
              {errorText}
            </Text>
          ) : null}
          <View className="flex-row items-center gap-2">
            <View className="min-w-0 flex-1">
              <Input
                accessibilityLabel="QA Domain"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                className="rounded-full px-2"
                editable={!loading}
                keyboardType="url"
                onChangeText={onChangeText}
                onSubmitEditing={submit}
                placeholder="QA domain, like name.qa.test"
                returnKeyType="go"
                submitBehavior="submit"
                value={value}
              />
            </View>
            <Pressable
              accessibilityLabel={onRetry ? "Retry server" : "Load QA profiles"}
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: !canSubmit }}
              className={cn(
                "h-12 w-12 items-center justify-center rounded-full",
                canSubmit ? "bg-primary" : "bg-muted"
              )}
              disabled={!canSubmit}
              haptic
              onPress={submit}
            >
              {loading ? (
                <ActivityIndicator color={colors.mutedForeground} />
              ) : (
                <Icon
                  className={cn(
                    "size-sm",
                    canSubmit
                      ? "text-primary-foreground"
                      : "text-muted-foreground"
                  )}
                  name={onRetry ? "RefreshCw" : "ArrowRight"}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardStickyView>
    </Portal>
  )
}
