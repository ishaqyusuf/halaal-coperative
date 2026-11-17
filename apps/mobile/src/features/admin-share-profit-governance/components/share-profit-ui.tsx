import { DockedFooter } from "@/components/app/docked-footer"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import type { ReactNode } from "react"
import { RefreshControl, ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

/** 03 Lifecycle ledger: back + centred compact title, fixed above the scroll. */
export function LedgerNav({
  onBack,
  title,
}: {
  onBack?: () => void
  title: string
}) {
  const router = useRouter()
  const { top } = useSafeAreaInsets()
  return (
    <View className="bg-background">
      <View style={{ height: top }} />
      <View className="h-[52px] flex-row items-center px-[12px]">
        <ScreenHeaderButton
          accessibilityLabel="Back"
          icon="ChevronLeft"
          onPress={
            onBack ??
            (() =>
              router.canGoBack()
                ? router.back()
                : router.replace("/(admin)/(tabs)/finance"))
          }
        />
        <Text
          accessibilityRole="header"
          className="flex-1 text-center"
          numberOfLines={1}
          variant="section"
        >
          {title}
        </Text>
        <View className="size-[44px]" />
      </View>
    </View>
  )
}

/** A pushed record page: fixed nav, own scroll with pull-to-refresh, docked action. */
export function LedgerDetail({
  children,
  footer,
  onRefresh,
  refreshing,
  testID,
  title,
}: {
  children: ReactNode
  footer?: ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  testID?: string
  title: string
}) {
  const colors = useColors()
  return (
    <View className="flex-1 bg-background" testID={testID}>
      <ScreenStatusBar />
      <LedgerNav title={title} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              colors={[colors.primary]}
              onRefresh={onRefresh}
              refreshing={Boolean(refreshing)}
              tintColor={colors.mutedForeground}
            />
          ) : undefined
        }
      >
        <View className="gap-[14px] px-[18px] pt-[6px]">{children}</View>
      </ScrollView>
      {footer ? <DockedFooter>{footer}</DockedFooter> : null}
    </View>
  )
}

/** Draft → Reviewed → Approved → Published (or a share request's own steps). */
export function LifecycleStepper({
  labels,
  stage,
}: {
  labels: readonly string[]
  stage: number
}) {
  return (
    <View
      accessibilityLabel={`Lifecycle: ${stage >= labels.length ? `${labels.at(-1)}, complete` : labels[stage]}`}
      accessibilityRole="progressbar"
      className="flex-row items-start"
    >
      {labels.map((label, index) => {
        const done = index < stage
        const current = index === stage
        return (
          <View className="flex-1 items-center gap-[4px]" key={label}>
            <View className="w-full flex-row items-center">
              <View
                className={cn(
                  "h-[2px] flex-1",
                  index === 0 ? "bg-transparent" : index <= stage ? "bg-primary" : "bg-border"
                )}
              />
              <View
                className={cn(
                  "size-[18px] items-center justify-center rounded-full border-2",
                  done
                    ? "border-primary bg-primary"
                    : current
                      ? "border-primary bg-card"
                      : "border-border bg-card"
                )}
              >
                {done ? (
                  <Icon className="size-[10px] text-primary-foreground" name="Check" />
                ) : null}
              </View>
              <View
                className={cn(
                  "h-[2px] flex-1",
                  index === labels.length - 1
                    ? "bg-transparent"
                    : index < stage
                      ? "bg-primary"
                      : "bg-border"
                )}
              />
            </View>
            <Text
              className={cn(
                "text-center",
                current ? "text-foreground" : "text-muted-foreground"
              )}
              numberOfLines={1}
              variant="caption"
            >
              {label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

/** Three header numbers in one strip card. */
export function StatStrip({
  stats,
}: {
  stats: readonly { label: string; tone?: "warning" | "brand"; value: string }[]
}) {
  return (
    <Elevated className="flex-row rounded-[18px] bg-card px-[6px] py-[12px]" radius={18}>
      {stats.map((stat, index) => (
        <View
          className={cn("min-w-0 flex-1 items-center px-[6px]", index > 0 && "border-l border-border")}
          key={stat.label}
        >
          <Text
            adjustsFontSizeToFit
            className={cn(
              stat.tone === "warning" && "text-tint-warm-foreground",
              stat.tone === "brand" && "text-primary"
            )}
            numberOfLines={1}
            variant="money"
          >
            {stat.value}
          </Text>
          <Text className="text-muted-foreground" numberOfLines={1} variant="caption">
            {stat.label}
          </Text>
        </View>
      ))}
    </Elevated>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Elevated className={cn("gap-[10px] rounded-[20px] bg-card p-[16px]", className)} radius={20}>
      {children}
    </Elevated>
  )
}

/** Label left, value right; totals bold, deductions muted. */
export function KV({
  label,
  tone,
  value,
}: {
  label: string
  tone?: "negative" | "total"
  value: string
}) {
  return (
    <View
      className={cn(
        "flex-row items-center justify-between gap-[12px]",
        tone === "total" && "border-t border-border pt-[10px]"
      )}
    >
      <Text
        className={cn("flex-1", tone === "total" ? "text-foreground" : "text-muted-foreground")}
        variant={tone === "total" ? "label" : "small"}
      >
        {label}
      </Text>
      <Text
        className={tone === "negative" ? "text-muted-foreground" : undefined}
        variant={tone === "total" ? "money" : "label"}
      >
        {value}
      </Text>
    </View>
  )
}
