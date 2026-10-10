import { DEV_QUICK_FILL_PORTAL_HOST } from "@/components/app/dev-quick-fill-layer"
import { Icon } from "@/components/ui/icon"
import {
  isMobileDevFixtureSession,
  isMobileQaClientBuild,
} from "@/dev/mobile-dev-session"
import { loadMobileQaAuthorization } from "@/lib/mobile-qa-authorization-store"
import { getSessionProfile } from "@/lib/session-store"
import { Portal } from "@gorhom/portal"
import { useIsFocused } from "@react-navigation/native"
import { useEffect, useState } from "react"
import { Keyboard, Pressable, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export function DevQuickFill({
  bottomOffset = 0,
  label = "Quick fill",
  onPress,
  placement = "floating",
  portal = true,
}: {
  bottomOffset?: number
  label?: string
  onPress: () => void
  placement?: "floating" | "footer"
  portal?: boolean
}) {
  const insets = useSafeAreaInsets()
  const isFocused = useIsFocused()
  const [hasDeviceQaAuthorization, setHasDeviceQaAuthorization] =
    useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(
    Keyboard.isVisible()
  )

  useEffect(() => {
    let mounted = true
    void loadMobileQaAuthorization()
      .then((authorization) => {
        if (mounted) setHasDeviceQaAuthorization(Boolean(authorization))
      })
      .catch(() => {
        if (mounted) setHasDeviceQaAuthorization(false)
      })
    return () => {
      mounted = false
    }
  }, [isFocused])

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setIsKeyboardVisible(true)
    )
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setIsKeyboardVisible(false)
    )

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  if (
    !isMobileQaClientBuild ||
    (placement !== "footer" &&
      !isMobileDevFixtureSession() &&
      !getSessionProfile()?.qaAuthorized &&
      !hasDeviceQaAuthorization) ||
    (placement !== "footer" && !isFocused) ||
    isKeyboardVisible
  )
    return null

  const control = (
    <View
      className={
        placement === "footer" ? "h-12 w-12" : "absolute left-4 h-12 w-12"
      }
      pointerEvents="box-none"
      style={
        placement === "footer"
          ? { elevation: 12 }
          : {
              // Keep native positioning with the runtime inset: Android otherwise
              // reserves this control's height in the full-screen form layout.
              position: "absolute",
              bottom: Math.max(insets.bottom, 16) + 12 + bottomOffset,
              elevation: 12,
              left: 16,
              zIndex: 20,
            }
      }
    >
      <Pressable
        accessibilityHint="Fills this form with safe development test data"
        accessibilityLabel={label}
        accessibilityRole="button"
        className="h-12 w-12 items-center justify-center rounded-full border border-border bg-card active:bg-accent"
        onPress={onPress}
      >
        <Icon className="size-base text-primary" name="WandSparkles" />
      </Pressable>
    </View>
  )

  if (!portal || placement === "footer") return control

  return <Portal hostName={DEV_QUICK_FILL_PORTAL_HOST}>{control}</Portal>
}
