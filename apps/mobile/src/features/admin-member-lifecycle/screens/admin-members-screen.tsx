import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { CalendarDateField } from "@/components/app/calendar-date-field"
import { useFormCalendar } from "@/hooks/use-form-calendar"
import { ListCreateFab } from "@/components/app/list-create-fab"
import { ScreenHeader } from "@/components/app/screen-header"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { canRoleManageSubscription } from "@/lib/mobile-subscription-policy"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  Keyboard,
  Pressable,
  ScrollView,
  View,
  type TextInput,
} from "react-native"
import {
  createAdminMemberProfile,
  decideAdminMemberOnboarding,
  getAdminMemberDirectory,
  reviewAdminMemberKyc,
} from "../api/admin-member-lifecycle-api"
import { presentAdminMembersForQa } from "../model/admin-member-lifecycle-qa"
import type {
  MobileAdminLifecycleQaState,
  MobileAdminMemberKycStatus,
  MobileAdminMemberOnboardingRequest,
  MobileAdminMemberRow,
  MobileAdminMembers,
  MobileAdminMemberStatus,
} from "../model/admin-member-lifecycle-types"
import { getMemberExpansionPresentation } from "../model/member-expansion-presentation"
import { MemberCapacityRail } from "../components/member-capacity-rail"

type MemberType = "civil_servant" | "individual" | "business"
type ReviewIntent =
  | { kind: "create" }
  | { kind: "kyc"; member: MobileAdminMemberRow }
  | {
      decision: "approved" | "rejected"
      kind: "onboarding"
      request: MobileAdminMemberOnboardingRequest
    }

const defaultJoinedDate = new Date().toISOString().slice(0, 10)

const statusFilters: Array<{
  label: string
  value: "all" | MobileAdminMemberStatus
}> = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Pending", value: "pending" },
  { label: "Suspended", value: "suspended" },
]

const kycFilters: Array<{
  label: string
  value: "all" | MobileAdminMemberKycStatus
}> = [
  { label: "All KYC", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Verified", value: "verified" },
  { label: "Rejected", value: "rejected" },
]

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function FormField({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-foreground">{label}</Text>
      {children}
    </View>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    currency: "NGN",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null
  const result = new Date(`${value.trim()}T00:00:00.000Z`)
  return Number.isNaN(result.getTime()) ? null : result
}

function parseOptionalAmount(value: string) {
  if (!value.trim()) return undefined
  const amount = Number(value.replace(/,/g, ""))
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

function FilterButton({
  fullWidth = false,
  label,
  onPress,
  selected,
}: {
  fullWidth?: boolean
  label: string
  onPress: () => void
  selected: boolean
}) {
  return (
    <Button
      accessibilityState={{ selected }}
      className={cn(
        "px-3",
        fullWidth ? "h-auto min-h-12 w-full justify-start py-3" : "h-11"
      )}
      onPress={onPress}
      role={fullWidth ? "radio" : undefined}
      variant={selected ? "secondary" : "ghost"}
    >
      {fullWidth ? (
        <View
          className={cn(
            "size-5 items-center justify-center rounded-full border-2",
            selected ? "border-brand" : "border-border"
          )}
        >
          {selected ? <View className="bg-brand size-2 rounded-full" /> : null}
        </View>
      ) : null}
      <Text className={cn(fullWidth && "min-w-0 flex-1")}>{label}</Text>
    </Button>
  )
}

function MemberRow({
  member,
  onOpen,
  onReviewKyc,
}: {
  member: MobileAdminMemberRow
  onOpen: () => void
  onReviewKyc: () => void
}) {
  const initials = member.fullName
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
  const kycNeedsReview = member.kycStatus !== "verified"
  const kycToneClass =
    member.kycStatus === "verified"
      ? "bg-success"
      : member.kycStatus === "rejected"
        ? "bg-destructive"
        : "bg-warn"

  return (
    <View className="min-h-20 flex-row items-center gap-2 border-b border-border py-3">
      <Pressable
        accessibilityLabel={`Open ${member.fullName}`}
        accessibilityRole="button"
        className="min-w-0 flex-1 flex-row items-center gap-3 active:bg-accent"
        onPress={onOpen}
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-accent">
          <Text className="text-sm font-extrabold text-accent-foreground">
            {initials}
          </Text>
        </View>
        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-extrabold text-foreground">
            {member.fullName}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {member.memberNumber} · {formatStatus(member.status)} ·{" "}
            {formatStatus(member.memberType)}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            <View className={`h-2 w-2 rounded-full ${kycToneClass}`} />
            <Text className="text-xs font-semibold text-muted-foreground">
              {member.kycStatus === "verified"
                ? "KYC verified"
                : `${formatStatus(member.kycStatus)} KYC`}
            </Text>
            <Text className="text-xs text-muted-foreground">·</Text>
            <Text className="text-xs text-muted-foreground">
              {member.linkedUserEmail ? "Login linked" : "Login unlinked"}
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {member.deductionSourceName ?? "No collection source"} ·{" "}
            {member.activeMonthlyCommitment
              ? `${formatCurrency(member.activeMonthlyCommitment)} monthly obligation`
              : "No active monthly obligation"}
          </Text>
        </View>
      </Pressable>
      {kycNeedsReview ? (
        <Button
          accessibilityLabel={`Review ${member.fullName} KYC`}
          className="h-11 px-2"
          onPress={onReviewKyc}
          variant="ghost"
        >
          <Text className="text-xs font-extrabold text-primary">Review</Text>
        </Button>
      ) : (
        <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      )}
    </View>
  )
}

function MetricStrip({ members }: { members: MobileAdminMembers | null }) {
  const useStackedLayout = useLargeTextLayout()
  const metrics = [
    { label: "Members", value: members?.summary.totalCount ?? 0 },
    { label: "KYC pending", value: members?.summary.kycPendingCount ?? 0 },
    { label: "Login linked", value: members?.summary.linkedUsersCount ?? 0 },
  ]

  return (
    <View
      className={cn("border-y border-border", !useStackedLayout && "flex-row")}
    >
      {metrics.map((metric, index) => (
        <View
          className={cn(
            "min-w-0 py-3",
            useStackedLayout
              ? index < metrics.length - 1 && "border-b border-border"
              : "flex-1",
            !useStackedLayout &&
              (index === 0 ? "pr-3" : "border-l border-border px-3")
          )}
          key={metric.label}
        >
          <Text className="text-xs font-bold text-muted-foreground">
            {metric.label}
          </Text>
          <Text className="mt-1 text-xl font-extrabold text-foreground">
            {metric.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function AdminMembersScreen({
  qaState = null,
}: {
  qaState?: MobileAdminLifecycleQaState | null
}) {
  const { profile } = useAuthContext()
  const colors = useColors()
  const useStackedLayout = useLargeTextLayout()
  const router = useRouter()
  const [members, setMembers] = useState<MobileAdminMembers | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [searchDraft, setSearchDraft] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"all" | MobileAdminMemberStatus>("all")
  const [kycFilter, setKycFilter] = useState<
    "all" | MobileAdminMemberKycStatus
  >("all")
  const [createVisible, setCreateVisible] = useState(false)
  const createCalendar = useFormCalendar(createVisible)
  const [compactVisible, setCompactVisible] = useState(false)
  const [filterVisible, setFilterVisible] = useState(false)
  const [queueVisible, setQueueVisible] = useState(false)
  const [reviewVisible, setReviewVisible] = useState(false)
  const [successVisible, setSuccessVisible] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null)
  const reopenIntentRef = useRef<ReviewIntent | null>(null)
  const queueIntentRef = useRef<ReviewIntent | null>(null)
  const showReviewAfterFormRef = useRef(false)
  const showSuccessAfterReviewRef = useRef(false)

  const memberNumberRef = useRef<TextInput>(null)
  const emailRef = useRef<TextInput>(null)
  const phoneNumberRef = useRef<TextInput>(null)
  const monthlyCommitmentRef = useRef<TextInput>(null)

  const [fullName, setFullName] = useState("")
  const [memberNumber, setMemberNumber] = useState("")
  const [memberType, setMemberType] = useState<MemberType>("individual")
  const [joinedAt, setJoinedAt] = useState(defaultJoinedDate)
  const [email, setEmail] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [monthlyCommitment, setMonthlyCommitment] = useState("")
  const [reviewNotes, setReviewNotes] = useState("")
  const [kycStatus, setKycStatus] =
    useState<MobileAdminMemberKycStatus>("verified")
  const [onboardingDecision, setOnboardingDecision] = useState<
    "approved" | "rejected"
  >("approved")
  const [draftStatus, setDraftStatus] = useState<
    "all" | MobileAdminMemberStatus
  >(status)
  const [draftKycFilter, setDraftKycFilter] = useState<
    "all" | MobileAdminMemberKycStatus
  >(kycFilter)

  const canUseMembers =
    qaState !== "denied" && canUseMobileFeatureData(profile, "admin")
  const stale = isMobileReadCacheStale(members?.cache)
  const canManagePlan = canRoleManageSubscription(profile?.cooperativeRole)
  const memberExpansionPresentation = members
    ? getMemberExpansionPresentation(members.memberExpansion)
    : null
  const hasNextPage = Boolean(
    members && page * members.pageSize < members.total
  )
  const hasMultiplePages = Boolean(
    members && (page > 1 || members.total > members.pageSize)
  )
  const reviewQueueCount = useMemo(
    () =>
      members?.reviewQueues.reduce((total, queue) => total + queue.count, 0) ??
      0,
    [members?.reviewQueues]
  )
  const draft = useMemo(
    () => ({
      email,
      fullName,
      joinedAt,
      memberNumber,
      memberType,
      monthlyCommitment,
      onboardingDecision,
      phoneNumber,
      reviewNotes,
      kycStatus,
    }),
    [
      email,
      fullName,
      joinedAt,
      kycStatus,
      memberNumber,
      memberType,
      monthlyCommitment,
      onboardingDecision,
      phoneNumber,
      reviewNotes,
    ]
  )
  const clearDraft = useMobileFormDraft({
    enabled: canUseMembers,
    key: "admin.member-lifecycle.forms",
    onHydrate: (value) => {
      setEmail(value.email)
      setFullName(value.fullName)
      setJoinedAt(value.joinedAt)
      setMemberNumber(value.memberNumber)
      setMemberType(value.memberType)
      setMonthlyCommitment(value.monthlyCommitment)
      setOnboardingDecision(value.onboardingDecision)
      setPhoneNumber(value.phoneNumber)
      setReviewNotes(value.reviewNotes)
      setKycStatus(value.kycStatus)
    },
    value: draft,
  })
  const hasCreateDraft = Boolean(
    fullName.trim() ||
    memberNumber.trim() ||
    email.trim() ||
    phoneNumber.trim() ||
    monthlyCommitment.trim() ||
    memberType !== "individual" ||
    joinedAt !== defaultJoinedDate
  )

  const loadMembers = useCallback(() => {
    let mounted = true
    if (!canUseMembers)
      return () => {
        mounted = false
      }
    if (qaState === "error") {
      setMembers(null)
      setError("Member directory is unavailable.")
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }
    if (qaState === "loading") {
      setMembers(null)
      setError(null)
      setIsLoading(true)
      return () => {
        mounted = false
      }
    }
    setIsLoading(true)
    setError(null)
    void getAdminMemberDirectory({
      kycStatus: kycFilter === "all" ? undefined : kycFilter,
      page,
      pageSize: 20,
      search: search || undefined,
      status: status === "all" ? undefined : status,
    })
      .then(
        (response) =>
          mounted && setMembers(presentAdminMembersForQa(response, qaState))
      )
      .catch(() => mounted && setError("Member directory is unavailable."))
      .finally(() => mounted && setIsLoading(false))
    return () => {
      mounted = false
    }
  }, [canUseMembers, kycFilter, page, qaState, search, status])

  useEffect(() => loadMembers(), [loadMembers])

  function resetForms() {
    setFullName("")
    setMemberNumber("")
    setMemberType("individual")
    setJoinedAt(defaultJoinedDate)
    setEmail("")
    setPhoneNumber("")
    setMonthlyCommitment("")
    setReviewNotes("")
    setKycStatus("verified")
    setOnboardingDecision("approved")
  }

  function openFilterSheet() {
    setDraftStatus(status)
    setDraftKycFilter(kycFilter)
    setFilterVisible(true)
  }

  function applyFilters() {
    setPage(1)
    setStatus(draftStatus)
    setKycFilter(draftKycFilter)
    setFilterVisible(false)
  }

  function openKycReview(member: MobileAdminMemberRow) {
    setReviewIntent({ kind: "kyc", member })
    setKycStatus(member.kycStatus === "verified" ? "verified" : "pending")
    setReviewNotes("")
    setCompactVisible(true)
  }

  function openOnboardingReview(request: MobileAdminMemberOnboardingRequest) {
    setReviewIntent({
      decision: onboardingDecision,
      kind: "onboarding",
      request,
    })
    setReviewNotes("")
    setCompactVisible(true)
  }

  function openQueueIntent(intent: ReviewIntent) {
    queueIntentRef.current = intent
    setQueueVisible(false)
  }

  function queueDismissed() {
    const intent = queueIntentRef.current
    queueIntentRef.current = null
    if (!intent) return
    if (intent.kind === "onboarding") {
      openOnboardingReview(intent.request)
      return
    }
    if (intent.kind === "kyc") openKycReview(intent.member)
  }

  function requestReview(intent: ReviewIntent) {
    if (stale) {
      setError("Refresh member data before making a change.")
      return
    }
    if (intent.kind === "create") {
      const amount = parseOptionalAmount(monthlyCommitment)
      if (
        !fullName.trim() ||
        !memberNumber.trim() ||
        !parseDate(joinedAt) ||
        amount === null
      ) {
        setError(
          "Enter a valid name, member number, joined date, and optional commitment."
        )
        return
      }
    } else if (reviewNotes.trim().length < 2) {
      setError("Review notes are required.")
      return
    }
    setReviewIntent(intent)
    showReviewAfterFormRef.current = true
    intent.kind === "create"
      ? setCreateVisible(false)
      : setCompactVisible(false)
  }

  function formDismissed() {
    if (!showReviewAfterFormRef.current) return
    showReviewAfterFormRef.current = false
    setReviewVisible(true)
  }

  async function confirmReview() {
    if (!reviewIntent || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      if (reviewIntent.kind === "create") {
        await createAdminMemberProfile({
          email: email.trim() || undefined,
          fullName: fullName.trim(),
          joinedAt: parseDate(joinedAt)!.toISOString(),
          memberNumber: memberNumber.trim(),
          memberType,
          monthlyCommitment:
            parseOptionalAmount(monthlyCommitment) ?? undefined,
          phoneNumber: phoneNumber.trim() || undefined,
        })
        setSuccessMessage(
          `${fullName.trim()} was added to the member registry.`
        )
      } else if (reviewIntent.kind === "kyc") {
        await reviewAdminMemberKyc({
          kycReviewNotes: reviewNotes.trim(),
          kycStatus,
          memberId: reviewIntent.member.id,
        })
        setSuccessMessage(
          `${reviewIntent.member.fullName}'s KYC is now ${formatStatus(kycStatus).toLowerCase()}.`
        )
      } else {
        await decideAdminMemberOnboarding({
          decision: reviewIntent.decision,
          requestId: reviewIntent.request.id,
          reviewNotes: reviewNotes.trim(),
        })
        setSuccessMessage(
          `${reviewIntent.request.fullName}'s onboarding was ${reviewIntent.decision}.`
        )
      }
      await clearDraft()
      resetForms()
      showSuccessAfterReviewRef.current = true
      setReviewVisible(false)
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The member action could not be completed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function reviewDismissed() {
    if (showSuccessAfterReviewRef.current) {
      showSuccessAfterReviewRef.current = false
      setPage(1)
      loadMembers()
      setSuccessVisible(true)
      return
    }
    const reopen = reopenIntentRef.current
    reopenIntentRef.current = null
    if (!reopen) return
    reopen.kind === "create" ? setCreateVisible(true) : setCompactVisible(true)
  }

  const reviewRows =
    reviewIntent?.kind === "create"
      ? [
          {
            detail: memberNumber,
            icon: "UserPlus",
            label: fullName,
            value: formatStatus(memberType),
          },
          {
            detail: "Member start date",
            icon: "CalendarClock",
            label: "Joined",
            value: formatDate(joinedAt),
          },
          {
            detail: email || "No email supplied",
            icon: "Mail",
            label: "Contact",
            value: phoneNumber || "No phone supplied",
          },
          {
            detail: "Monthly starting commitment",
            icon: "HandCoins",
            label: "Commitment",
            value:
              parseOptionalAmount(monthlyCommitment) === undefined
                ? "Not set"
                : formatCurrency(parseOptionalAmount(monthlyCommitment)!),
          },
        ]
      : reviewIntent?.kind === "kyc"
        ? [
            {
              detail: reviewNotes,
              icon: "ShieldCheck",
              label: reviewIntent.member.fullName,
              value: formatStatus(kycStatus),
            },
          ]
        : reviewIntent?.kind === "onboarding"
          ? [
              {
                detail: reviewNotes,
                icon: "UserCheck",
                label: reviewIntent.request.fullName,
                value: formatStatus(reviewIntent.decision),
              },
            ]
          : []

  if (!profile) return null

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView
        contentContainerClassName="gap-4 px-5 pb-24 pt-5"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader title="Members" />

        {!canUseMembers ? (
          <EmptyState
            description="Use an authorized member-operations workspace to load the registry."
            icon="ShieldX"
            title="Member access required"
          />
        ) : (
          <>
            {isLoading && !members ? (
              <LoadingSpinner />
            ) : error && !members ? (
              <View className="gap-4 py-8">
                <EmptyState
                  description="The signed workspace could not load the member registry."
                  icon="AlertTriangle"
                  title="Member directory unavailable"
                />
                <Button
                  accessibilityLabel="Retry member directory"
                  className="h-11 self-center px-5"
                  onPress={() => loadMembers()}
                  variant="outline"
                >
                  <Icon className="size-sm text-foreground" name="RefreshCw" />
                  <Text>Retry</Text>
                </Button>
              </View>
            ) : (
              <>
                <CachedReadBanner
                  action="creating or reviewing members"
                  cache={members?.cache}
                  label="member directory"
                />
                {error ? (
                  <View className="border-y border-destructive/30 py-3">
                    <Text className="text-sm font-semibold text-destructive">
                      {error}
                    </Text>
                  </View>
                ) : null}

                <MetricStrip members={members} />

                {memberExpansionPresentation ? (
                  <MemberCapacityRail
                    canManagePlan={canManagePlan}
                    onViewPlan={() => router.push("/subscription")}
                    presentation={memberExpansionPresentation}
                  />
                ) : null}

                {reviewQueueCount > 0 ? (
                  <Pressable
                    accessibilityLabel={`Open ${reviewQueueCount} member reviews`}
                    accessibilityRole="button"
                    className="min-h-12 flex-row items-center gap-3 border-b border-border active:bg-accent"
                    onPress={() => setQueueVisible(true)}
                  >
                    <View className="bg-warn h-2 w-2 rounded-full" />
                    <Text className="min-w-0 flex-1 text-sm font-extrabold text-foreground">
                      {reviewQueueCount} member{" "}
                      {reviewQueueCount === 1 ? "review" : "reviews"} need
                      attention
                    </Text>
                    <Text className="text-xs font-extrabold text-primary">
                      Open queue
                    </Text>
                    <Icon
                      className="size-sm text-primary"
                      name="ChevronRight"
                    />
                  </Pressable>
                ) : null}

                <View className="flex-row gap-2">
                  <Input
                    accessibilityLabel="Search members"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="flex-1"
                    onChangeText={setSearchDraft}
                    onSubmitEditing={() => {
                      Keyboard.dismiss()
                      setPage(1)
                      setSearch(searchDraft.trim())
                    }}
                    placeholder="Search members"
                    returnKeyType="search"
                    value={searchDraft}
                  />
                  <Button
                    accessibilityLabel="Filter members"
                    className="h-12 w-12 px-0"
                    onPress={openFilterSheet}
                    variant={kycFilter === "all" ? "outline" : "secondary"}
                  >
                    <Icon
                      className="size-base text-foreground"
                      name="SlidersHorizontal"
                    />
                  </Button>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-1">
                    {statusFilters.map((item) => {
                      const count =
                        item.value === "all"
                          ? members?.summary.totalCount
                          : item.value === "active"
                            ? members?.summary.activeCount
                            : undefined
                      return (
                        <FilterButton
                          key={item.value}
                          label={`${item.label}${count === undefined ? "" : ` · ${count}`}`}
                          selected={status === item.value}
                          onPress={() => {
                            setPage(1)
                            setStatus(item.value)
                          }}
                        />
                      )
                    })}
                  </View>
                </ScrollView>

                <View className="flex-row items-baseline justify-between gap-3 pt-1">
                  <Text className="text-xl font-extrabold tracking-tight text-foreground">
                    Member records
                  </Text>
                  <Text className="text-xs font-semibold text-muted-foreground">
                    {members?.total ?? 0} matching
                  </Text>
                </View>

                {isLoading ? (
                  <LoadingSpinner />
                ) : (
                  <VirtualizedCardList
                    data={members?.members ?? []}
                    empty={
                      <EmptyState
                        description="Try another name, member number, status, or KYC filter."
                        icon="UsersRound"
                        title="No members found"
                      />
                    }
                    estimatedItemSize={108}
                    keyExtractor={(member) => member.id}
                    maxHeight={560}
                    renderItem={({ item: member }) => (
                      <MemberRow
                        member={member}
                        onOpen={() =>
                          router.push({
                            params: { memberId: member.id },
                            pathname: "/members/[memberId]",
                          } as never)
                        }
                        onReviewKyc={() => openKycReview(member)}
                      />
                    )}
                  />
                )}

                {hasMultiplePages ? (
                  <View className="flex-row gap-3">
                    <Button
                      className="h-11 flex-1"
                      disabled={page <= 1 || isLoading}
                      onPress={() => setPage((value) => Math.max(1, value - 1))}
                      variant="outline"
                    >
                      <Text>Previous</Text>
                    </Button>
                    <Button
                      className="h-11 flex-1"
                      disabled={!hasNextPage || isLoading}
                      onPress={() => setPage((value) => value + 1)}
                      variant="outline"
                    >
                      <Text>Next</Text>
                    </Button>
                  </View>
                ) : null}
              </>
            )}
          </>
        )}
      </ScrollView>

      {canUseMembers && members?.memberExpansion?.status === "available" ? (
        <ListCreateFab
          accessibilityLabel="Create member"
          disabled={stale || isLoading}
          onPress={() => {
            setError(null)
            setCreateVisible(true)
          }}
        />
      ) : null}

      <FloatingBottomSheet
        accessibilityLabel="Filter members"
        onClose={() => setFilterVisible(false)}
        presentation="compact"
        scrollable={false}
        title="Filter members"
        visible={filterVisible}
      >
        <View className="gap-4 px-5 pt-2 pb-4">
          <View className="gap-2">
            <Text className="text-sm font-extrabold text-foreground">
              Membership status
            </Text>
            <View className="flex-row flex-wrap gap-1">
              {statusFilters.map((item) => (
                <FilterButton
                  key={item.value}
                  label={item.label}
                  onPress={() => setDraftStatus(item.value)}
                  selected={draftStatus === item.value}
                />
              ))}
            </View>
          </View>
          <View className="gap-2 border-t border-border pt-4">
            <Text className="text-sm font-extrabold text-foreground">
              KYC status
            </Text>
            <View className="flex-row flex-wrap gap-1">
              {kycFilters.map((item) => (
                <FilterButton
                  key={item.value}
                  label={item.label}
                  onPress={() => setDraftKycFilter(item.value)}
                  selected={draftKycFilter === item.value}
                />
              ))}
            </View>
          </View>
          <View className="flex-row gap-2 border-t border-border pt-3">
            <Button
              className="h-11 flex-1"
              onPress={() => {
                setDraftStatus("all")
                setDraftKycFilter("all")
              }}
              variant="outline"
            >
              <Text>Reset</Text>
            </Button>
            <Button className="h-11 flex-1" onPress={applyFilters}>
              <Text>Apply filters</Text>
            </Button>
          </View>
        </View>
      </FloatingBottomSheet>

      <FloatingBottomSheet
        accessibilityLabel="Member reviews"
        onClose={() => setQueueVisible(false)}
        onDismissed={queueDismissed}
        presentation="compact"
        scrollable="auto"
        title="Member reviews"
        visible={queueVisible}
      >
        <View className="gap-1 px-5 pt-1 pb-5">
          {members?.onboardingRequests.map((request) => (
            <View
              className="flex-row items-center gap-3 border-b border-border py-3"
              key={request.id}
            >
              <View className="bg-warn h-2 w-2 rounded-full" />
              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-extrabold text-foreground">
                  {request.fullName}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Membership approval · {request.memberNumber}
                </Text>
              </View>
              <Button
                className="h-11 px-2"
                onPress={() =>
                  openQueueIntent({
                    decision: onboardingDecision,
                    kind: "onboarding",
                    request,
                  })
                }
                variant="ghost"
              >
                <Text className="text-xs font-extrabold text-primary">
                  Review
                </Text>
              </Button>
            </View>
          ))}
          {(members?.summary.kycPendingCount ?? 0) > 0 ? (
            <View className="flex-row items-center gap-3 border-b border-border py-3">
              <View className="h-2 w-2 rounded-full bg-primary" />
              <View className="min-w-0 flex-1 gap-1">
                <Text className="font-extrabold text-foreground">
                  KYC documents
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {members?.summary.kycPendingCount ?? 0} waiting for
                  verification
                </Text>
              </View>
              <Button
                className="h-11 px-2"
                onPress={() => {
                  setPage(1)
                  setStatus("all")
                  setKycFilter("pending")
                  setQueueVisible(false)
                }}
                variant="ghost"
              >
                <Text className="text-xs font-extrabold text-primary">
                  Show
                </Text>
              </Button>
            </View>
          ) : null}
        </View>
      </FloatingBottomSheet>

      <FullScreenFormSheet
        dirty={hasCreateDraft}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              label="Quick fill member"
              onPress={() => {
                const preset = mobileDevQuickFill.adminMember
                setFullName(preset.fullName)
                setMemberNumber(preset.memberNumber)
                setMemberType("individual")
                setJoinedAt(preset.joinedAt)
                setEmail(preset.email)
                setPhoneNumber(preset.phoneNumber)
                setMonthlyCommitment(preset.monthlyCommitment)
              }}
              placement="footer"
              portal={false}
            />
            <Button
              className="h-12 flex-1"
              disabled={stale || isSubmitting}
              onPress={() => requestReview({ kind: "create" })}
            >
              <Icon
                className="size-base text-primary-foreground"
                name="UserPlus"
              />
              <Text>Review member</Text>
            </Button>
          </View>
        }
        isSubmitting={isSubmitting}
        onClose={() => setCreateVisible(false)}
        overlay={createCalendar.overlay}
        overlayActive={createCalendar.isOpen}
        onDismissed={formDismissed}
        title="Create member"
        visible={createVisible}
      >
        <FormStateBanner hasDraft={hasCreateDraft} isStale={stale} />
        <FormField label="Full name">
          <Input
            accessibilityLabel="Member full name"
            autoCapitalize="words"
            blurOnSubmit={false}
            onChangeText={setFullName}
            onSubmitEditing={() => memberNumberRef.current?.focus()}
            placeholder="Full name"
            returnKeyType="next"
            value={fullName}
          />
        </FormField>
        <FormField label="Member number">
          <Input
            accessibilityLabel="Member number"
            autoCapitalize="characters"
            blurOnSubmit={false}
            onChangeText={setMemberNumber}
            onSubmitEditing={() =>
              createCalendar.open({
                label: "Joined date",
                value: joinedAt,
                onChange: setJoinedAt,
              })
            }
            placeholder="Member number"
            ref={memberNumberRef}
            returnKeyType="next"
            value={memberNumber}
          />
        </FormField>
        <FormField label="Member type">
          <View
            accessibilityLabel="Member type"
            className={cn(
              useStackedLayout ? "gap-1" : "flex-row flex-wrap gap-2"
            )}
            role={useStackedLayout ? "radiogroup" : undefined}
          >
            {(["individual", "civil_servant", "business"] as const).map(
              (value) => (
                <FilterButton
                  fullWidth={useStackedLayout}
                  key={value}
                  label={formatStatus(value)}
                  selected={memberType === value}
                  onPress={() => setMemberType(value)}
                />
              )
            )}
          </View>
        </FormField>
        <FormField label="Joined date">
          <CalendarDateField
            accessibilityLabel="Joined date"
            onPress={() =>
              createCalendar.open({
                label: "Joined date",
                value: joinedAt,
                onChange: setJoinedAt,
              })
            }
            value={joinedAt}
          />
        </FormField>
        <FormField label="Email (optional)">
          <Input
            accessibilityLabel="Member email"
            autoCapitalize="none"
            autoCorrect={false}
            blurOnSubmit={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            onSubmitEditing={() => phoneNumberRef.current?.focus()}
            placeholder="name@example.com"
            ref={emailRef}
            returnKeyType="next"
            value={email}
          />
        </FormField>
        <FormField label="Phone (optional)">
          <Input
            accessibilityLabel="Member phone"
            blurOnSubmit={false}
            keyboardType="phone-pad"
            onChangeText={setPhoneNumber}
            onSubmitEditing={() => monthlyCommitmentRef.current?.focus()}
            placeholder="Phone number"
            ref={phoneNumberRef}
            returnKeyType="next"
            value={phoneNumber}
          />
        </FormField>
        <FormField label="Monthly commitment (optional)">
          <Input
            accessibilityLabel="Monthly commitment"
            keyboardType="numeric"
            onChangeText={setMonthlyCommitment}
            onSubmitEditing={Keyboard.dismiss}
            placeholder="0"
            ref={monthlyCommitmentRef}
            returnKeyType="done"
            value={monthlyCommitment}
          />
        </FormField>
      </FullScreenFormSheet>

      <CompactFormSheet
        dirty={Boolean(reviewNotes.trim())}
        footer={
          <View className="flex-row items-center gap-3 px-5 pt-3 pb-5">
            <DevQuickFill
              label="Quick fill review"
              onPress={() =>
                setReviewNotes(mobileDevQuickFill.adminMemberReview.kycNotes)
              }
              placement="footer"
              portal={false}
            />
            <Button
              className="h-12 flex-1"
              disabled={reviewNotes.trim().length < 2 || stale}
              onPress={() => {
                if (reviewIntent?.kind === "kyc") requestReview(reviewIntent)
                if (reviewIntent?.kind === "onboarding")
                  requestReview({
                    ...reviewIntent,
                    decision: onboardingDecision,
                  })
              }}
            >
              <Text>Continue to confirmation</Text>
            </Button>
          </View>
        }
        isSubmitting={isSubmitting}
        onClose={() => setCompactVisible(false)}
        onDismissed={formDismissed}
        title={
          reviewIntent?.kind === "kyc" ? "Review KYC" : "Review onboarding"
        }
        visible={compactVisible}
      >
        <Textarea
          accessibilityLabel="Review notes"
          onChangeText={setReviewNotes}
          placeholder="Required review notes"
          value={reviewNotes}
        />
        {reviewIntent?.kind === "kyc" ? (
          <View className="flex-row flex-wrap gap-2">
            {(["pending", "verified", "rejected"] as const).map((value) => (
              <FilterButton
                key={value}
                label={formatStatus(value)}
                selected={kycStatus === value}
                onPress={() => setKycStatus(value)}
              />
            ))}
          </View>
        ) : (
          <View className="flex-row gap-2">
            {(["approved", "rejected"] as const).map((value) => (
              <Button
                accessibilityState={{ selected: onboardingDecision === value }}
                className="h-10 flex-1"
                key={value}
                onPress={() => setOnboardingDecision(value)}
                variant={onboardingDecision === value ? "secondary" : "outline"}
              >
                <Text>{formatStatus(value)}</Text>
              </Button>
            ))}
          </View>
        )}
      </CompactFormSheet>

      <SubmissionReviewSheet
        confirmLabel="Confirm change"
        description="Confirm this tenant-scoped member action. The server will enforce the signed role, subscription, and current record state."
        isSubmitting={isSubmitting}
        onClose={() => {
          reopenIntentRef.current = reviewIntent
          setReviewVisible(false)
        }}
        onConfirm={confirmReview}
        onDismissed={reviewDismissed}
        rows={reviewRows}
        title="Confirm member action"
        visible={reviewVisible}
      />
      <SubmissionSuccessSheet
        description={successMessage}
        onClose={() => setSuccessVisible(false)}
        title="Member action complete"
        visible={successVisible}
      />
    </SafeArea>
  )
}
