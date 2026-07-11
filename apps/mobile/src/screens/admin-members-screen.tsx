import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  createMobileAdminMember,
  getMobileAdminMembers,
  reviewMobileAdminMemberOnboarding,
  updateMobileAdminMemberKyc,
  type MobileAdminMemberOnboardingReviewInput,
  type MobileAdminMemberOnboardingRequest,
  type MobileAdminMemberKycStatus,
  type MobileAdminMemberRow,
  type MobileAdminMemberReviewQueue,
  type MobileAdminMemberStatus,
  type MobileAdminMembers,
} from "@/lib/mobile-home-api"
import { isMockSessionToken } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

type StatusFilter = "all" | MobileAdminMemberStatus
type KycFilter = "all" | MobileAdminMemberKycStatus
type MemberTypeDraft = "civil_servant" | "individual" | "business"
type OnboardingReviewDecision =
  MobileAdminMemberOnboardingReviewInput["decision"]

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

const kycReviewStatuses: {
  label: string
  value: MobileAdminMemberKycStatus
}[] = [
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

function parseDateInput(value: string) {
  const trimmed = value.trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null

  const date = new Date(`${trimmed}T00:00:00.000Z`)

  return Number.isNaN(date.getTime()) ? null : date
}

function parseOptionalAmount(value: string) {
  const trimmed = value.replace(/,/g, "").trim()
  if (!trimmed) return undefined

  const amount = Number(trimmed)

  return Number.isFinite(amount) && amount > 0 ? amount : null
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
  actionState,
  isFirst,
  kycReviewMemberId,
  kycReviewNotes,
  kycReviewStatus,
  member,
  onOpenKycReview,
  onOpen,
  onReviewKyc,
  setKycReviewNotes,
  setKycReviewStatus,
}: {
  actionState: "idle" | "pending"
  isFirst: boolean
  kycReviewMemberId: string | null
  kycReviewNotes: string
  kycReviewStatus: MobileAdminMemberKycStatus
  member: MobileAdminMemberRow
  onOpenKycReview: (member: MobileAdminMemberRow | null) => void
  onOpen: () => void
  onReviewKyc: (member: MobileAdminMemberRow) => void
  setKycReviewNotes: (value: string) => void
  setKycReviewStatus: (value: MobileAdminMemberKycStatus) => void
}) {
  const isReviewingKyc = kycReviewMemberId === member.id
  const notesRequired = kycReviewNotes.trim().length < 2

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

      {isReviewingKyc ? (
        <View className="gap-3">
          <Textarea
            editable={actionState !== "pending"}
            onChangeText={setKycReviewNotes}
            placeholder="KYC review notes"
            value={kycReviewNotes}
          />
          <View className="flex-row flex-wrap gap-2">
            {kycReviewStatuses.map((item) => (
              <Button
                className="h-9"
                disabled={actionState === "pending"}
                key={item.value}
                onPress={() => setKycReviewStatus(item.value)}
                variant={
                  kycReviewStatus === item.value ? "secondary" : "outline"
                }
              >
                <Text>{item.label}</Text>
              </Button>
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Button
              className="h-10"
              disabled={actionState === "pending" || notesRequired}
              onPress={() => onReviewKyc(member)}
            >
              <Icon
                name="ShieldCheck"
                className="size-base text-primary-foreground"
              />
              <Text>{actionState === "pending" ? "Saving" : "Save KYC"}</Text>
            </Button>
            <Button
              className="h-10"
              disabled={actionState === "pending"}
              onPress={() => onOpenKycReview(null)}
              variant="outline"
            >
              <Text>Cancel</Text>
            </Button>
          </View>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2">
          <Button
            className="h-10 self-start px-3"
            onPress={onOpen}
            variant="outline"
          >
            <Icon name="FileText" className="size-base text-foreground" />
            <Text>Open detail</Text>
          </Button>
          <Button
            className="h-10 self-start px-3"
            disabled={actionState === "pending"}
            onPress={() => onOpenKycReview(member)}
            variant="outline"
          >
            <Icon name="ShieldCheck" className="size-base text-foreground" />
            <Text>Review KYC</Text>
          </Button>
        </View>
      )}
    </View>
  )
}

function reviewQueueIcon(queueKey: MobileAdminMemberReviewQueue["key"]) {
  if (queueKey === "membership-approvals") return "UserPlus"
  return "FolderCheck"
}

function ReviewQueueCard({ queue }: { queue: MobileAdminMemberReviewQueue }) {
  return (
    <View className="flex-row gap-3 rounded-md bg-secondary p-3">
      <Icon
        name={reviewQueueIcon(queue.key)}
        className="size-base text-accent"
      />
      <View className="flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="flex-1 font-semibold text-foreground">
            {queue.label}
          </Text>
          <Text className="text-sm font-semibold text-foreground">
            {queue.count}
          </Text>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {queue.detail}
        </Text>
      </View>
    </View>
  )
}

function OnboardingRequestCard({
  actionState,
  isFirst,
  onOpenReview,
  onReview,
  onboardingReviewNotes,
  onboardingReviewRequestId,
  request,
  setOnboardingReviewNotes,
}: {
  actionState: "idle" | "pending"
  isFirst: boolean
  onOpenReview: (request: MobileAdminMemberOnboardingRequest | null) => void
  onReview: (
    request: MobileAdminMemberOnboardingRequest,
    decision: OnboardingReviewDecision
  ) => void
  onboardingReviewNotes: string
  onboardingReviewRequestId: string | null
  request: MobileAdminMemberOnboardingRequest
  setOnboardingReviewNotes: (value: string) => void
}) {
  const isReviewing = onboardingReviewRequestId === request.id
  const notesRequired = onboardingReviewNotes.trim().length < 2

  return (
    <View className={isFirst ? "gap-2" : "gap-2 border-t border-border pt-3"}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {request.fullName}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {request.memberNumber} - {request.email}
          </Text>
        </View>
        <Text className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
          {formatStatus(request.status)}
        </Text>
      </View>
      <Text className="text-xs font-medium text-muted-foreground">
        {request.emailVerifiedAt
          ? `Email verified ${formatDate(request.emailVerifiedAt)}`
          : "Email verification pending"}{" "}
        - Requested {formatDate(request.createdAt)}
      </Text>
      {isReviewing ? (
        <View className="gap-3 pt-1">
          <Textarea
            editable={actionState !== "pending"}
            onChangeText={setOnboardingReviewNotes}
            placeholder="Onboarding review notes"
            value={onboardingReviewNotes}
          />
          <View className="flex-row flex-wrap gap-2">
            <Button
              className="h-10"
              disabled={actionState === "pending" || notesRequired}
              onPress={() => onReview(request, "approved")}
            >
              <Icon
                name="UserCheck"
                className="size-base text-primary-foreground"
              />
              <Text>{actionState === "pending" ? "Saving" : "Approve"}</Text>
            </Button>
            <Button
              className="h-10"
              disabled={actionState === "pending" || notesRequired}
              onPress={() => onReview(request, "rejected")}
              variant="outline"
            >
              <Text>Reject</Text>
            </Button>
            <Button
              className="h-10"
              disabled={actionState === "pending"}
              onPress={() => onOpenReview(null)}
              variant="ghost"
            >
              <Text>Cancel</Text>
            </Button>
          </View>
        </View>
      ) : (
        <Button
          className="h-10 self-start px-3"
          disabled={actionState === "pending"}
          onPress={() => onOpenReview(request)}
          variant="outline"
        >
          <Icon name="UserCheck" className="size-base text-foreground" />
          <Text>Review onboarding</Text>
        </Button>
      )}
    </View>
  )
}

export function AdminMembersScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [members, setMembers] = useState<MobileAdminMembers | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [actionKey, setActionKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createMessage, setCreateMessage] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [onboardingReviewRequestId, setOnboardingReviewRequestId] = useState<
    string | null
  >(null)
  const [onboardingReviewNotes, setOnboardingReviewNotes] = useState("")
  const [kycReviewMemberId, setKycReviewMemberId] = useState<string | null>(
    null
  )
  const [kycReviewStatus, setKycReviewStatus] =
    useState<MobileAdminMemberKycStatus>("verified")
  const [kycReviewNotes, setKycReviewNotes] = useState("")
  const [createFullName, setCreateFullName] = useState("")
  const [createMemberNumber, setCreateMemberNumber] = useState("")
  const [createMemberType, setCreateMemberType] =
    useState<MemberTypeDraft>("individual")
  const [createJoinedAt, setCreateJoinedAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [createEmail, setCreateEmail] = useState("")
  const [createPhoneNumber, setCreatePhoneNumber] = useState("")
  const [createMonthlyCommitment, setCreateMonthlyCommitment] = useState("")
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
    } as unknown as Parameters<typeof router.push>[0]

    router.push(memberDetailHref)
  }

  function applySearch() {
    setPage(1)
    setSearch(searchDraft)
  }

  async function handleCreateMember() {
    const joinedAt = parseDateInput(createJoinedAt)
    const monthlyCommitment = parseOptionalAmount(createMonthlyCommitment)

    if (
      isCreating ||
      !joinedAt ||
      !createFullName.trim() ||
      !createMemberNumber.trim() ||
      monthlyCommitment === null
    ) {
      setCreateMessage(
        "Enter a valid name, member number, joined date, and optional commitment."
      )
      return
    }

    setIsCreating(true)
    setCreateMessage(null)
    setError(null)

    try {
      await createMobileAdminMember({
        email: createEmail.trim() || undefined,
        fullName: createFullName.trim(),
        joinedAt: joinedAt.toISOString(),
        memberNumber: createMemberNumber.trim(),
        memberType: createMemberType,
        monthlyCommitment,
        phoneNumber: createPhoneNumber.trim() || undefined,
      })
      setCreateFullName("")
      setCreateMemberNumber("")
      setCreateMemberType("individual")
      setCreateJoinedAt(new Date().toISOString().slice(0, 10))
      setCreateEmail("")
      setCreatePhoneNumber("")
      setCreateMonthlyCommitment("")
      setCreateMessage("Member profile created.")
      setPage(1)
      loadMembers()
    } catch (createError) {
      setCreateMessage(
        createError instanceof Error
          ? createError.message
          : "Member profile could not be created."
      )
    } finally {
      setIsCreating(false)
    }
  }

  async function handleReviewOnboarding(
    request: MobileAdminMemberOnboardingRequest,
    decision: OnboardingReviewDecision
  ) {
    const reviewNotes = onboardingReviewNotes.trim()

    if (reviewNotes.length < 2) {
      setError("Onboarding review notes are required.")
      return
    }

    const nextActionKey = `onboarding-${request.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await reviewMobileAdminMemberOnboarding({
        decision,
        requestId: request.id,
        reviewNotes,
      })
      setOnboardingReviewRequestId(null)
      setOnboardingReviewNotes("")
      setPage(1)
      loadMembers()
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "Onboarding review could not be submitted."
      )
    } finally {
      setActionKey(null)
    }
  }

  async function handleReviewKyc(member: MobileAdminMemberRow) {
    const kycReviewNotesValue = kycReviewNotes.trim()

    if (kycReviewNotesValue.length < 2) {
      setError("KYC review notes are required.")
      return
    }

    const nextActionKey = `kyc-${member.id}`

    setActionKey(nextActionKey)
    setError(null)

    try {
      await updateMobileAdminMemberKyc({
        kycReviewNotes: kycReviewNotesValue,
        kycStatus: kycReviewStatus,
        memberId: member.id,
      })
      setKycReviewMemberId(null)
      setKycReviewNotes("")
      setKycReviewStatus("verified")
      loadMembers()
    } catch (reviewError) {
      setError(
        reviewError instanceof Error
          ? reviewError.message
          : "KYC review could not be submitted."
      )
    } finally {
      setActionKey(null)
    }
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

            <SectionCard icon="UserCheck" title="Review queues">
              {isLoading ? (
                <LoadingSpinner />
              ) : members?.reviewQueues.length ? (
                <View className="gap-3">
                  {members.reviewQueues.map((queue) => (
                    <ReviewQueueCard key={queue.key} queue={queue} />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No onboarding or KYC review queues need attention right now.
                </Text>
              )}
            </SectionCard>

            <SectionCard icon="UserPlus" title="Pending onboarding">
              {isLoading ? (
                <LoadingSpinner />
              ) : members?.onboardingRequests.length ? (
                <View className="gap-3">
                  {members.onboardingRequests.map((request, index) => (
                    <OnboardingRequestCard
                      actionState={
                        actionKey === `onboarding-${request.id}`
                          ? "pending"
                          : "idle"
                      }
                      isFirst={index === 0}
                      key={request.id}
                      onOpenReview={(selectedRequest) => {
                        setOnboardingReviewRequestId(
                          selectedRequest?.id ?? null
                        )
                        setOnboardingReviewNotes("")
                        setKycReviewMemberId(null)
                        setKycReviewNotes("")
                        setError(null)
                      }}
                      onReview={handleReviewOnboarding}
                      onboardingReviewNotes={onboardingReviewNotes}
                      onboardingReviewRequestId={onboardingReviewRequestId}
                      request={request}
                      setOnboardingReviewNotes={setOnboardingReviewNotes}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No pending member onboarding requests are visible in mobile.
                </Text>
              )}
            </SectionCard>

            <SectionCard icon="UserRoundPlus" title="Create member">
              <View className="gap-3">
                <Input
                  editable={!isCreating}
                  onChangeText={setCreateFullName}
                  placeholder="Full name"
                  value={createFullName}
                />
                <Input
                  editable={!isCreating}
                  onChangeText={setCreateMemberNumber}
                  placeholder="Member number"
                  value={createMemberNumber}
                />
                <View className="flex-row flex-wrap gap-2">
                  {(["individual", "civil_servant", "business"] as const).map(
                    (memberType) => (
                      <FilterButton
                        isSelected={createMemberType === memberType}
                        key={memberType}
                        label={formatStatus(memberType)}
                        onPress={() => setCreateMemberType(memberType)}
                      />
                    )
                  )}
                </View>
                <Input
                  editable={!isCreating}
                  onChangeText={setCreateJoinedAt}
                  placeholder="Joined date YYYY-MM-DD"
                  value={createJoinedAt}
                />
                <Input
                  editable={!isCreating}
                  keyboardType="email-address"
                  onChangeText={setCreateEmail}
                  placeholder="Email"
                  value={createEmail}
                />
                <Input
                  editable={!isCreating}
                  keyboardType="phone-pad"
                  onChangeText={setCreatePhoneNumber}
                  placeholder="Phone"
                  value={createPhoneNumber}
                />
                <Input
                  editable={!isCreating}
                  keyboardType="numeric"
                  onChangeText={setCreateMonthlyCommitment}
                  placeholder="Starting commitment"
                  value={createMonthlyCommitment}
                />
                <Button
                  className="h-11"
                  disabled={isCreating}
                  onPress={handleCreateMember}
                >
                  <Icon
                    name="UserPlus"
                    className="size-base text-primary-foreground"
                  />
                  <Text>{isCreating ? "Creating..." : "Create member"}</Text>
                </Button>
                {createMessage ? (
                  <Text className="text-sm font-medium text-muted-foreground">
                    {createMessage}
                  </Text>
                ) : null}
              </View>
            </SectionCard>

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
                      actionState={
                        actionKey === `kyc-${member.id}` ? "pending" : "idle"
                      }
                      isFirst={index === 0}
                      key={member.id}
                      kycReviewMemberId={kycReviewMemberId}
                      kycReviewNotes={kycReviewNotes}
                      kycReviewStatus={kycReviewStatus}
                      member={member}
                      onOpenKycReview={(selectedMember) => {
                        setKycReviewMemberId(selectedMember?.id ?? null)
                        setKycReviewStatus(
                          selectedMember
                            ? (selectedMember.kycStatus as MobileAdminMemberKycStatus)
                            : "verified"
                        )
                        setKycReviewNotes("")
                        setOnboardingReviewRequestId(null)
                        setOnboardingReviewNotes("")
                        setError(null)
                      }}
                      onOpen={() => openMemberDetail(member.id)}
                      onReviewKyc={handleReviewKyc}
                      setKycReviewNotes={setKycReviewNotes}
                      setKycReviewStatus={setKycReviewStatus}
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
