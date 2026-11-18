import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native"
import { palette } from "@/lib/design-tokens"

/**
 * Runtime colors for native APIs (navigation, status bar, icons, Reanimated).
 * Derived from the single token source in lib/design-tokens.ts.
 */
export const THEME = palette

export type ThemeColors = (typeof THEME)["light"] | (typeof THEME)["dark"]

export const NAV_THEME: Record<"light" | "dark", Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
}
