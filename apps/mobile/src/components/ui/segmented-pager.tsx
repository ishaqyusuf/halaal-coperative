import { motion } from "@/lib/design-tokens"
import {
  PAGER_COMMIT_DURATION,
  PAGER_GAP,
  PAGER_TAP_DURATION,
  pagerDragPosition,
  pagerGestureDecision,
  pagerReleaseIndex,
} from "@/lib/segmented-pager-motion"
import {
  type ComponentRef,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  View,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  Easing,
  scrollTo,
  useAnimatedReaction,
  useAnimatedRef,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { scheduleOnRN } from "react-native-worklets"

const EASING = Easing.bezier(...motion.sheet.bezier)

/** Shared float index for a SegmentedControl + SegmentedPager pair. */
export function usePagerPosition(initialIndex: number) {
  return useSharedValue(initialIndex)
}

/**
 * Brings the segmented tabs back into view when a tap switches lanes while
 * the screen is scrolled past them (02 v3). Pass `scrollRef`/`onScroll` to
 * ScreenShell, `anchorRef` to a View around the SegmentedControl, and
 * `revealTabs` to SegmentedPager's `onTapTransition`.
 */
export function useLaneTabsAnchor() {
  const insets = useSafeAreaInsets()
  const reduceMotion = useReducedMotion()
  const scrollRef = useRef<ScrollView | null>(null)
  const anchorRef = useRef<View | null>(null)
  const offset = useRef(0)
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset.y
    },
    []
  )
  const revealTabs = useCallback(() => {
    anchorRef.current?.measureInWindow((_x, y) => {
      const top = insets.top + 8
      if (y >= top) return
      scrollRef.current?.scrollTo({
        animated: !reduceMotion,
        y: Math.max(0, offset.current - (top - y)),
      })
    })
  }, [insets.top, reduceMotion])
  return { anchorRef, onScroll, revealTabs, scrollRef } as {
    anchorRef: RefObject<View | null>
    onScroll: typeof onScroll
    revealTabs: () => void
    scrollRef: RefObject<ScrollView | null>
  }
}

/**
 * Lane carousel (02 v3): pages sit side by side 24pt apart. Changing
 * `index` (a segment tap) slides in the tap direction over 340ms; a
 * horizontal swipe follows the finger, commits past 22% and calls
 * `onIndexChange`. Pages mount on first visit and stay mounted. The pager
 * takes the height of the current page.
 */
export function SegmentedPager({
  disabled = false,
  eager = false,
  fill = false,
  index,
  onIndexChange,
  onTapTransition,
  pages,
  position,
}: {
  disabled?: boolean
  /** Mount every lane up front (dev gallery poses); default is lazy. */
  eager?: boolean
  /** Give independent virtualized lanes the viewport height. */
  fill?: boolean
  index: number
  onIndexChange: (index: number) => void
  /** Runs when a tab tap (not a swipe) starts a transition. */
  onTapTransition?: () => void
  /** One render function per segment, in segment order. */
  pages: readonly (() => ReactNode)[]
  position: SharedValue<number>
}) {
  const reduceMotion = useReducedMotion()
  const [width, setWidth] = useState(0)
  const [heights, setHeights] = useState<number[]>([])
  const [visited, setVisited] = useState(
    () => new Set(eager ? pages.map((_, page) => page) : [index])
  )
  const onTapTransitionRef = useRef(onTapTransition)
  onTapTransitionRef.current = onTapTransition
  const firstRun = useRef(true)
  const fromGesture = useRef(false)
  const count = pages.length
  const startIndex = useSharedValue(index)
  const viewportRef = useAnimatedRef<ComponentRef<typeof Animated.ScrollView>>()

  useEffect(() => {
    setVisited((current) =>
      current.has(index) ? current : new Set([...current, index])
    )
    if (fromGesture.current) {
      fromGesture.current = false
      return
    }
    if (!firstRun.current) onTapTransitionRef.current?.()
    firstRun.current = false
    position.set(
      reduceMotion
        ? index
        : withTiming(index, { duration: PAGER_TAP_DURATION, easing: EASING })
    )
  }, [index, position, reduceMotion])

  const mountNeighbours = (at: number) => {
    setVisited((current) => {
      const next = new Set(current)
      if (at > 0) next.add(at - 1)
      if (at < count - 1) next.add(at + 1)
      return next.size === current.size ? current : next
    })
  }

  const commit = (next: number) => {
    fromGesture.current = next !== index
    if (next !== index) onIndexChange(next)
  }

  const touchStart = useSharedValue({ x: 0, y: 0 })
  const pan = Gesture.Pan()
    .enabled(!disabled)
    // Horizontal lock: |dx| > 1.2·|dy|, so vertical scroll and
    // pull-to-refresh are never captured by the lane swipe.
    .manualActivation(true)
    .onTouchesDown((event) => {
      const touch = event.allTouches[0]
      if (touch) touchStart.set({ x: touch.absoluteX, y: touch.absoluteY })
    })
    .onTouchesMove((event, manager) => {
      const touch = event.allTouches[0]
      if (!touch) return
      const start = touchStart.get()
      const decision = pagerGestureDecision(
        touch.absoluteX - start.x,
        touch.absoluteY - start.y
      )
      if (decision === "activate") manager.activate()
      else if (decision === "fail") manager.fail()
    })
    // Manual activation must always resolve, or a tap that never moved
    // leaves the gesture pending and blocks later touches.
    .onTouchesUp((_event, manager) => {
      manager.end()
    })
    .onTouchesCancelled((_event, manager) => {
      manager.fail()
    })
    .onBegin(() => {
      startIndex.set(Math.round(position.get()))
      // Neighbours must be mounted before they slide into view.
      scheduleOnRN(mountNeighbours, Math.round(position.get()))
    })
    .onUpdate((event) => {
      position.set(
        pagerDragPosition({
          count,
          dx: event.translationX,
          index: startIndex.get(),
          pageWidth: width,
        })
      )
    })
    .onEnd((event) => {
      const target = pagerReleaseIndex({
        count,
        dx: event.translationX,
        index: startIndex.get(),
        pageWidth: width,
        vx: event.velocityX,
      })
      position.set(
        reduceMotion
          ? target
          : target === startIndex.get()
            ? // Below the 22% threshold: spring back to the current lane.
              withSpring(target, {
                damping: 26,
                mass: 0.8,
                overshootClamping: true,
                stiffness: 240,
              })
            : // Commit: 260ms from the release point.
              withTiming(target, {
                duration: PAGER_COMMIT_DURATION,
                easing: EASING,
              })
      )
      scheduleOnRN(commit, target)
    })

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -position.get() * (width + PAGER_GAP) }],
  }))

  useAnimatedReaction(
    () => fill && width ? position.get() * (width + PAGER_GAP) : null,
    (offset) => {
      if (offset !== null) scrollTo(viewportRef, offset, 0, false)
    }
  )

  const lanes = pages.map((render, pageIndex) => (
    <View
      accessibilityElementsHidden={pageIndex !== index}
      importantForAccessibility={
        pageIndex === index ? "auto" : "no-hide-descendants"
      }
      key={pageIndex}
      onLayout={(event) => {
        if (fill) return
        const next = event.nativeEvent.layout.height
        setHeights((current) => {
          if (current[pageIndex] === next) return current
          const copy = [...current]
          copy[pageIndex] = next
          return copy
        })
      }}
      {...(width ? { style: { width } } : null)}
    >
      {visited.has(pageIndex) ? render() : null}
    </View>
  ))

  if (fill) {
    return (
      <GestureDetector gesture={pan}>
        <Animated.ScrollView
          contentContainerStyle={{ gap: PAGER_GAP }}
          horizontal
          nestedScrollEnabled
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
          ref={viewportRef}
          removeClippedSubviews={false}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {width ? lanes : null}
        </Animated.ScrollView>
      </GestureDetector>
    )
  }

  // Eager (posed) pagers size to the tallest lane; lazy ones to the current.
  const height = eager ? undefined : heights[index]
  return (
    <GestureDetector gesture={pan}>
      <View
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={height ? { height, overflow: "hidden" } : { overflow: "hidden" }}
      >
        <Animated.View
          style={[
            { alignItems: "flex-start", flexDirection: "row", gap: PAGER_GAP },
            rowStyle,
          ]}
        >
          {lanes}
        </Animated.View>
      </View>
    </GestureDetector>
  )
}
