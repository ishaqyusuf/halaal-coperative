import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { ScreenHeader } from "@/components/app/screen-header"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useRef, useState } from "react"
import { Pressable, TextInput, View } from "react-native"

import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  labelize,
} from "../lib/admin-contribution-presentation"
import type {
  CollectionBatchSummary,
  ContributionLane,
  ContributionLedgerRow,
  ContributionMemberRow,
  ContributionWorkspace,
} from "../model/admin-contribution-operations-types"

const emptyRows: ContributionWorkspace["data"] = []

const lanes: { label: string; value: ContributionLane }[] = [
  { label: "Ledger", value: "ledger" },
  { label: "Commitments", value: "commitments" },
  { label: "Collections", value: "collections" },
]

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}

function Avatar({ name }: { name: string }) {
  return (
    <View className="size-11 shrink-0 items-center justify-center rounded-xl bg-accent">
      <Text className="text-xs font-extrabold text-accent-foreground">
        {initials(name)}
      </Text>
    </View>
  )
}

function StatusDot({ status }: { status: string }) {
  const className =
    status === "posted"
      ? "bg-success"
      : status === "blocked" || status === "exception"
        ? "bg-destructive"
        : "bg-warn"
  return <View className={`size-2 rounded-full ${className}`} />
}

function LedgerRow({
  currencyCode,
  item,
  onPress,
}: {
  currencyCode: string
  item: ContributionLedgerRow
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityLabel={`${item.memberName}, ${formatCurrency(item.amount, currencyCode)}, ${labelize(item.status)}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`contribution-ledger-row-${item.id}`}
    >
      <Avatar name={item.memberName} />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-bold text-foreground">
          {item.memberName}
        </Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {item.memberNumber} · {item.reference ?? labelize(item.channel)}
        </Text>
        <View className="flex-row items-center gap-2">
          <StatusDot status={item.status} />
          <Text className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
            {labelize(item.status)} ·{" "}
            {item.periodLabel ?? formatDate(item.postedAt)}
          </Text>
        </View>
      </View>
      <View className="shrink-0 items-end gap-1">
        <Text className="text-sm font-extrabold text-foreground">
          {formatCurrency(item.amount, currencyCode)}
        </Text>
        <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      </View>
    </Pressable>
  )
}

function MemberRow({
  currencyCode,
  item,
  onPress,
}: {
  currencyCode: string
  item: ContributionMemberRow
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityLabel={`${item.name}, ${item.number}, monthly target ${formatCurrency(item.activeCommitmentAmount, currencyCode)}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`contribution-member-row-${item.id}`}
    >
      <Avatar name={item.name} />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-bold text-foreground">{item.name}</Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {item.number} · {labelize(item.paymentAllocationPreference)}
        </Text>
        <View className="flex-row items-center gap-2">
          <StatusDot
            status={item.status === "active" ? "posted" : item.status}
          />
          <Text className="min-w-0 flex-1 text-xs text-muted-foreground">
            {formatCompactCurrency(item.totalSavings, currencyCode)} saved
          </Text>
        </View>
      </View>
      <View className="shrink-0 items-end gap-1">
        <Text className="text-sm font-extrabold text-foreground">
          {formatCompactCurrency(item.activeCommitmentAmount, currencyCode)}
        </Text>
        <Text className="text-[10px] text-muted-foreground">monthly</Text>
      </View>
      <Icon
        className="size-sm shrink-0 text-muted-foreground"
        name="ChevronRight"
      />
    </Pressable>
  )
}

function BatchRow({
  currencyCode,
  item,
  onPress,
}: {
  currencyCode: string
  item: CollectionBatchSummary
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityLabel={`${item.deductionSource.name}, ${item.periodLabel}, ${labelize(item.status)}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`contribution-batch-row-${item.id}`}
    >
      <Avatar name={item.deductionSource.name} />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-base font-bold text-foreground">
          {item.deductionSource.name}
        </Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {item.periodLabel} · {item.totals.rowCount} rows
        </Text>
        <View className="flex-row items-center gap-2">
          <StatusDot status={item.status} />
          <Text className="text-xs font-medium text-muted-foreground">
            {labelize(item.status)}
          </Text>
        </View>
      </View>
      <Text className="text-sm font-extrabold text-foreground">
        {formatCompactCurrency(item.totals.paidAmount, currencyCode)}
      </Text>
      <Icon
        className="size-sm shrink-0 text-muted-foreground"
        name="ChevronRight"
      />
    </Pressable>
  )
}

export function AdminContributionWorkspace({
  canManageBatches,
  canManageMember,
  error,
  isLoading,
  isLoadingMore,
  isOnline,
  lane,
  loadMoreError,
  onBack,
  onBatchPress,
  onLaneChange,
  onLedgerPress,
  onLoadMore,
  onMemberPress,
  onRefresh,
  onSearchChange,
  onSearchSubmit,
  onStartBatch,
  search,
  searchDraft,
  workspace,
}: {
  canManageBatches: boolean
  canManageMember: boolean
  error: string | null
  isLoading: boolean
  isLoadingMore: boolean
  isOnline: boolean
  lane: ContributionLane
  loadMoreError: string | null
  onBack: () => void
  onBatchPress: (item: CollectionBatchSummary) => void
  onLaneChange: (lane: ContributionLane) => void
  onLedgerPress: (item: ContributionLedgerRow) => void
  onLoadMore: () => void
  onMemberPress: (item: ContributionMemberRow) => void
  onRefresh: () => void
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onStartBatch: () => void
  search: string
  searchDraft: string
  workspace: ContributionWorkspace | null
}) {
  const largeTextLayout = useLargeTextLayout()
  const searchRef = useRef<TextInput>(null)
  const currencyCode = workspace?.currencyCode ?? "NGN"
  const data = workspace?.data ?? emptyRows
  const [listHeight, setListHeight] = useState(320)

  const focusMemberSearch = () => searchRef.current?.focus()

  return (
    <View
      className="flex-1 px-5 pt-4 pb-2"
      testID="admin-contribution-operations-screen"
    >
      <ScreenHeader
        action={
          <Button
            accessibilityLabel={
              lane === "collections" && canManageBatches
                ? "Stage Collection Source batch"
                : lane === "commitments" && canManageMember
                  ? "Record payment. Search for a member"
                  : "Refresh contributions"
            }
            onPress={
              lane === "collections" && canManageBatches
                ? onStartBatch
                : lane === "commitments" && canManageMember
                  ? focusMemberSearch
                  : onRefresh
            }
            size="icon"
            variant="ghost"
          >
            <Icon
              className="size-base text-foreground"
              name={
                (lane === "commitments" && canManageMember) ||
                (lane === "collections" && canManageBatches)
                  ? "Plus"
                  : "RefreshCw"
              }
            />
          </Button>
        }
        leading={<ScreenBackButton onPress={onBack} />}
        size="compact"
        title="Contributions"
      />

      <View className="mt-3">
        <CachedReadBanner
          cache={workspace?.cache}
          label="contribution operations"
        />
      </View>
      {!isOnline ? (
        <View className="bg-warn/10 mt-3 px-3 py-2">
          <Text className="text-warn text-sm leading-5">
            Saved records remain available. Posting requires a connection.
          </Text>
        </View>
      ) : null}

      {lane === "commitments" && workspace ? (
        <View className="mt-4 gap-3 border-y border-border py-3">
          <View className={largeTextLayout ? "gap-3" : "flex-row gap-3"}>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                Members
              </Text>
              <Text className="text-xl font-extrabold text-foreground">
                {workspace.stats.members}
              </Text>
            </View>
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                Posted this month
              </Text>
              <Text className="text-xl font-extrabold text-foreground">
                {formatCurrency(workspace.stats.postedThisMonth, currencyCode)}
              </Text>
            </View>
          </View>
          {canManageMember ? (
            <Button
              accessibilityHint="Moves focus to member search"
              onPress={focusMemberSearch}
            >
              <Icon className="size-sm text-primary-foreground" name="Plus" />
              <Text>Record payment</Text>
            </Button>
          ) : null}
        </View>
      ) : null}

      <View
        className={`${lane === "commitments" ? "mt-3" : "mt-4"} ${largeTextLayout ? "gap-1" : "flex-row"} rounded-xl bg-secondary p-1`}
      >
        {lanes.map((item) => (
          <Button
            className={`${largeTextLayout ? "w-full" : "h-10 flex-1"} px-2`}
            key={item.value}
            onPress={() => onLaneChange(item.value)}
            testID={`contribution-lane-${item.value}`}
            variant={lane === item.value ? "outline" : "ghost"}
          >
            <Text className="text-xs font-bold">{item.label}</Text>
          </Button>
        ))}
      </View>

      {lane !== "commitments" && workspace ? (
        <View
          className={`${largeTextLayout ? "gap-3" : "flex-row"} mt-3 border-y border-border py-3`}
        >
          {[
            {
              label: "This month",
              value: formatCompactCurrency(
                workspace.stats.postedThisMonth,
                currencyCode
              ),
            },
            { label: "Members", value: String(workspace.stats.members) },
            { label: "Exceptions", value: String(workspace.stats.exceptions) },
          ].map((stat, index) => (
            <View
              className={`${largeTextLayout ? (index ? "border-t border-border pt-3" : "") : `min-w-0 flex-1 px-3 ${index ? "border-l border-border" : "pl-0"}`} gap-1`}
              key={stat.label}
            >
              <Text className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                {stat.label}
              </Text>
              <Text className="text-lg font-extrabold text-foreground">
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Input
        ref={searchRef}
        accessibilityLabel={`Search ${lane}`}
        className="mt-3"
        leading={
          <Icon className="size-base text-muted-foreground" name="Search" />
        }
        onChangeText={onSearchChange}
        onSubmitEditing={onSearchSubmit}
        placeholder={
          lane === "collections"
            ? "Search source or period"
            : lane === "commitments"
              ? "Search members"
              : "Search member or reference"
        }
        returnKeyType="search"
        testID="contribution-search-input"
        value={searchDraft}
      />

      <View
        className="mt-3 min-h-0 flex-1"
        onLayout={(event) => setListHeight(event.nativeEvent.layout.height)}
      >
        {isLoading ? (
          <View className="mt-12">
            <LoadingSpinner />
          </View>
        ) : error ? (
          <View className="gap-3 py-8">
            <Text className="text-sm leading-5 text-destructive">{error}</Text>
            <Button
              className="self-start"
              onPress={onRefresh}
              variant="outline"
            >
              <Text>Retry</Text>
            </Button>
          </View>
        ) : (
          <VirtualizedCardList
            data={data}
            empty={
              <EmptyState
                title={
                  search
                    ? "No matches"
                    : lane === "commitments"
                      ? "No members"
                      : lane === "collections"
                        ? "No collection batches"
                        : "No contributions"
                }
              />
            }
            estimatedItemSize={84}
            keyExtractor={(item) => item.id}
            maxHeight={listHeight}
            renderItem={({ item }) =>
              lane === "ledger" ? (
                <LedgerRow
                  currencyCode={currencyCode}
                  item={item as ContributionLedgerRow}
                  onPress={() => onLedgerPress(item as ContributionLedgerRow)}
                />
              ) : lane === "commitments" ? (
                <MemberRow
                  currencyCode={currencyCode}
                  item={item as ContributionMemberRow}
                  onPress={() => onMemberPress(item as ContributionMemberRow)}
                />
              ) : (
                <BatchRow
                  currencyCode={currencyCode}
                  item={item as CollectionBatchSummary}
                  onPress={() => onBatchPress(item as CollectionBatchSummary)}
                />
              )
            }
          />
        )}
      </View>
      {workspace?.nextCursor && !isLoading && !error ? (
        <View className="mt-2 gap-1">
          {loadMoreError ? (
            <Text
              accessibilityRole="alert"
              className="text-sm text-destructive"
            >
              {loadMoreError}
            </Text>
          ) : null}
          <Button
            disabled={isLoadingMore || !isOnline}
            onPress={onLoadMore}
            variant="ghost"
          >
            <Text>
              {isLoadingMore
                ? "Loading…"
                : loadMoreError
                  ? "Try again"
                  : "Load more"}
            </Text>
          </Button>
        </View>
      ) : null}
    </View>
  )
}
