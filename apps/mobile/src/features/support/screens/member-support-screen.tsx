import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { FloatingSearchButton } from "@/components/search/floating-search-field"
import { Icon } from "@/components/ui/icon"
import {
  initialsFor,
  useCardShadow,
  type RowPosition,
} from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SegmentedControl } from "@/components/ui/segmented-control"
import {
  SegmentedPager,
  usePagerPosition,
} from "@/components/ui/segmented-pager"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { useRef, useState } from "react"
import { View } from "react-native"
import {
  authorName,
  caseStatus,
  isActiveCase,
  previewTime,
  supportCategories,
} from "../model/member-support-presentation"
import type {
  MobileMemberSupport,
  MobileSupportCase,
} from "../model/member-support-types"

const rowCorners: Record<RowPosition, string> = {
  first: "rounded-t-[20px]",
  last: "rounded-b-[20px]",
  middle: "",
  only: "rounded-[20px]",
}

export function SupportAvatar({
  name,
  member = false,
  small = false,
}: {
  name: string
  member?: boolean
  small?: boolean
}) {
  const sky = !member && name.charCodeAt(0) % 2 !== 0
  return (
    <View
      className={cn(
        "shrink-0 items-center justify-center rounded-full",
        small ? "size-[32px]" : "size-[44px]",
        member ? "bg-accent" : sky ? "bg-tint-sky" : "bg-tint-lilac"
      )}
      importantForAccessibility="no"
    >
      <Text
        className={cn(
          !small && "text-[15px]",
          member
            ? "text-accent-foreground"
            : sky
              ? "text-tint-sky-foreground"
              : "text-tint-lilac-foreground"
        )}
        variant="caption"
      >
        {initialsFor(name)}
      </Text>
    </View>
  )
}

function ConversationRow({
  item,
  onOpen,
  position,
  timezone,
  cooperative,
  memberName,
}: {
  item: MobileSupportCase
  onOpen: () => void
  position: RowPosition
  timezone: string
  cooperative: string
  memberName: string
}) {
  const message = item.recentMessages.at(-1)
  const member = message?.authorType === "member"
  const name = member
    ? memberName
    : message
      ? authorName(message, cooperative)
      : cooperative
  const status = caseStatus(item.status)
  return (
    <View className={cn("mx-[18px] bg-card", rowCorners[position])}>
      {position === "middle" || position === "last" ? (
        <View className="ml-[70px] h-px bg-border" />
      ) : null}
      <Pressable
        accessibilityLabel={`${item.subject}, ${status.label}`}
        accessibilityRole="button"
        className={cn(
          "active:bg-surface-raised flex-row items-start gap-[12px] px-[14px] py-[13px]",
          rowCorners[position]
        )}
        onPress={onOpen}
      >
        <SupportAvatar member={member} name={name} />
        <View className="min-w-0 flex-1 gap-[2px]">
          <View className="flex-row items-start gap-[8px]">
            <View className="min-w-0 flex-1 flex-row items-center gap-[6px]">
              <Text className="shrink" numberOfLines={1} variant="section">
                {item.subject}
              </Text>
              {item.status === "waiting_on_member" ? (
                <View className="bg-brand-warm size-[8px] rounded-full" />
              ) : null}
            </View>
            <Text className="text-muted-foreground" variant="caption">
              {previewTime(message?.createdAt ?? item.lastActivityAt, timezone)}
            </Text>
          </View>
          <Text
            className="text-muted-foreground"
            numberOfLines={2}
            variant="small"
          >
            <Text className="text-foreground-soft font-bold" variant="small">
              {member ? "You" : name.split(" ")[0]}
              {": "}
            </Text>
            {message?.message ?? item.detail}
          </Text>
          <View className="mt-[4px] flex-row flex-wrap items-center gap-x-[8px] gap-y-[4px]">
            <StatusPill
              className="min-h-[24px]"
              label={status.label}
              tone={status.tone}
            />
            <Text className="text-muted-foreground" variant="caption">
              {supportCategories[item.category].label}
              {item.moneyImpactRequested ? " · Money-impact review" : ""}
            </Text>
          </View>
        </View>
      </Pressable>
    </View>
  )
}

export function SupportNavButton({
  icon,
  label,
  onPress,
}: {
  icon: string
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className="bg-surface-raised size-[40px] items-center justify-center rounded-full"
      hitSlop={4}
      onPress={onPress}
    >
      <Icon className="size-[22px] text-foreground" name={icon} />
    </Pressable>
  )
}

export function MemberSupportList({
  cooperative,
  timezone,
  data,
  cases,
  online,
  stale,
  loading,
  error,
  canUseSupport,
  draft,
  hasNext,
  paging,
  refreshing,
  refresh,
  next,
  open,
  create,
  back,
  lane,
  setLane,
}: {
  cooperative: string
  timezone: string
  data?: MobileMemberSupport
  cases: MobileSupportCase[]
  online: boolean
  stale: boolean
  loading: boolean
  error: boolean
  canUseSupport: boolean
  draft: boolean
  hasNext: boolean
  paging: boolean
  refreshing: boolean
  refresh: () => void
  next: () => void
  open: (id: string) => void
  create: () => void
  back: () => void
  lane: 0 | 1
  setLane: (lane: 0 | 1) => void
}) {
  const position = usePagerPosition(lane)
  const colors = useColors()
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState("")
  const searchWasFocused = useRef(false)
  const query = search.trim().toLocaleLowerCase()
  const hasCases = Boolean(cases.length)
  const openCount = data?.summary.openCases ?? 0
  const totalCount = data?.summary.totalCases ?? 0
  const canCreate = data?.canCreateCase === true && data.state === "available"
  const showSearch = totalCount > 10
  const shadow = useCardShadow()
  const options = [
    { label: `Active · ${openCount}`, value: "active" },
    { label: `Finished · ${totalCount - openCount}`, value: "finished" },
  ] as const

  const renderLane = (index: number) => {
    const active = index === lane
    const items = cases.filter((item) =>
      query
        ? item.subject.toLocaleLowerCase().includes(query) ||
          item.detail.toLocaleLowerCase().includes(query) ||
          item.recentMessages.some((message) =>
            message.message.toLocaleLowerCase().includes(query)
          )
        : isActiveCase(item) === (index === 0)
    )
    const laneCount = index === 0 ? openCount : totalCount - openCount
    const canPage =
      active &&
      !query &&
      online &&
      !stale &&
      hasNext &&
      items.length < laneCount
    const empty =
      !canUseSupport || data?.state === "member_profile_missing" ? (
        <EmptyState
          icon="Headphones"
          title="Support is unavailable"
          description="Sign in with a linked member profile to create and track cases."
        />
      ) : query ? (
        <EmptyState
          icon="Search"
          title="No matching cases"
          description={`Nothing in your loaded cases matches “${search.trim()}”.`}
          action={{ label: "Clear search", onPress: () => setSearch("") }}
        />
      ) : !hasCases && online ? (
        <EmptyState
          action={
            canCreate
              ? {
                  label: "New support case",
                  onPress: create,
                  variant: "default",
                }
              : undefined
          }
          description={`Ask about payments, receipts or your account. ${cooperative} replies here in the app.`}
          icon="Headphones"
          title="No support cases yet"
        />
      ) : !hasCases ? (
        <EmptyState
          icon="WifiOff"
          title="You’re offline"
          description="Connect to see your support cases."
        />
      ) : canPage ? (
        <Text
          className="px-[18px] text-center text-muted-foreground"
          variant="small"
        >
          Checking for older cases…
        </Text>
      ) : (
        <EmptyState
          description={
            index === 0
              ? "When you ask for help, the conversation stays here until it’s resolved."
              : "Resolved and closed cases appear here."
          }
          icon={index === 0 ? "Inbox" : "CircleCheck"}
          title={index === 0 ? "No open cases" : "Nothing finished yet"}
        />
      )
    return (
      <AppList
        active={active}
        back={false}
        bottomAction={
          active && !searchOpen && (showSearch || (canCreate && hasCases)) ? (
            <View className="flex-1 flex-row items-center justify-between">
              <View>
                {showSearch ? (
                  <FloatingSearchButton
                    accessibilityLabel="Search your cases"
                    onPress={() => setSearchOpen(true)}
                  />
                ) : null}
              </View>
              {canCreate && hasCases ? (
                <View
                  style={{
                    ...shadow,
                    backgroundColor: colors.primary,
                    borderRadius: 26,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    className="h-[52px] flex-row items-center gap-[8px] rounded-full bg-primary pr-[20px] pl-[16px]"
                    onPress={create}
                  >
                    <Icon
                      className="size-[20px] text-primary-foreground"
                      name={draft ? "Pencil" : "Plus"}
                    />
                    <Text className="text-primary-foreground" variant="section">
                      {draft ? "Continue case" : "New case"}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ) : undefined
        }
        data={items}
        empty={empty}
        error={
          error && online && !data
            ? "Check your connection, then try again. Your cases are safe."
            : null
        }
        errorTitle="Support didn’t load"
        estimatedItemSize={115}
        fixedHeader={<SupportListHeader back={back} />}
        fullWidthBottomAction
        header={
          <>
            {hasCases && !query ? (
              <SegmentedControl
                accessibilityLabel="Case lanes"
                onChange={(nextLane) => setLane(nextLane === "active" ? 0 : 1)}
                options={options}
                position={position}
                value={lane === 0 ? "active" : "finished"}
              />
            ) : null}
            {!online && data ? (
              <StatusBanner
                description={
                  data.cache
                    ? `Showing cases saved at ${previewTime(data.cache.cachedAt, timezone)}.`
                    : "Showing your saved cases."
                }
                kind="offline"
                title="You’re offline"
              />
            ) : null}
            {online && (stale || (data && error)) ? (
              <StatusBanner
                description="Showing your saved cases."
                kind="error"
                onRetry={refresh}
                retrying={refreshing}
                title="Couldn’t refresh"
              />
            ) : null}
            {data?.state === "available" && !canCreate ? (
              <StatusBanner
                description="Your existing conversations are still available here."
                kind="info"
                title="New cases are turned off"
              />
            ) : null}
            {query ? (
              <View className="flex-row items-center justify-between">
                <Text variant="section">Results</Text>
                <Text className="text-muted-foreground" variant="caption">
                  {items.length} found
                </Text>
              </View>
            ) : null}
          </>
        }
        isFetchingNextPage={active && paging}
        isLoading={loading && online}
        keyExtractor={(item) => item.id}
        listFooter={
          query && items.length > 0 ? (
            <Text
              className="text-center text-muted-foreground"
              variant="caption"
            >
              Matches in loaded cases
            </Text>
          ) : undefined
        }
        onEndReached={canPage ? next : undefined}
        onRefresh={active && online && canUseSupport ? refresh : undefined}
        onRetry={refresh}
        refreshing={active && refreshing}
        renderItem={({ item, position: row }) => (
          <ConversationRow
            cooperative={cooperative}
            item={item}
            memberName={data?.member?.name ?? "You"}
            onOpen={() => open(item.id)}
            position={row}
            timezone={timezone}
          />
        )}
        search={
          active && searchOpen
            ? {
                autoFocus: true,
                localSearch: true,
                onChangeText: setSearch,
                onFocusChange: (focused) => {
                  if (focused) searchWasFocused.current = true
                  else if (searchWasFocused.current) {
                    searchWasFocused.current = false
                    if (!search.trim()) setSearchOpen(false)
                  }
                },
                placeholder: "Search your cases",
                totalCount,
                value: search,
              }
            : undefined
        }
        searchBottomOffset={6}
        title="Support"
      />
    )
  }

  return (
    <View className="flex-1 bg-background">
      <SegmentedPager
        disabled={!hasCases || searchOpen}
        fill
        index={lane}
        onIndexChange={(index) => setLane(index === 1 ? 1 : 0)}
        pages={[() => renderLane(0), () => renderLane(1)]}
        position={position}
      />
    </View>
  )
}

function SupportListHeader({ back }: { back: () => void }) {
  return (
    <View className="min-h-[52px] flex-row items-center px-[12px]">
      <SupportNavButton icon="ChevronLeft" label="Go back" onPress={back} />
    </View>
  )
}
