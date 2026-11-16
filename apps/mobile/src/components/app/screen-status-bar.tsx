import { useColors, useColorScheme } from "@/hooks/use-color"
import {
  resolveScreenStatusBar,
  type ScreenStatusBarTone,
} from "@/lib/screen-status-bar-policy"
import { useIsFocused } from "@react-navigation/native"
import { StatusBar } from "expo-status-bar"
import { Platform } from "react-native"

/**
 * The only module that renders expo-status-bar (enforced by
 * check:nativewind-ui). Everything resolves through screen-status-bar-policy.
 */
function PolicyStatusBar({
  focused,
  tone,
}: {
  focused: boolean
  tone: ScreenStatusBarTone
}) {
  const colors = useColors()
  const { colorScheme } = useColorScheme()
  const appearance = resolveScreenStatusBar({
    androidApiLevel:
      Platform.OS === "android" ? Number(Platform.Version) : undefined,
    background: colors.background,
    brandSurface: colors.brandSurface,
    colorScheme,
    focused,
    heroStart: colors.heroStart,
    surface: colors.card,
    tone,
  })

  return appearance ? <StatusBar animated {...appearance} /> : null
}

/** A navigator screen's bar; inactive screens relinquish it. */
export function ScreenStatusBar({
  tone = "background",
}: {
  tone?: ScreenStatusBarTone
}) {
  const focused = useIsFocused()
  return <PolicyStatusBar focused={focused} tone={tone} />
}

/**
 * For surfaces outside a navigator screen: the root default, full-screen
 * modals (FullScreenFormSheet, AppSheet full screen) and app-lock. React
 * Native stacks status-bar entries, so unmounting restores the screen's.
 */
export function OverlayStatusBar({
  tone = "background",
}: {
  tone?: ScreenStatusBarTone
}) {
  return <PolicyStatusBar focused tone={tone} />
}
