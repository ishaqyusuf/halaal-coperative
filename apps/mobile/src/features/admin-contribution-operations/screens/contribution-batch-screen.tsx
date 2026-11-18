import { EmptyState } from "@/components/app/empty-state"
import { ScreenShell } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated, ListCard, RecordRow } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SectionHeader } from "@/components/ui/section-header"
import { DetailSkeleton, ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { View } from "react-native"
import {
  getContributionBatch,
  getContributionSummary,
  postContributionBatchRows,
} from "../api/admin-contribution-operations-api"
import { ContributionRowSheet } from "../components/contribution-row-sheet"
import {
  ContributionResultSheet,
  ContributionReviewSheet,
  useContributionReview,
} from "../components/contribution-review-sheet"
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
} from "../lib/admin-contribution-presentation"
import type { CollectionBatchRow } from "../model/admin-contribution-operations-types"
import { contributionStatus } from "../model/contribution-forms"
import {
  contributionKeys,
  usePullRefresh,
  useRefreshContributions,
} from "../model/contribution-queries"

function StatTile({
  label,
  value,
  warn = false,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <View className="min-w-0 flex-1">
      <Elevated
        className={cn(
          "rounded-[18px] px-[12px] py-[11px]",
          warn ? "bg-tint-warm" : "bg-card"
        )}
        radius={18}
      >
        <Text
          className={warn ? "text-tint-warm-foreground" : "text-muted-foreground"}
          variant="caption"
        >
          {label}
        </Text>
        <Text
          adjustsFontSizeToFit
          className={cn("mt-[4px]", warn && "text-tint-warm-foreground")}
          numberOfLines={1}
          variant="money"
        >
          {value}
        </Text>
      </Elevated>
    </View>
  )
}

/**
 * T18 screen 7 (01 Large title): a collection batch's member rows. Collected
 * rows are selected by default; posting reviews them first. Rows that are
 * not posted or blocked open the row editor.
 */
export function ContributionBatchScreen({ batchId }: { batchId: string }) {
  const { profile } = useAuthContext()
  const online = useIsOnline()
  const refresh = useRefreshContributions()
  const enabled = canUseMobileFeatureData(profile, "admin")
  const keys = contributionKeys()
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<CollectionBatchRow | null>(null)

  const summary = useAppQuery({
    enabled,
    networkMode: "always",
    queryFn: getContributionSummary,
    queryKey: keys.summary,
  })
  const query = useAppQuery({
    enabled,
    networkMode: "always",
    queryFn: () => getContributionBatch(batchId),
    queryKey: keys.batch(batchId),
  })
  const batch = query.data
  const currencyCode = summary.data?.currencyCode ?? "NGN"
  const canManage = Boolean(summary.data?.capabilities.manageBatches)
  const offline = !online
  const blocked = offline || isMobileReadCacheStale(batch?.cache)
  const collectedIds = (batch?.rows ?? [])
    .filter((row) => row.status === "collected")
    .map((row) => row.id)
  const collectedKey = collectedIds.join(",")
  // Select every collected row whenever the batch (re)loads.
  useEffect(() => {
    setSelected(collectedKey ? collectedKey.split(",") : [])
  }, [collectedKey])

  const pull = usePullRefresh(() => query.refetch())

  const flow = useContributionReview({
    onSucceeded: () => {
      setEditing(null)
      void refresh({ batchId, lanes: ["collections", "ledger"] })
    },
  })

  if (!batch) {
    return (
      <ScreenShell
        onRefresh={enabled ? pull.onRefresh : undefined}
        refreshing={pull.refreshing}
        title="Collection batch"
      >
        {query.isError ? (
          <EmptyState
            action={{ label: "Try again", onPress: () => void query.refetch() }}
            description="No rows were changed. Try again."
            icon="CircleAlert"
            title="Couldn’t load this batch"
            tone="error"
          />
        ) : (
          <View className="gap-[16px]">
            <DetailSkeleton rows={3} />
            <ListSkeleton rows={6} />
          </View>
        )}
      </ScreenShell>
    )
  }

  const totals = batch.totals
  const exceptions = totals.exceptionRows + totals.blockedRows
  const status = contributionStatus(batch.status)
  const chosen = batch.rows.filter((row) => selected.includes(row.id))
  const chosenTotal = chosen.reduce((sum, row) => sum + row.paidAmount, 0)
  const allPosted = batch.status === "posted"

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  function reviewPost() {
    if (!batch || !chosen.length) return
    const input = {
      batchId: batch.id,
      commandId: createClientSubmissionKey(),
      expectedState: batch.status,
      rowIds: chosen.map((row) => row.id),
    }
    const money = formatCurrency(chosenTotal, currencyCode)
    flow.open({
      amount: money,
      busyLabel: "Posting",
      cancelLabel: "Cancel",
      cta: `Post ${chosen.length} row${chosen.length > 1 ? "s" : ""}`,
      failure: "No rows were posted. Try again.",
      rows: [
        ["Batch", batch.deductionSource.name],
        ["Period", batch.periodLabel],
        ["Rows", String(chosen.length)],
        ["Posting date", formatDate(`${todayDateOnly()}T00:00:00.000Z`)],
      ],
      run: () => postContributionBatchRows(input),
      sub: `${chosen.length} member${chosen.length > 1 ? "s" : ""} · ${batch.deductionSource.name}`,
      success: [
        "Rows posted",
        `${chosen.length} contribution${chosen.length > 1 ? "s" : ""} totalling ${money} ${chosen.length > 1 ? "are" : "is"} on the ledger.`,
      ],
      title: "Post collected rows",
    })
  }

  return (
    <>
      <ScreenShell
        footer={
          canManage && batch.rows.length && !allPosted ? (
            <Button
              disabled={!chosen.length || blocked}
              onPress={reviewPost}
              testID="contribution-batch-review-post"
            >
              <Text>
                {chosen.length
                  ? `Review ${chosen.length} collected row${chosen.length > 1 ? "s" : ""}`
                  : "Select collected rows to post"}
              </Text>
            </Button>
          ) : undefined
        }
        header={
          <View className="gap-[14px]">
            <Text className="text-muted-foreground -mt-[10px]" variant="small">
              {batch.periodLabel} · {status.label}
              {batch.reference ? ` · ${batch.reference}` : ""}
            </Text>
            <View className="flex-row gap-[10px]">
              <StatTile
                label="Collected"
                value={formatCompactCurrency(totals.paidAmount, currencyCode)}
              />
              <StatTile
                label="Posted"
                value={`${totals.postedRows}/${totals.rowCount}`}
              />
              <StatTile
                label="Exceptions"
                value={String(exceptions)}
                warn={exceptions > 0}
              />
            </View>
            {offline ? (
              <StatusBanner
                description="Showing saved rows. Posting needs a connection."
                kind="offline"
                title="Offline"
              />
            ) : !canManage && summary.data ? (
              <StatusBanner
                description="Posting batches needs finance access."
                kind="info"
                title="View only"
              />
            ) : null}
          </View>
        }
        onRefresh={online ? pull.onRefresh : undefined}
        refreshing={pull.refreshing}
        testID="contribution-batch-screen"
        title={batch.deductionSource.name}
      >
        <SectionHeader
          action={
            canManage && collectedIds.length
              ? {
                  label:
                    selected.length === collectedIds.length
                      ? "Clear"
                      : "Select all collected",
                  onPress: () =>
                    setSelected(
                      selected.length === collectedIds.length ? [] : collectedIds
                    ),
                }
              : undefined
          }
          title="Member rows"
          value={
            canManage && collectedIds.length
              ? undefined
              : `${batch.rows.length} rows`
          }
        />
        {batch.rows.length ? (
          <ListCard inset={false}>
            {batch.rows.map((row) => {
              const rowStatus = contributionStatus(row.status)
              const selectable = canManage && row.status === "collected"
              const on = selected.includes(row.id)
              const editable =
                canManage && row.status !== "posted" && row.status !== "blocked"
              const shown = row.paidAmount || row.expectedAmount
              const note =
                row.exceptionReason ??
                (row.blocker ? contributionStatus(row.blocker).label : null)
              return (
                <RecordRow
                  accessibilityLabel={`${row.memberName}, ${formatCurrency(shown, currencyCode)}, ${rowStatus.label}`}
                  amount={formatCurrency(shown, currencyCode)}
                  chevron={editable}
                  key={row.id}
                  leading={
                    canManage ? (
                      <Pressable
                        accessibilityLabel={`${on ? "Deselect" : "Select"} ${row.memberName}`}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on, disabled: !selectable }}
                        className="size-[44px] items-center justify-center"
                        disabled={!selectable}
                        onPress={() => toggle(row.id)}
                      >
                        <View
                          className={cn(
                            "size-[22px] items-center justify-center rounded-[7px] border",
                            on
                              ? "border-primary bg-primary"
                              : "border-border bg-card",
                            !selectable && "opacity-40"
                          )}
                        >
                          {on ? (
                            <Icon
                              className="size-[14px] text-primary-foreground"
                              name="Check"
                            />
                          ) : null}
                        </View>
                      </Pressable>
                    ) : undefined
                  }
                  meta={`${row.memberNumber}${note ? ` · ${note}` : ""}`}
                  onPress={editable ? () => setEditing(row) : undefined}
                  supporting={
                    <View className="flex-row pt-[2px]">
                      <StatusPill label={rowStatus.label} tone={rowStatus.tone} />
                    </View>
                  }
                  title={row.memberName}
                  trailing={
                    row.paidAmount && row.paidAmount !== row.expectedAmount ? (
                      <Text className="text-muted-foreground" variant="caption">
                        of {formatCurrency(row.expectedAmount, currencyCode)}
                      </Text>
                    ) : undefined
                  }
                />
              )
            })}
          </ListCard>
        ) : (
          <EmptyState
            description="This source had no eligible members for the period."
            icon="Users"
            title="No batch rows"
          />
        )}
      </ScreenShell>
      {editing ? (
        <ContributionRowSheet
          batch={batch}
          blocked={blocked}
          currencyCode={currencyCode}
          onClose={() => setEditing(null)}
          onReview={flow.open}
          reviewActive={flow.active}
          row={editing}
        />
      ) : null}
      <ContributionReviewSheet flow={flow} />
      <ContributionResultSheet onDone={flow.dismissResult} result={flow.result} />
    </>
  )
}
