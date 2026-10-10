import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeader } from "@/components/app/screen-header"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { LegendList } from "@legendapp/list"
import { type ReactNode, useCallback } from "react"
import { Pressable, ScrollView, View } from "react-native"
import type {
  AdminFinanceSupportItem,
  AdminFinanceSupportOverview,
  AdminFinanceSupportQueueKey,
} from "../model/admin-finance-support-types"
import {
  adminFinanceQueueFilters,
  buildAdminFinanceSupportPresentation,
  formatAdminFinanceAge,
  formatAdminFinanceCompactCurrency,
  formatAdminFinanceCurrency,
  formatAdminFinanceStatus,
  getAdminFinanceQueueCount,
} from "../model/admin-finance-support-presentation"

const queueTone: Record<
  AdminFinanceSupportQueueKey,
  { background: string; icon: string; name: string }
> = {
  collections: {
    background: "bg-brand-warm/20",
    icon: "text-warn",
    name: "CircleDollarSign",
  },
  financing: {
    background: "bg-brand-vivid/15",
    icon: "text-brand-vivid",
    name: "HandCoins",
  },
  foodPurchase: {
    background: "bg-brand-warm/20",
    icon: "text-warn",
    name: "ShoppingBasket",
  },
  procurement: {
    background: "bg-brand-warm/20",
    icon: "text-warn",
    name: "ShoppingBag",
  },
  projectFinancing: {
    background: "bg-brand-contrast/10",
    icon: "text-brand-contrast",
    name: "BriefcaseBusiness",
  },
  receipts: {
    background: "bg-brand/10",
    icon: "text-brand",
    name: "ReceiptText",
  },
  shares: {
    background: "bg-brand-contrast/10",
    icon: "text-brand-contrast",
    name: "ChartNoAxesCombined",
  },
  support: {
    background: "bg-brand-contrast/10",
    icon: "text-brand-contrast",
    name: "Headphones",
  },
}

function DecisionSignal({
  currencyCode,
  overview,
}: {
  currencyCode: string
  overview: AdminFinanceSupportOverview
}) {
  const largeTextLayout = useLargeTextLayout()
  const presentation = buildAdminFinanceSupportPresentation(overview)

  return (
    <View className="bg-brand-surface relative mt-5 overflow-hidden rounded-[24px] px-5 pt-5 pb-4">
      <View
        className="border-brand-surface-foreground/10 absolute -top-14 -right-12 size-44 rounded-full border-[24px]"
        pointerEvents="none"
      />
      <View
        className="bg-brand-warm/10 absolute top-0 -right-16 size-36 rounded-full"
        pointerEvents="none"
      />

      <View
        className={cn(
          "relative gap-4",
          !largeTextLayout && "flex-row items-end justify-between"
        )}
      >
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-brand-surface-foreground/75 text-[10px] font-black tracking-[1.2px] uppercase">
            Decision pulse
          </Text>
          <Text className="text-brand-surface-foreground text-[38px] leading-[42px] font-black tracking-[-1.5px]">
            {presentation.totalCount}
          </Text>
          <Text className="text-brand-surface-foreground/75 text-xs font-semibold">
            Records awaiting finance review
          </Text>
        </View>

        <View
          className={cn(
            "border-brand-surface-foreground/15 gap-1",
            largeTextLayout ? "border-t pt-3" : "min-w-24 border-l pl-4"
          )}
        >
          <Text className="text-brand-warm text-xl font-black">
            {presentation.blockedCount}
          </Text>
          <Text className="text-brand-surface-foreground/70 text-[11px] font-semibold">
            Blocked by evidence
          </Text>
        </View>
      </View>

      <View
        className={cn(
          "border-brand-surface-foreground/15 relative mt-4 border-t",
          !largeTextLayout && "flex-row"
        )}
      >
        <View className="min-w-0 flex-1 gap-1 py-3 pr-3">
          <Text className="text-brand-surface-foreground text-base font-black">
            {presentation.deployableFunds === null
              ? "—"
              : formatAdminFinanceCompactCurrency(
                  presentation.deployableFunds,
                  currencyCode
                )}
          </Text>
          <Text className="text-brand-surface-foreground/65 text-[10px]">
            Deployable funds
          </Text>
        </View>
        <View
          className={cn(
            "min-w-0 flex-1 gap-1 py-3",
            largeTextLayout
              ? "border-brand-surface-foreground/15 border-t"
              : "border-brand-surface-foreground/15 border-l pl-4"
          )}
        >
          <Text className="text-brand-surface-foreground text-base font-black">
            {getAdminFinanceQueueCount(overview, "financing")}
          </Text>
          <Text className="text-brand-surface-foreground/65 text-[10px]">
            Financing reviews
          </Text>
        </View>
        <View
          className={cn(
            "min-w-0 flex-1 gap-1 py-3",
            largeTextLayout
              ? "border-brand-surface-foreground/15 border-t"
              : "border-brand-surface-foreground/15 border-l pl-4"
          )}
        >
          <Text className="text-brand-surface-foreground text-base font-black">
            {getAdminFinanceQueueCount(overview, "receipts")}
          </Text>
          <Text className="text-brand-surface-foreground/65 text-[10px]">
            Receipts
          </Text>
        </View>
      </View>
    </View>
  )
}

function QueueRow({
  currencyCode,
  item,
  onOpen,
}: {
  currencyCode: string
  item: AdminFinanceSupportItem
  onOpen: (item: AdminFinanceSupportItem) => void
}) {
  const largeTextLayout = useLargeTextLayout()
  const tone = queueTone[item.queueKey]
  const statusLabel = `${formatAdminFinanceStatus(item.state)} · ${formatAdminFinanceAge(item.ageMinutes)}`
  const handlePress = useCallback(() => onOpen(item), [item, onOpen])

  return (
    <Pressable
      accessibilityHint="Opens record evidence and permitted review actions"
      accessibilityLabel={`Review ${item.title}, ${item.subtitle}, ${statusLabel}`}
      accessibilityRole="button"
      className="mx-5 min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={handlePress}
      testID={`admin-work-item-${item.queueKey}-${item.id}`}
    >
      <View
        className={cn(
          "size-10 shrink-0 items-center justify-center rounded-xl",
          tone.background
        )}
      >
        <Icon className={cn("size-base", tone.icon)} name={tone.name} />
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <View
          className={cn(
            "gap-1",
            !largeTextLayout && "flex-row items-baseline justify-between gap-3"
          )}
        >
          <Text className="min-w-0 flex-1 text-sm font-extrabold text-foreground">
            {item.title}
          </Text>
          {item.amount !== null ? (
            <Text className="shrink-0 text-sm font-black text-foreground">
              {formatAdminFinanceCurrency(item.amount, currencyCode)}
            </Text>
          ) : null}
        </View>
        <Text className="text-xs leading-4 text-muted-foreground">
          {formatAdminFinanceStatus(item.queueKey)} ·{" "}
          {item.member?.number ?? item.subtitle}
        </Text>
        <View className="flex-row items-center gap-2">
          <View
            className={cn(
              "size-1.5 rounded-full",
              item.blockers.length ? "bg-brand-vivid" : "bg-brand"
            )}
          />
          <Text
            className={cn(
              "min-w-0 flex-1 text-[11px] font-semibold",
              item.blockers.length
                ? "text-brand-vivid"
                : "text-muted-foreground"
            )}
          >
            {item.blockers[0] ?? statusLabel}
          </Text>
        </View>
      </View>
      <Icon
        className="size-sm shrink-0 text-muted-foreground"
        name="ChevronRight"
      />
    </Pressable>
  )
}

export function AdminFinanceWorkQueue({
  currencyCode,
  destinationNotice,
  error,
  isLoading,
  offline,
  onOpenItem,
  onOpenOperations,
  onQueueFilterChange,
  onRefresh,
  onSearch,
  onSearchDraftChange,
  overview,
  queueFilter,
  searchDraft,
  tenantName,
}: {
  currencyCode: string
  destinationNotice?: ReactNode
  error: string | null
  isLoading: boolean
  offline: boolean
  onOpenItem: (item: AdminFinanceSupportItem) => void
  onOpenOperations: () => void
  onQueueFilterChange: (value: "all" | AdminFinanceSupportQueueKey) => void
  onRefresh: () => void
  onSearch: () => void
  onSearchDraftChange: (value: string) => void
  overview: AdminFinanceSupportOverview | null
  queueFilter: "all" | AdminFinanceSupportQueueKey
  searchDraft: string
  tenantName: string
}) {
  const renderItem = useCallback(
    ({ item }: { item: AdminFinanceSupportItem }) => (
      <QueueRow currencyCode={currencyCode} item={item} onOpen={onOpenItem} />
    ),
    [currencyCode, onOpenItem]
  )
  const keyExtractor = useCallback(
    (item: AdminFinanceSupportItem) => `${item.queueKey}-${item.id}`,
    []
  )

  const listHeader = (
    <View className="gap-4 px-5 pt-4">
      <ScreenHeader
        action={
          <View className="flex-row gap-2">
            <Button
              accessibilityLabel="Open finance operations"
              onPress={onOpenOperations}
              size="icon"
              testID="open-admin-finance-operations"
              variant="secondary"
            >
              <Icon className="size-base text-foreground" name="LayoutGrid" />
            </Button>
            <Button
              accessibilityLabel="Refresh finance queue"
              disabled={isLoading}
              onPress={onRefresh}
              size="icon"
              testID="admin-work-queue-refresh"
              variant="secondary"
            >
              <Icon className="size-base text-foreground" name="RefreshCw" />
            </Button>
          </View>
        }
        description={tenantName}
        title="Finance"
      />

      {destinationNotice}

      {overview?.cache ? (
        <CachedReadBanner cache={overview.cache} label="finance work" />
      ) : null}

      {offline ? (
        <View className="bg-warn/10 px-3 py-2">
          <Text className="text-warn text-sm leading-5">
            Offline. Queue data remains available; actions are paused.
          </Text>
        </View>
      ) : null}

      {error ? (
        <View className="gap-3 bg-destructive/10 px-3 py-3">
          <Text className="text-sm leading-5 text-destructive">{error}</Text>
          <Button
            className="self-start"
            disabled={isLoading}
            onPress={onRefresh}
            variant="outline"
          >
            <Icon className="size-sm text-foreground" name="RefreshCw" />
            <Text>Retry</Text>
          </Button>
        </View>
      ) : null}

      {overview ? (
        <DecisionSignal currencyCode={currencyCode} overview={overview} />
      ) : null}

      <View className="gap-3">
        <View className="flex-row gap-2">
          <Input
            accessibilityLabel="Search finance queue"
            className="flex-1"
            onChangeText={onSearchDraftChange}
            onSubmitEditing={onSearch}
            placeholder="Search member or record"
            returnKeyType="search"
            testID="admin-work-queue-search-input"
            value={searchDraft}
          />
          <Button
            accessibilityLabel="Search finance queue"
            onPress={onSearch}
            size="icon"
            testID="admin-work-queue-search-submit"
            variant="secondary"
          >
            <Icon className="size-base text-foreground" name="Search" />
          </Button>
        </View>

        <ScrollView
          horizontal
          contentContainerClassName="gap-2"
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
        >
          {adminFinanceQueueFilters.map((filter) => {
            const count = getAdminFinanceQueueCount(overview, filter.value)
            return (
              <Button
                className="h-auto min-h-10 px-3 py-2"
                key={filter.value}
                onPress={() => onQueueFilterChange(filter.value)}
                testID={`admin-work-queue-filter-${filter.value}`}
                variant={queueFilter === filter.value ? "secondary" : "ghost"}
              >
                <Text>
                  {count ? `${filter.label} · ${count}` : filter.label}
                </Text>
              </Button>
            )
          })}
        </ScrollView>
      </View>

      <View className="mt-1 flex-row items-end justify-between gap-3 border-b border-border pb-3">
        <Text className="text-xl font-black tracking-tight text-foreground">
          Needs review
        </Text>
        {overview ? (
          <Text className="text-xs font-bold text-muted-foreground">
            {overview.items.length}{" "}
            {overview.items.length === 1 ? "record" : "records"}
          </Text>
        ) : null}
      </View>
    </View>
  )

  return (
    <LegendList
      data={overview?.items ?? []}
      drawDistance={420}
      estimatedItemSize={104}
      keyExtractor={keyExtractor}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        isLoading && !overview ? (
          <View className="min-h-48 items-center justify-center px-5">
            <LoadingSpinner />
          </View>
        ) : (
          <View className="px-5">
            <EmptyState
              description="Try another queue or search."
              icon="ClipboardCheck"
              title="Queue clear"
            />
          </View>
        )
      }
      ListFooterComponent={<View className="h-28" />}
      ListHeaderComponent={listHeader}
      maintainVisibleContentPosition
      recycleItems
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      testID="admin-finance-support-screen"
    />
  )
}
