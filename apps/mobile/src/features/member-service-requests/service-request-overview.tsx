import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import {
  ScreenHeaderButton,
  ScreenShell,
  useScreenBack,
} from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated, type RowPosition } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  SegmentedPager,
  usePagerPosition,
} from "@/components/ui/segmented-pager"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import type { StatusTone } from "@/components/ui/status-pill"
import { useState } from "react"
import { View } from "react-native"
import Svg, { Circle } from "react-native-svg"
import {
  formatServiceDate,
  formatServiceMoney,
  type RequestFilter,
  type ServiceDesign,
  type ServiceRequest,
  type ServiceWorkspace,
} from "./service-request-model"
import {
  requestLoadErrorGate,
  type PayLink,
  type RequestGate,
} from "./service-request-gate"
import { PayButton, RequestGateCard } from "./service-request-pay"
import {
  isPaymentOverdue,
  nextRequestPayment,
  repaymentProgress,
  requestBadge,
  ServiceTile,
} from "./service-request-presentation"

const lanes: RequestFilter[] = ["all", "active", "pending", "closed"]

export type RequestLane = {
  rows: ServiceRequest[]
  isLoading: boolean
  isPaging: boolean
  error: string | null
  more?: () => void
  retry?: () => void
}

export type ServiceNotice = {
  title: string
  description?: string
  icon: string
  tone: Extract<StatusTone, "warning" | "info" | "danger" | "neutral">
  action?: { label: string; onPress: () => void }
}

const noticeStyles = {
  warning: ["bg-tint-warm", "text-tint-warm-foreground"],
  info: ["bg-tint-sky", "text-tint-sky-foreground"],
  danger: ["bg-tint-danger", "text-tint-danger-foreground"],
  neutral: ["bg-surface-raised", "text-foreground-soft"],
}

export function RequestNotice({ notice }: { notice: ServiceNotice }) {
  const [background, ink] = noticeStyles[notice.tone]
  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn(
        "flex-row items-start gap-[12px] rounded-[20px] px-[14px] py-[14px]",
        background
      )}
    >
      <View className="size-[40px] items-center justify-center rounded-[12px] bg-card/65">
        <Icon className={cn("size-[20px]", ink)} name={notice.icon} />
      </View>
      <View className="min-w-0 flex-1 gap-[4px]">
        <Text variant="section">{notice.title}</Text>
        {notice.description ? (
          <Text className="text-foreground-soft" variant="small">
            {notice.description}
          </Text>
        ) : null}
        {notice.action ? (
          <Pressable
            accessibilityRole="button"
            className="min-h-[44px] justify-center self-start"
            onPress={notice.action.onPress}
          >
            <Text className="text-primary" variant="label">
              {notice.action.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function BalanceRing({ percent }: { percent: number }) {
  const colors = useColors()
  const radius = 28.5
  const circumference = 2 * Math.PI * radius
  return (
    <View
      accessibilityLabel={`${percent}% repaid`}
      className="size-[64px] shrink-0 items-center justify-center"
    >
      <Svg height={64} style={{ position: "absolute" }} width={64}>
        <Circle
          cx={32}
          cy={32}
          fill="none"
          r={radius}
          stroke={colors.surfaceRaised}
          strokeWidth={7}
        />
        {percent > 0 ? (
          <Circle
            cx={32}
            cy={32}
            fill="none"
            r={radius}
            rotation={-90}
            origin="32, 32"
            stroke={colors.brand}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - percent / 100)}
            strokeWidth={7}
          />
        ) : null}
      </Svg>
      <Text tabular variant="caption">
        {percent}%
      </Text>
    </View>
  )
}

function OverviewBalance({
  active,
  currency,
  design,
  onOpen,
  payLink,
}: {
  active?: ServiceRequest
  currency: string
  design: ServiceDesign
  onOpen: (row: ServiceRequest) => void
  payLink: PayLink | null
}) {
  if (!active) {
    return (
      <Elevated
        className="flex-row items-center gap-[12px] rounded-[20px] border border-transparent bg-card p-[16px] dark:border-border"
        radius={20}
      >
        <ServiceTile design={design} />
        <View className="min-w-0 flex-1 gap-[2px]">
          <Text variant="section">No active {design.noun}</Text>
          <Text className="text-muted-foreground" variant="small">
            Start one and track its review and payments here.
          </Text>
        </View>
      </Elevated>
    )
  }
  const next = nextRequestPayment(active)
  const overdue = isPaymentOverdue(next)
  const checking = active.checkingAmount ?? 0
  return (
    <Elevated
      className={cn(
        "rounded-[20px] border bg-card",
        overdue && payLink
          ? "border-destructive"
          : "border-transparent dark:border-border"
      )}
      radius={20}
    >
      <Pressable
        accessibilityRole="button"
        className="gap-[12px] p-[16px]"
        onPress={() => onOpen(active)}
        testID="service-active-summary"
      >
        <View className="flex-row items-center justify-between gap-[12px]">
          <View className="min-w-0 flex-1 gap-[2px]">
            <Text className="text-muted-foreground" variant="label">
              {active.outstanding === null ? "Active request" : "Outstanding"}
            </Text>
            <Text className="text-[30px] leading-[36px]" variant="hero">
              {formatServiceMoney(
                active.outstanding ?? active.amount,
                currency
              )}
            </Text>
            <Text className="text-foreground-soft" variant="small">
              {active.title}
            </Text>
          </View>
          {active.outstanding !== null ? (
            <BalanceRing percent={repaymentProgress(active)} />
          ) : null}
        </View>
        {next || active.monthly ? (
          <View className="flex-row flex-wrap items-center justify-between gap-[6px] border-t border-border pt-[12px]">
            <View className="min-w-0 flex-1 gap-[2px]">
              <Text variant="money">
                {payLink ? (next ? "Next: " : "Left: ") : ""}
                {formatServiceMoney(
                  next
                    ? next.amount - next.paid
                    : payLink
                      ? (active.outstanding ?? 0)
                      : (active.monthly ?? 0),
                  currency
                )}
              </Text>
              <View className="flex-row items-center gap-[6px]">
                <Icon
                  className={cn(
                    "size-[14px]",
                    overdue
                      ? "text-tint-danger-foreground"
                      : "text-muted-foreground"
                  )}
                  name="CalendarDays"
                />
                <Text
                  className={
                    overdue
                      ? "text-tint-danger-foreground"
                      : "text-foreground-soft"
                  }
                  variant="caption"
                >
                  {next
                    ? `${overdue ? "Overdue since" : "Due"} ${formatServiceDate(next.date)}`
                    : payLink
                      ? `${formatServiceMoney(active.monthly ?? 0, currency)} a month`
                      : "Monthly payback"}
                </Text>
              </View>
            </View>
            {payLink && checking > 0 ? (
              <View
                className="bg-tint-warm min-h-[36px] flex-row items-center gap-[6px] rounded-full px-[12px]"
                testID="overview-checking"
              >
                <Icon
                  className="text-tint-warm-foreground size-[14px]"
                  name="Clock"
                />
                <Text className="text-tint-warm-foreground" variant="caption">
                  {formatServiceMoney(checking, currency)} being checked
                </Text>
              </View>
            ) : payLink ? (
              <PayButton label="Pay now" link={payLink} testID="overview-pay" />
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </Elevated>
  )
}

function OverviewRow({
  currency,
  design,
  onOpen,
  position,
  row,
}: {
  currency: string
  design: ServiceDesign
  onOpen: (row: ServiceRequest) => void
  position: RowPosition
  row: ServiceRequest
}) {
  const badge = requestBadge(row.status, design)
  return (
    <View
      className={cn(
        "mx-[18px] overflow-hidden bg-card dark:border-x dark:border-border",
        (position === "first" || position === "only") &&
          "rounded-t-[18px] dark:border-t",
        (position === "last" || position === "only") &&
          "rounded-b-[18px] dark:border-b"
      )}
    >
      {position !== "only" && position !== "first" ? (
        <View className="ml-[16px] h-px bg-border" />
      ) : null}
      <Pressable
        accessibilityRole="button"
        className="active:bg-surface-raised min-h-[64px] flex-row items-center gap-[12px] px-[16px] py-[10px]"
        onPress={() => onOpen(row)}
      >
        <View className="min-w-0 flex-1 gap-[2px]">
          <Text className="font-bold" numberOfLines={1} variant="body">
            {row.title}
          </Text>
          <Text
            className="text-muted-foreground"
            numberOfLines={1}
            variant="small"
          >
            {[row.subtitle, formatServiceDate(row.date)]
              .filter(Boolean)
              .join(" · ")}
          </Text>
        </View>
        <View className="max-w-[48%] items-end gap-[3px]">
          <Text variant="money">
            {formatServiceMoney(row.amount, currency)}
          </Text>
          <View className="flex-row items-center gap-[6px]">
            <View className={cn("size-[8px] rounded-full", badge.dot)} />
            <Text
              className={cn("shrink text-right", badge.ink)}
              variant="caption"
            >
              {row.status === "active" && row.outstanding === null
                ? "Active"
                : badge.label}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  )
}

export function ServiceRequestOverview({
  active,
  canStart,
  currency,
  design,
  draft,
  error,
  filter,
  gate,
  getLane,
  loading,
  notice,
  onFilter,
  onGateAction,
  onOpen,
  onRefresh,
  onSearch,
  onStart,
  payLink,
  refreshing,
  search,
  workspace,
}: {
  active?: ServiceRequest
  canStart: boolean
  currency: string
  design: ServiceDesign
  draft: string | null
  error: string | null
  filter: RequestFilter
  gate: RequestGate | null
  getLane: (lane: RequestFilter) => RequestLane
  loading: boolean
  notice?: ServiceNotice
  onFilter: (value: RequestFilter) => void
  onGateAction: () => void
  onOpen: (row: ServiceRequest) => void
  onRefresh: () => void
  onSearch: (value: string) => void
  onStart: () => void
  payLink: PayLink | null
  refreshing: boolean
  search: string
  workspace?: ServiceWorkspace
}) {
  const [showSearch, setShowSearch] = useState(false)
  const back = useScreenBack(true)
  const index = lanes.indexOf(filter)
  const position = usePagerPosition(index)
  const total = workspace?.totalCount ?? 0
  const searchable = total > 10
  const newLabel = draft ? `Continue ${design.noun}` : design.newLabel
  const tabs = [
    { label: "All", value: "all", count: workspace?.totalCount },
    {
      label: design.activeLabel,
      value: "active",
      count: workspace?.activeCount,
    },
    { label: "Pending", value: "pending", count: workspace?.pendingCount },
    { label: "Closed", value: "closed" },
  ] satisfies { label: string; value: RequestFilter; count?: number }[]

  if (!workspace && error) {
    return (
      <ScreenShell back title={design.title}>
        <RequestGateCard
          gate={gate ?? requestLoadErrorGate(design)}
          onAction={onRefresh}
        />
      </ScreenShell>
    )
  }
  const gated = Boolean(gate && !loading)
  const quiet = gated && !total
  const header = (
    <>
      {!loading && (active || !gated) ? (
        <OverviewBalance
          active={active}
          currency={currency}
          design={design}
          onOpen={onOpen}
          payLink={payLink}
        />
      ) : null}
      {notice ? <RequestNotice notice={notice} /> : null}
      {gate && gated ? (
        <RequestGateCard gate={gate} onAction={onGateAction} />
      ) : null}
      {draft && canStart ? (
        <Pressable
          accessibilityRole="button"
          className="min-h-[56px] flex-row items-center gap-[12px] rounded-[18px] border border-dashed border-primary/50 bg-accent px-[14px] py-[10px]"
          onPress={onStart}
        >
          <Icon className="size-[18px] text-accent-foreground" name="Pencil" />
          <View className="flex-1">
            <Text className="text-accent-foreground" variant="label">
              Continue your draft
            </Text>
            <Text
              className="text-foreground-soft"
              numberOfLines={1}
              variant="caption"
            >
              {draft} · saved on this phone
            </Text>
          </View>
          <Icon
            className="size-[18px] text-accent-foreground"
            name="ChevronRight"
          />
        </Pressable>
      ) : null}
      {!searchable && !loading && !draft && canStart ? (
        <Button onPress={onStart} variant="secondary">
          <Icon className="size-[20px] text-accent-foreground" name="Plus" />
          <Text>{newLabel}</Text>
        </Button>
      ) : null}
      {quiet ? (
        <Text className="mt-[6px]" variant="section">
          Your {design.noun}s
        </Text>
      ) : null}
      {!loading && !quiet ? (
        <SegmentedControl
          accessibilityLabel={`${design.title} request status`}
          onChange={onFilter}
          options={tabs}
          position={position}
          value={filter}
          variant="pills"
        />
      ) : null}
    </>
  )

  return (
    <SegmentedPager
      disabled={!workspace || loading}
      fill
      index={index}
      onIndexChange={(next) => onFilter(lanes[next] ?? "all")}
      pages={lanes.map(
        (lane) =>
          function ServiceLanePage() {
            const page = getLane(lane)
            return (
              <AppList
                active={lane === filter}
                back
                bottomAction={
                  searchable && canStart ? (
                    <Button
                      accessibilityLabel={newLabel}
                      className="size-[52px] rounded-full"
                      onPress={onStart}
                      size="icon"
                    >
                      <Icon
                        className="size-[24px] text-primary-foreground"
                        name="Plus"
                      />
                    </Button>
                  ) : undefined
                }
                compactHeader={
                  <View className="min-h-[48px] flex-row items-center border-b border-border bg-background px-[10px]">
                    <ScreenHeaderButton
                      accessibilityLabel="Go back"
                      icon="ChevronLeft"
                      onPress={back ?? (() => undefined)}
                    />
                    <Text className="flex-1 text-center" variant="section">
                      {design.title}
                    </Text>
                    <View className="w-[44px]" />
                  </View>
                }
                data={page.rows}
                empty={
                  quiet ? (
                    <View className="mx-[18px] rounded-[18px] bg-card p-[18px] dark:border dark:border-border">
                      <Text
                        className="text-center text-muted-foreground"
                        variant="small"
                      >
                        {design.noun === "application"
                          ? "Applications you make show here with their payments."
                          : "Requests you make show here with their instalments."}
                      </Text>
                    </View>
                  ) : (
                    <EmptyState
                      description={
                        search
                          ? `No ${design.noun}s match “${search}”.`
                          : lane === "all"
                            ? `Your ${design.title.toLowerCase()} ${design.noun}s and their status will appear here.`
                            : `No ${design.noun}s with this status.`
                      }
                      icon={design.icon}
                      title={
                        search
                          ? "No matches"
                          : lane === "all"
                            ? `No ${design.noun}s yet`
                            : "Nothing here"
                      }
                    />
                  )
                }
                error={page.error ?? error}
                estimatedItemSize={65}
                header={header}
                isFetchingNextPage={page.isPaging}
                isLoading={loading || page.isLoading}
                keyExtractor={(row) => row.id}
                onEndReached={lane === filter ? page.more : undefined}
                onRefresh={onRefresh}
                onRetry={page.retry ?? onRefresh}
                refreshing={refreshing}
                renderItem={({ item, position: rowPosition }) => (
                  <OverviewRow
                    currency={currency}
                    design={design}
                    onOpen={onOpen}
                    position={rowPosition}
                    row={item}
                  />
                )}
                search={
                  searchable
                    ? {
                        autoFocus: showSearch,
                        onChangeText: onSearch,
                        onFocusChange: setShowSearch,
                        placeholder: `Search ${design.noun}s`,
                        totalCount: total,
                        value: search,
                      }
                    : undefined
                }
                testID={lane === filter ? "service-overview" : undefined}
                title={design.title}
              />
            )
          }
      )}
      position={position}
    />
  )
}
