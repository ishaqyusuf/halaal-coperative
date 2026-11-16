import { useDockContentInset } from "@/components/app/dock-tab-bar"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { Icon } from "@/components/ui/icon"
import { useCardShadow } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useBottomDockScroll } from "@/hooks/use-bottom-dock-scroll"
import { useColors } from "@/hooks/use-color"
import { motion } from "@/lib/design-tokens"
import { useDockVisibilityStore } from "@/lib/dock-visibility-store"
import { resolveDockGeometry } from "@/lib/tab-bar-geometry"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useState,
} from "react"
import {
  Platform,
  RefreshControl,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/** A 44pt round header control: back, close, filter, add. */
export function ScreenHeaderButton({
  accessibilityLabel,
  icon,
  onPress,
  testID,
  tone = "default",
}: {
  accessibilityLabel: string
  icon: string
  onPress: () => void
  testID?: string
  tone?: "default" | "inverse"
}) {
  const shadow = useCardShadow()
  return (
    // Shadow on a style-only wrapper; className on the Pressable.
    <View style={tone === "inverse" ? { borderRadius: 999 } : { ...shadow, borderRadius: 999 }}>
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className={cn(
        "size-[44px] items-center justify-center rounded-full",
        tone === "inverse" ? "bg-hero-foreground/15" : "bg-card"
      )}
      haptic
      hitSlop={4}
      onPress={onPress}
      testID={testID}
      transition
    >
      <Icon
        className={cn(
          "size-md",
          tone === "inverse" ? "text-hero-foreground" : "text-foreground"
        )}
        name={icon}
      />
    </Pressable>
    </View>
  )
}

/** Back control resolution: an explicit handler, true/false, or auto. */
export function useScreenBack(back: boolean | (() => void) | undefined) {
  const router = useRouter()
  if (typeof back === "function") return back
  const show = back ?? router.canGoBack()
  return show ? () => router.back() : null
}

/**
 * The header row (back + actions) and the 26/32 large title. Used by
 * ScreenShell and as AppList's list header, so both read the same.
 */
export function ScreenTitleHeader({
  back,
  children,
  headerActions,
  title,
  tone = "default",
}: {
  back?: boolean | (() => void)
  /** Extra header content below the title: summary card, segments, banner. */
  children?: ReactNode
  headerActions?: ReactNode
  title?: string
  tone?: "default" | "inverse"
}) {
  const onBack = useScreenBack(back)
  return (
    <View className="gap-[12px]">
      {onBack || headerActions ? (
        <View className="min-h-[44px] flex-row items-center justify-between">
          {onBack ? (
            <ScreenHeaderButton
              accessibilityLabel="Go back"
              icon="ChevronLeft"
              onPress={onBack}
              testID="screen-back-button"
              tone={tone}
            />
          ) : (
            <View />
          )}
          <View className="flex-row items-center gap-[10px]">{headerActions}</View>
        </View>
      ) : null}
      {title ? (
        <Text
          accessibilityRole="header"
          className={tone === "inverse" ? "text-hero-foreground" : "text-foreground"}
          variant="screenTitle"
        >
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  )
}

/**
 * The brand hero surface: hero gradient, edge-to-edge under the status bar
 * with the top inset folded into its padding, bottom radius 28.
 */
export function ScreenHero({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  return (
    <View
      style={{
        backgroundColor: colors.heroMid,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        experimental_backgroundImage: `linear-gradient(165deg, ${colors.heroStart} 0%, ${colors.heroMid} 55%, ${colors.heroEnd} 100%)`,
        paddingBottom: 24,
        paddingHorizontal: 18,
        paddingTop: insets.top + 12,
      }}
    >
      <View className={className}>{children}</View>
    </View>
  )
}

/**
 * Status-bar blend + dock scroll for a scrollable screen (ADR §3, §1).
 * With a hero, the bar keeps light icons over the hero and a strip fades to
 * the card colour once the hero scrolls past; without one, the strip is the
 * canvas. On tab screens, scrolling down sinks the dock and search pill.
 */
export function useScreenChrome({ hero }: { hero: boolean }) {
  const insets = useSafeAreaInsets()
  const colors = useColors()
  const reduceMotion = useReducedMotion()
  const { contentInset, inDockScene } = useDockContentInset()
  const setDockHidden = useDockVisibilityStore((store) => store.setHidden)
  const dockHidden = useDockVisibilityStore((store) => store.hidden)
  // Off the tabs there is no dock; the scroll still hides the search pill.
  const [localHidden, setLocalHidden] = useState(false)
  const onDockScroll = useBottomDockScroll(
    inDockScene ? setDockHidden : setLocalHidden
  )
  const [heroHeight, setHeroHeight] = useState(0)
  const [scrolledPastHero, setScrolledPastHero] = useState(false)
  const strip = useSharedValue(hero ? 0 : 1)

  useEffect(() => {
    const target = !hero || scrolledPastHero ? 1 : 0
    strip.set(
      reduceMotion
        ? target
        : withTiming(target, {
            duration: motion.statusStrip.duration,
            easing: Easing.out(Easing.quad),
          })
    )
  }, [hero, reduceMotion, scrolledPastHero, strip])

  const stripStyle = useAnimatedStyle(() => ({ opacity: strip.get() }))

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (hero) {
        const threshold = Math.max(1, heroHeight - insets.top)
        const past = event.nativeEvent.contentOffset.y >= threshold
        setScrolledPastHero((current) => (current === past ? current : past))
      }
      onDockScroll(event)
    },
    [hero, heroHeight, insets.top, onDockScroll]
  )

  const onHeroLayout = useCallback((height: number) => {
    setHeroHeight((current) => (current === height ? current : height))
  }, [])

  const chrome = (
    <>
      <ScreenStatusBar
        tone={hero ? (scrolledPastHero ? "surface" : "hero") : "background"}
      />
      <Animated.View
        accessible={false}
        pointerEvents="none"
        style={[
          {
            backgroundColor: hero ? colors.card : colors.background,
            height: insets.top,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
            zIndex: 100,
          },
          stripStyle,
        ]}
        testID="screen-status-strip"
      />
    </>
  )

  return {
    /** Scroll-down state for the search pill (and the dock on tab screens). */
    barsHidden: inDockScene ? dockHidden : localHidden,
    chrome,
    contentBottomInset: inDockScene ? contentInset : insets.bottom + 24,
    /** Lift for a bottom search footer so it floats just above the dock. */
    dockLift: inDockScene
      ? resolveDockGeometry(insets.bottom, Platform.OS).bottom +
        resolveDockGeometry(insets.bottom, Platform.OS).height -
        insets.bottom
      : 0,
    inDockScene,
    insetsTop: insets.top,
    onHeroLayout,
    onScroll,
    scrolledPastHero,
  }
}

export type ScreenShellProps = {
  title?: string
  /** Auto (router.canGoBack()) unless set; a function overrides navigation. */
  back?: boolean | (() => void)
  headerActions?: ReactNode
  /** Header content under the title (summary, segments, banners). */
  header?: ReactNode
  /** Edge-to-edge brand hero (use ScreenHero). Replaces the title header. */
  hero?: ReactNode
  children?: ReactNode
  /** Pull-to-refresh; replaces header Refresh buttons. */
  onRefresh?: () => void
  refreshing?: boolean
  /** Overlays pinned to the screen, e.g. BottomSearchFooter or a FAB. */
  overlay?: ReactNode
  contentClassName?: string
  /** For screens that scroll programmatically (e.g. useLaneTabsAnchor). */
  scrollRef?: RefObject<ScrollView | null>
  /** Extra scroll listener; the shell's chrome still runs. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void
  testID?: string
}

/**
 * The one screen shell (ADR §3, §6): canvas, status-bar blend, large title,
 * back button on pushed screens, pull-to-refresh and dock-aware padding.
 * For long lists use AppList instead; it shares this header and chrome.
 */
export function ScreenShell({
  back,
  children,
  contentClassName,
  header,
  headerActions,
  hero,
  onRefresh,
  onScroll,
  overlay,
  refreshing = false,
  scrollRef,
  testID,
  title,
}: ScreenShellProps) {
  const colors = useColors()
  const chrome = useScreenChrome({ hero: Boolean(hero) })

  return (
    <View className="flex-1 bg-background" testID={testID}>
      {chrome.chrome}
      <ScrollView
        contentContainerStyle={{ paddingBottom: chrome.contentBottomInset }}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        onScroll={(event) => {
          chrome.onScroll(event)
          onScroll?.(event)
        }}
        ref={scrollRef}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              colors={[colors.primary]}
              onRefresh={onRefresh}
              progressViewOffset={chrome.insetsTop}
              refreshing={refreshing}
              tintColor={hero ? colors.primary : colors.mutedForeground}
            />
          ) : undefined
        }
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {hero ? (
          <View
            onLayout={(event) =>
              chrome.onHeroLayout(event.nativeEvent.layout.height)
            }
          >
            {hero}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 18, paddingTop: chrome.insetsTop + 8 }}>
            <ScreenTitleHeader
              back={back}
              headerActions={headerActions}
              title={title}
            >
              {header}
            </ScreenTitleHeader>
          </View>
        )}
        <View className={cn("gap-[16px] px-[18px] pt-[16px]", contentClassName)}>
          {children}
        </View>
      </ScrollView>
      {overlay}
    </View>
  )
}
