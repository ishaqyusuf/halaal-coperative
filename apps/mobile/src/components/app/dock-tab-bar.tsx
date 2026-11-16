import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColorScheme, useColors } from "@/hooks/use-color"
import { shadows } from "@/lib/design-tokens"
import {
  DOCK_OPACITY_INPUT,
  DOCK_OPACITY_OUTPUT,
  animateDock,
} from "@/lib/dock-motion"
import { useDockVisibilityStore } from "@/lib/dock-visibility-store"
import { resolveDockGeometry } from "@/lib/tab-bar-geometry"
import { cn } from "@/lib/utils"
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs"
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { StyleSheet, View } from "react-native"
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/**
 * 02 Brand native floating dock for the member and admin tabs: a 64pt
 * pill (radius 32) floating above the home indicator; the active tab sits on
 * a tint capsule. It sinks and fades with the search pill (animateDock) when
 * the focused list scrolls down, and leaves entirely while a full-screen
 * form is open.
 */
export function DockTabBar({
  descriptors,
  hidden: formOpen = false,
  navigation,
  state,
}: BottomTabBarProps & { hidden?: boolean }) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const { colorScheme } = useColorScheme()
  const reduceMotion = useReducedMotion()
  const scrolledAway = useDockVisibilityStore((store) => store.hidden)
  const geometry = resolveDockGeometry(insets.bottom)
  const shouldHide = formOpen || scrolledAway
  const progress = useSharedValue(shouldHide ? 1 : 0)
  const travel = geometry.bottom + geometry.height + 24

  useEffect(() => {
    progress.set(animateDock(shouldHide ? 1 : 0, shouldHide, reduceMotion))
  }, [progress, reduceMotion, shouldHide])

  const motionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), DOCK_OPACITY_INPUT, DOCK_OPACITY_OUTPUT),
    transform: [{ translateY: progress.get() * travel }],
  }))

  const routes = state.routes.filter((route) => {
    const style = StyleSheet.flatten(descriptors[route.key]?.options.tabBarItemStyle)
    return style?.display !== "none"
  })

  return (
    <Animated.View
      accessibilityElementsHidden={shouldHide}
      importantForAccessibility={shouldHide ? "no-hide-descendants" : "auto"}
      pointerEvents={shouldHide ? "none" : "box-none"}
      // Reanimated views take no className; position lives in style.
      style={[
        {
          position: "absolute",
          bottom: geometry.bottom,
          left: geometry.side,
          right: geometry.side,
        },
        motionStyle,
      ]}
      testID="dock-tab-bar"
    >
      <View
        accessibilityRole="tablist"
        style={{
          backgroundColor:
            colorScheme === "dark" ? colors.surfaceFloat : colors.card,
          borderColor: colors.border,
          borderRadius: 32,
          borderWidth: 1,
          boxShadow: shadows[colorScheme].float,
          flexDirection: "row",
          height: geometry.height,
          padding: 6,
        }}
      >
        {routes.map((route) => {
          const options = descriptors[route.key]?.options ?? {}
          const focused = state.routes[state.index]?.key === route.key
          const label = options.title ?? route.name
          const tint = focused ? colors.accentForeground : colors.mutedForeground
          return (
            <Pressable
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              className={cn(
                "flex-1 items-center justify-center gap-[2px] rounded-[26px]",
                focused ? "bg-accent" : "bg-transparent"
              )}
              haptic
              key={route.key}
              noRipple
              onLongPress={() =>
                navigation.emit({ target: route.key, type: "tabLongPress" })
              }
              onPress={() => {
                const event = navigation.emit({
                  canPreventDefault: true,
                  target: route.key,
                  type: "tabPress",
                })
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params)
                }
              }}
              testID={`dock-tab-${route.name}`}
            >
              {options.tabBarIcon?.({ color: tint, focused, size: 22 })}
              <Text
                className={focused ? "text-accent-foreground" : "text-muted-foreground"}
                maxFontSizeMultiplier={1.15}
                numberOfLines={1}
                variant="caption"
              >
                {label}
              </Text>
            </Pressable>
          )
        })}
      </View>
    </Animated.View>
  )
}

type DockSceneValue = {
  /** A shell that lays its own content under the dock opts out of padding. */
  claimDockInset: () => () => void
  contentInset: number
  inDockScene: boolean
}

const DockSceneContext = createContext<DockSceneValue>({
  claimDockInset: () => () => undefined,
  contentInset: 0,
  inDockScene: false,
})

/**
 * Wraps every tab screen (Tabs `screenLayout`). Unmigrated screens get
 * bottom padding so their last rows clear the floating dock; ScreenShell
 * and AppList claim the inset and scroll under the dock instead.
 */
export function DockScene({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const [claims, setClaims] = useState(0)
  const contentInset = resolveDockGeometry(insets.bottom).contentInset
  const claimDockInset = useCallback(() => {
    setClaims((count) => count + 1)
    let released = false
    return () => {
      if (released) return
      released = true
      setClaims((count) => Math.max(0, count - 1))
    }
  }, [])
  const value = useMemo(
    () => ({ claimDockInset, contentInset, inDockScene: true }),
    [claimDockInset, contentInset]
  )
  return (
    <DockSceneContext.Provider value={value}>
      <View
        style={{
          backgroundColor: colors.background,
          flex: 1,
          paddingBottom: claims > 0 ? 0 : contentInset,
        }}
      >
        {children}
      </View>
    </DockSceneContext.Provider>
  )
}

/** Bottom scroll padding for content that runs under the dock (0 off-tab). */
export function useDockContentInset() {
  const { claimDockInset, contentInset, inDockScene } =
    useContext(DockSceneContext)
  useEffect(() => (inDockScene ? claimDockInset() : undefined), [
    claimDockInset,
    inDockScene,
  ])
  return { contentInset: inDockScene ? contentInset : 0, inDockScene }
}
