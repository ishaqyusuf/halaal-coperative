import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { AppKeyboardAwareScrollView } from "@/components/app/keyboard-aware-scroll-view"
import { ScreenHeader } from "@/components/app/screen-header"
import { StatusBadge, getStatusBadgeTone } from "@/components/app/status-badge"
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
import { useDebounce } from "@/hooks/use-debounce"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { captureMobileError } from "@/lib/sentry"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback, useRef, useState, type ReactNode } from "react"
import { Keyboard, Pressable, View, useWindowDimensions } from "react-native"
import {
  approveProfitEntry,
  getProfitPeriodDetail,
  getShareApplicationDetail,
  getShareProfitWorkspace,
  publishProfitEntry,
  reviewShareApplication,
} from "../api/admin-share-profit-governance-api"
import type {
  ProfitEntry,
  ProfitPeriod,
  ProfitPeriodDetail,
  ShareApplication,
  ShareApplicationDetail,
  ShareProfitBook,
  ShareProfitQaState,
  ShareProfitWorkspace,
} from "../model/admin-share-profit-governance-types"

type DetailIntent =
  | { id: string; kind: "profit" }
  | { id: string; kind: "share" }

type ActionIntent =
  | { application: ShareApplication; kind: "share_review" }
  | { entry: ProfitEntry; kind: "profit_approve" }
  | { entry: ProfitEntry; kind: "profit_publish" }

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatCompactCurrency(value: number, currencyCode: string) {
  if (Math.abs(value) < 1_000) return formatCurrency(value, currencyCode)
  const divisor = Math.abs(value) >= 999_500 ? 1_000_000 : 1_000
  return `${new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 1,
    style: "currency",
  }).format(value / divisor)}${divisor === 1_000_000 ? "m" : "k"}`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function labelize(value: string | null | undefined) {
  if (!value) return "Not recorded"
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold text-foreground">{label}</Text>
      {children}
    </View>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <View className="flex-row items-start gap-3 bg-destructive/10 px-3 py-3">
      <Icon className="size-sm mt-0.5 text-destructive" name="AlertCircle" />
      <Text
        accessibilityLiveRegion="polite"
        className="min-w-0 flex-1 text-sm leading-5 font-medium text-destructive"
      >
        {message}
      </Text>
    </View>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-12 flex-row items-start justify-between gap-4 border-b border-border py-3">
      <Text className="min-w-0 flex-1 text-sm text-muted-foreground">
        {label}
      </Text>
      <Text className="max-w-[62%] text-right text-sm leading-5 font-semibold text-foreground">
        {value}
      </Text>
    </View>
  )
}

function ShareApplicationRow({
  application,
  currencyCode,
  onPress,
}: {
  application: ShareApplication
  currencyCode: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityLabel={`${application.memberName}, ${application.requestedUnits} optional units, ${formatCurrency(application.shareValueSnapshot, currencyCode)}, ${labelize(application.status)}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`share-governance-application-${application.id}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {application.memberName}
          </Text>
          <Text className="text-sm font-extrabold text-foreground">
            {formatCurrency(application.shareValueSnapshot, currencyCode)}
          </Text>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {application.memberNumber} · {application.requestedUnits} optional
          units
        </Text>
        <Text className="text-warn text-xs font-bold">
          Requested at{" "}
          {formatCurrency(application.unitAmountSnapshot, currencyCode)} per
          unit
        </Text>
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

function ProfitPeriodRow({
  currencyCode,
  onPress,
  period,
}: {
  currencyCode: string
  onPress: () => void
  period: ProfitPeriod
}) {
  const attention = period.pendingApprovalCount
    ? `${period.pendingApprovalCount} approval${period.pendingApprovalCount === 1 ? "" : "s"}`
    : period.readyToPublishCount
      ? `${period.readyToPublishCount} ready to publish`
      : labelize(period.status)
  return (
    <Pressable
      accessibilityLabel={`${period.name}, ${formatCurrency(period.distributableAmount, currencyCode)}, ${attention}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`share-governance-period-${period.id}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {period.name}
          </Text>
          <Text className="text-sm font-extrabold text-foreground">
            {formatCurrency(period.distributableAmount, currencyCode)}
          </Text>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
        </Text>
        <Text
          className={`text-xs font-bold ${period.pendingApprovalCount ? "text-warn" : period.readyToPublishCount ? "text-primary" : "text-muted-foreground"}`}
        >
          {attention}
        </Text>
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

export function AdminShareProfitGovernanceScreen({
  qaState = null,
}: {
  qaState?: ShareProfitQaState | null
}) {
  const runtime = useMobileRuntime()
  const { width } = useWindowDimensions()
  const [book, setBook] = useState<ShareProfitBook>("shares")
  const [searchDraft, setSearchDraft] = useState("")
  const search = useDebounce(searchDraft.trim(), 350)
  const [workspace, setWorkspace] = useState<ShareProfitWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detailIntent, setDetailIntent] = useState<DetailIntent | null>(null)
  const [shareDetail, setShareDetail] = useState<ShareApplicationDetail | null>(
    null
  )
  const [profitDetail, setProfitDetail] = useState<ProfitPeriodDetail | null>(
    null
  )
  const [detailVisible, setDetailVisible] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [actionIntent, setActionIntent] = useState<ActionIntent | null>(null)
  const [shareDecision, setShareDecision] = useState<"approved" | "rejected">(
    "approved"
  )
  const [approvedUnits, setApprovedUnits] = useState("")
  const [notes, setNotes] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<{
    description: string
    title: string
  } | null>(null)
  const queuedActionRef = useRef<ActionIntent | null>(null)
  const queuedSuccessRef = useRef<{
    description: string
    title: string
  } | null>(null)

  const loadWorkspace = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)
    if (qaState === "denied") {
      setWorkspace(null)
      setIsLoading(false)
      return
    }
    if (qaState === "error") {
      setWorkspace(null)
      setLoadError(
        "Share and profit governance could not be loaded. No records changed."
      )
      setIsLoading(false)
      return
    }
    try {
      const next = await getShareProfitWorkspace({
        book,
        search: search || undefined,
      })
      if (qaState === "empty") {
        setWorkspace({
          ...next,
          profit: next.profit
            ? {
                ...next.profit,
                nextCursor: null,
                periods: [],
                summary: {
                  pendingApprovalCount: 0,
                  readyToPublishCount: 0,
                  unpublishedAmount: 0,
                },
                total: 0,
              }
            : null,
          shares: next.shares
            ? {
                ...next.shares,
                applications: [],
                ledger: [],
                nextCursor: null,
                summary: {
                  ledgerCount: 0,
                  pendingCount: 0,
                  pendingUnits: 0,
                  postedCapital: 0,
                },
                total: 0,
              }
            : null,
        })
      } else if (qaState === "monthly" && next.shares) {
        setWorkspace({
          ...next,
          shares: {
            ...next.shares,
            applications: [],
            nextCursor: null,
            policy: {
              ...next.shares.policy,
              configurationMode: "monthly_history",
            },
            summary: {
              ...next.shares.summary,
              pendingCount: 0,
              pendingUnits: 0,
            },
          },
        })
      } else setWorkspace(next)
    } catch (error) {
      captureMobileError(error, "mobile.share_profit_governance")
      setLoadError(
        error instanceof Error
          ? error.message
          : "Share and profit governance could not be loaded."
      )
    } finally {
      setIsLoading(false)
    }
  }, [book, qaState, search])

  useFocusEffect(useCallback(() => void loadWorkspace(), [loadWorkspace]))

  const loadMore = useCallback(async () => {
    const cursor =
      book === "shares"
        ? workspace?.shares?.nextCursor
        : workspace?.profit?.nextCursor
    if (!cursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const next = await getShareProfitWorkspace({
        book,
        cursor,
        search: search || undefined,
      })
      setWorkspace((current) => {
        if (!current) return next
        if (book === "shares" && current.shares && next.shares) {
          return {
            ...next,
            shares: {
              ...next.shares,
              applications: [
                ...current.shares.applications,
                ...next.shares.applications,
              ],
            },
          }
        }
        if (book === "profit" && current.profit && next.profit) {
          return {
            ...next,
            profit: {
              ...next.profit,
              periods: [...current.profit.periods, ...next.profit.periods],
            },
          }
        }
        return next
      })
    } catch (error) {
      captureMobileError(error, "mobile.share_profit_governance")
      setLoadError(
        error instanceof Error
          ? error.message
          : "More records could not be loaded."
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [book, isLoadingMore, search, workspace])

  const openDetail = useCallback(async (intent: DetailIntent) => {
    setDetailIntent(intent)
    setDetailVisible(true)
    setIsDetailLoading(true)
    setShareDetail(null)
    setProfitDetail(null)
    try {
      if (intent.kind === "share") {
        setShareDetail(await getShareApplicationDetail(intent.id))
      } else {
        setProfitDetail(await getProfitPeriodDetail(intent.id))
      }
    } catch (error) {
      captureMobileError(error, "mobile.share_profit_governance")
      setLoadError(
        error instanceof Error
          ? error.message
          : "Governance details could not be loaded."
      )
      setDetailVisible(false)
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  const openAction = (intent: ActionIntent) => {
    queuedActionRef.current = intent
    setDetailVisible(false)
  }

  const prepareAction = (intent: ActionIntent) => {
    setActionError(null)
    setNotes("")
    setShareDecision("approved")
    if (intent.kind === "share_review") {
      setApprovedUnits(String(intent.application.requestedUnits))
    } else setApprovedUnits("")
    setActionIntent(intent)
  }

  const commandsBlocked =
    isLoading ||
    workspace?.book !== book ||
    (book === "shares" ? !workspace?.shares : !workspace?.profit) ||
    qaState === "offline" ||
    qaState === "stale" ||
    runtime.state.connectivity !== "online"
  const currencyCode = workspace?.currencyCode ?? "NGN"
  const compactGutter = width < 390 ? "px-4" : width >= 600 ? "px-6" : "px-5"
  const dataState = loadError
    ? "error"
    : isLoading || workspace?.book !== book
      ? "loading"
      : (book === "shares" ? !workspace?.shares : !workspace?.profit)
        ? "error"
        : qaState === "offline"
          ? "offline"
          : qaState === "stale"
            ? "stale"
            : "live"

  const quickFill = () => {
    if (actionIntent?.kind === "share_review") {
      setShareDecision("approved")
      setApprovedUnits(String(actionIntent.application.requestedUnits))
      setNotes("Share cap and unit-price snapshot verified for approval.")
    } else if (actionIntent?.kind === "profit_approve") {
      setNotes("Reviewed expenses and member allocation totals reconcile.")
    }
  }

  const submitAction = async () => {
    if (!actionIntent || isSubmitting) return
    if (commandsBlocked) {
      setActionError("Refresh online data before applying a financial command.")
      return
    }
    if (actionIntent.kind !== "profit_publish" && notes.trim().length < 2) {
      setActionError("Decision evidence is required.")
      return
    }
    if (actionIntent.kind === "share_review" && shareDecision === "approved") {
      const parsedUnits = Number(approvedUnits)
      if (!Number.isInteger(parsedUnits) || parsedUnits <= 0) {
        setActionError("Approved units must be a positive whole number.")
        return
      }
      if (parsedUnits > actionIntent.application.requestedUnits) {
        setActionError("Approved units cannot exceed requested units.")
        return
      }
    }

    setIsSubmitting(true)
    setActionError(null)
    try {
      if (actionIntent.kind === "share_review") {
        const application = actionIntent.application
        await reviewShareApplication({
          approvedUnits:
            shareDecision === "approved" ? Number(approvedUnits) : undefined,
          commandId: createClientSubmissionKey(),
          decision: shareDecision,
          expectedState: "pending",
          memberShareApplicationId: application.id,
          reviewNotes: notes.trim(),
        })
        queuedSuccessRef.current = {
          description:
            shareDecision === "approved"
              ? `${approvedUnits} optional unit${approvedUnits === "1" ? "" : "s"} approved and posted to the share capital ledger.`
              : "The optional-unit request was rejected without posting share capital.",
          title:
            shareDecision === "approved"
              ? "Share capital posted"
              : "Request rejected",
        }
      } else if (actionIntent.kind === "profit_approve") {
        await approveProfitEntry({
          commandId: createClientSubmissionKey(),
          expectedState: "reviewed",
          notes: notes.trim(),
          profitEntryId: actionIntent.entry.id,
        })
        queuedSuccessRef.current = {
          description:
            "The reviewed profit entry is approved and ready for governed publication.",
          title: "Profit entry approved",
        }
      } else {
        await publishProfitEntry({
          commandId: createClientSubmissionKey(),
          expectedState: "approved",
          profitEntryId: actionIntent.entry.id,
        })
        queuedSuccessRef.current = {
          description:
            "Member allocations were published and the period evidence was rebuilt from published entries.",
          title: "Profit published",
        }
      }
      setActionIntent(null)
      await loadWorkspace()
    } catch (error) {
      captureMobileError(error, "mobile.share_profit_governance")
      setActionError(
        error instanceof Error
          ? error.message
          : "The command could not be confirmed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (qaState === "denied") {
    return (
      <SafeArea className="flex-1 bg-background">
        <View className={`${compactGutter} flex-1 pt-4`}>
          <ScreenHeader title="Share & profit" />
          <View className="flex-1 justify-center">
            <EmptyState
              description="Your current cooperative role cannot view share capital or profit governance records."
              icon="ShieldX"
              title="Governance access required"
            />
          </View>
        </View>
      </SafeArea>
    )
  }

  const shares = workspace?.shares
  const profit = workspace?.profit
  const selectedBookLoaded =
    workspace?.book === book && (book === "shares" ? !!shares : !!profit)
  const selectedShareApplication = shareDetail?.application
  const selectedPeriod = profitDetail?.period

  return (
    <SafeArea className="flex-1 bg-background">
      <AppKeyboardAwareScrollView
        bottomOffset={140}
        contentContainerClassName={`gap-5 pb-28 pt-4 ${compactGutter}`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="admin-share-profit-governance-screen"
      >
        <View className="w-full max-w-[560px] gap-5 self-center">
          <ScreenHeader
            action={
              <Button
                accessibilityLabel="Refresh share and profit governance"
                disabled={isLoading}
                onPress={loadWorkspace}
                size="icon"
                testID="share-profit-refresh"
                variant="ghost"
              >
                <Icon className="size-base text-foreground" name="RefreshCw" />
              </Button>
            }
            title="Share & profit"
          />

          <View className="flex-row items-center gap-2 border-b border-border pb-4">
            <View
              className={`size-2 rounded-full ${dataState === "error" ? "bg-destructive" : dataState === "live" ? "bg-success" : "bg-warn"}`}
            />
            <Text
              className={`text-xs font-bold ${dataState === "error" ? "text-destructive" : dataState === "live" ? "text-success" : "text-warn"}`}
            >
              {dataState === "error"
                ? "Refresh required"
                : dataState === "loading"
                  ? "Refreshing governance data"
                  : dataState === "offline"
                    ? "Offline · cached records"
                    : dataState === "stale"
                      ? "Cached governance data"
                      : "Live governance data"}
            </Text>
          </View>

          {!selectedBookLoaded ? (
            <View className="min-h-96 items-center justify-center gap-5 py-12">
              {isLoading || (workspace?.book !== book && !loadError) ? (
                <LoadingSpinner />
              ) : (
                <>
                  <EmptyState
                    description="No records changed. Refresh to try again."
                    icon="RefreshCcw"
                    title="Governance unavailable"
                  />
                  <Button
                    onPress={() => void loadWorkspace()}
                    variant="outline"
                  >
                    <Text>Try again</Text>
                  </Button>
                </>
              )}
            </View>
          ) : (
            <>
              {commandsBlocked ? (
                <View className="bg-warn/10 px-3 py-3">
                  <Text className="text-warn text-sm leading-5">
                    Records remain readable. Share decisions and profit
                    publication require fresh online data.
                  </Text>
                </View>
              ) : null}
              {loadError ? <ErrorBanner message={loadError} /> : null}

              <View className="flex-row gap-1 rounded-xl bg-secondary p-1">
                {(["shares", "profit"] as const).map((value) => (
                  <Button
                    className="h-11 flex-1"
                    key={value}
                    onPress={() => setBook(value)}
                    testID={`share-profit-book-${value}`}
                    variant={book === value ? "outline" : "ghost"}
                  >
                    <Text>
                      {value === "shares" ? "Share capital" : "Profit periods"}
                    </Text>
                  </Button>
                ))}
              </View>

              {book === "shares" ? (
                <View className="flex-row divide-x divide-border border-y border-border py-4">
                  <View className="min-w-0 flex-1 gap-1 pr-3">
                    <Text className="text-2xl font-extrabold tracking-tight text-foreground">
                      {shares?.summary.pendingCount ?? 0}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Pending
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1 gap-1 px-3">
                    <Text className="text-2xl font-extrabold tracking-tight text-foreground">
                      {shares?.policy.configurationMode === "unit_based"
                        ? formatCompactCurrency(
                            shares.policy.unitAmount,
                            currencyCode
                          )
                        : "History"}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {shares?.policy.configurationMode === "unit_based"
                        ? "Unit price"
                        : "Share model"}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-[1.25] gap-1 pl-3">
                    <Text
                      adjustsFontSizeToFit
                      className="text-2xl font-extrabold tracking-tight text-foreground"
                      minimumFontScale={0.7}
                      numberOfLines={1}
                    >
                      {formatCompactCurrency(
                        shares?.summary.postedCapital ?? 0,
                        currencyCode
                      )}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Posted capital
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="flex-row divide-x divide-border border-y border-border py-4">
                  <View className="min-w-0 flex-1 gap-1 pr-3">
                    <Text className="text-warn text-2xl font-extrabold tracking-tight">
                      {profit?.summary.pendingApprovalCount ?? 0}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Approvals
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1 gap-1 px-3">
                    <Text className="text-2xl font-extrabold tracking-tight text-primary">
                      {profit?.summary.readyToPublishCount ?? 0}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Publish ready
                    </Text>
                  </View>
                  <View className="min-w-0 flex-[1.25] gap-1 pl-3">
                    <Text
                      adjustsFontSizeToFit
                      className="text-2xl font-extrabold tracking-tight text-foreground"
                      minimumFontScale={0.7}
                      numberOfLines={1}
                    >
                      {formatCompactCurrency(
                        profit?.summary.unpublishedAmount ?? 0,
                        currencyCode
                      )}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      Unpublished
                    </Text>
                  </View>
                </View>
              )}

              <View className="flex-row gap-2">
                <Input
                  accessibilityLabel={`Search ${book === "shares" ? "share capital" : "profit periods"}`}
                  className="min-w-0 flex-1"
                  onChangeText={setSearchDraft}
                  onSubmitEditing={Keyboard.dismiss}
                  placeholder={
                    book === "shares"
                      ? "Search member or number"
                      : "Search period or business"
                  }
                  returnKeyType="search"
                  testID="share-profit-search-input"
                  value={searchDraft}
                />
                <Button
                  accessibilityLabel="Search"
                  onPress={Keyboard.dismiss}
                  size="icon"
                  variant="secondary"
                >
                  <Icon className="size-base text-foreground" name="Search" />
                </Button>
              </View>

              {book === "shares" ? (
                <>
                  <View>
                    <View className="flex-row items-end justify-between gap-3 border-b border-border pb-3">
                      <Text className="text-lg font-extrabold text-foreground">
                        Review queue
                      </Text>
                      <Text className="text-xs font-medium text-muted-foreground">
                        Oldest first
                      </Text>
                    </View>
                    {isLoading && !shares ? (
                      <View className="items-center py-16">
                        <LoadingSpinner />
                      </View>
                    ) : shares?.policy.configurationMode ===
                      "monthly_history" ? (
                      <EmptyState
                        description="This cooperative records dated share history. Optional-unit requests are unavailable."
                        icon="History"
                        title="Monthly share history model"
                      />
                    ) : (
                      <VirtualizedCardList
                        data={shares?.applications ?? []}
                        empty={
                          <EmptyState
                            description="No optional-unit applications match this search."
                            icon="Landmark"
                            title="No pending share requests"
                          />
                        }
                        estimatedItemSize={92}
                        keyExtractor={(item) => item.id}
                        maxHeight={520}
                        renderItem={({ item }) => (
                          <ShareApplicationRow
                            application={item}
                            currencyCode={currencyCode}
                            onPress={() =>
                              void openDetail({ id: item.id, kind: "share" })
                            }
                          />
                        )}
                      />
                    )}
                    {shares?.nextCursor ? (
                      <Button
                        className="mt-3 self-center"
                        disabled={isLoadingMore}
                        onPress={() => void loadMore()}
                        variant="ghost"
                      >
                        <Text>{isLoadingMore ? "Loading" : "Load more"}</Text>
                      </Button>
                    ) : null}
                  </View>

                  <View>
                    <View className="flex-row items-end justify-between gap-3 border-b border-border pb-3">
                      <Text className="text-lg font-extrabold text-foreground">
                        Recent postings
                      </Text>
                      <Text className="text-xs font-medium text-muted-foreground">
                        Immutable ledger
                      </Text>
                    </View>
                    {shares?.ledger.length ? (
                      shares.ledger.map((entry) => (
                        <View
                          className="min-h-16 flex-row items-center gap-3 border-b border-border py-3"
                          key={entry.id}
                        >
                          <View className="min-w-0 flex-1 gap-1">
                            <Text className="text-sm font-bold text-foreground">
                              {entry.member.fullName}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                              {labelize(entry.sourceType)} ·{" "}
                              {formatDate(entry.effectiveDate)}
                            </Text>
                          </View>
                          <Text className="text-sm font-extrabold text-foreground">
                            +{formatCurrency(entry.amount, currencyCode)}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <EmptyState
                        description="Approved share capital postings will appear here."
                        icon="BookOpen"
                        title="No share ledger entries"
                      />
                    )}
                  </View>
                </>
              ) : (
                <View>
                  <View className="flex-row items-end justify-between gap-3 border-b border-border pb-3">
                    <Text className="text-lg font-extrabold text-foreground">
                      Profit periods
                    </Text>
                    <Text className="text-xs font-medium text-muted-foreground">
                      {profit ? `${profit.total} periods` : "Governed evidence"}
                    </Text>
                  </View>
                  {isLoading && !profit ? (
                    <View className="items-center py-16">
                      <LoadingSpinner />
                    </View>
                  ) : (
                    <VirtualizedCardList
                      data={profit?.periods ?? []}
                      empty={
                        <EmptyState
                          description="No profit periods match this search."
                          icon="ChartNoAxesCombined"
                          title="No profit periods"
                        />
                      }
                      estimatedItemSize={92}
                      keyExtractor={(item) => item.id}
                      maxHeight={600}
                      renderItem={({ item }) => (
                        <ProfitPeriodRow
                          currencyCode={currencyCode}
                          onPress={() =>
                            void openDetail({ id: item.id, kind: "profit" })
                          }
                          period={item}
                        />
                      )}
                    />
                  )}
                  {profit?.nextCursor ? (
                    <Button
                      className="mt-3 self-center"
                      disabled={isLoadingMore}
                      onPress={() => void loadMore()}
                      variant="ghost"
                    >
                      <Text>{isLoadingMore ? "Loading" : "Load more"}</Text>
                    </Button>
                  ) : null}
                </View>
              )}

              <View className="flex-row items-start gap-3 border-t border-border pt-4">
                <Icon
                  className="size-sm mt-0.5 text-primary"
                  name="ShieldCheck"
                />
                <Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
                  Share capital and profit distributions are separate books.
                  Members only see profit after governed publication.
                </Text>
              </View>
            </>
          )}
        </View>
      </AppKeyboardAwareScrollView>

      <FloatingBottomSheet
        accessibilityLabel={
          detailIntent?.kind === "share"
            ? "Share application detail"
            : "Profit period detail"
        }
        hideHandle
        onClose={() => setDetailVisible(false)}
        onDismissed={() => {
          const queued = queuedActionRef.current
          queuedActionRef.current = null
          if (queued) prepareAction(queued)
          else {
            setDetailIntent(null)
            setShareDetail(null)
            setProfitDetail(null)
          }
        }}
        presentation="large"
        scrollable
        visible={detailVisible}
      >
        <View className="gap-5 px-5 pt-5 pb-8">
          <View className="flex-row items-start gap-3 border-b border-border pb-4">
            <View className="min-w-0 flex-1 gap-1">
              <Text
                accessibilityRole="header"
                className="text-2xl font-extrabold tracking-tight text-foreground"
              >
                {selectedShareApplication?.memberName ??
                  selectedPeriod?.name ??
                  "Loading record"}
              </Text>
              {selectedShareApplication ? (
                <Text className="text-sm text-muted-foreground">
                  {selectedShareApplication.memberNumber} · Optional share
                  request
                </Text>
              ) : selectedPeriod ? (
                <Text className="text-sm text-muted-foreground">
                  {formatDate(selectedPeriod.periodStart)} –{" "}
                  {formatDate(selectedPeriod.periodEnd)}
                </Text>
              ) : null}
            </View>
            <Button
              accessibilityLabel="Close governance detail"
              onPress={() => setDetailVisible(false)}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="X" />
            </Button>
          </View>

          {isDetailLoading ? (
            <View className="items-center py-20">
              <LoadingSpinner />
            </View>
          ) : selectedShareApplication && shareDetail ? (
            <>
              <View className="flex-row items-end justify-between gap-3 border-b border-border pb-4">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                    {formatCurrency(
                      selectedShareApplication.shareValueSnapshot,
                      currencyCode
                    )}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {selectedShareApplication.requestedUnits} units at{" "}
                    {formatCurrency(
                      selectedShareApplication.unitAmountSnapshot,
                      currencyCode
                    )}
                  </Text>
                </View>
                <StatusBadge
                  label={labelize(selectedShareApplication.status)}
                  tone={getStatusBadgeTone(selectedShareApplication.status)}
                />
              </View>
              {shareDetail.position ? (
                <View>
                  <Text className="border-b border-border pb-2 text-lg font-extrabold text-foreground">
                    Member position
                  </Text>
                  <DetailRow
                    label="Compulsory units"
                    value={String(shareDetail.position.compulsoryUnits)}
                  />
                  <DetailRow
                    label="Approved optional"
                    value={String(shareDetail.position.approvedOptionalUnits)}
                  />
                  <DetailRow
                    label="Pending optional"
                    value={String(shareDetail.position.pendingOptionalUnits)}
                  />
                  <DetailRow
                    label="Maximum units"
                    value={String(shareDetail.position.maximumUnits)}
                  />
                </View>
              ) : null}
              <DetailRow
                label="Request context"
                value={selectedShareApplication.notes ?? "No context recorded"}
              />
              {shareDetail.postedLedger ? (
                <DetailRow
                  label="Posted capital"
                  value={`${formatCurrency(shareDetail.postedLedger.amount, currencyCode)} · ${formatDate(shareDetail.postedLedger.effectiveDate)}`}
                />
              ) : null}
              {selectedShareApplication.allowedActions.includes("review") ? (
                <Button
                  className="h-12 w-full"
                  disabled={commandsBlocked}
                  onPress={() =>
                    openAction({
                      application: selectedShareApplication,
                      kind: "share_review",
                    })
                  }
                  testID="share-governance-review-action"
                >
                  <Text>Review share request</Text>
                </Button>
              ) : null}
            </>
          ) : selectedPeriod && profitDetail ? (
            <>
              <View className="flex-row items-end justify-between gap-3 border-b border-border pb-4">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                    {formatCurrency(
                      selectedPeriod.distributableAmount,
                      currencyCode
                    )}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    Distributable after reviewed deductions
                  </Text>
                </View>
                <StatusBadge
                  label={labelize(selectedPeriod.status)}
                  tone={getStatusBadgeTone(selectedPeriod.status)}
                />
              </View>
              <View>
                <Text className="border-b border-border pb-2 text-lg font-extrabold text-foreground">
                  Period result
                </Text>
                <DetailRow
                  label="Gross result"
                  value={formatCurrency(
                    selectedPeriod.grossProfitAmount,
                    currencyCode
                  )}
                />
                <DetailRow
                  label="Entry expenses"
                  value={`−${formatCurrency(selectedPeriod.entryExpenseAmount, currencyCode)}`}
                />
                <DetailRow
                  label="Period deduction"
                  value={`−${formatCurrency(selectedPeriod.deductionAmount, currencyCode)}`}
                />
                <DetailRow
                  label="Member allocations"
                  value={String(selectedPeriod.allocationCount)}
                />
              </View>
              <View>
                <View className="flex-row items-end justify-between gap-3 border-b border-border pb-2">
                  <Text className="text-lg font-extrabold text-foreground">
                    Profit entries
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {profitDetail.profitEntries.length} records
                  </Text>
                </View>
                {profitDetail.profitEntries.map((entry) => (
                  <View
                    className="gap-3 border-b border-border py-4"
                    key={entry.id}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="min-w-0 flex-1 gap-1">
                        <Text className="text-sm font-bold text-foreground">
                          {entry.businessName}
                        </Text>
                        <Text className="text-xs leading-5 text-muted-foreground">
                          {formatCurrency(entry.profitAmount, currencyCode)}{" "}
                          gross ·{" "}
                          {formatCurrency(
                            entry.allocatableProfit,
                            currencyCode
                          )}{" "}
                          distributable
                        </Text>
                      </View>
                      <StatusBadge
                        label={labelize(entry.status)}
                        tone={getStatusBadgeTone(entry.status)}
                      />
                    </View>
                    <Text
                      className={`text-xs leading-5 font-medium ${entry.blocker ? "text-warn" : "text-success"}`}
                    >
                      {entry.blocker ??
                        `${entry.allocationCount} allocations reconcile`}
                    </Text>
                    {entry.allowedActions.includes("approve") ? (
                      <Button
                        disabled={commandsBlocked}
                        onPress={() =>
                          openAction({ entry, kind: "profit_approve" })
                        }
                        variant="outline"
                      >
                        <Text>Approve entry</Text>
                      </Button>
                    ) : null}
                    {entry.allowedActions.includes("publish") ? (
                      <Button
                        disabled={commandsBlocked}
                        onPress={() =>
                          openAction({ entry, kind: "profit_publish" })
                        }
                      >
                        <Text>Review publication</Text>
                      </Button>
                    ) : null}
                  </View>
                ))}
              </View>
              {selectedPeriod.status === "published" ? (
                <View>
                  <View className="flex-row items-end justify-between gap-3 border-b border-border pb-2">
                    <Text className="text-lg font-extrabold text-foreground">
                      Published evidence
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {profitDetail.periodAllocations.length} members
                    </Text>
                  </View>
                  {profitDetail.periodAllocations
                    .slice(0, 8)
                    .map((allocation) => (
                      <View
                        className="min-h-14 flex-row items-center gap-3 border-b border-border py-3"
                        key={allocation.id}
                      >
                        <View className="min-w-0 flex-1 gap-1">
                          <Text className="text-sm font-bold text-foreground">
                            {allocation.member.fullName}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {allocation.member.memberNumber}
                          </Text>
                        </View>
                        <Text className="text-sm font-extrabold text-foreground">
                          {formatCurrency(
                            allocation.allocationAmount,
                            currencyCode
                          )}
                        </Text>
                      </View>
                    ))}
                </View>
              ) : null}
            </>
          ) : (
            <EmptyState
              description="Refresh the record and try again."
              icon="FileWarning"
              title="Detail unavailable"
            />
          )}
        </View>
      </FloatingBottomSheet>

      <FloatingBottomSheet
        accessibilityLabel={
          actionIntent?.kind === "share_review"
            ? "Review share request"
            : actionIntent?.kind === "profit_approve"
              ? "Approve profit entry"
              : "Publish profit entry"
        }
        footer={
          <View className="flex-row items-center gap-3 px-5 pt-3 pb-5">
            {actionIntent?.kind !== "profit_publish" ? (
              <DevQuickFill
                label="Quick fill governance decision"
                onPress={quickFill}
                placement="footer"
                portal={false}
              />
            ) : null}
            <Button
              className="h-12 flex-1"
              disabled={isSubmitting}
              onPress={() => void submitAction()}
              testID="share-profit-confirm-action"
            >
              <Text>
                {isSubmitting
                  ? "Confirming"
                  : actionIntent?.kind === "share_review"
                    ? `Confirm ${shareDecision === "approved" ? "approval" : "rejection"}`
                    : actionIntent?.kind === "profit_approve"
                      ? "Confirm approval"
                      : "Publish member evidence"}
              </Text>
            </Button>
          </View>
        }
        keyboardExpandable={actionIntent?.kind !== "profit_publish"}
        onClose={() => setActionIntent(null)}
        onDismissed={() => {
          const nextSuccess = queuedSuccessRef.current
          queuedSuccessRef.current = null
          if (nextSuccess) setSuccess(nextSuccess)
        }}
        presentation="compact"
        scrollable="auto"
        title={
          actionIntent?.kind === "share_review"
            ? "Review share request"
            : actionIntent?.kind === "profit_approve"
              ? "Approve profit entry"
              : "Publish profit entry"
        }
        visible={Boolean(actionIntent)}
      >
        <View className="gap-5 px-5 pt-3 pb-4">
          {actionError ? <ErrorBanner message={actionError} /> : null}
          {actionIntent?.kind === "share_review" ? (
            <>
              <View className="flex-row gap-2">
                {(["approved", "rejected"] as const).map((decision) => (
                  <Button
                    className="flex-1"
                    key={decision}
                    onPress={() => setShareDecision(decision)}
                    variant={shareDecision === decision ? "secondary" : "ghost"}
                  >
                    <Text>
                      {decision === "approved" ? "Approve" : "Reject"}
                    </Text>
                  </Button>
                ))}
              </View>
              {shareDecision === "approved" ? (
                <Field label="Approved units">
                  <Input
                    accessibilityLabel="Approved share units"
                    inputMode="numeric"
                    onChangeText={setApprovedUnits}
                    placeholder="3"
                    testID="share-approved-units-input"
                    value={approvedUnits}
                  />
                </Field>
              ) : null}
              <Field label="Decision evidence">
                <Textarea
                  accessibilityLabel="Share review evidence"
                  onChangeText={setNotes}
                  placeholder="Record the cap, snapshot, and decision evidence"
                  testID="share-review-notes-input"
                  value={notes}
                />
              </Field>
            </>
          ) : actionIntent?.kind === "profit_approve" ? (
            <>
              <View className="border-y border-border py-3">
                <DetailRow
                  label="Business"
                  value={actionIntent.entry.businessName}
                />
                <DetailRow
                  label="Distributable"
                  value={formatCurrency(
                    actionIntent.entry.allocatableProfit,
                    currencyCode
                  )}
                />
                <DetailRow
                  label="Allocations"
                  value={`${actionIntent.entry.allocationCount} · reconciled`}
                />
              </View>
              <Field label="Approval evidence">
                <Textarea
                  accessibilityLabel="Profit approval evidence"
                  onChangeText={setNotes}
                  placeholder="Record the reviewed expenses and allocation check"
                  testID="profit-approval-notes-input"
                  value={notes}
                />
              </Field>
            </>
          ) : actionIntent?.kind === "profit_publish" ? (
            <>
              <View className="bg-warn/10 px-3 py-3">
                <Text className="text-warn text-sm leading-5 font-medium">
                  Publication makes these allocations visible as member dividend
                  evidence and cannot be treated as a promised return.
                </Text>
              </View>
              <DetailRow
                label="Business"
                value={actionIntent.entry.businessName}
              />
              <DetailRow
                label="Distributable"
                value={formatCurrency(
                  actionIntent.entry.allocatableProfit,
                  currencyCode
                )}
              />
              <DetailRow
                label="Member allocations"
                value={String(actionIntent.entry.allocationCount)}
              />
            </>
          ) : null}
        </View>
      </FloatingBottomSheet>

      <SubmissionSuccessSheet
        description={
          success?.description ?? "The governance command was confirmed."
        }
        onClose={() => setSuccess(null)}
        title={success?.title ?? "Command confirmed"}
        visible={Boolean(success)}
      />
    </SafeArea>
  )
}
