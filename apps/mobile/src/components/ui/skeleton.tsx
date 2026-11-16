import { Elevated } from "@/components/ui/list-card"
import { useColors } from "@/hooks/use-color"
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
  const colors = useColors()
  const style = useAnimatedStyle(() => ({
    opacity: 0.55 + progress.get() * 0.45,
  }))
  // The plain View owns size and shape (className); Reanimated views take
  // no className, so the pulse fills it through style.
  return (
    <View
      accessible={false}
      className={cn("overflow-hidden rounded-lg", className)}
    >
      <Animated.View
        style={[
          {
            backgroundColor: colors.muted,
            bottom: 0,
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          },
          style,
        ]}
      />
    </View>
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
  return (
    <SkeletonGroup>
      <Elevated
        className={cn("overflow-hidden rounded-[20px] bg-card", className)}
        radius={20}
      >
        {Array.from({ length: rows }, (_, index) => (
          <View key={index}>
            {index > 0 ? <View className="ml-[66px] h-px bg-border" /> : null}
            <View className="min-h-[64px] flex-row items-center gap-[12px] px-[14px] py-[10px]">
              <Skeleton className="size-[40px] rounded-[14px]" />
              <View className="flex-1 gap-[8px]">
                <Skeleton className="h-4 w-3/5 rounded-md" />
                <Skeleton className="h-3 w-2/5 rounded-md" />
              </View>
              <View className="items-end gap-[8px]">
                <Skeleton className="h-4 w-16 rounded-md" />
                <Skeleton className="h-[22px] w-14 rounded-full" />
              </View>
            </View>
          </View>
        ))}
      </Elevated>
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
        className={cn("gap-[16px]", className)}
      >
        <Skeleton className="h-48 w-full rounded-[28px]" />
        <View className="flex-row gap-[12px]">
          <Skeleton className="h-32 flex-1 rounded-[20px]" />
          <Skeleton className="h-32 flex-1 rounded-[20px]" />
        </View>
        <View className="flex-row gap-[12px]">
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
        className={cn("gap-[16px]", className)}
      >
        <View className="flex-row items-center gap-[12px]">
          <Skeleton className="size-[56px] rounded-[14px]" />
          <View className="flex-1 gap-[8px]">
            <Skeleton className="h-5 w-1/2 rounded-md" />
            <Skeleton className="h-3.5 w-1/3 rounded-md" />
          </View>
        </View>
        <View className="overflow-hidden rounded-[20px] bg-card">
          {Array.from({ length: rows }, (_, index) => (
            <View
              className="min-h-[48px] flex-row items-center justify-between px-[14px] py-[12px]"
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
