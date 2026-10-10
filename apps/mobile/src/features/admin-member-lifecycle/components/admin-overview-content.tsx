import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeader } from "@/components/app/screen-header"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import type { MobileAdminOverview } from "../model/admin-member-lifecycle-types"
import type { AdminOverviewPresentation } from "../model/admin-overview-presentation"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function SectionHeading({
  label,
  summary,
}: {
  label: string
  summary?: string
}) {
  const useStackedLayout = useLargeTextLayout()

  return (
    <View
      className={cn(
        "gap-1",
        useStackedLayout
          ? "items-start"
          : "flex-row items-baseline justify-between gap-4"
      )}
    >
      <Text
        accessibilityRole="header"
        className="min-w-0 flex-1 text-xl font-black tracking-tight text-foreground"
      >
        {label}
      </Text>
      {summary ? (
        <Text
          className={cn(
            "text-xs font-bold text-muted-foreground",
            !useStackedLayout && "shrink-0"
          )}
        >
          {summary}
        </Text>
      ) : null}
    </View>
  )
}

function QueueLead({
  item,
}: {
  item: MobileAdminOverview["actionQueue"][number]
}) {
  if (item.key === "finance") {
    return (
      <View className="bg-brand-warm/25 size-10 items-center justify-center rounded-xl">
        <Icon className="text-warn size-base" name="ClipboardCheck" />
      </View>
    )
  }

  if (item.key === "members") {
    return (
      <View className="bg-brand/10 size-10 items-center justify-center rounded-xl">
        <Icon className="text-brand size-base" name="UserRoundPlus" />
      </View>
    )
  }

  if (item.key === "support") {
    return (
      <View className="bg-brand-surface size-10 items-center justify-center rounded-xl">
        <Icon
          className="text-brand-surface-foreground size-base"
          name="Headphones"
        />
      </View>
    )
  }

  return (
    <View className="size-10 items-center justify-center rounded-xl bg-accent">
      <Icon className="size-base text-foreground" name="ClipboardList" />
    </View>
  )
}

function PriorityQueue({
  items,
  total,
}: {
  items: MobileAdminOverview["actionQueue"]
  total: number
}) {
  return (
    <View className="gap-2">
      <SectionHeading
        label="Needs attention"
        summary={total ? `${total} total` : undefined}
      />
      {items.length ? (
        <View className="border-t border-border">
          {items.map((item) => (
            <View
              accessible
              accessibilityLabel={`${item.label}, ${item.count}. ${item.detail}. ${item.severity} priority.`}
              className="min-h-20 flex-row items-center gap-3 border-b border-border py-3"
              key={item.key}
            >
              <QueueLead item={item} />
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-sm font-bold text-foreground">
                  {item.label}
                </Text>
                <Text className="text-xs leading-4 text-muted-foreground">
                  {item.detail}
                </Text>
              </View>
              <Text className="shrink-0 text-xl font-black text-foreground">
                {item.count}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <EmptyState
          className="min-h-24 py-4"
          description="No open decisions."
          icon="ShieldCheck"
          title="Queue clear"
        />
      )}
    </View>
  )
}

function Compliance({
  items,
}: {
  items: MobileAdminOverview["complianceWatch"]
}) {
  return (
    <View className="gap-2">
      <SectionHeading label="Compliance" />
      {items.length ? (
        <View className="flex-row flex-wrap border-y border-border">
          {items.map((item, index) => (
            <View
              accessible
              accessibilityLabel={`${item.label}, ${item.count}`}
              className={cn(
                "min-w-[50%] flex-1 gap-1 py-4",
                index > 0 && "border-l border-border pl-4",
                index === 0 && "pr-4"
              )}
              key={item.key}
            >
              <Text className="text-xl font-black text-foreground">
                {item.count}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="border-y border-border py-4 text-sm text-muted-foreground">
          No open checks.
        </Text>
      )}
    </View>
  )
}

function Warnings({ warnings }: { warnings: MobileAdminOverview["warnings"] }) {
  if (!warnings.length) return null

  return (
    <View className="gap-3">
      {warnings.map((warning) => (
        <View
          className="border-warn border-l-[3px] py-2 pl-3"
          key={warning.key}
        >
          <Text className="text-warn text-sm font-bold">{warning.label}</Text>
        </View>
      ))}
    </View>
  )
}

function RecentActivity({
  items,
}: {
  items: MobileAdminOverview["recentActivity"]
}) {
  return (
    <View className="gap-2">
      <SectionHeading label="Recent activity" />
      {items.length ? (
        <View className="border-t border-border">
          {items.map((item) => (
            <View className="gap-1 border-b border-border py-4" key={item.id}>
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
                  {item.label}
                </Text>
                <Text className="shrink-0 text-[11px] text-muted-foreground">
                  {formatDate(item.occurredAt)}
                </Text>
              </View>
              <Text className="text-xs leading-5 text-muted-foreground">
                {item.detail}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="border-y border-border py-4 text-sm text-muted-foreground">
          No recent activity.
        </Text>
      )}
    </View>
  )
}

export function AdminOverviewHero({
  currencyCode,
  generatedAt,
  initials,
  presentation,
  tenantName,
}: {
  currencyCode: string
  generatedAt: string
  initials: string
  presentation: AdminOverviewPresentation
  tenantName: string
}) {
  const useStackedLayout = useLargeTextLayout()
  const { primaryMetric, schedulePercentage, supportingMetrics } = presentation

  return (
    <View className="bg-brand-surface gap-5 px-5 pt-5 pb-4">
      <ScreenHeader
        action={
          <View
            accessibilityLabel={`${initials} profile`}
            className="bg-brand-warm size-11 items-center justify-center rounded-full"
          >
            <Text className="text-brand-surface text-xs font-black">
              {initials}
            </Text>
          </View>
        }
        description={tenantName}
        title="Overview"
        tone="inverse"
      />

      <View
        accessibilityLabel={`Live position. Updated ${formatDate(generatedAt)}`}
        className="bg-brand-surface-foreground/10 flex-row items-center gap-2 self-start rounded-full px-3 py-2"
      >
        <View className="bg-brand-surface-foreground size-1.5 rounded-full" />
        <Text className="text-brand-surface-foreground text-[11px] font-bold">
          Live position
        </Text>
      </View>

      {primaryMetric ? (
        <View className="gap-2">
          <Text className="text-brand-surface-foreground/75 text-[10px] font-black tracking-[1px] uppercase">
            {primaryMetric.label}
          </Text>
          <Text className="text-brand-surface-foreground text-[38px] leading-[42px] font-black tracking-[-1.5px]">
            {formatMobileMetricValue(primaryMetric, currencyCode)}
          </Text>
          {schedulePercentage !== null ? (
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{
                max: 100,
                min: 0,
                now: schedulePercentage,
              }}
              className="bg-brand-surface-foreground/20 mt-2 h-1.5 overflow-hidden rounded-full"
            >
              <View
                className="bg-brand-warm h-full rounded-full"
                style={{ width: `${schedulePercentage}%` }}
              />
            </View>
          ) : null}
          <Text className="text-brand-surface-foreground/75 text-[11px] font-semibold">
            {primaryMetric.detail}
          </Text>
        </View>
      ) : null}

      {supportingMetrics.length ? (
        <View
          className={cn(
            "border-brand-surface-foreground/15 border-t",
            !useStackedLayout && "flex-row"
          )}
        >
          {supportingMetrics.map((metric, index) => (
            <View
              className={cn(
                "min-w-0 flex-1 gap-1 py-3",
                useStackedLayout &&
                  index > 0 &&
                  "border-brand-surface-foreground/15 border-t",
                !useStackedLayout &&
                  index > 0 &&
                  "border-brand-surface-foreground/15 border-l pl-4",
                !useStackedLayout && index === 0 && "pr-4"
              )}
              key={metric.key}
            >
              <Text className="text-brand-surface-foreground text-lg font-black">
                {formatMobileMetricValue(metric, currencyCode)}
              </Text>
              <Text className="text-brand-surface-foreground/70 text-[11px]">
                {metric.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  )
}

export function AdminOverviewLoadedContent({
  overview,
  presentation,
}: {
  overview: MobileAdminOverview
  presentation: AdminOverviewPresentation
}) {
  return (
    <View className="gap-6 px-5 pt-5 pb-8">
      {overview.cache ? (
        <CachedReadBanner
          action="following up on admin exceptions"
          cache={overview.cache}
          label="admin overview"
        />
      ) : null}
      <PriorityQueue
        items={overview.actionQueue}
        total={presentation.decisionCount}
      />
      <Compliance items={overview.complianceWatch} />
      <Warnings warnings={overview.warnings} />
      <RecentActivity items={overview.recentActivity} />
    </View>
  )
}
