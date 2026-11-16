import { useCardShadow } from "@/components/ui/list-card"
import { cn } from "@/lib/utils"
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
} from "react"
import { View } from "react-native"
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

const ShimmerContext = createContext<SharedValue<number> | null>(null)

function useShimmerClock() {
  const reduceMotion = useReducedMotion()
  const progress = useSharedValue(0)
  useEffect(() => {
    if (reduceMotion) {
      progress.set(0.5)
      return
    }
    progress.set(
      withRepeat(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      )
    )
    return () => cancelAnimation(progress)
  }, [progress, reduceMotion])
  return progress
}

/** One clock for every bone inside, so a whole skeleton breathes together. */
export function SkeletonGroup({ children }: { children: ReactNode }) {
  const progress = useShimmerClock()
  return (
    <ShimmerContext.Provider value={progress}>{children}</ShimmerContext.Provider>
  )
}

function SharedBone({
  className,
  progress,
}: {
  className?: string
  progress: SharedValue<number>
}) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + progress.get() * 0.45,
  }))
  return (
    <Animated.View
      accessible={false}
      className={cn("rounded-lg bg-muted", className)}
      style={style}
    />
  )
}

function StandaloneBone({ className }: { className?: string }) {
  const progress = useShimmerClock()
  return <SharedBone className={className} progress={progress} />
}

/** A shimmering placeholder block. Size it with className. */
function Skeleton({ className }: { className?: string }) {
  const progress = useContext(ShimmerContext)
  return progress ? (
    <SharedBone className={className} progress={progress} />
  ) : (
    <StandaloneBone className={className} />
  )
}

/** Rows shaped like RecordRow inside a ListCard. */
function ListSkeleton({
  className,
  rows = 4,
}: {
  className?: string
  rows?: number
}) {
  const shadow = useCardShadow()
  return (
    <SkeletonGroup>
      <View
        accessibilityLabel="Loading"
        accessibilityRole="progressbar"
        className={cn("overflow-hidden rounded-[20px] bg-card", className)}
        style={shadow}
      >
        {Array.from({ length: rows }, (_, index) => (
          <View key={index}>
            {index > 0 ? <View className="ml-[66px] h-px bg-border" /> : null}
            <View className="min-h-16 flex-row items-center gap-3 px-[14px] py-2.5">
              <Skeleton className="size-10 rounded-[14px]" />
              <View className="flex-1 gap-2">
                <Skeleton className="h-4 w-3/5 rounded-md" />
                <Skeleton className="h-3 w-2/5 rounded-md" />
              </View>
              <View className="items-end gap-2">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-[22px] w-14 rounded-full" />
              </View>
            </View>
          </View>
        ))}
      </View>
    </SkeletonGroup>
  )
}

/** A hero card and a stat grid, for dashboards loading their first read. */
function HomeSkeleton({ className }: { className?: string }) {
  return (
    <SkeletonGroup>
      <View
        accessibilityLabel="Loading"
        accessibilityRole="progressbar"
        className={cn("gap-4", className)}
      >
        <Skeleton className="h-48 w-full rounded-[28px]" />
        <View className="flex-row gap-3">
          <Skeleton className="h-32 flex-1 rounded-[20px]" />
          <Skeleton className="h-32 flex-1 rounded-[20px]" />
        </View>
        <View className="flex-row gap-3">
          <Skeleton className="h-32 flex-1 rounded-[20px]" />
          <Skeleton className="h-32 flex-1 rounded-[20px]" />
        </View>
      </View>
    </SkeletonGroup>
  )
}

/** Title block and label/value rows, for a record detail. */
function DetailSkeleton({
  className,
  rows = 5,
}: {
  className?: string
  rows?: number
}) {
  return (
    <SkeletonGroup>
      <View
        accessibilityLabel="Loading"
        accessibilityRole="progressbar"
        className={cn("gap-4", className)}
      >
        <View className="flex-row items-center gap-3">
          <Skeleton className="size-14 rounded-[14px]" />
          <View className="flex-1 gap-2">
            <Skeleton className="h-5 w-1/2 rounded-md" />
            <Skeleton className="h-3.5 w-1/3 rounded-md" />
          </View>
        </View>
        <View className="overflow-hidden rounded-[20px] bg-card">
          {Array.from({ length: rows }, (_, index) => (
            <View
              className="min-h-12 flex-row items-center justify-between px-[14px] py-3"
              key={index}
            >
              <Skeleton className="h-3.5 w-1/3 rounded-md" />
              <Skeleton className="h-3.5 w-1/4 rounded-md" />
            </View>
          ))}
        </View>
      </View>
    </SkeletonGroup>
  )
}

export { DetailSkeleton, HomeSkeleton, ListSkeleton, Skeleton }
