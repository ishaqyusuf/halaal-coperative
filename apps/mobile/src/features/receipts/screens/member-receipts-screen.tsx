import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import {
  appQueryKey,
  useAppInfiniteQuery,
  useAppQuery,
} from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useDebounce } from "@/hooks/use-debounce"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { useIsOnline } from "@/lib/online-status"
import { cn } from "@/lib/utils"
import { useQueryClient, type InfiniteData } from "@tanstack/react-query"
import { useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { View } from "react-native"
import {
  getMemberReceiptDetail,
  getMemberReceipts,
} from "../api/member-receipts-api"
import { ReceiptDetail, ReceiptTile } from "../components/receipt-detail"
import { ReceiptSubmitFlow } from "../components/receipt-submit-flow"
import { ReceiptSupportFlow } from "../components/receipt-support-flow"
import type {
  MobileMemberReceipts,
  MobilePaymentReceipt,
} from "../model/member-receipt-types"
import {
  hasReceiptDraft,
  newReceiptDraft,
  receiptDate,
  receiptMatches,
  receiptMoney,
  receiptMonth,
  receiptStatus,
  receiptTitle,
} from "../model/receipt-presentation"

type LedgerItem = {
  first: boolean
  last: boolean
  month?: string
  monthCount?: number
  receipt: MobilePaymentReceipt
}

function ledgerItems(receipts: MobilePaymentReceipt[]) {
  const monthCounts = new Map<string, number>()
  for (const item of receipts) {
    const month = item.submittedAt.slice(0, 7)
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1)
  }
  return receipts.map((receipt, index, items): LedgerItem => {
    const month = receipt.submittedAt.slice(0, 7)
    const first = items[index - 1]?.submittedAt.slice(0, 7) !== month
    return {
      first,
      last: items[index + 1]?.submittedAt.slice(0, 7) !== month,
      month: first ? month : undefined,
      monthCount: first ? monthCounts.get(month) : undefined,
      receipt,
    }
  })
}

function ReceiptLedgerRow({
  currency,
  item,
  onPress,
}: {
  currency: string
  item: LedgerItem
  onPress: () => void
}) {
  const { receipt } = item
  const status = receiptStatus(receipt.status)
  const count = receipt.allocations.length
  return (
    <View className={cn("px-[18px]", item.last && "pb-[16px]")}>
      {item.month ? (
        <View className="mb-[8px] flex-row items-baseline justify-between px-[2px]">
          <Text accessibilityRole="header" variant="section">
            {receiptMonth(item.month)}
          </Text>
          <Text className="text-muted-foreground" variant="caption">
            {item.monthCount}
          </Text>
        </View>
      ) : null}
      <Pressable
        accessibilityLabel={`${receiptTitle(receipt)}, ${receiptMoney(receipt.totalAmount, currency)}, ${status.label}`}
        accessibilityRole="button"
        className={cn(
          "min-h-[68px] flex-row items-center gap-[10px] border-x border-border bg-card px-[13px] py-[10px]",
          item.first && "rounded-t-[20px] border-t",
          item.last && "rounded-b-[20px] border-b"
        )}
        onPress={onPress}
      >
        <ReceiptTile tone={status.tone} />
        <View className="min-w-0 flex-1 gap-[2px]">
          <Text className="font-extrabold" numberOfLines={1} variant="body">
            {receiptTitle(receipt)}
          </Text>
          <Text
            className="text-muted-foreground"
            numberOfLines={1}
            variant="small"
          >
            {receiptDate(receipt.paidAt, true)} · {count}{" "}
            {count === 1 ? "split" : "splits"}
          </Text>
        </View>
        <View className="items-end gap-[3px]">
          <Text tabular variant="money">
            {receiptMoney(receipt.totalAmount, currency)}
          </Text>
          <StatusPill
            icon={status.icon}
            label={status.label}
            tone={status.tone}
          />
        </View>
      </Pressable>
      {!item.last ? (
        <View className="border-x border-border bg-card pl-[67px]">
          <View className="h-px bg-border" />
        </View>
      ) : null}
    </View>
  )
}

function ReceiptStats({
  snapshot,
}: {
  snapshot: MobileMemberReceipts | undefined
}) {
  const cards = [
    {
      label: "In review",
      count: snapshot?.summary.pendingReviewReceipts,
      dot: "bg-brand-warm",
    },
    {
      label: "To fix",
      count: snapshot?.summary.correctionRequestedReceipts,
      dot: "bg-brand-vivid",
    },
    {
      label: "Approved",
      count: snapshot?.summary.approvedReceipts,
      dot: "bg-success",
    },
  ]
  return (
    <Elevated
      className="flex-row rounded-[20px] border border-border bg-card"
      radius={20}
    >
      {cards.map((card, i) => (
        <View
          className={cn(
            "min-w-0 flex-1 items-start gap-[4px] px-[12px] py-[14px]",
            i > 0 && "border-l border-border"
          )}
          key={card.label}
        >
          {card.count === undefined ? (
            <Skeleton className="h-[26px] w-[28px] rounded-[6px]" />
          ) : (
            <Text tabular variant="title">
              {card.count}
            </Text>
          )}
          <View className="flex-row items-center gap-[5px]">
            <View className={cn("size-[7px] rounded-full", card.dot)} />
            <Text className="shrink text-muted-foreground" variant="caption">
              {card.label}
            </Text>
          </View>
        </View>
      ))}
    </Elevated>
  )
}

export function ReceiptsScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const { profile } = useAuthContext()
  const router = useRouter()
  const online = useIsOnline()
  const cache = useQueryClient()
  const account = profile
    ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
    : undefined
  const allowed = canUseMobileFeatureData(profile, "member")
  const currency = profile?.tenant.currencyCode ?? "NGN"
  const [search, setSearch] = useState("")
  const term = useDebounce(search.trim().slice(0, 120), 275)
  const [draft, setDraft] = useState(newReceiptDraft)
  const [formOpen, setFormOpen] = useState(false)
  const [receiptId, setReceiptId] = useState<string | null>(initialEntityId)
  const [supportOpen, setSupportOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const previousEntityId = useRef(initialEntityId)
  useEffect(() => {
    if (initialEntityId === previousEntityId.current) return
    previousEntityId.current = initialEntityId
    if (initialEntityId) {
      setReceiptId(initialEntityId)
      setSupportOpen(false)
    }
  }, [initialEntityId])

  const clearStoredDraft = useMobileFormDraft({
    enabled: allowed,
    key: "member.receipts.create",
    onHydrate: (value) =>
      setDraft((previous) => ({
        ...previous,
        ...value,
        allocations: value.allocations?.length
          ? value.allocations
          : previous.allocations,
      })),
    value: draft,
  })
  const draftSaved = hasReceiptDraft(draft)

  const listKey = appQueryKey("member-receipts", account, "ledger")
  const ledger = useAppInfiniteQuery<
    MobileMemberReceipts,
    MobilePaymentReceipt,
    Error,
    typeof listKey,
    string | null
  >({
    enabled: allowed,
    getNextPageParam: (page) => page.nextCursor,
    initialPageParam: null,
    networkMode: "always",
    placeholderData: undefined,
    queryKey: listKey,
    queryFn: ({ pageParam }) =>
      getMemberReceipts({ cursor: pageParam, online }),
    selectItems: (page) => page.receipts,
  })
  const snapshot = ledger.data?.pages[0]
  const stale = isMobileReadCacheStale(snapshot?.cache)
  const canCreate = Boolean(snapshot?.canCreateReceipt)
  const canSupport = Boolean(snapshot?.canCreateSupportCase)
  const searching = Boolean(term && online)
  const searchKey = appQueryKey("member-receipts", account, "search", term)
  const results = useAppInfiniteQuery<
    MobileMemberReceipts,
    MobilePaymentReceipt,
    Error,
    typeof searchKey,
    string | null
  >({
    enabled: allowed && searching,
    getNextPageParam: (page) => page.nextCursor,
    initialPageParam: null,
    placeholderData: undefined,
    queryKey: searchKey,
    queryFn: ({ pageParam }) =>
      getMemberReceipts({ cursor: pageParam, online, search: term }),
    selectItems: (page) => page.receipts,
  })
  const detail = useAppQuery({
    enabled: allowed && Boolean(receiptId) && online,
    placeholderData: undefined,
    queryKey: appQueryKey("member-receipts", account, "detail", receiptId),
    queryFn: () => getMemberReceiptDetail(receiptId!),
  })
  const cachedReceipt =
    ledger.items.find((item) => item.id === receiptId) ??
    results.items.find((item) => item.id === receiptId)
  const selected =
    detail.data === null ? null : (detail.data ?? cachedReceipt ?? null)
  const activeList = searching ? results : ledger
  const rows = online
    ? activeList.items
    : ledger.items.filter(
        (item) => !term || receiptMatches(item, term, currency)
      )
  const totalCount = snapshot
    ? Object.values(snapshot.summary).reduce((a, b) => a + b, 0)
    : 0
  const missing = snapshot?.state === "member_profile_missing" || !allowed
  const failed =
    activeList.isError || snapshot?.state === "database_unavailable"
  const loading = allowed && activeList.isPending && !failed
  const openForm = () => {
    if (canCreate) setFormOpen(true)
  }
  const openReceipt = (id: string) => {
    setSupportOpen(false)
    setReceiptId(id)
  }

  function resetDraft() {
    setDraft((value) => ({
      ...newReceiptDraft(),
      supportDescription: value.supportDescription,
      supportReceiptId: value.supportReceiptId,
    }))
    void clearStoredDraft().catch(() => undefined)
  }

  async function refresh() {
    if (!online || retrying) return
    setRetrying(true)
    try {
      const key = searching ? searchKey : listKey
      cache.setQueryData<InfiniteData<MobileMemberReceipts, string | null>>(
        key,
        (value) =>
          value
            ? {
                pages: value.pages.slice(0, 1),
                pageParams: value.pageParams.slice(0, 1),
              }
            : value
      )
      await activeList.refetch()
    } finally {
      setRetrying(false)
    }
  }

  function submitted(receipt: MobilePaymentReceipt) {
    cache.setQueryData(
      appQueryKey("member-receipts", account, "detail", receipt.id),
      receipt
    )
    cache.setQueryData<InfiniteData<MobileMemberReceipts, string | null>>(
      listKey,
      (value) => {
        if (
          !value?.pages[0] ||
          value.pages.some((page) =>
            page.receipts.some((item) => item.id === receipt.id)
          )
        )
          return value
        const [first, ...pages] = value.pages
        return {
          ...value,
          pages: [
            {
              ...first,
              receipts: [receipt, ...first.receipts],
              summary: {
                ...first.summary,
                pendingReviewReceipts: first.summary.pendingReviewReceipts + 1,
              },
            },
            ...pages,
          ],
        }
      }
    )
    void cache.invalidateQueries({
      queryKey: searchKey,
      exact: true,
      refetchType: "none",
    })
    resetDraft()
  }

  const nav = (compact: boolean) => (
    <View className="min-h-[50px] flex-row items-center justify-between">
      <ScreenHeaderButton
        accessibilityLabel="Go back"
        icon="ChevronLeft"
        onPress={() => router.back()}
      />
      {compact ? <Text variant="label">Receipts</Text> : null}
      {canCreate ? (
        <Button
          accessibilityLabel={
            draftSaved ? "Continue receipt" : "Submit receipt"
          }
          onPress={openForm}
          size="icon"
          testID="receipt-new"
        >
          <Icon
            className="size-[22px] text-primary-foreground"
            name={draftSaved ? "SquarePen" : "Plus"}
          />
        </Button>
      ) : (
        <View className="size-[44px]" />
      )}
    </View>
  )
  const empty = missing ? (
    <EmptyState
      description="Your cooperative needs to link your member profile before receipts show here."
      icon="IdCard"
      title="Your member profile isn’t linked yet"
    />
  ) : failed ? (
    <EmptyState
      action={online ? { label: "Try again", onPress: refresh } : undefined}
      description="Check your connection and try again."
      icon="CircleAlert"
      title={
        online ? "Couldn’t load receipts" : "No receipts saved on this phone"
      }
      tone="error"
    />
  ) : term ? (
    <EmptyState
      action={{ label: "Clear search", onPress: () => setSearch("") }}
      description="Try a reference, an amount or a status."
      icon="Search"
      title={`No receipts match “${term}”`}
    />
  ) : (
    <EmptyState
      action={
        canCreate ? { label: "Submit receipt", onPress: openForm } : undefined
      }
      description={
        canCreate
          ? "After you pay your cooperative, send the proof here. Finance reviews it before posting."
          : "Receipts you send will show here."
      }
      icon="ReceiptText"
      title="No receipts yet"
    />
  )

  return (
    <>
      <AppList
        back={false}
        compactHeader={<View className="px-[18px]">{nav(true)}</View>}
        data={ledgerItems(rows)}
        keyExtractor={(item) => item.receipt.id}
        estimatedItemSize={77}
        error={
          failed && rows.length > 0 && !activeList.isFetchNextPageError
            ? "Couldn’t refresh receipts."
            : null
        }
        empty={empty}
        header={
          <View className="gap-[14px]">
            {nav(false)}
            <Text accessibilityRole="header" variant="screenTitle">
              Receipts
            </Text>
            {!online ? (
              <StatusBanner
                description={
                  snapshot?.cache?.cachedAt
                    ? `Showing receipts saved ${receiptDate(snapshot.cache.cachedAt, true)}.`
                    : undefined
                }
                kind="offline"
                title="You’re offline"
              />
            ) : stale ? (
              <StatusBanner
                kind="stale"
                onRetry={refresh}
                retrying={retrying}
                title="Couldn’t refresh receipts"
              />
            ) : null}
            {!canCreate && snapshot?.state === "available" ? (
              <StatusBanner
                kind="info"
                title="New receipts are off"
                description="Your receipt history is still available."
              />
            ) : null}
            {canCreate && draftSaved ? (
              <Pressable
                accessibilityRole="button"
                className="flex-row items-center gap-[10px] rounded-[18px] bg-accent p-[12px]"
                onPress={openForm}
              >
                <Icon
                  className="ml-[6px] size-[20px] text-primary"
                  name="SquarePen"
                />
                <View className="flex-1">
                  <Text
                    className="font-bold text-accent-foreground"
                    variant="body"
                  >
                    Continue your receipt
                  </Text>
                  <Text className="text-accent-foreground" variant="small">
                    {receiptMoney(
                      Number(draft.totalAmount.replace(/,/g, "")) || 0,
                      currency
                    )}{" "}
                    draft saved on this phone
                  </Text>
                </View>
                <Icon
                  className="size-[18px] text-primary"
                  name="ChevronRight"
                />
              </Pressable>
            ) : null}
            {!missing &&
            (snapshot?.state === "available" || ledger.isPending) ? (
              <ReceiptStats snapshot={snapshot} />
            ) : null}
          </View>
        }
        isFetchingNextPage={activeList.isFetchingNextPage}
        isLoading={loading}
        listFooter={
          activeList.isFetchNextPageError && online ? (
            <View className="px-[18px]">
              <StatusBanner
                kind="error"
                onRetry={() => void activeList.fetchNextPage()}
                title="Couldn’t load more receipts"
              />
            </View>
          ) : undefined
        }
        onEndReached={online && !stale ? activeList.onEndReached : undefined}
        onRefresh={online ? refresh : undefined}
        onRetry={online ? refresh : undefined}
        refreshing={retrying}
        renderItem={({ item }) => (
          <ReceiptLedgerRow
            currency={currency}
            item={item}
            onPress={() => openReceipt(item.receipt.id)}
          />
        )}
        search={
          totalCount > 10
            ? {
                value: search,
                onChangeText: setSearch,
                placeholder: "Search receipts",
                totalCount,
                localSearch: !online,
              }
            : undefined
        }
        testID="member-receipts"
      />
      <ReceiptDetail
        canSupport={canSupport}
        currency={currency}
        error={detail.isError || !online}
        loading={online && detail.isPending}
        onClose={() => setReceiptId(null)}
        onRetry={() => void detail.refetch()}
        onSupport={() => {
          if (!selected || !canSupport) return
          if (draft.supportReceiptId !== selected.id) {
            setDraft((value) => ({
              ...value,
              supportDescription: "",
              supportReceiptId: selected.id,
            }))
          }
          setSupportOpen(true)
        }}
        receipt={selected}
        visible={Boolean(receiptId && !supportOpen && !formOpen)}
      />
      {formOpen ? (
        <ReceiptSubmitFlow
          canCreate={canCreate}
          proofRequired={Boolean(snapshot?.proofRequired)}
          currency={currency}
          draft={draft}
          offline={!online}
          onClose={() => setFormOpen(false)}
          onDiscard={() => {
            resetDraft()
            setFormOpen(false)
          }}
          onSent={submitted}
          onViewReceipt={(receipt) => {
            setFormOpen(false)
            openReceipt(receipt.id)
          }}
          scope={account}
          setDraft={setDraft}
          stale={stale}
          visible
        />
      ) : null}
      {supportOpen && selected ? (
        <ReceiptSupportFlow
          canSubmit={canSupport}
          currency={currency}
          description={draft.supportDescription}
          offline={!online}
          onClose={() => setSupportOpen(false)}
          onEdit={(supportDescription) =>
            setDraft((value) => ({ ...value, supportDescription }))
          }
          onSent={() =>
            setDraft((value) => ({
              ...value,
              supportDescription: "",
              supportReceiptId: null,
            }))
          }
          receipt={selected}
          stale={stale}
          visible
        />
      ) : null}
    </>
  )
}
