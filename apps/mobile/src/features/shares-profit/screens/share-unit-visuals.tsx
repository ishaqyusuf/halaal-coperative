import { Elevated } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { View, type ViewStyle } from "react-native"
import type { MobileMemberSharePosition } from "../model/member-shares-types"

const UNIT_COLORS = {
  compulsory: "bg-primary",
  optional: "bg-brand/55 dark:bg-brand-surface",
  pending: "bg-brand-warm",
  request: "bg-brand-vivid",
  available: "bg-foreground/15",
}

function units(position: MobileMemberSharePosition, requested: number) {
  return [
    { key: "compulsory", label: "Compulsory", count: position.compulsoryUnits },
    {
      key: "optional",
      label: "Optional",
      count: position.approvedOptionalUnits,
    },
    { key: "pending", label: "Pending", count: position.pendingOptionalUnits },
    { key: "request", label: "This request", count: requested },
    {
      key: "available",
      label: "Available",
      count: Math.max(0, position.remainingOptionalUnits - requested),
    },
  ] as const
}

function UnitLegend({ segments }: { segments: ReturnType<typeof units> }) {
  return (
    <View className="flex-row flex-wrap gap-x-[12px] gap-y-[6px]">
      {segments
        .filter(
          ({ key, count }) =>
            count ||
            key === "available" ||
            key === "optional" ||
            key === "compulsory"
        )
        .map(({ key, label, count }) => (
          <View className="flex-row items-center gap-[5px]" key={key}>
            <View
              className={cn("size-[8px] rounded-[2px]", UNIT_COLORS[key])}
            />
            <Text className="text-muted-foreground" variant="caption">
              {label}{" "}
              <Text tabular variant="caption">
                {count}
              </Text>
            </Text>
          </View>
        ))}
    </View>
  )
}

function pendingStripes(warm: string, tint: string) {
  return `linear-gradient(135deg,
    ${warm} 0%, ${warm} 15%, ${tint} 15%, ${tint} 30%,
    ${warm} 30%, ${warm} 45%, ${tint} 45%, ${tint} 60%,
    ${warm} 60%, ${warm} 75%, ${tint} 75%, ${tint} 90%, ${warm} 90%)`
}

const styles = {
  segment: (count: number): ViewStyle => ({ flex: count }),
}

export function UnitGrid({
  position,
}: {
  position: MobileMemberSharePosition
}) {
  const colors = useColors()
  const stripes = pendingStripes(colors.brandWarm, colors.tintWarm)
  const segments = units(position, 0)
  const total = segments.reduce((sum, segment) => sum + segment.count, 0)
  // Use an aggregate meter for policy sizes that would produce a very tall grid.
  const cells =
    total <= 60
      ? segments.flatMap(({ key, count }) =>
          Array.from({ length: count }, () => key)
        )
      : []
  return (
    <>
      {cells.length ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="gap-[6px]"
        >
          {Array.from({ length: Math.ceil(cells.length / 10) }, (_, row) => (
            <View className="flex-row gap-[6px]" key={row}>
              {Array.from({ length: 10 }, (_, column) => {
                const key = cells[row * 10 + column]
                const tile = "aspect-square flex-1 rounded-[7px]"
                if (!key) return <View className={tile} key={column} />
                if (key === "pending") {
                  return (
                    <View
                      key={column}
                      style={{
                        aspectRatio: 1,
                        backgroundColor: colors.brandWarm,
                        borderRadius: 7,
                        experimental_backgroundImage: stripes,
                        flex: 1,
                      }}
                    />
                  )
                }
                return (
                  <View
                    className={cn(
                      tile,
                      key === "available"
                        ? "border-[1.5px] border-foreground/20"
                        : UNIT_COLORS[key]
                    )}
                    key={column}
                  />
                )
              })}
            </View>
          ))}
        </View>
      ) : (
        <UnitMeter segments={segments} />
      )}
      <UnitLegend segments={segments} />
    </>
  )
}

function UnitMeter({ segments }: { segments: ReturnType<typeof units> }) {
  const colors = useColors()
  const stripes = pendingStripes(colors.brandWarm, colors.tintWarm)
  return (
    <View className="h-[10px] flex-row gap-[2px] overflow-hidden rounded-full">
      {segments
        .filter(({ count }) => count > 0)
        .map(({ key, count }) => (
          <View key={key} style={styles.segment(count)}>
            {key === "pending" ? (
              <View
                style={{
                  backgroundColor: colors.brandWarm,
                  experimental_backgroundImage: stripes,
                  flex: 1,
                }}
              />
            ) : (
              <View className={cn("flex-1", UNIT_COLORS[key])} />
            )}
          </View>
        ))}
    </View>
  )
}

export function AfterApproval({
  position,
  requested,
}: {
  position: MobileMemberSharePosition
  requested: number
}) {
  const segments = units(position, requested)
  return (
    <Elevated
      className="gap-[10px] rounded-[20px] bg-card px-[16px] py-[14px]"
      radius={20}
    >
      <View className="flex-row flex-wrap justify-between gap-[8px]">
        <Text className="text-muted-foreground" variant="label">
          After approval
        </Text>
        <Text tabular variant="label">
          {position.totalApprovedUnits + requested} of {position.maximumUnits}{" "}
          units
        </Text>
      </View>
      <UnitMeter segments={segments} />
      <UnitLegend segments={segments} />
    </Elevated>
  )
}
