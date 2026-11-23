import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { Elevated, useCardShadow } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SegmentedControl } from "@/components/ui/segmented-control"
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
import { todayDateOnly } from "@/lib/date-only"
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
import type { ReceiptProofFile } from "../api/receipt-proof-api"
import { ReceiptDetail, ReceiptTile } from "../components/receipt-detail"
import { ReceiptSupportFlow } from "../components/receipt-support-flow"
import { RecordPaymentFlow } from "../components/record-payment-flow"
import type {
  MobileMemberReceipts,
  MobilePaymentReceipt,
} from "../model/member-receipt-types"
import {
  hasPaymentDraft,
  newPaymentDraft,
  preselectedPayable,
  type PaymentDraft,
} from "../model/payment-plan"
import {
  receiptCategories,
  receiptCategoryColors,
  receiptDate,
  receiptMatches,
  receiptMoney,
  receiptPartsLine,
  receiptStatus,
} from "../model/receipt-presentation"
import {
  memberPayablesQueryKey,
  useMemberPayables,
} from "../public/member-payables"

type Lane = "all" | "checking" | "fix" | "applied"

const laneStatuses: Record<Lane, readonly string[] | null> = {
  all: null,
  applied: ["approved"],
  checking: ["submitted", "under_review", "pending_review"],
  fix: ["correction_requested"],
}

/** The "where it went" bar and legend under a row (02 Activity feed). */
function WhereItWent({
  currency,
  receipt,
}: {
  currency: string
  receipt: MobilePaymentReceipt
}) {
  const parts = new Map<string, { amount: number; color: string; label: string }>()
  for (const split of receipt.allocations) {
    const label = receiptCategories[split.category]
    const part = parts.get(label)
    if (part) part.amount += split.amount
    else
      parts.set(label, {
        amount: split.amount,
        color: receiptCategoryColors[split.category],
        label,
      })
  }
  if (!parts.size) return null
  return (
    <>
      <View className="mt-[8px] h-[8px] w-full flex-row gap-[2px] self-stretch overflow-hidden rounded-[4px]">
        {[...parts.values()].map((part) => (
          <View
            className="h-[8px] basis-0"
            key={part.label}
            style={{ flexGrow: part.amount }}
          >
            <View className={cn("h-[8px] w-full", part.color)} />
          </View>
        ))}
      </View>
      <View className="mt-[6px] flex-row flex-wrap gap-x-[10px] gap-y-[4px]">
        {[...parts.values()].map((part) => (
          <View className="flex-row items-center gap-[5px]" key={part.label}>
            <View className={cn("size-[8px] rounded-[3px]", part.color)} />
            <Text className="text-muted-foreground" variant="caption">
              {part.label} {receiptMoney(part.amount, currency)}
            </Text>
          </View>
        ))}
      </View>
    </>
  )
}

function TransactionRow({
  currency,
  first,
  last,
  onPress,
  receipt,
}: {
  currency: string
  first: boolean
  last: boolean
  onPress: () => void
  receipt: MobilePaymentReceipt
}) {
  const status = receiptStatus(receipt.status)
  const fix = receipt.status === "correction_requested" && receipt.reviewNotes
  return (
    <View className={cn("px-[18px]", last && "pb-[16px]")}>
      <Pressable
        accessibilityLabel={`${receiptMoney(receipt.totalAmount, currency)}, ${receiptDate(receipt.paidAt, true)}, ${receiptPartsLine(receipt)}, ${status.label}`}
        accessibilityRole="button"
        className={cn(
          "min-h-[68px] flex-row items-start gap-[10px] border-x border-border bg-card px-[13px] py-[12px]",
          first && "rounded-t-[20px] border-t",
          last && "rounded-b-[20px] border-b"
        )}
        onPress={onPress}
      >
        <ReceiptTile
          icon={
            receipt.status === "approved"
              ? "Wallet"
              : (status.icon ?? "ReceiptText")
          }
          tone={status.tone}
        />
        <View className="min-w-0 flex-1">
          <Text tabular variant="money">
            {receiptMoney(receipt.totalAmount, currency)}
          </Text>
          <Text
            className={cn(fix ? "text-destructive" : "text-muted-foreground")}
            numberOfLines={1}
            variant="small"
          >
            {fix ||
              `${receiptDate(receipt.paidAt, true)} · ${receiptPartsLine(receipt)}`}
          </Text>
          <WhereItWent currency={currency} receipt={receipt} />
        </View>
        <StatusPill icon={status.icon} label={status.label} tone={status.tone} />
      </Pressable>
      {!last ? (
        <View className="border-x border-border bg-card pl-[67px]">
          <View className="h-px bg-border" />
        </View>
      ) : null}
    </View>
  )
}

function Strip({
  currency,
  dueNow,
  snapshot,
}: {
  currency: string
  dueNow: number | undefined
  snapshot: MobileMemberReceipts | undefined
}) {
  const cells = [
    { label: "Due now", value: dueNow },
    { label: "Checking", value: snapshot?.summary.checkingAmount },
    { label: "Applied", value: snapshot?.summary.appliedAmount },
  ]
  return (
    <Elevated
      className="flex-row rounded-[20px] border border-border bg-card"
      radius={20}
    >
      {cells.map((cell, index) => (
        <View
          className={cn(
            "min-w-0 flex-1 gap-[2px] p-[14px]",
            index > 0 && "border-l border-border"
          )}
          key={cell.label}
        >
          <Text className="text-muted-foreground" variant="caption">
            {cell.label}
          </Text>
          {cell.value === undefined ? (
            <Skeleton className="h-[22px] w-[64px] rounded-[6px]" />
          ) : (
            <Text numberOfLines={1} adjustsFontSizeToFit tabular variant="money">
              {receiptMoney(cell.value, currency)}
            </Text>
          )}
        </View>
      ))}
    </Elevated>
  )
}

export function ReceiptsScreen({
  composePayable = null,
  composeRequested = false,
  initialEntityId = null,
  onComposeHandled,
  onSharedReceiptClosed,
  sharedReceipt,
}: {
  /** `payable` deep-link param (`<kind>:<id>`), T30 contract. */
  composePayable?: string | null
  /** `compose=1`: open Record payment on arrival. */
  composeRequested?: boolean
  initialEntityId?: string | null
  onComposeHandled?: () => void
  onSharedReceiptClosed?: (paymentId?: string) => void
  sharedReceipt?: ReceiptProofFile
}) {
  const { profile } = useAuthContext()
  const router = useRouter()
  const online = useIsOnline()
  const cache = useQueryClient()
  const shadow = useCardShadow()
  const account = profile
    ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
    : undefined
  const allowed = canUseMobileFeatureData(profile, "member")
  const currency = profile?.tenant.currencyCode ?? "NGN"
  const cooperativeName = profile?.tenant.name ?? "your cooperative"
  const [search, setSearch] = useState("")
  const term = useDebounce(search.trim().slice(0, 120), 275)
  const [lane, setLane] = useState<Lane>("all")
  const [draft, setDraft] = useState<PaymentDraft>(() =>
    newPaymentDraft(todayDateOnly())
  )
  const [formOpen, setFormOpen] = useState(Boolean(sharedReceipt))
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
    enabled: allowed && !sharedReceipt,
    key: "member.receipts.payment",
    onHydrate: (value) =>
      setDraft((previous) => ({
        ...previous,
        ...value,
        selected: Array.isArray(value.selected) ? value.selected : [],
      })),
    value: draft,
  })
  const draftSaved = hasPaymentDraft(draft)

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
  const payables = useMemberPayables({ enabled: allowed })
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
  const loaded = online
    ? activeList.items
    : ledger.items.filter(
        (item) => !term || receiptMatches(item, term, currency)
      )
  const statuses = laneStatuses[lane]
  const rows = statuses
    ? loaded.filter((item) => statuses.includes(item.status))
    : loaded
  const totalCount = snapshot
    ? snapshot.summary.approvedReceipts +
      snapshot.summary.correctionRequestedReceipts +
      snapshot.summary.pendingReviewReceipts +
      snapshot.summary.rejectedReceipts
    : 0
  const fixCount = snapshot?.summary.correctionRequestedReceipts ?? 0
  const owed = payables.data?.payables
  const dueNow = owed?.reduce((sum, payable) => sum + payable.amount, 0)
  const overdue = owed?.find((payable) => payable.overdue)
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

  // Pay-from-request deep link: open Record payment with the badge picked
  // once payables load (unknown or already-paid ids pick nothing).
  const composeHandled = useRef(false)
  useEffect(() => {
    if (!composeRequested) {
      composeHandled.current = false
      return
    }
    if (composeHandled.current || !snapshot || payables.isPending) return
    composeHandled.current = true
    const pick = preselectedPayable(
      composePayable ?? undefined,
      payables.data?.payables ?? []
    )
    if (pick) setDraft((value) => ({ ...value, selected: [pick] }))
    if (snapshot.canCreateReceipt) setFormOpen(true)
    onComposeHandled?.()
  }, [
    composePayable,
    composeRequested,
    onComposeHandled,
    payables.data,
    payables.isPending,
    snapshot,
  ])

  function resetDraft() {
    setDraft((value) => ({
      ...newPaymentDraft(todayDateOnly()),
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
      await Promise.all([activeList.refetch(), payables.refetch()])
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
                checkingAmount:
                  (first.summary.checkingAmount ?? 0) + receipt.totalAmount,
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
      {compact ? <Text variant="label">Transactions</Text> : null}
      <View className="size-[44px]" />
    </View>
  )
  const empty = missing ? (
    <EmptyState
      description="Your cooperative needs to link your member profile before your payments show here."
      icon="IdCard"
      title="Your member profile isn’t linked yet"
    />
  ) : failed ? (
    <EmptyState
      action={online ? { label: "Try again", onPress: refresh } : undefined}
      description="Check your connection and try again."
      icon="CircleAlert"
      title={
        online
          ? "Couldn’t load your transactions"
          : "No transactions saved on this phone"
      }
      tone="error"
    />
  ) : term ? (
    <EmptyState
      action={{ label: "Clear search", onPress: () => setSearch("") }}
      description="Try a reference, an amount or a status."
      icon="Search"
      title={`No payments match “${term}”`}
    />
  ) : lane !== "all" && loaded.length ? (
    <EmptyState
      action={{ label: "Show all", onPress: () => setLane("all") }}
      description="Nothing in this list right now."
      icon={lane === "fix" ? "BadgeCheck" : "Wallet"}
      title={
        lane === "fix"
          ? "Nothing to fix"
          : lane === "checking"
            ? "Nothing being checked"
            : "Nothing applied yet"
      }
    />
  ) : (
    <EmptyState
      action={
        canCreate ? { label: "Record payment", onPress: openForm } : undefined
      }
      description={
        canCreate
          ? "When you pay the cooperative, add it here with your slip. We apply it to what you owe and put any extra in your savings."
          : "Payments you record will show here."
      }
      icon="Wallet"
      title="No payments yet"
    />
  )

  return (
    <>
      <AppList
        back={false}
        bottomAction={
          canCreate && !formOpen ? (
            <View className="flex-1 flex-row justify-end">
              <View style={{ ...shadow, borderRadius: 28 }}>
                <Pressable
                  accessibilityLabel={
                    draftSaved ? "Continue payment" : "Record payment"
                  }
                  accessibilityRole="button"
                  className="h-[56px] flex-row items-center gap-[8px] rounded-full bg-primary pr-[20px] pl-[16px]"
                  onPress={openForm}
                  testID="receipt-new"
                >
                  <Icon
                    className="size-[20px] text-primary-foreground"
                    name={draftSaved ? "SquarePen" : "Plus"}
                  />
                  <Text className="text-primary-foreground" variant="section">
                    {draftSaved ? "Continue payment" : "Record payment"}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : undefined
        }
        compactHeader={<View className="px-[18px]">{nav(true)}</View>}
        data={rows}
        empty={empty}
        error={
          failed && rows.length > 0 && !activeList.isFetchNextPageError
            ? "Couldn’t refresh your transactions."
            : null
        }
        estimatedItemSize={96}
        extraData={lane}
        header={
          <View className="gap-[14px]">
            {nav(false)}
            <View className="gap-[2px]">
              <Text accessibilityRole="header" variant="screenTitle">
                Transactions
              </Text>
              <Text className="text-muted-foreground" variant="small">
                Money you’ve paid in and where it went
              </Text>
            </View>
            {!online ? (
              <StatusBanner
                description={
                  snapshot?.cache?.cachedAt
                    ? `Showing what was saved ${receiptDate(snapshot.cache.cachedAt, true)}. You can start a payment; send it when you’re back.`
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
                title="Couldn’t refresh your transactions"
              />
            ) : null}
            {!canCreate && snapshot?.state === "available" ? (
              <StatusBanner
                description="Your payment history is still here."
                kind="info"
                title="Recording payments is off"
              />
            ) : null}
            {!missing &&
            (snapshot?.state === "available" || ledger.isPending) ? (
              <Strip currency={currency} dueNow={dueNow} snapshot={snapshot} />
            ) : null}
            {canCreate && owed?.length ? (
              <Pressable
                accessibilityRole="button"
                className="min-h-[56px] flex-row items-center gap-[10px] rounded-[20px] border border-border bg-card px-[13px] py-[10px]"
                onPress={openForm}
                testID="transactions-due"
              >
                <View
                  className={cn(
                    "size-[44px] items-center justify-center rounded-[14px]",
                    overdue ? "bg-tint-danger" : "bg-accent"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[20px]",
                      overdue
                        ? "text-tint-danger-foreground"
                        : "text-accent-foreground"
                    )}
                    name={overdue ? "CircleAlert" : "CalendarClock"}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-extrabold" variant="body">
                    {receiptMoney(dueNow ?? 0, currency)} due now
                  </Text>
                  <Text
                    className="text-muted-foreground"
                    numberOfLines={1}
                    variant="small"
                  >
                    {overdue
                      ? `${overdue.kind === "food_purchase" ? "Foodstuff" : overdue.kind === "procurement" ? "Procurement" : overdue.kind === "loan" ? "Loan" : "Payment"} overdue · tap to pay`
                      : `${owed.length} item${owed.length === 1 ? "" : "s"} · tap to pay`}
                  </Text>
                </View>
                <Icon
                  className="size-[18px] text-muted-foreground"
                  name="ChevronRight"
                />
              </Pressable>
            ) : null}
            {canCreate && draftSaved && !formOpen ? (
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
                    Continue your payment
                  </Text>
                  <Text className="text-accent-foreground" variant="small">
                    Saved on this phone
                  </Text>
                </View>
                <Icon
                  className="size-[18px] text-primary"
                  name="ChevronRight"
                />
              </Pressable>
            ) : null}
            {totalCount > 0 ? (
              <SegmentedControl
                accessibilityLabel="Filter transactions"
                onChange={setLane}
                options={[
                  { label: "All", value: "all" },
                  { label: "Checking", value: "checking" },
                  {
                    count: fixCount || undefined,
                    countBadge: true,
                    countTone: "attention",
                    label: "Fix",
                    value: "fix",
                  },
                  { label: "Applied", value: "applied" },
                ]}
                scrollable={false}
                value={lane}
              />
            ) : null}
          </View>
        }
        isFetchingNextPage={activeList.isFetchingNextPage}
        isLoading={loading}
        keyExtractor={(item) => item.id}
        listFooter={
          activeList.isFetchNextPageError && online ? (
            <View className="px-[18px]">
              <StatusBanner
                kind="error"
                onRetry={() => void activeList.fetchNextPage()}
                title="Couldn’t load more payments"
              />
            </View>
          ) : undefined
        }
        onEndReached={online && !stale ? activeList.onEndReached : undefined}
        onRefresh={online ? refresh : undefined}
        onRetry={online ? refresh : undefined}
        refreshing={retrying}
        renderItem={({ item, index }) => (
          <TransactionRow
            currency={currency}
            first={index === 0}
            last={index === rows.length - 1}
            onPress={() => openReceipt(item.id)}
            receipt={item}
          />
        )}
        search={
          totalCount > 10
            ? {
                localSearch: !online,
                onChangeText: setSearch,
                placeholder: "Search payments",
                totalCount,
                value: search,
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
        <RecordPaymentFlow
          cooperativeName={cooperativeName}
          currency={currency}
          draft={draft}
          memberLine={
            snapshot?.member
              ? `${snapshot.member.name} · ${snapshot.member.memberNumber}`
              : null
          }
          offline={!online}
          onClose={onSharedReceiptClosed ?? (() => setFormOpen(false))}
          onDiscard={
            onSharedReceiptClosed ??
            (() => {
              resetDraft()
              setFormOpen(false)
            })
          }
          onRetryPayables={() => void payables.refetch()}
          onSent={(receipt) => {
            submitted(receipt)
            void cache.invalidateQueries({
              exact: true,
              queryKey: memberPayablesQueryKey(account),
            })
          }}
          onViewReceipt={(receipt) => {
            if (onSharedReceiptClosed) {
              onSharedReceiptClosed(receipt.id)
              return
            }
            setFormOpen(false)
            openReceipt(receipt.id)
          }}
          payables={payables.data}
          payablesError={payables.isError && !payables.data}
          payablesLoading={payables.isPending}
          setDraft={setDraft}
          sharedReceipt={sharedReceipt}
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
