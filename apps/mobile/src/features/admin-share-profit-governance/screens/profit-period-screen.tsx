import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { ListCard } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SectionHeader } from "@/components/ui/section-header"
import { DetailSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { formatMoney } from "@/lib/money"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import {
  getProfitPeriodDetail,
  getShareProfitSummary,
} from "../api/admin-share-profit-governance-api"
import { ApproveEntrySheet, PublishProfitSheet } from "../components/share-profit-flows"
import { Card, KV, LedgerDetail, LifecycleStepper } from "../components/share-profit-ui"
import type { ProfitPeriodDetail } from "../model/admin-share-profit-governance-types"
import {
  LIFECYCLE,
  entryStage,
  shareProfitStatus,
} from "../model/share-profit-presentation"
import {
  shareProfitKeys,
  usePullRefresh,
  useRefreshShareProfit,
} from "../model/share-profit-queries"

type Entry = ProfitPeriodDetail["profitEntries"][number]

function day(iso: string, year = true) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC", ...(year ? { year: "numeric" } : {}) })
}

function EntryState({ entry }: { entry: Entry }) {
  if (entry.status === "reviewed" && !entry.allocationsReconcile)
    return <StatusPill label="Doesn’t reconcile" tone="danger" />
  const status = shareProfitStatus(entry.status)
  return <StatusPill label={status.label} tone={status.tone} />
}

/**
 * T22 screens 4 and 5 (03 Lifecycle ledger): a profit period with its result
 * and business entries, or one entry with its allocations and next step.
 * Both read the same cached period detail.
 */
export function ProfitPeriodScreen({ entryId, periodId }: { entryId: string | null; periodId: string }) {
  const router = useRouter()
  const { profile } = useAuthContext()
  const online = useIsOnline()
  const refresh = useRefreshShareProfit()
  const enabled = canUseMobileFeatureData(profile, "admin")
  const keys = shareProfitKeys()
  const [flow, setFlow] = useState<"approve" | "publish" | null>(null)
  const summary = useAppQuery({ enabled, networkMode: "always", queryFn: getShareProfitSummary, queryKey: keys.summary })
  const query = useAppQuery({
    enabled,
    networkMode: "always",
    queryFn: () => getProfitPeriodDetail(periodId),
    queryKey: keys.period(periodId),
  })
  const pull = usePullRefresh(() => query.refetch())
  const detail = query.data
  const currencyCode = summary.data?.currencyCode ?? "NGN"
  const money = (value: number) => formatMoney(value, { currencyCode })
  const offline = !online
  const blocked = offline || isMobileReadCacheStale(detail?.cache)
  const entry = entryId ? detail?.profitEntries.find((item) => item.id === entryId) : undefined
  const title = entryId ? (entry?.businessName ?? "Profit entry") : (detail?.period.name ?? "Profit period")

  if (!detail || (entryId && !entry)) {
    return (
      <LedgerDetail onRefresh={enabled ? pull.onRefresh : undefined} refreshing={pull.refreshing} title={title}>
        {query.isError || (detail && entryId && !entry) ? (
          <EmptyState
            action={{ label: "Try again", onPress: () => void query.refetch() }}
            description="Nothing was changed. Try again when you’re online."
            icon="CircleAlert"
            title="Couldn’t load this record"
            tone="error"
          />
        ) : (
          <DetailSkeleton rows={5} />
        )}
      </LedgerDetail>
    )
  }

  const period = detail.period
  const done = () => {
    void refresh({ book: "profit", periodId })
  }

  if (entry) {
    const stage = entryStage(entry.status)
    const canApprove = entry.allowedActions.includes("approve")
    const canPublish = entry.allowedActions.includes("publish")
    const viewOnly =
      (entry.status === "reviewed" && summary.data && !summary.data.capabilities.approveProfit) ||
      (entry.status === "approved" && summary.data && !summary.data.capabilities.publishProfit)
    return (
      <>
        <LedgerDetail
          footer={
            canApprove ? (
              <Button disabled={blocked} onPress={() => setFlow("approve")} testID="profit-entry-approve">
                <Icon className="size-[18px] text-primary-foreground" name="Check" />
                <Text>Approve entry</Text>
              </Button>
            ) : canPublish ? (
              <Button disabled={blocked} onPress={() => setFlow("publish")} testID="profit-entry-publish">
                <Icon className="size-[18px] text-primary-foreground" name="Send" />
                <Text>Review publication</Text>
              </Button>
            ) : undefined
          }
          onRefresh={online ? pull.onRefresh : undefined}
          refreshing={pull.refreshing}
          testID="profit-entry-screen"
          title={entry.businessName}
        >
          <Card>
            <View className="flex-row items-center gap-[10px]">
              <View className="min-w-0 flex-1">
                <Text className="font-bold" numberOfLines={1} variant="body">
                  {entry.businessName}
                </Text>
                <Text className="text-muted-foreground" variant="small">
                  {period.name} · {day(entry.profitDate)}
                </Text>
              </View>
              <EntryState entry={entry} />
            </View>
            <View>
              <Text variant="hero">{money(entry.allocatableProfit)}</Text>
              <Text className="text-muted-foreground" variant="small">
                Distributable to {entry.allocationCount} members
              </Text>
            </View>
            <LifecycleStepper labels={LIFECYCLE} stage={stage} />
          </Card>
          {entry.blocker ? (
            <StatusBanner
              description={entry.blocker.replace(/web\s+dashboard/gi, "web")}
              kind="error"
              title="Can’t approve yet"
            />
          ) : null}
          {viewOnly ? (
            <StatusBanner description="Your role can view profit entries but not decide them." kind="info" title="View only" />
          ) : null}
          <SectionHeader title="Profit" />
          <Card>
            <KV label="Gross profit" value={money(entry.profitAmount)} />
            {entry.expenseLines.length ? (
              entry.expenseLines.map((line) => (
                <KV key={line.id} label={line.reason} tone="negative" value={`−${money(line.amount)}`} />
              ))
            ) : (
              <KV label="Expenses" tone="negative" value={`−${money(entry.expenseAmount)}`} />
            )}
            <KV label="Distributable" tone="total" value={money(entry.allocatableProfit)} />
          </Card>
          <SectionHeader
            title="Member allocations"
            value={entry.allocationsReconcile ? "Reconciles" : "Doesn’t reconcile"}
          />
          {entry.allocations.length ? (
            <ListCard inset={false}>
              {[
                ...entry.allocations.slice(0, 5).map((allocation) => (
                  <View className="min-h-[56px] flex-row items-center gap-[10px] px-[14px] py-[10px]" key={allocation.id}>
                    <View className="min-w-0 flex-1">
                      <Text className="font-bold" numberOfLines={1} variant="body">
                        {allocation.member.fullName}
                      </Text>
                      <Text className="text-muted-foreground" variant="small">
                        {(allocation.sharePercentage * 100).toFixed(2)}% · {money(allocation.memberShareBalance)} shares
                      </Text>
                    </View>
                    <Text variant="money">{money(allocation.allocatedProfitAmount)}</Text>
                  </View>
                )),
                ...(entry.allocationCount > 5
                  ? [
                      <View className="px-[14px] py-[12px]" key="more">
                        <Text className="text-muted-foreground" variant="small">
                          + {entry.allocationCount - 5} more members
                        </Text>
                      </View>,
                    ]
                  : []),
              ]}
            </ListCard>
          ) : (
            <EmptyState description="Work out shares on the web first." icon="Users" title="No allocations yet" />
          )}
        </LedgerDetail>
        {flow === "approve" ? (
          <ApproveEntrySheet
            blocked={blocked}
            currencyCode={currencyCode}
            entry={entry}
            onClose={() => setFlow(null)}
            onDone={done}
            periodName={period.name}
          />
        ) : null}
        {flow === "publish" ? (
          <PublishProfitSheet
            blocked={blocked}
            currencyCode={currencyCode}
            entry={entry}
            onClose={() => setFlow(null)}
            onDone={done}
            periodName={period.name}
          />
        ) : null}
      </>
    )
  }

  const published = period.status === "published"
  const unreconciled = detail.profitEntries.some((item) => item.status === "reviewed" && !item.allocationsReconcile)
  const status = shareProfitStatus(period.status)
  return (
    <LedgerDetail
      onRefresh={online ? pull.onRefresh : undefined}
      refreshing={pull.refreshing}
      testID="profit-period-screen"
      title={period.name}
    >
      <Card>
        <View className="flex-row items-center gap-[10px]">
          <View className="min-w-0 flex-1">
            <Text className="font-bold" numberOfLines={1} variant="body">
              {period.name}
            </Text>
            <Text className="text-muted-foreground" variant="small">
              {day(period.periodStart, false)} – {day(period.periodEnd)}
            </Text>
          </View>
          <StatusPill label={status.label} tone={status.tone} />
        </View>
        <View>
          <Text variant="hero">{money(period.distributableAmount)}</Text>
          <Text className="text-muted-foreground" variant="small">
            Distributable to members{published && period.publishedAt ? ` · published ${day(period.publishedAt)}` : ""}
          </Text>
        </View>
      </Card>
      {unreconciled ? (
        <StatusBanner
          description="Fix the allocations on the web before publishing."
          kind="error"
          title="One entry doesn’t reconcile"
        />
      ) : null}
      <SectionHeader title="Period result" />
      <Card>
        <KV label="Gross profit" value={money(period.grossProfitAmount)} />
        <KV label="Entry expenses" tone="negative" value={`−${money(period.entryExpenseAmount)}`} />
        <KV
          label={period.deductionAmount ? `Deduction${period.deductionReason ? ` · ${period.deductionReason}` : ""}` : "Period deduction"}
          tone="negative"
          value={period.deductionAmount ? `−${money(period.deductionAmount)}` : money(0)}
        />
        <KV label="Distributable to members" tone="total" value={money(period.distributableAmount)} />
      </Card>
      {detail.profitEntries.length ? (
        <>
          <SectionHeader
            title="Business entries"
            value={`${detail.profitEntries.length} ${detail.profitEntries.length === 1 ? "entry" : "entries"}`}
          />
          {detail.profitEntries.map((item) => (
            <Pressable
              accessibilityLabel={`${item.businessName}, ${money(item.allocatableProfit)}`}
              accessibilityRole="button"
              key={item.id}
              onPress={() =>
                router.push({
                  pathname: "/(admin)/share-profit-governance",
                  params: { entryId: item.id, periodId },
                })
              }
            >
              <Card>
                <View className="flex-row items-start gap-[10px]">
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold" numberOfLines={1} variant="body">
                      {item.businessName}
                    </Text>
                    <Text className="text-muted-foreground" variant="small">
                      {item.allocationCount} members · {day(item.profitDate, false)}
                    </Text>
                  </View>
                  <Text variant="money">{money(item.allocatableProfit)}</Text>
                  <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
                </View>
                <LifecycleStepper labels={LIFECYCLE} stage={entryStage(item.status)} />
                {item.status === "reviewed" && !item.allocationsReconcile ? (
                  <View className="flex-row">
                    <EntryState entry={item} />
                  </View>
                ) : null}
              </Card>
            </Pressable>
          ))}
        </>
      ) : null}
      {published && detail.periodAllocations.length ? (
        <>
          <SectionHeader title="Published to members" value={`${period.allocationCount || detail.periodAllocations.length} members`} />
          <ListCard inset={false}>
            {detail.periodAllocations.slice(0, 5).map((allocation) => (
              <View className="min-h-[56px] flex-row items-center gap-[10px] px-[14px] py-[10px]" key={allocation.id}>
                <View className="min-w-0 flex-1">
                  <Text className="font-bold" numberOfLines={1} variant="body">
                    {allocation.member.fullName}
                  </Text>
                  <Text className="text-muted-foreground" variant="small">
                    {allocation.member.memberNumber}
                  </Text>
                </View>
                <Text variant="money">{money(allocation.allocationAmount)}</Text>
              </View>
            ))}
          </ListCard>
        </>
      ) : null}
    </LedgerDetail>
  )
}
