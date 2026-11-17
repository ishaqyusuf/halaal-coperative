import { AppList } from "@/components/app/app-list"
import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { ListCard, RecordRow } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppInfiniteQuery, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import { useEffect, useRef, useState } from "react"
import { ScrollView, View } from "react-native"
import {
  decideAdminMemberOnboarding,
  getAdminMemberDirectory,
  getAdminMemberDirectorySummary,
} from "../api/admin-member-lifecycle-api"
import { CreateMemberSheet } from "../components/create-member-sheet"
import { MemberCapacityRail } from "../components/member-capacity-rail"
import { MemberChangeSheet } from "../components/member-change-sheet"
import type {
  MobileAdminLifecycleQaState,
  MobileAdminMemberKycStatus,
  MobileAdminMemberOnboardingRequest,
  MobileAdminMemberStatus,
} from "../model/admin-member-lifecycle-types"
import { getMemberExpansionPresentation } from "../model/member-expansion-presentation"
import {
  memberLabel,
  memberMeta,
  memberPill,
} from "../model/member-directory-presentation"
import {
  memberDirectoryKeys,
  useRefreshMemberDirectory,
} from "../model/member-directory-queries"

type Filters = {
  status?: MobileAdminMemberStatus
  kycStatus?: MobileAdminMemberKycStatus
  needsReview?: boolean
}

const PAGE_SIZE = 20
const STATUS_OPTIONS = [
  "active",
  "pending",
  "inactive",
  "suspended",
  "exited",
] as const
const KYC_OPTIONS = ["not_started", "pending", "verified", "rejected"] as const
const QUICK_STATUSES = ["active", "pending", "suspended"] as const
const ONBOARDING_OPTIONS = [
  { label: "Approve", value: "approved" },
  { label: "Decline", value: "rejected" },
] as const

function FilterChip({
  count,
  label,
  onPress,
  selected,
}: {
  count?: number
  label: string
  onPress: () => void
  selected: boolean
}) {
  const labelTone = selected ? "text-primary-foreground" : "text-foreground-soft"
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className="min-h-[44px] justify-center"
      onPress={onPress}
    >
      <View
        className={cn(
          "min-h-[36px] flex-row items-center gap-[6px] rounded-full border px-[13px]",
          selected
            ? "border-primary bg-primary"
            : "dark:bg-surface-raised border-border bg-card"
        )}
      >
        <Text className={labelTone} variant="label">
          {label}
        </Text>
        {count === undefined ? null : (
          <Text
            className={selected ? labelTone : "text-muted-foreground"}
            variant="label"
          >
            {count}
          </Text>
        )}
      </View>
    </Pressable>
  )
}

export function AdminMembersScreen({
  qaState = null,
}: {
  qaState?: MobileAdminLifecycleQaState | null
}) {
  const { profile } = useAuthContext()
  const router = useRouter()
  const online = useIsOnline()
  const keys = memberDirectoryKeys()
  const refreshDirectory = useRefreshMemberDirectory()
  const [filters, setFilters] = useState<Filters>({})
  const [draftFilters, setDraftFilters] = useState<Filters>({})
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")
  const [sheet, setSheet] = useState<"filter" | "reviews" | "create" | null>(
    null
  )
  const [request, setRequest] =
    useState<MobileAdminMemberOnboardingRequest | null>(null)
  const nextRequest = useRef<MobileAdminMemberOnboardingRequest | null>(null)
  const nextMemberId = useRef<string | null>(null)

  const canUseMembers =
    qaState !== "denied" && canUseMobileFeatureData(profile, "admin")
  const enabled = canUseMembers && qaState !== "error" && qaState !== "loading"
  const offline = !online || qaState === "offline"
  const searchInput = search.trim().slice(0, 120)

  useEffect(() => {
    const timer = setTimeout(
      () => setSearch(searchDraft),
      searchDraft ? 300 : 0
    )
    return () => clearTimeout(timer)
  }, [searchDraft])

  const summary = useAppQuery({
    enabled,
    networkMode: "always",
    queryKey: keys.summary,
    queryFn: getAdminMemberDirectorySummary,
  })
  const directory = useAppInfiniteQuery({
    enabled,
    networkMode: "always",
    queryKey: [...keys.directory, filters, searchInput],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      getAdminMemberDirectory({
        ...filters,
        page: pageParam,
        pageSize: PAGE_SIZE,
        search: searchInput || undefined,
      }),
    selectItems: (page) => page.members,
    getNextPageParam: ({ page, pageSize, total }) =>
      page * pageSize < total ? page + 1 : undefined,
  })

  const qaEmpty =
    qaState === "empty" || qaState === "error" || qaState === "loading"
  const metadata = qaEmpty ? undefined : summary.data
  const page = qaEmpty ? undefined : directory.data?.pages[0]
  const memberCount = metadata?.total ?? page?.total ?? 0
  const results = qaEmpty ? [] : directory.items
  const seen = new Set<string>()
  const members = results.filter(({ id }) => {
    if (seen.has(id)) return false
    seen.add(id)
    return true
  })
  const filtered = Boolean(
    filters.status || filters.kycStatus || filters.needsReview
  )
  const loading = qaState === "loading" || (enabled && directory.isPending)
  const readFailed =
    qaState === "error" ||
    qaState === "refresh-error" ||
    (directory.isError && !directory.isFetchNextPageError)
  const saved =
    qaState === "stale" ||
    isMobileReadCacheStale(page?.cache) ||
    isMobileReadCacheStale(metadata?.cache)
  const blocked = offline || saved || readFailed
  const canCreate = metadata?.memberExpansion?.status === "available"
  const capacity =
    metadata && getMemberExpansionPresentation(metadata.memberExpansion)
  const onboardingCount =
    metadata?.reviewQueues.find((queue) => queue.key === "membership-approvals")
      ?.count ?? 0
  const kycCount =
    metadata?.reviewQueues.find((queue) => queue.key === "kyc-documents")
      ?.count ?? 0
  const reviewCount = onboardingCount + kycCount
  const matching = page?.total ?? 0

  const draftCount =
    draftFilters.status && draftFilters.kycStatus
      ? undefined
      : draftFilters.status
        ? metadata?.statusCounts[draftFilters.status]
        : draftFilters.kycStatus
          ? metadata?.kycCounts[draftFilters.kycStatus]
          : metadata?.total

  function refresh() {
    if (offline || !enabled) return
    void directory.refetch()
    void summary.refetch()
  }

  function openMember(memberId: string) {
    router.push({
      pathname: "/(admin)/members/[memberId]",
      params: { memberId },
    })
  }

  function openFilters() {
    setDraftFilters({ status: filters.status, kycStatus: filters.kycStatus })
    setSheet("filter")
  }

  const error = readFailed ? "Check your connection and try again." : null

  const headerActions =
    canUseMembers && metadata ? (
      <>
        <View>
          <ScreenHeaderButton
            accessibilityLabel={
              reviewCount
                ? `Member reviews, ${reviewCount} waiting`
                : "Member reviews"
            }
            icon="Bell"
            onPress={() => setSheet("reviews")}
          />
          {reviewCount > 0 ? (
            <View
              pointerEvents="none"
              className="absolute -top-[3px] -right-[3px] min-w-[18px] items-center rounded-full bg-destructive px-[4px]"
            >
              <Text className="text-destructive-foreground" variant="caption">
                {reviewCount}
              </Text>
            </View>
          ) : null}
        </View>
        <View>
          <ScreenHeaderButton
            accessibilityLabel="Filter members"
            icon="SlidersHorizontal"
            onPress={openFilters}
          />
          {filtered ? (
            <View
              pointerEvents="none"
              className="absolute top-[7px] right-[7px] size-[8px] rounded-full bg-primary"
            />
          ) : null}
        </View>
      </>
    ) : undefined

  return (
    <>
      <AppList
        back={false}
        bottomAction={
          canCreate ? (
            <Pressable
              accessibilityLabel="Add member"
              accessibilityRole="button"
              accessibilityState={{ disabled: blocked }}
              className="disabled:bg-surface-raised size-[56px] items-center justify-center rounded-full bg-primary shadow-lg"
              disabled={blocked}
              onPress={() => setSheet("create")}
              testID="admin-members-add"
            >
              <Icon
                className={cn(
                  "size-lg",
                  blocked ? "text-muted-foreground" : "text-primary-foreground"
                )}
                name="Plus"
              />
            </Pressable>
          ) : null
        }
        data={members}
        empty={
          !canUseMembers ? (
            <EmptyState
              title="Member access required"
              description="Ask a workspace owner for permission to manage members."
              icon="ShieldX"
            />
          ) : searchInput ? (
            <EmptyState
              action={{
                label: "Clear search",
                onPress: () => {
                  setSearchDraft("")
                  setSearch("")
                },
              }}
              description="Check the spelling, or search by member number or phone."
              icon="Search"
              title={`No members match “${searchInput}”`}
            />
          ) : filtered ? (
            <EmptyState
              action={{ label: "Clear filters", onPress: () => setFilters({}) }}
              description="Try another status or KYC filter."
              icon="SlidersHorizontal"
              title="No members match these filters"
            />
          ) : (
            <EmptyState
              action={
                canCreate && !blocked
                  ? { label: "Add member", onPress: () => setSheet("create") }
                  : undefined
              }
              description={
                offline
                  ? "Connect to load the member directory."
                  : "Add the first member or approve a membership request."
              }
              icon="UserRoundPlus"
              title={
                offline
                  ? "Member directory unavailable offline"
                  : "No members yet"
              }
            />
          )
        }
        error={canUseMembers ? error : null}
        errorTitle="Couldn’t load members"
        estimatedItemSize={65}
        compactHeader={
          <View className="min-h-[52px] flex-row items-center justify-between gap-[8px] border-b border-border px-[18px]">
            <Text variant="section">Members</Text>
            <View className="flex-row items-center gap-[10px]">
              {headerActions}
            </View>
          </View>
        }
        headerActions={headerActions}
        header={
          canUseMembers ? (
            <View className="gap-[10px]">
              {offline || saved ? (
                <StatusBanner
                  kind={offline ? "offline" : "stale"}
                  title={offline ? "You’re offline" : "Showing saved members"}
                  description={
                    offline
                      ? "Changes are paused until you reconnect."
                      : "Refresh member data before making changes."
                  }
                  onRetry={!offline ? refresh : undefined}
                />
              ) : null}
              {summary.isError && !offline && !saved ? (
                <StatusBanner
                  kind="error"
                  title="Couldn’t load member reviews"
                  description="Pull down to try again."
                />
              ) : null}
              {metadata && !searchInput ? (
                <>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-[8px]">
                      <FilterChip
                        count={metadata.total}
                        label="All"
                        selected={!filtered}
                        onPress={() => setFilters({})}
                      />
                      {QUICK_STATUSES.map((status) => (
                        <FilterChip
                          key={status}
                          count={metadata.statusCounts[status]}
                          label={memberLabel(status)}
                          selected={
                            filters.status === status &&
                            !filters.kycStatus &&
                            !filters.needsReview
                          }
                          onPress={() => setFilters({ status })}
                        />
                      ))}
                      <FilterChip
                        count={metadata.kycCounts.pending}
                        label="KYC pending"
                        selected={
                          filters.kycStatus === "pending" && !filters.status
                        }
                        onPress={() => setFilters({ kycStatus: "pending" })}
                      />
                    </View>
                  </ScrollView>
                  {filtered &&
                  (filters.needsReview ||
                    (filters.kycStatus &&
                      (filters.kycStatus !== "pending" || filters.status)) ||
                    filters.status === "inactive" ||
                    filters.status === "exited") ? (
                    <View className="flex-row flex-wrap gap-[8px]">
                      {filters.status ? (
                        <FilterChip
                          label={`${memberLabel(filters.status)} ×`}
                          selected
                          onPress={() =>
                            setFilters({ ...filters, status: undefined })
                          }
                        />
                      ) : null}
                      {filters.kycStatus ? (
                        <FilterChip
                          label={`${memberPill(filters.kycStatus, true).label} ×`}
                          selected
                          onPress={() =>
                            setFilters({ ...filters, kycStatus: undefined })
                          }
                        />
                      ) : null}
                      {filters.needsReview ? (
                        <FilterChip
                          label="KYC reviews ×"
                          selected
                          onPress={() => setFilters({})}
                        />
                      ) : null}
                    </View>
                  ) : null}
                  {capacity ? (
                    <MemberCapacityRail presentation={capacity} />
                  ) : null}
                  {reviewCount > 0 ? (
                    <Pressable
                      accessibilityRole="button"
                      className="bg-tint-warm min-h-[62px] flex-row items-center gap-[12px] rounded-[18px] px-[12px] py-[10px]"
                      onPress={() => setSheet("reviews")}
                    >
                      <View className="bg-warn/25 size-[36px] items-center justify-center rounded-[12px]">
                        <Icon
                          className="size-base text-tint-warm-foreground"
                          name="Bell"
                        />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-tint-warm-foreground text-[15px]"
                          variant="label"
                        >
                          {reviewCount}{" "}
                          {reviewCount === 1 ? "review" : "reviews"} waiting
                        </Text>
                        <Text
                          className="text-tint-warm-foreground"
                          variant="small"
                        >
                          {[
                            onboardingCount
                              ? `${onboardingCount} membership ${onboardingCount === 1 ? "approval" : "approvals"}`
                              : null,
                            kycCount ? `${kycCount} KYC` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </Text>
                      </View>
                      <Icon
                        className="size-sm text-tint-warm-foreground"
                        name="ChevronRight"
                      />
                    </Pressable>
                  ) : null}
                </>
              ) : null}
              {members.length ? (
                <View className="flex-row items-baseline justify-between pt-[12px]">
                  <Text variant="section">
                    {searchInput
                      ? `${matching} ${matching === 1 ? "result" : "results"}`
                      : filtered
                        ? `${matching} matching`
                        : `${matching} ${matching === 1 ? "member" : "members"}`}
                  </Text>
                  {searchInput ? null : (
                    <Text className="text-muted-foreground" variant="caption">
                      Newest first
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          ) : null
        }
        isFetchingNextPage={directory.isFetchingNextPage}
        isLoading={loading}
        keyExtractor={(member) => member.id}
        listFooter={
          directory.isFetchNextPageError ? (
            <EmptyState
              action={
                !offline
                  ? {
                      label: "Try again",
                      onPress: () => void directory.fetchNextPage(),
                    }
                  : undefined
              }
              description="The members already loaded are still available."
              title="Couldn’t load more members"
            />
          ) : offline && directory.hasNextPage ? (
            <Text className="text-center text-muted-foreground" variant="small">
              Connect to load more members
            </Text>
          ) : null
        }
        onEndReached={
          !offline &&
          !saved &&
          !directory.isPlaceholderData &&
          !directory.isFetching
            ? directory.onEndReached
            : undefined
        }
        onRefresh={enabled && !offline ? refresh : undefined}
        onRetry={!offline ? refresh : undefined}
        refreshing={directory.isRefetching && !directory.isPlaceholderData}
        renderItem={({ item, position }) => {
          const pill =
            item.status !== "active"
              ? memberPill(item.status)
              : item.kycStatus !== "verified"
                ? memberPill(item.kycStatus, true)
                : null
          return (
            <RecordRow
              chevron={!pill}
              meta={memberMeta(item)}
              onPress={() => openMember(item.id)}
              position={position}
              status={pill?.label}
              statusTone={pill?.tone}
              title={item.fullName}
            />
          )
        }}
        search={
          canUseMembers && (memberCount > 10 || searchDraft)
            ? {
                onChangeText: setSearchDraft,
                accessibilityLabel: "Search members",
                placeholder: "Search name, number or phone",
                totalCount: Math.max(memberCount, searchDraft ? 11 : 0),
                value: searchDraft,
              }
            : undefined
        }
        testID="admin-members-screen"
        title="Members"
      />

      <AppSheet
        footer={
          <View className="flex-row gap-[10px]">
            <Button
              className="flex-1"
              onPress={() => setDraftFilters({})}
              variant="secondary"
            >
              <Text>Reset</Text>
            </Button>
            <Button
              className="flex-1"
              onPress={() => {
                setFilters(draftFilters)
                setSheet(null)
              }}
            >
              <Text>
                {draftCount
                  ? `Show ${draftCount} ${draftCount === 1 ? "member" : "members"}`
                  : "Apply filters"}
              </Text>
            </Button>
          </View>
        }
        insetFloatingFooter
        onClose={() => setSheet(null)}
        title="Filter members"
        visible={sheet === "filter"}
      >
        <Text className="text-muted-foreground" variant="label">
          Membership status
        </Text>
        <View className="flex-row flex-wrap gap-x-[8px]">
          <FilterChip
            count={metadata?.total}
            label="Any status"
            selected={!draftFilters.status}
            onPress={() =>
              setDraftFilters({ ...draftFilters, status: undefined })
            }
          />
          {STATUS_OPTIONS.map((status) => (
            <FilterChip
              key={status}
              count={metadata?.statusCounts[status]}
              label={memberLabel(status)}
              selected={draftFilters.status === status}
              onPress={() => setDraftFilters({ ...draftFilters, status })}
            />
          ))}
        </View>
        <Text className="text-muted-foreground" variant="label">
          KYC
        </Text>
        <View className="flex-row flex-wrap gap-x-[8px]">
          <FilterChip
            count={metadata?.total}
            label="Any KYC"
            selected={!draftFilters.kycStatus}
            onPress={() =>
              setDraftFilters({ ...draftFilters, kycStatus: undefined })
            }
          />
          {KYC_OPTIONS.map((kycStatus) => (
            <FilterChip
              key={kycStatus}
              count={metadata?.kycCounts[kycStatus]}
              label={memberLabel(kycStatus)}
              selected={draftFilters.kycStatus === kycStatus}
              onPress={() => setDraftFilters({ ...draftFilters, kycStatus })}
            />
          ))}
        </View>
      </AppSheet>

      <AppSheet
        onClose={() => setSheet(null)}
        onDismissed={() => {
          setRequest(nextRequest.current)
          nextRequest.current = null
        }}
        title="Member reviews"
        visible={sheet === "reviews"}
      >
        {onboardingCount > 0 ? (
          <View className="gap-[8px]">
            <Text className="text-muted-foreground" variant="label">
              Membership approvals · {onboardingCount}
            </Text>
            <ListCard>
              {metadata?.onboardingRequests.map((item) => (
                <RecordRow
                  key={item.id}
                  meta={item.memberNumber}
                  onPress={
                    !blocked
                      ? () => {
                          nextRequest.current = item
                          setSheet(null)
                        }
                      : undefined
                  }
                  title={item.fullName}
                  trailing={
                    <StatusPill
                      label={
                        item.emailVerifiedAt
                          ? "Email verified"
                          : "Email not verified"
                      }
                      tone={item.emailVerifiedAt ? "success" : "warning"}
                    />
                  }
                />
              ))}
            </ListCard>
          </View>
        ) : null}
        {kycCount > 0 ? (
          <ListCard>
            <RecordRow
              avatarIcon="ShieldCheck"
              chevron
              meta={`${kycCount} waiting`}
              onPress={() => {
                setFilters({ needsReview: true })
                setSearchDraft("")
                setSearch("")
                setSheet(null)
              }}
              title="KYC and document reviews"
            />
          </ListCard>
        ) : null}
        {!reviewCount ? (
          <EmptyState
            icon="CircleCheck"
            title="Nothing to review"
            description="Membership approvals and KYC are up to date."
          />
        ) : null}
      </AppSheet>

      {canUseMembers ? (
        <CreateMemberSheet
          blocked={blocked || !canCreate}
          currencyCode={profile?.tenant.currencyCode ?? "NGN"}
          onClose={() => setSheet(null)}
          onCreated={(member) => {
            setFilters({})
            setSearchDraft("")
            setSearch("")
            refreshDirectory(member.id)
          }}
          onOpenMember={(id) => {
            nextMemberId.current = id
            setSheet(null)
          }}
          onDismissed={() => {
            const id = nextMemberId.current
            nextMemberId.current = null
            if (id) openMember(id)
          }}
          visible={sheet === "create"}
          workspaceName={profile?.tenant.name ?? "cooperative"}
        />
      ) : null}

      {request ? (
        <MemberChangeSheet
          blocked={blocked}
          initialValue="approved"
          memberName={request.fullName}
          memberNumber={request.memberNumber}
          onClose={() => setRequest(null)}
          onSubmit={async (decision, reviewNotes) => {
            await decideAdminMemberOnboarding({
              decision,
              requestId: request.id,
              reviewNotes,
            })
            refreshDirectory()
          }}
          options={ONBOARDING_OPTIONS}
          quickFillKind="onboardingNotes"
          title="Review membership"
        />
      ) : null}
    </>
  )
}
