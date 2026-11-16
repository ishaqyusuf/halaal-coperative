import { motion } from "@/lib/design-tokens"
import {
  PAGER_COMMIT_DURATION,
  PAGER_GAP,
  PAGER_TAP_DURATION,
  pagerDragPosition,
  pagerReleaseIndex,
} from "@/lib/segmented-pager-motion"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"

const EASING = Easing.bezier(...motion.sheet.bezier)

/** Shared float index for a SegmentedControl + SegmentedPager pair. */
export function usePagerPosition(initialIndex: number) {
  return useSharedValue(initialIndex)
}

/**
 * Lane carousel (02 v3): pages sit side by side 24pt apart. Changing
 * `index` (a segment tap) slides in the tap direction over 340ms; a
 * horizontal swipe follows the finger, commits past 22% and calls
 * `onIndexChange`. Pages mount on first visit and stay mounted. The pager
 * takes the height of the current page.
 */
export function SegmentedPager({
  index,
  onIndexChange,
  pages,
  position,
}: {
  index: number
  onIndexChange: (index: number) => void
  /** One render function per segment, in segment order. */
  pages: readonly (() => ReactNode)[]
  position: SharedValue<number>
}) {
  const reduceMotion = useReducedMotion()
  const [width, setWidth] = useState(0)
  const [heights, setHeights] = useState<number[]>([])
  const [visited, setVisited] = useState(() => new Set([index]))
  const fromGesture = useRef(false)
  const count = pages.length
  const startIndex = useSharedValue(index)

  useEffect(() => {
    setVisited((current) =>
      current.has(index) ? current : new Set([...current, index])
    )
    if (fromGesture.current) {
      fromGesture.current = false
      return
    }
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

  const pan = Gesture.Pan()
    .activeOffsetX([-14, 14])
    .failOffsetY([-12, 12])
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
          : withTiming(target, {
              duration: PAGER_COMMIT_DURATION,
              easing: EASING,
            })
      )
      scheduleOnRN(commit, target)
    })

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -position.get() * (width + PAGER_GAP) }],
  }))

  const height = heights[index]

  return (
    <GestureDetector gesture={pan}>
      <View
        className="overflow-hidden"
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={height ? { height } : undefined}
      >
        <Animated.View
          className="flex-row items-start"
          style={[{ gap: PAGER_GAP }, rowStyle]}
        >
          {pages.map((render, pageIndex) => (
            <View
              accessibilityElementsHidden={pageIndex !== index}
              importantForAccessibility={
                pageIndex === index ? "auto" : "no-hide-descendants"
              }
              key={pageIndex}
              onLayout={(event) => {
                const next = event.nativeEvent.layout.height
                setHeights((current) => {
                  if (current[pageIndex] === next) return current
                  const copy = [...current]
                  copy[pageIndex] = next
                  return copy
                })
              }}
              style={{ width: width || undefined }}
            >
              {visited.has(pageIndex) ? render() : null}
            </View>
          ))}
        </Animated.View>
      </View>
    </GestureDetector>
  )
}
