import { AppKeyboardAwareScrollView } from "@/components/app/keyboard-aware-scroll-view"
import { useScreenChrome } from "@/components/app/screen-shell"
import { useColors } from "@/hooks/use-color"
import { type ReactNode, useState } from "react"
import { View } from "react-native"
import { KeyboardStickyView } from "react-native-keyboard-controller"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/**
 * Hero + docked action screen (T02 auth, workshop 02-auth rev a9a85dc7;
 * shared since T03 for the system gates: splash error, mobile access, not
 * found). The hero runs under the status bar, content sits on the canvas,
 * and the primary action is docked at the bottom and rides the keyboard, so
 * it is always in view. Scrolling past the hero turns the status strip to the
 * card colour (ScreenShell chrome). Banners and errors grow the page, never
 * the dock.
 */
export function DockedHeroScreen({
  children,
  footer,
  hero,
  onFooterHeightChange,
  testID,
}: {
  children: ReactNode
  /** Docked actions: the primary button, then quiet links. */
  footer?: ReactNode
  hero: ReactNode
  /** The docked bar's height, for floating controls that must clear it. */
  onFooterHeightChange?: (height: number) => void
  testID?: string
}) {
  const chrome = useScreenChrome({ hero: true })
  const colors = useColors()
  const insets = useSafeAreaInsets()
  const [footerHeight, setFooterHeight] = useState(0)

  return (
    <View className="flex-1 bg-background" testID={testID}>
      {chrome.chrome}
      <AppKeyboardAwareScrollView
        bottomOffset={footerHeight + 24}
        contentInsetAdjustmentBehavior="never"
        onScroll={chrome.onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        <View
          onLayout={(event) =>
            chrome.onHeroLayout(event.nativeEvent.layout.height)
          }
        >
          {hero}
        </View>
        <View className="gap-[16px] px-[18px] pt-[26px]">{children}</View>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{ height: footerHeight + 32 }}
        />
      </AppKeyboardAwareScrollView>
      {footer ? (
        <KeyboardStickyView
          // Drop the home-indicator padding while the keyboard is up.
          offset={{ closed: 0, opened: Math.max(0, insets.bottom - 10) }}
          pointerEvents="box-none"
          style={{ bottom: 0, left: 0, position: "absolute", right: 0 }}
        >
          <View
            onLayout={(event) => {
              setFooterHeight(event.nativeEvent.layout.height)
              onFooterHeightChange?.(event.nativeEvent.layout.height)
            }}
            style={{
              backgroundColor: colors.card,
              paddingBottom: Math.max(insets.bottom, 12) + 4,
            }}
          >
            <View className="gap-[6px] border-t border-border bg-card px-[18px] pt-[12px]">
              {footer}
            </View>
          </View>
        </KeyboardStickyView>
      ) : null}
    </View>
  )
}
