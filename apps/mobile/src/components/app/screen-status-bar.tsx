import { useColors, useColorScheme } from "@/hooks/use-color"
import { resolveScreenStatusBar } from "@/lib/screen-status-bar-policy"
import { useIsFocused } from "@react-navigation/native"
import { StatusBar } from "expo-status-bar"
import { Platform } from "react-native"

export function ScreenStatusBar({
  tone = "background",
}: {
  tone?: "background" | "brand"
}) {
  const focused = useIsFocused()
  const colors = useColors()
  const { colorScheme } = useColorScheme()
  const appearance = resolveScreenStatusBar({
    androidApiLevel:
      Platform.OS === "android" ? Number(Platform.Version) : undefined,
    background: colors.background,
    brandSurface: colors.brandSurface,
    colorScheme,
    focused,
    tone,
  })

  return appearance ? <StatusBar {...appearance} /> : null
}
