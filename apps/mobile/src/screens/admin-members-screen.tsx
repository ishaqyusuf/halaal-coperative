import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileAdminMembers,
  type MobileAdminMemberKycStatus,
  type MobileAdminMemberRow,
  type MobileAdminMemberStatus,
  type MobileAdminMembers,
} from "@/lib/mobile-home-api"
import { isMockSessionToken } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

type StatusFilter = "all" | MobileAdminMemberStatus
type KycFilter = "all" | MobileAdminMemberKycStatus

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Suspended", value: "suspended" },
]

const kycFilters: { label: string; value: KycFilter }[] = [
  { label: "All KYC", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function FilterButton({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean
  label: string
  onPress: () => void
}) {
  return (
    <Button
      className="h-10 px-3"
      onPress={onPress}
      variant={isSelected ? "secondary" : "outline"}
    >
      <Text>{label}</Text>
    </Button>
  )
}

function MemberCard({
  isFirst,
  member,
  onOpen,
}: {
  isFirst: boolean
  member: MobileAdminMemberRow
  onOpen: () => void
}) {
  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {member.fullName}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {member.memberNumber} - {formatStatus(member.memberType)}
          </Text>
        </View>
        <Text className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
          {formatStatus(member.status)}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">KYC</Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatStatus(member.kycStatus)}
          </Text>
        </View>
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Login
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {member.linkedUserEmail ? "Linked" : "Unlinked"}
          </Text>
        </View>
      </View>

      <View className="gap-1">
        <Text className="text-sm leading-5 text-muted-foreground">
          KYC {formatStatus(member.kycStatus)} - Joined{" "}
          {formatDate(member.joinedAt)}
        </Text>
        {member.email ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {member.email}
          </Text>
        ) : null}
        {member.phoneNumber ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {member.phoneNumber}
          </Text>
        ) : null}
        {member.deductionSourceName ? (
          <Text className="text-sm leading-5 text-muted-foreground">
            {member.deductionSourceName}
          </Text>
        ) : null}
        <Text className="text-xs font-medium text-muted-foreground">
          {member.linkedUserEmail
            ? `Linked login ${member.linkedUserEmail}`
            : "No linked login"}
        </Text>
      </View>

      <Button
        className="h-10 self-start px-3"
        onPress={onOpen}
        variant="outline"
      >
        <Icon name="FileText" className="size-base text-foreground" />
        <Text>Open detail</Text>
      </Button>
    </View>
  )
}

export function AdminMembersScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [members, setMembers] = useState<MobileAdminMembers | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [kycStatus, setKycStatus] = useState<KycFilter>("all")
  const [page, setPage] = useState(1)
  const canUseServerMembers = Boolean(
    profile?.role === "admin" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const hasNextPage = Boolean(
    members && members.page * members.pageSize < members.total
  )
  const stats = useMemo(
    () => [
      {
        detail: "Members matching current filters",
        label: "Total",
        value: String(members?.summary.totalCount ?? 0),
      },
      {
        detail: "Visible on this page",
        label: "Showing",
        value: String(members?.summary.pageCount ?? 0),
      },
      {
        detail: "Active on this page",
        label: "Active",
        value: String(members?.summary.activeCount ?? 0),
      },
      {
        detail: "Needs KYC attention on this page",
        label: "KYC pending",
        value: String(members?.summary.kycPendingCount ?? 0),
      },
    ],
    [
      members?.summary.activeCount,
      members?.summary.kycPendingCount,
      members?.summary.pageCount,
      members?.summary.totalCount,
    ]
  )

  const loadMembers = useCallback(() => {
    let mounted = true

    if (!canUseServerMembers) {
      setMembers(null)
      setError(null)
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileAdminMembers({
      kycStatus: kycStatus === "all" ? undefined : kycStatus,
      page,
      pageSize: 20,
      search: search.trim() || undefined,
      status: status === "all" ? undefined : status,
    })
      .then((response) => {
        if (mounted) {
          setMembers(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Member directory is unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerMembers, kycStatus, page, search, status])

  useEffect(() => loadMembers(), [loadMembers])

  function openMemberDetail(memberId: string) {
    const memberDetailHref = {
      params: { memberId },
      pathname: "/members/[memberId]",
    } as Parameters<typeof router.push>[0]

    router.push(memberDetailHref)
  }

  function applySearch() {
    setPage(1)
    setSearch(searchDraft)
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">Members</Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Search cooperative members and review account readiness from the
            field.
          </Text>
        </View>

        {!canUseServerMembers ? (
          <SectionCard icon="UsersRound" title="Member directory">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production admin account to search and review
              member records.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerMembers ? (
          <>
            <View className="flex-row flex-wrap gap-3">
              {stats.map((item) => (
                <StatCard key={item.label} {...item} />
              ))}
            </View>

            <SectionCard icon="Search" title="Find members">
              <View className="gap-3">
                <View className="flex-row gap-2">
                  <Input
                    className="flex-1"
                    editable={!isLoading}
                    onChangeText={setSearchDraft}
                    placeholder="Name or member number"
                    value={searchDraft}
                  />
                  <Button
                    className="h-12 w-12 px-0"
                    disabled={isLoading}
                    onPress={applySearch}
                  >
                    <Icon
                      name="Search"
                      className="size-base text-primary-foreground"
                    />
                  </Button>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {statusFilters.map((item) => (
                    <FilterButton
                      isSelected={status === item.value}
                      key={item.value}
                      label={item.label}
                      onPress={() => {
                        setPage(1)
                        setStatus(item.value)
                      }}
                    />
                  ))}
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {kycFilters.map((item) => (
                    <FilterButton
                      isSelected={kycStatus === item.value}
                      key={item.value}
                      label={item.label}
                      onPress={() => {
                        setPage(1)
                        setKycStatus(item.value)
                      }}
                    />
                  ))}
                </View>
              </View>
            </SectionCard>

            {error ? (
              <Text className="text-sm font-medium text-destructive">
                {error}
              </Text>
            ) : null}

            <SectionCard icon="UsersRound" title="Member records">
              {isLoading ? (
                <LoadingSpinner />
              ) : members?.members.length ? (
                <View className="gap-3">
                  {members.members.map((member, index) => (
                    <MemberCard
                      isFirst={index === 0}
                      key={member.id}
                      member={member}
                      onOpen={() => openMemberDetail(member.id)}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No members match the current directory filters.
                </Text>
              )}
            </SectionCard>

            <View className="flex-row gap-3">
              <Button
                className="h-11 flex-1"
                disabled={page <= 1 || isLoading}
                onPress={() => setPage((current) => Math.max(current - 1, 1))}
                variant="outline"
              >
                <Icon
                  name="ChevronLeft"
                  className="size-base text-foreground"
                />
                <Text>Previous</Text>
              </Button>
              <Button
                className="h-11 flex-1"
                disabled={!hasNextPage || isLoading}
                onPress={() => setPage((current) => current + 1)}
                variant="outline"
              >
                <Text>Next</Text>
                <Icon
                  name="ChevronRight"
                  className="size-base text-foreground"
                />
              </Button>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
