import { AppSheet } from "@/components/app/app-sheet"
import { Button } from "@/components/ui/button"
import {
  RecordRow,
  type RowPosition,
  rowPosition,
} from "@/components/ui/list-card"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import type { MobileReadCacheState } from "@/lib/read-cache"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { formatMoney } from "@/lib/money"
import { useMemo, useState } from "react"
import { View } from "react-native"
import type {
  MobileMemberActivityRow,
  MobileMemberSectionRow,
} from "../model/member-core-types"
import type { MemberActivityRead } from "../public/use-member-activity"

const postedDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
})
const activityMonth = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
})

export function formatLedgerValue(
  row: MobileMemberSectionRow,
  currencyCode: string
) {
  if (!row.format || row.value === null) return undefined
  if (row.format === "currency") {
    return formatMoney(row.value, {
      currencyCode,
      fractionDigits: Number.isInteger(row.value) ? 0 : 2,
    })
  }
  return formatMobileMetricValue(
    { ...row, format: row.format, value: row.value },
    currencyCode
  )
}

type LedgerItem =
  | {
      heading: string
      key: string
      row?: undefined
      total?: { count: number; amount: number }
    }
  | { key: string; position: RowPosition; row: MobileMemberActivityRow }

export function useMemberLedgerList(
  rows: MobileMemberActivityRow[],
  plans: boolean,
  completeThroughEnd = false
) {
  const [search, setSearch] = useState("")
  const data = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const groups: { label: string; rows: MobileMemberActivityRow[] }[] = []
    let group: { label: string; rows: MobileMemberActivityRow[] } | undefined
    for (const row of rows) {
      if (
        keyword &&
        ![row.label, row.detail, row.reference, row.value].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(keyword)
        )
      )
        continue
      const date = row.postedAt ? new Date(row.postedAt) : null
      const label =
        date && Number.isFinite(date.getTime())
          ? plans
            ? String(date.getUTCFullYear())
            : activityMonth.format(date)
          : ""
      if (!group || group.label !== label) {
        group = { label, rows: [] }
        groups.push(group)
      }
      group.rows.push(row)
    }
    return groups.flatMap<LedgerItem>(({ label, rows }, index) => [
      ...(label
        ? [
            {
              heading: label,
              key: `period-${rows[0]?.key}`,
              total:
                plans &&
                !keyword &&
                (index < groups.length - 1 || completeThroughEnd)
                  ? {
                      count: rows.length,
                      amount: rows.reduce(
                        (sum, row) => sum + (row.value ?? 0),
                        0
                      ),
                    }
                  : undefined,
            },
          ]
        : []),
      ...rows.map((row, index) => ({
        key: row.key,
        position: rowPosition(index, rows.length),
        row,
      })),
    ])
  }, [completeThroughEnd, plans, rows, search])
  const stickyIndices = useMemo(
    () => data.flatMap((item, index) => (item.row ? [] : [index])),
    [data]
  )
  return { data, search, setSearch, stickyIndices }
}

export function MemberLedgerRow({
  item,
  currencyCode,
  onPress,
  plans,
}: {
  item: LedgerItem
  currencyCode: string
  onPress: (row: MobileMemberActivityRow) => void
  plans?: boolean
}) {
  if (!item.row) {
    return (
      <View className="bg-background px-[18px] pt-[10px] pb-[6px]">
        <Text
          accessibilityRole="header"
          className="text-muted-foreground"
          variant="caption"
        >
          {item.heading}
        </Text>
        {item.total ? (
          <Text className="text-muted-foreground" variant="caption">
            {item.total.count} ·{" "}
            {formatMoney(item.total.amount, {
              currencyCode,
              fractionDigits: Number.isInteger(item.total.amount) ? 0 : 2,
            })}
          </Text>
        ) : null}
      </View>
    )
  }

  const { position, row } = item
  const channel =
    row.channel === "Payroll"
      ? "Payroll deduction"
      : row.channel === "Transfer"
        ? "Bank transfer"
        : row.channel
  const date = row.postedAt ? new Date(row.postedAt) : null
  const dateLabel =
    date && Number.isFinite(date.getTime()) ? postedDate.format(date) : null
  const meta = [plans ? channel : dateLabel, plans ? dateLabel : row.reference]
    .filter(Boolean)
    .join(" · ")
  return (
    <RecordRow
      amount={formatLedgerValue(row, currencyCode)}
      avatarIcon={
        plans ? (row.channel === "Transfer" ? "Landmark" : "Wallet") : undefined
      }
      leading={plans ? undefined : <></>}
      meta={meta || row.detail}
      onPress={() => onPress(row)}
      position={position}
      title={row.label}
      trailing={
        plans && row.extraSavings ? (
          <Text
            className="bg-tint-warm text-tint-warm-foreground rounded-full px-[6px] py-[2px]"
            variant="caption"
          >
            +
            {formatLedgerValue(
              { ...row, value: row.extraSavings },
              currencyCode
            )}{" "}
            special
          </Text>
        ) : undefined
      }
    />
  )
}

export function MemberLedgerDetail({
  row,
  onClose,
  currencyCode,
  title,
}: {
  row: MobileMemberActivityRow | null
  onClose: () => void
  currencyCode: string
  title: string
}) {
  return (
    <AppSheet onClose={onClose} title={title} visible={Boolean(row)}>
      {row ? (
        <View className="gap-[8px]">
          <Text variant="title">{row.label}</Text>
          {row.value !== null ? (
            <Text variant="money">{formatLedgerValue(row, currencyCode)}</Text>
          ) : null}
          {row.status ? <Text variant="label">{row.status}</Text> : null}
          <Text className="text-muted-foreground" variant="small">
            {row.detail}
          </Text>
        </View>
      ) : null}
    </AppSheet>
  )
}

export function MemberReadBanner({
  cache,
  offline,
  error,
  onRetry,
}: {
  cache?: MobileReadCacheState
  offline: boolean
  error: boolean
  onRetry: () => void
}) {
  if (!offline && !error && cache?.status !== "stale") return null
  return (
    <StatusBanner
      description={
        cache
          ? `Showing data saved at ${new Date(cache.cachedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}.`
          : undefined
      }
      kind={offline ? "offline" : "error"}
      onRetry={offline ? undefined : onRetry}
      title={offline ? "You’re offline" : "Couldn’t refresh"}
    />
  )
}

export function MemberLedgerFooter({
  activity,
  endLabel,
  offline,
  searching,
}: {
  activity: MemberActivityRead
  endLabel: string
  offline: boolean
  searching: boolean
}) {
  if (offline || searching) return null
  if (activity.pageError) {
    return (
      <View className="items-center gap-[4px] px-[18px]">
        <Text variant="small">Couldn’t load older entries</Text>
        <Button onPress={activity.retryPage} size="sm" variant="secondary">
          <Text>Retry</Text>
        </Button>
      </View>
    )
  }
  if (
    activity.hasNextPage ||
    activity.error ||
    activity.cache?.status !== "live" ||
    !activity.rows.length
  )
    return null
  return (
    <Text className="text-center text-muted-foreground" variant="caption">
      {endLabel}
    </Text>
  )
}
