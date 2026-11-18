import { AppList } from "@/components/app/app-list"
import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ReviewRow } from "@/components/app/result-screen"
import { Icon } from "@/components/ui/icon"
import {
  Elevated,
  RecordRow,
  type RowPosition,
} from "@/components/ui/list-card"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill, type StatusTone } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { useMemo, useState } from "react"
import { View } from "react-native"
import {
  formatShareDate,
  formatShareUnitCount,
} from "../model/member-shares-presentation"
import type {
  MobileMemberShareApplication,
  MobileMemberShareApplicationCreateInput,
  ShareOverview,
  ShareProfitPeriod,
  ShareTimelineItem,
} from "../model/member-shares-types"
import { ShareRequestAction } from "./share-request-flow"
import { UnitGrid } from "./share-unit-visuals"

type ProfitRead = {
  periods?: ShareProfitPeriod[]
  loading: boolean
  onOpen: () => void
  onClose: () => void
  onRetry: () => void
}

type SharesScreenProps = {
  cachedAt?: string
  currencyCode: string
  loading: boolean
  loadError: boolean
  memberNumber?: string
  offline: boolean
  overview: ShareOverview | null
  stale: boolean
  refresh: () => void
  refreshing: boolean
  timeline: ShareTimelineItem[]
  loadMore: () => void
  loadingMore: boolean
  pageError: boolean
  retryPage: () => void
  profit: ProfitRead
  persistDraft: boolean
  submit: (
    input: MobileMemberShareApplicationCreateInput
  ) => Promise<MobileMemberShareApplication>
}

const REQUEST_STATUS: Record<
  MobileMemberShareApplication["status"],
  {
    icon: string
    ink: string
    label: string
    surface: string
    tone: StatusTone
  }
> = {
  pending: {
    icon: "Clock",
    ink: "text-hero-mark-foreground",
    label: "Pending review",
    surface: "bg-brand-warm",
    tone: "warning",
  },
  approved: {
    icon: "Check",
    ink: "text-brand-surface-foreground",
    label: "Approved",
    surface: "bg-success",
    tone: "success",
  },
  rejected: {
    icon: "X",
    ink: "text-brand-surface-foreground",
    label: "Rejected",
    surface: "bg-destructive",
    tone: "danger",
  },
  cancelled: {
    icon: "Ban",
    ink: "text-brand-surface-foreground",
    label: "Cancelled",
    surface: "bg-muted-foreground/70",
    tone: "neutral",
  },
}

function ShareIcon({
  icon,
  surface,
  ink,
}: {
  icon: string
  surface: string
  ink?: string
}) {
  return (
    <View
      className={cn(
        "size-[30px] items-center justify-center rounded-[8px]",
        surface
      )}
    >
      <Icon className={cn("size-sm", ink)} name={icon} />
    </View>
  )
}

function GroupLabel({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="px-[4px] tracking-wide text-muted-foreground uppercase"
      variant="caption"
    >
      {children}
    </Text>
  )
}

function timelineKey(item: ShareTimelineItem) {
  return item.kind === "request"
    ? `request:${item.application.id}`
    : `ledger:${item.id}`
}

export function SharesScreen({
  cachedAt,
  currencyCode,
  loading,
  loadError,
  memberNumber,
  offline,
  overview,
  stale,
  refresh,
  refreshing,
  timeline,
  loadMore,
  loadingMore,
  pageError,
  retryPage,
  profit,
  persistDraft,
  submit,
}: SharesScreenProps) {
  const [search, setSearch] = useState("")
  const [detail, setDetail] = useState<MobileMemberShareApplication | null>(
    null
  )
  const [showProfit, setShowProfit] = useState(false)
  const money = useMemo(
    () =>
      new Intl.NumberFormat("en-NG", {
        currency: currencyCode,
        currencyDisplay: "narrowSymbol",
        minimumFractionDigits: 0,
        style: "currency",
      }).format,
    [currencyCode]
  )
  const member = overview?.member
  const position = overview?.position
  const hasShares = Boolean(member)
  const showSearch = hasShares && timeline.length > 10
  const searchTerm = showSearch ? search.trim().toLowerCase() : ""
  const items = searchTerm
    ? timeline.filter((item) => {
        const date = formatShareDate(item.occurredAt)
        const values =
          item.kind === "request"
            ? [
                "request",
                formatShareUnitCount(item.application.requestedUnits),
                REQUEST_STATUS[item.application.status].label,
                money(item.application.shareValueSnapshot),
                date,
              ]
            : [item.label, item.source ?? "", money(item.amount), date]
        return values.join(" ").toLowerCase().includes(searchTerm)
      })
    : timeline
  const cachedTime = cachedAt
    ? new Intl.DateTimeFormat("en-NG", {
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(cachedAt))
    : null
  const isUnavailable = overview?.state === "database_unavailable"
  const restricted = !loading && !loadError && !hasShares && !isUnavailable
  const mainError = !hasShares && (loadError || isUnavailable)
  const headerMemberNumber =
    member?.memberNumber ?? (mainError ? memberNumber : undefined)

  function row(item: ShareTimelineItem, rowPosition: RowPosition) {
    if (item.kind === "ledger") {
      return (
        <RecordRow
          compact
          leading={
            <ShareIcon
              ink="text-success-foreground"
              icon="ArrowDownLeft"
              surface="bg-success"
            />
          }
          meta={[formatShareDate(item.occurredAt), item.source]
            .filter(Boolean)
            .join(" · ")}
          position={rowPosition}
          title={item.label}
          trailing={
            <Text
              className={cn(item.amount > 0 && "text-tint-success-foreground")}
              variant="money"
            >
              {item.amount > 0 ? "+" : ""}
              {money(item.amount)}
            </Text>
          }
        />
      )
    }
    const application = item.application
    const status = REQUEST_STATUS[application.status]
    return (
      <RecordRow
        compact
        leading={
          <ShareIcon
            ink={status.ink}
            icon={status.icon}
            surface={status.surface}
          />
        }
        meta={`${formatShareDate(item.occurredAt)} · ${money(application.shareValueSnapshot)}`}
        onPress={() => setDetail(application)}
        position={rowPosition}
        status={status.label}
        statusTone={status.tone}
        title={`Request · ${formatShareUnitCount(application.requestedUnits)}`}
      />
    )
  }

  return (
    <>
      <AppList
        back={false}
        data={hasShares ? items : []}
        empty={
          mainError ? (
            <EmptyState
              action={{ label: "Retry", onPress: refresh, loading: refreshing }}
              description="Check your connection and try again."
              icon="CircleAlert"
              title="Couldn’t load your shares"
              tone="error"
            />
          ) : restricted ? (
            <EmptyState
              action={
                overview?.state === "member_profile_missing"
                  ? { label: "Check again", onPress: refresh }
                  : undefined
              }
              className="mx-[18px] rounded-[20px] bg-card"
              description={
                overview?.state === "member_profile_missing"
                  ? "Your account is not linked to a member profile yet. Your cooperative can link it for you."
                  : "Your share position is unavailable in this session."
              }
              icon={
                overview?.state === "member_profile_missing"
                  ? "Link2Off"
                  : "PieChart"
              }
              title={
                overview?.state === "member_profile_missing"
                  ? "Member profile not linked"
                  : "Shares unavailable"
              }
              tone={
                overview?.state === "member_profile_missing"
                  ? "warning"
                  : "default"
              }
            />
          ) : (
            <EmptyState
              className="mx-[18px] rounded-[20px] bg-card"
              description={
                searchTerm
                  ? "Try a different search."
                  : "Requests and posted ledger movements will appear here."
              }
              icon={searchTerm ? "Search" : "History"}
              title={
                searchTerm
                  ? "No matching share activity"
                  : "No share activity yet"
              }
            />
          )
        }
        header={
          <>
            <View className="flex-row items-end justify-between gap-[12px] pb-[2px]">
              <Text accessibilityRole="header" variant="screenTitle">
                Shares
              </Text>
              {headerMemberNumber ? (
                <Text
                  className="pb-[3px] text-muted-foreground"
                  variant="label"
                >
                  {headerMemberNumber}
                </Text>
              ) : null}
            </View>
            {offline ? (
              <StatusBanner
                description={
                  cachedTime
                    ? `Showing share data saved at ${cachedTime}.`
                    : undefined
                }
                kind="offline"
                title="You’re offline"
              />
            ) : hasShares && (stale || loadError) ? (
              <StatusBanner
                description={
                  cachedTime
                    ? `Showing share data saved at ${cachedTime}.`
                    : undefined
                }
                kind={loadError ? "error" : "stale"}
                onRetry={refresh}
                retrying={refreshing}
                retryLabel={loadError ? "Retry" : "Refresh"}
                title={loadError ? "Couldn’t refresh" : "Showing saved data"}
              />
            ) : null}
            {hasShares && overview ? (
              <>
                <Elevated
                  className="gap-[14px] rounded-[20px] bg-card px-[16px] pt-[18px] pb-[16px]"
                  radius={20}
                >
                  <View className="flex-row flex-wrap items-start justify-between gap-x-[12px]">
                    <View className="min-w-[130px] flex-1">
                      <Text variant="title">
                        {position
                          ? `${position.totalApprovedUnits} of ${position.maximumUnits} units`
                          : "Share capital"}
                      </Text>
                      <Text className="text-muted-foreground" variant="small">
                        {position
                          ? `Approved share capital · ${money(position.unitAmount)} each`
                          : "Ledger balance as of today"}
                      </Text>
                    </View>
                    <Text tabular variant="title">
                      {money(overview.shareBalance)}
                    </Text>
                  </View>
                  {position ? (
                    <>
                      <UnitGrid position={position} />
                      <ShareRequestAction
                        money={money}
                        offline={offline}
                        onViewRequest={setDetail}
                        persistDraft={persistDraft}
                        position={position}
                        refresh={refresh}
                        refreshing={refreshing}
                        stale={stale || loadError}
                        submit={submit}
                      />
                    </>
                  ) : null}
                </Elevated>
                {!position ? (
                  <StatusBanner
                    description="Optional unit share requests are available only when the cooperative selects unit-based shareholding."
                    kind="info"
                    title="Optional share requests are off"
                  />
                ) : null}
                <View className="gap-[6px]">
                  <GroupLabel>Published profit</GroupLabel>
                  <Elevated
                    className="overflow-hidden rounded-[14px] bg-card"
                    radius={14}
                  >
                    <RecordRow
                      compact
                      chevron={overview.profit.count > 0}
                      leading={
                        <ShareIcon
                          icon="Coins"
                          surface={
                            overview.profit.count
                              ? "bg-primary"
                              : "bg-muted-foreground/70"
                          }
                          ink={
                            overview.profit.count
                              ? "text-primary-foreground"
                              : "text-brand-surface-foreground"
                          }
                        />
                      }
                      meta={
                        overview.profit.count
                          ? `${overview.profit.count} ${overview.profit.count === 1 ? "period" : "periods"}${overview.profit.latestUnpaidAmount !== null ? ` · ${money(overview.profit.latestUnpaidAmount)} not paid yet` : ""}`
                          : "Published profit for your shares will appear here."
                      }
                      onPress={
                        overview.profit.count
                          ? () => {
                              profit.onOpen()
                              setShowProfit(true)
                            }
                          : undefined
                      }
                      title={
                        overview.profit.count
                          ? `${money(overview.profit.total)} shared`
                          : "No profit published yet"
                      }
                    />
                  </Elevated>
                </View>
                <View className="-mb-[6px]">
                  <GroupLabel>Activity</GroupLabel>
                </View>
              </>
            ) : null}
          </>
        }
        isFetchingNextPage={loadingMore}
        isLoading={loading}
        keyExtractor={timelineKey}
        listFooter={
          pageError && !offline ? (
            <StatusBanner
              className="mx-[18px]"
              kind="error"
              onRetry={retryPage}
              title="Couldn’t load older activity"
            />
          ) : undefined
        }
        loading={
          <Elevated
            className="gap-[14px] rounded-[20px] bg-card p-[16px]"
            radius={20}
          >
            <Skeleton className="h-[26px] w-1/2" />
            <Skeleton className="h-[58px] w-full" />
            <Skeleton className="h-[52px] w-full" />
          </Elevated>
        }
        onEndReached={searchTerm ? undefined : loadMore}
        onRefresh={refresh}
        refreshing={refreshing}
        renderItem={({ item, position: rowPosition }) => row(item, rowPosition)}
        search={
          showSearch
            ? {
                localSearch: true,
                onChangeText: setSearch,
                placeholder: "Search share activity",
                totalCount: timeline.length,
                value: search,
              }
            : undefined
        }
        testID="member-shares"
      />
      <AppSheet
        onClose={() => setDetail(null)}
        title="Share request"
        visible={Boolean(detail)}
      >
        {detail ? (
          <ShareRequestDetail application={detail} money={money} />
        ) : null}
      </AppSheet>
      <AppSheet
        onClose={() => {
          setShowProfit(false)
          profit.onClose()
        }}
        title="Published profit"
        visible={showProfit}
      >
        {profit.loading ? (
          <Skeleton className="h-[64px] w-full" />
        ) : !profit.periods ? (
          <StatusBanner
            kind={offline ? "offline" : "error"}
            onRetry={offline ? undefined : profit.onRetry}
            title={
              offline
                ? "Connect to view profit periods"
                : "Couldn’t load profit periods"
            }
          />
        ) : profit.periods.length > 0 ? (
          <Elevated className="bg-surface-raised rounded-[14px]" radius={14}>
            {profit.periods.map((period) => (
              <RecordRow
                amount={money(period.amount)}
                avatarIcon="Coins"
                key={period.id}
                meta={
                  period.payout
                    ? `Paid ${formatShareDate(period.payout.paidAt)} ${period.payout.destination}`
                    : `Period ended ${formatShareDate(period.periodEnd)}${period.publishedAt ? ` · Shared ${formatShareDate(period.publishedAt)}` : ""}`
                }
                status={period.payout ? "Paid" : "Not paid yet"}
                statusTone={period.payout ? "success" : "warning"}
                title={period.name}
              />
            ))}
          </Elevated>
        ) : (
          <Text className="text-muted-foreground" variant="small">
            No profit published yet.
          </Text>
        )}
      </AppSheet>
    </>
  )
}

function ShareRequestDetail({
  application,
  money,
}: {
  application: MobileMemberShareApplication
  money: (value: number) => string
}) {
  const status = REQUEST_STATUS[application.status]
  return (
    <View className="gap-[6px]">
      <StatusPill label={status.label} tone={status.tone} />
      <Text className="mb-[8px]" tabular variant="screenTitle">
        {formatShareUnitCount(application.requestedUnits)} ·{" "}
        {money(application.shareValueSnapshot)}
      </Text>
      <View>
        <ReviewRow
          compact
          label="Requested"
          value={formatShareDate(application.createdAt)}
        />
        <View className="h-px bg-border" />
        <ReviewRow
          compact
          label="Per unit"
          tabular
          value={money(application.unitAmountSnapshot)}
        />
        {application.status === "approved" ? (
          <>
            <View className="h-px bg-border" />
            <ReviewRow
              compact
              label="Approved units"
              value={`${application.approvedUnits ?? application.requestedUnits} of ${application.requestedUnits}`}
            />
          </>
        ) : null}
        {application.reviewedAt || application.status === "pending" ? (
          <>
            <View className="h-px bg-border" />
            <ReviewRow
              compact
              label={application.reviewedAt ? "Reviewed" : "Review"}
              value={
                application.reviewedAt
                  ? formatShareDate(application.reviewedAt)
                  : "Waiting for your cooperative"
              }
            />
          </>
        ) : null}
      </View>
      {application.notes ? (
        <View className="bg-surface-raised gap-[2px] rounded-[12px] px-[12px] py-[10px]">
          <Text className="text-muted-foreground" variant="caption">
            Your context
          </Text>
          <Text variant="small">{application.notes}</Text>
        </View>
      ) : null}
      {application.reviewNotes ? (
        <View className="border-brand gap-[2px] border-l-2 pl-[12px]">
          <Text className="text-muted-foreground" variant="caption">
            Review note
          </Text>
          <Text variant="small">{application.reviewNotes}</Text>
        </View>
      ) : null}
    </View>
  )
}
