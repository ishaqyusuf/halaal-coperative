import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { DetailSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { View, useWindowDimensions } from "react-native"
import type { OpsDetail } from "../model/service-ops-types"

const dotClass = {
  danger: "bg-destructive",
  muted: "bg-border",
  success: "bg-success",
  warning: "bg-brand-warm",
} as const

function Card({ children, side, title }: { children: ReactNode; side?: string; title: string }) {
  return (
    <Elevated className="gap-[4px] rounded-[20px] bg-card px-[16px] py-[14px]" radius={20}>
      <View className="flex-row items-center justify-between pb-[6px]">
        <Text accessibilityRole="header" variant="section">
          {title}
        </Text>
        {side ? (
          <Text className="text-muted-foreground" variant="caption">
            {side}
          </Text>
        ) : null}
      </View>
      {children}
    </Elevated>
  )
}

/** 02 detail: brand hero card with the lifecycle, details, timeline, schedule. */
export function ServiceOpsDetailBody({
  currencyCode,
  detail,
}: {
  currencyCode: string
  detail: OpsDetail
}) {
  const colors = useColors()
  const money = (value: number) => formatMoney(value, { currencyCode })
  return (
    <View className="gap-[14px]">
      <View
        style={{
          backgroundColor: colors.heroMid,
          borderRadius: 28,
          experimental_backgroundImage: `linear-gradient(165deg, ${colors.heroStart} 0%, ${colors.heroMid} 55%, ${colors.heroEnd} 100%)`,
          gap: 6,
          padding: 18,
        }}
      >
        <Text className="text-hero-foreground/80" numberOfLines={1} variant="small">
          {detail.who}
        </Text>
        <Text accessibilityRole="header" className="text-hero-foreground" variant="title">
          {detail.headline}
        </Text>
        {detail.amount === null ? null : (
          <Text className="text-hero-foreground" variant="hero">
            {money(detail.amount)}
          </Text>
        )}
        {detail.pill || detail.meta ? (
          <View className="flex-row items-center gap-[8px]">
            {detail.pill ? <StatusPill label={detail.pill.label} tone={detail.pill.tone} /> : null}
            {detail.meta ? (
              <Text className="min-w-0 flex-1 text-hero-foreground/80" numberOfLines={1} variant="caption">
                {detail.meta}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View
          accessibilityLabel={`Step ${detail.stepIndex + 1} of ${detail.steps.length}: ${detail.steps[detail.stepIndex] ?? ""}`}
          className="mt-[8px] flex-row items-start"
        >
          {detail.steps.map((step, index) => {
            const done = index < detail.stepIndex
            const now = index === detail.stepIndex
            return (
              <View className="flex-1 items-center gap-[6px]" key={step}>
                <View className="w-full flex-row items-center">
                  <View className={cn("h-[2px] flex-1", index === 0 ? "bg-transparent" : done || now ? "bg-hero-accent" : "bg-hero-foreground/25")} />
                  <View
                    className={cn(
                      "size-[20px] items-center justify-center rounded-full",
                      done ? "bg-hero-accent" : now ? "border-2 border-hero-accent bg-hero-foreground/15" : "bg-hero-foreground/25"
                    )}
                  >
                    {done ? <Icon className="size-[12px] text-hero-mark-foreground" name="Check" /> : null}
                  </View>
                  <View className={cn("h-[2px] flex-1", index === detail.steps.length - 1 ? "bg-transparent" : done ? "bg-hero-accent" : "bg-hero-foreground/25")} />
                </View>
                <Text
                  className={cn("text-center", now ? "text-hero-foreground" : "text-hero-foreground/70")}
                  numberOfLines={1}
                  variant="caption"
                >
                  {step}
                </Text>
              </View>
            )
          })}
        </View>
      </View>
      <Card title="Details">
        {detail.facts.map(([label, value]) => (
          <View className="min-h-[36px] flex-row items-center justify-between gap-[12px]" key={label}>
            <Text className="text-muted-foreground" variant="small">
              {label}
            </Text>
            <Text className="min-w-0 flex-1 text-right font-bold" numberOfLines={2} variant="small">
              {value}
            </Text>
          </View>
        ))}
      </Card>
      {detail.schedule ? (
        <Card side={detail.schedule.side} title={detail.schedule.title}>
          {detail.schedule.rows.map((row, index) => (
            <View className="min-h-[48px] flex-row items-center gap-[12px]" key={`${row.title}-${index}`}>
              <View className={cn("size-[8px] rounded-full", dotClass[row.tone])} />
              <View className="min-w-0 flex-1">
                <Text className="font-bold" variant="small">
                  {row.title}
                </Text>
                <Text className={row.tone === "danger" ? "text-destructive" : "text-muted-foreground"} variant="caption">
                  {row.sub}
                </Text>
              </View>
              <Text tabular variant="label">
                {money(row.amount)}
              </Text>
            </View>
          ))}
        </Card>
      ) : null}
      {detail.timeline.length ? (
        <Card side="Server record" title="Evidence timeline">
          {detail.timeline.map((entry, index) => (
            <View className="flex-row gap-[12px] py-[6px]" key={`${entry.title}-${index}`}>
              <View className="items-center pt-[5px]">
                <View className="size-[8px] rounded-full bg-primary" />
                {index < detail.timeline.length - 1 ? <View className="mt-[4px] w-[2px] flex-1 bg-border" /> : null}
              </View>
              <View className="min-w-0 flex-1 gap-[2px] pb-[4px]">
                <Text className="font-bold" variant="small">
                  {entry.title}
                </Text>
                {entry.note ? (
                  <Text className="text-foreground-soft" variant="small">
                    {entry.note}
                  </Text>
                ) : null}
                <Text className="text-muted-foreground" variant="caption">
                  {entry.meta}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  )
}

export function ServiceOpsDetailSheet({
  action,
  closedNote = "Closed record · no actions",
  currencyCode,
  detail,
  error,
  loading,
  offline,
  onClose,
  onDismissed,
  onRetry,
  retrying,
  title,
  visible,
}: {
  action?: { disabled?: boolean; label: string; onPress: () => void; testID?: string } | null
  closedNote?: string
  currencyCode: string
  detail: OpsDetail | undefined
  error: boolean
  loading: boolean
  offline: boolean
  onClose: () => void
  onDismissed: () => void
  onRetry: () => void
  retrying: boolean
  title: string
  visible: boolean
}) {
  const { height } = useWindowDimensions()
  const footer = !detail ? undefined : action ? (
    <View className="gap-[8px]">
      {offline ? (
        <Text className="text-center text-muted-foreground" variant="small">
          Reconnect to continue
        </Text>
      ) : null}
      <Button disabled={offline || action.disabled} onPress={action.onPress} testID={action.testID}>
        <Text>{action.label}</Text>
      </Button>
    </View>
  ) : (
    <View className="flex-row items-center justify-center gap-[8px] py-[8px]">
      <Icon className="size-[16px] text-muted-foreground" name="ShieldCheck" />
      <Text className="text-muted-foreground" variant="small">
        {closedNote}
      </Text>
    </View>
  )
  return (
    <AppSheet
      footer={footer}
      minimumContentHeight={height}
      onClose={onClose}
      onDismissed={onDismissed}
      title={title}
      visible={visible}
    >
      {loading && !detail ? (
        <DetailSkeleton />
      ) : error && !detail ? (
        <EmptyState
          action={offline ? undefined : { label: "Try again", loading: retrying, onPress: onRetry, variant: "secondary" }}
          description={offline ? "Reconnect to load this record." : "Check your connection, then try again."}
          icon={offline ? "WifiOff" : "CircleAlert"}
          title="Couldn’t load this record"
          tone={offline ? "default" : "error"}
        />
      ) : detail ? (
        <View className="gap-[14px]">
          {offline ? (
            <StatusBanner description="Showing this record as last saved. Actions are paused." kind="offline" title="You’re offline" />
          ) : null}
          <ServiceOpsDetailBody currencyCode={currencyCode} detail={detail} />
        </View>
      ) : null}
    </AppSheet>
  )
}
