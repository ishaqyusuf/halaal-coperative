import { useColors } from "@/hooks/use-color"
import { resolveDockedFooterInset } from "@/lib/docked-footer-inset"
import { type ReactNode } from "react"
import { Platform, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/**
 * Actions docked at the foot of a full-height screen (03 Docked action, T03):
 * card surface, hairline top border, the primary button then quiet actions.
 * Keeps a clear gap above the Android gesture handle.
 */
export function DockedFooter({ children }: { children: ReactNode }) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        gap: 4,
        paddingBottom: resolveDockedFooterInset(insets.bottom, Platform.OS),
        paddingHorizontal: 18,
        paddingTop: 12,
      }}
    >
      {children}
    </View>
  )
}
