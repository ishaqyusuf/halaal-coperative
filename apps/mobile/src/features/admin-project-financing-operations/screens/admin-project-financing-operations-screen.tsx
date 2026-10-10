import { CalendarDateField } from "@/components/app/calendar-date-field"
import { CalendarPickerSheet } from "@/components/app/calendar-picker-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { AppKeyboardAwareScrollView } from "@/components/app/keyboard-aware-scroll-view"
import { ScreenHeader } from "@/components/app/screen-header"
import { StatusBadge, getStatusBadgeTone } from "@/components/app/status-badge"
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
import { useDebounce } from "@/hooks/use-debounce"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { captureMobileError } from "@/lib/sentry"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect } from "@react-navigation/native"
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
  useWindowDimensions,
} from "react-native"
import {
  activateProjectFinancingOperation,
  getProjectFinancingOperationDetail,
  getProjectFinancingOperationsWorkspace,
  recordProjectFinancingDisbursement,
  reviewProjectFinancingOperation,
} from "../api/admin-project-financing-operations-api"
import type {
  ProjectFinancingDetail,
  ProjectFinancingLane,
  ProjectFinancingOperationsQaState,
  ProjectFinancingProject,
  ProjectFinancingStructure,
  ProjectFinancingWorkspace,
} from "../model/admin-project-financing-operations-types"
import { getProjectFinancingDetailFailureKind } from "../model/project-financing-detail-failure"

const lanes: { label: string; value: ProjectFinancingLane }[] = [
  { label: "Needs action", value: "needs_action" },
  { label: "Active", value: "active" },
  { label: "Closed", value: "closed" },
]

const structureOptions: {
  label: string
  value: Exclude<ProjectFinancingStructure, "undecided">
}[] = [
  { label: "Repayable facility", value: "repayable_facility" },
  { label: "Investment partnership", value: "investment_partnership" },
  { label: "Profit sharing", value: "profit_sharing" },
]

type FormIntent =
  | { kind: "activate"; project: ProjectFinancingProject }
  | { kind: "disbursement"; project: ProjectFinancingProject }
  | { kind: "review"; project: ProjectFinancingProject }

type ReviewIntent = FormIntent

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
    year: "numeric",
  }).format(new Date(value))
}

function labelize(value: string | null | undefined) {
  if (!value) return "Not recorded"
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function structureLabel(value: ProjectFinancingStructure | null) {
  return labelize(value)
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

function BoundaryNotice({ project }: { project: ProjectFinancingProject }) {
  const repayable = project.boundary === "repayable_principal"
  return (
    <View
      className={`flex-row items-start gap-3 px-3 py-3 ${repayable ? "bg-primary/10" : "bg-warn/10"}`}
    >
      <Icon
        className={`size-sm mt-0.5 ${repayable ? "text-primary" : "text-warn"}`}
        name={repayable ? "CircleDollarSign" : "ShieldCheck"}
      />
      <View className="min-w-0 flex-1 gap-1">
        <Text
          className={`text-sm font-bold ${repayable ? "text-primary" : "text-warn"}`}
        >
          {repayable ? "Principal-only obligation" : "Evidence-only structure"}
        </Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {repayable
            ? "Only approved principal can be settled through reviewed receipt allocations. No time-based interest or implied profit is added."
            : "Activation and release record governance evidence only. Repayment, balance, profit, and dividend controls remain unavailable."}
        </Text>
      </View>
    </View>
  )
}

function ProjectRow({
  currencyCode,
  onPress,
  project,
  showDivider,
}: {
  currencyCode: string
  onPress: () => void
  project: ProjectFinancingProject
  showDivider: boolean
}) {
  const amount = project.approvedAmount ?? project.requestedAmount
  return (
    <Pressable
      accessibilityLabel={`${project.businessName}, ${project.member.fullName}, ${formatCurrency(amount, currencyCode)}, ${labelize(project.status)}`}
      accessibilityRole="button"
      className="relative min-h-28 flex-row items-center gap-3 px-2 py-6 active:bg-accent/40"
      onPress={onPress}
      testID={`project-financing-row-${project.id}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {project.businessName}
          </Text>
          <Text className="text-sm font-extrabold text-foreground">
            {formatCurrency(amount, currencyCode)}
          </Text>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {project.member.fullName} · {project.member.memberNumber}
        </Text>
        <View className="flex-row flex-wrap items-center gap-2">
          <Text
            className={`text-xs font-bold ${project.boundary === "repayable_principal" ? "text-primary" : "text-warn"}`}
          >
            {project.boundary === "repayable_principal"
              ? "Principal"
              : "Evidence only"}
          </Text>
          <Text className="text-xs text-muted-foreground">·</Text>
          <Text className="text-xs font-medium text-muted-foreground">
            {project.attention?.label ?? labelize(project.status)}
          </Text>
        </View>
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
      {showDivider ? (
        <View className="absolute right-2 bottom-0 left-2 h-px bg-border" />
      ) : null}
    </Pressable>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-h-12 flex-row items-start justify-between gap-4 border-b border-border py-3">
      <Text className="min-w-0 flex-1 text-sm text-muted-foreground">
        {label}
      </Text>
      <Text className="max-w-[58%] text-right text-sm leading-5 font-semibold text-foreground">
        {value}
      </Text>
    </View>
  )
}

function AttentionRow({
  currencyCode,
  onPress,
  project,
  showDivider,
}: {
  currencyCode: string
  onPress: () => void
  project: ProjectFinancingProject
  showDivider: boolean
}) {
  return (
    <Pressable
      accessibilityLabel={`${project.attention?.label}. ${project.businessName}`}
      accessibilityRole="button"
      className="relative min-h-24 flex-row items-center gap-3 px-2 py-6 active:bg-accent/40"
      onPress={onPress}
    >
      <View
        className={`h-9 w-1 rounded-full ${project.attention?.severity === "blocked" ? "bg-destructive" : project.attention?.severity === "ready" ? "bg-success" : "bg-warn"}`}
      />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-sm font-bold text-foreground">
          {project.businessName}
        </Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {project.attention?.label}
        </Text>
      </View>
      <Text className="text-sm font-extrabold text-foreground">
        {formatCompactCurrency(
          project.approvedAmount ?? project.requestedAmount,
          currencyCode
        )}
      </Text>
      {showDivider ? (
        <View className="absolute right-2 bottom-0 left-2 h-px bg-border" />
      ) : null}
    </Pressable>
  )
}

export function AdminProjectFinancingOperationsScreen({
  initialEntityId = null,
  qaState = null,
}: {
  initialEntityId?: string | null
  qaState?: ProjectFinancingOperationsQaState | null
}) {
  const runtime = useMobileRuntime()
  const { width } = useWindowDimensions()
  const [lane, setLane] = useState<ProjectFinancingLane>("needs_action")
  const [searchDraft, setSearchDraft] = useState("")
  const search = useDebounce(searchDraft.trim(), 350)
  const [workspace, setWorkspace] = useState<ProjectFinancingWorkspace | null>(
    null
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detail, setDetail] = useState<ProjectFinancingDetail | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [formIntent, setFormIntent] = useState<FormIntent | null>(null)
  const [reviewIntent, setReviewIntent] = useState<ReviewIntent | null>(null)
  const [calendarVisible, setCalendarVisible] = useState(false)
  const [decision, setDecision] = useState<
    "approved" | "rejected" | "under_review"
  >("approved")
  const [approvedAmount, setApprovedAmount] = useState("")
  const [approvedMonths, setApprovedMonths] = useState("")
  const [approvedStructure, setApprovedStructure] =
    useState<Exclude<ProjectFinancingStructure, "undecided">>(
      "repayable_facility"
    )
  const [disbursedAt, setDisbursedAt] = useState(todayDateOnly())
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const queuedFormRef = useRef<FormIntent | null>(null)
  const queuedReviewRef = useRef<ReviewIntent | null>(null)
  const queuedSuccessRef = useRef<string | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)

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
        "Project financing operations could not be loaded. No records or commands changed."
      )
      setIsLoading(false)
      return
    }

    try {
      const nextWorkspace = await getProjectFinancingOperationsWorkspace({
        lane,
        search: search || undefined,
      })
      setWorkspace(
        qaState === "empty"
          ? {
              ...nextWorkspace,
              attention: [],
              nextCursor: null,
              projects: [],
              summary: {
                blockedCount: 0,
                closedCount: 0,
                outstandingPrincipal: 0,
                readyCount: 0,
                totalProjects: 0,
              },
              total: 0,
            }
          : nextWorkspace
      )
    } catch (error) {
      captureMobileError(error, "mobile.project_financing_operations")
      setLoadError(
        error instanceof Error
          ? error.message
          : "Project financing operations could not be loaded."
      )
    } finally {
      setIsLoading(false)
    }
  }, [lane, qaState, search])

  useFocusEffect(useCallback(() => void loadWorkspace(), [loadWorkspace]))

  const loadMore = useCallback(async () => {
    const cursor = workspace?.nextCursor
    if (!cursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const next = await getProjectFinancingOperationsWorkspace({
        cursor,
        lane,
        search: search || undefined,
      })
      setWorkspace((current) =>
        current
          ? { ...next, projects: [...current.projects, ...next.projects] }
          : next
      )
    } catch (error) {
      captureMobileError(error, "mobile.project_financing_operations")
      setLoadError(
        error instanceof Error
          ? error.message
          : "More project financing records could not be loaded."
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, lane, search, workspace])

  const openDetail = useCallback(
    async (
      projectFinancingRequestId: string,
      origin: "list" | "notification" = "list"
    ) => {
      const presentsLoadingSheet = origin === "list"
      if (presentsLoadingSheet) setDetailVisible(true)
      setIsDetailLoading(true)
      setIsDestinationUnavailable(false)
      try {
        const nextDetail = await getProjectFinancingOperationDetail(
          projectFinancingRequestId
        )
        setDetail(nextDetail)
        setDetailVisible(true)
      } catch (error) {
        const failureKind = getProjectFinancingDetailFailureKind(error)
        const isUnavailableNotification =
          origin === "notification" && failureKind === "request_unavailable"

        if (!isUnavailableNotification) {
          captureMobileError(error, "mobile.project_financing_operations")
        }
        if (isUnavailableNotification) {
          setIsDestinationUnavailable(true)
        } else {
          setLoadError(
            "Project financing details could not be loaded. Try again."
          )
        }
        setDetail(null)
        setDetailVisible(false)
      } finally {
        setIsDetailLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (
      !initialEntityId ||
      qaState === "denied" ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }
    handledNotificationEntityRef.current = initialEntityId
    void openDetail(initialEntityId, "notification")
  }, [initialEntityId, openDetail, qaState])

  const commandsBlocked =
    qaState === "offline" ||
    qaState === "stale" ||
    runtime.state.connectivity !== "online"
  const currencyCode = workspace?.currencyCode ?? "NGN"
  const compactGutter = width < 390 ? "px-4" : width >= 600 ? "px-6" : "px-5"
  const dataState = loadError
    ? "error"
    : qaState === "offline"
      ? "offline"
      : qaState === "stale"
        ? "stale"
        : "live"

  const prepareForm = (intent: FormIntent) => {
    setFormError(null)
    setCalendarVisible(false)
    setReference("")
    setNotes("")
    setDisbursedAt(todayDateOnly())
    if (intent.kind === "review") {
      const structure =
        intent.project.proposedStructure === "undecided"
          ? "repayable_facility"
          : intent.project.proposedStructure
      setDecision("approved")
      setApprovedAmount(String(intent.project.requestedAmount))
      setApprovedStructure(structure)
      setApprovedMonths(
        structure === "repayable_facility"
          ? String(intent.project.requestedPaybackMonths ?? 12)
          : ""
      )
    }
    setFormIntent(intent)
  }

  const openFormFromDetail = (intent: FormIntent) => {
    queuedFormRef.current = intent
    setDetailVisible(false)
  }

  const formDirty = useMemo(() => {
    if (!formIntent) return false
    if (formIntent.kind === "review") {
      return Boolean(approvedAmount || approvedMonths || notes)
    }
    if (formIntent.kind === "disbursement") {
      return Boolean(reference || notes || disbursedAt !== todayDateOnly())
    }
    return Boolean(notes)
  }, [
    approvedAmount,
    approvedMonths,
    disbursedAt,
    formIntent,
    notes,
    reference,
  ])

  const validateForm = () => {
    setFormError(null)
    if (!formIntent) return

    if (formIntent.kind === "review") {
      if (
        decision === "approved" &&
        (!Number.isFinite(Number(approvedAmount)) ||
          Number(approvedAmount) <= 0)
      ) {
        setFormError("Enter a valid approved amount.")
        return
      }
      if (
        decision === "approved" &&
        approvedStructure === "repayable_facility" &&
        (!Number.isInteger(Number(approvedMonths)) ||
          Number(approvedMonths) <= 0)
      ) {
        setFormError("Enter a valid whole-number repayment term.")
        return
      }
      if (decision !== "under_review" && notes.trim().length < 2) {
        setFormError("Record the evidence for this final decision.")
        return
      }
    }

    if (formIntent.kind === "activate" && notes.trim().length < 2) {
      setFormError("Record the activation evidence.")
      return
    }

    if (formIntent.kind === "disbursement") {
      if (!disbursedAt) {
        setFormError("Choose the release date.")
        return
      }
      if (reference.trim().length < 2) {
        setFormError("Enter the release evidence reference.")
        return
      }
    }

    queuedReviewRef.current = formIntent
    setFormIntent(null)
  }

  const runCommand = async () => {
    if (!reviewIntent || commandsBlocked || isSubmitting) return
    setIsSubmitting(true)
    setFormError(null)
    try {
      if (reviewIntent.kind === "review") {
        await reviewProjectFinancingOperation({
          approvedAmount:
            decision === "approved" ? Number(approvedAmount) : undefined,
          approvedPaybackMonths:
            decision === "approved" &&
            approvedStructure === "repayable_facility"
              ? Number(approvedMonths)
              : undefined,
          approvedStructure:
            decision === "approved" ? approvedStructure : undefined,
          commandId: createClientSubmissionKey(),
          expectedState: reviewIntent.project.status as
            | "submitted"
            | "under_review",
          notes: notes.trim() || undefined,
          projectFinancingRequestId: reviewIntent.project.id,
          status: decision,
        })
        queuedSuccessRef.current =
          decision === "approved"
            ? "The approved structure is ready for activation."
            : decision === "rejected"
              ? "The request was rejected with review evidence."
              : "The request remains under review."
      } else if (reviewIntent.kind === "activate") {
        await activateProjectFinancingOperation({
          commandId: createClientSubmissionKey(),
          expectedState: "approved",
          notes: notes.trim(),
          projectFinancingRequestId: reviewIntent.project.id,
        })
        queuedSuccessRef.current =
          reviewIntent.project.boundary === "repayable_principal"
            ? "The principal-only structure is active. Release evidence is now required."
            : "The evidence-only structure is active. No repayment ledger was created."
      } else {
        await recordProjectFinancingDisbursement({
          commandId: createClientSubmissionKey(),
          disbursedAt,
          expectedState: "active",
          notes: notes.trim() || undefined,
          projectFinancingRequestId: reviewIntent.project.id,
          reference: reference.trim(),
        })
        queuedSuccessRef.current =
          "Release evidence was recorded. This did not initiate a bank transfer."
      }
      setReviewIntent(null)
      await loadWorkspace()
    } catch (error) {
      captureMobileError(error, "mobile.project_financing_operations")
      setFormError(
        error instanceof Error
          ? error.message
          : "The project financing action could not be completed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const quickFill = () => {
    if (!formIntent) return
    if (formIntent.kind === "review") {
      const nextStructure =
        formIntent.project.proposedStructure === "undecided"
          ? "repayable_facility"
          : formIntent.project.proposedStructure
      setDecision("approved")
      setApprovedAmount(String(formIntent.project.requestedAmount))
      setApprovedStructure(nextStructure)
      setApprovedMonths(
        nextStructure === "repayable_facility"
          ? String(formIntent.project.requestedPaybackMonths ?? 12)
          : ""
      )
      setNotes(
        nextStructure === "repayable_facility"
          ? "Approved as a principal-only facility within the committee decision and affordability evidence."
          : "Approved structure recorded as governance evidence. No repayment or profit ledger is created."
      )
    } else if (formIntent.kind === "activate") {
      setNotes(
        formIntent.project.boundary === "repayable_principal"
          ? "Approved principal, term, and committee evidence verified before activation."
          : "Approved structure and evidence-only accounting boundary verified before activation."
      )
    } else {
      setDisbursedAt(todayDateOnly())
      setReference(`QA-PF-${Date.now().toString().slice(-6)}`)
      setNotes("Release evidence verified against the cooperative bank record.")
    }
  }

  const reviewRows = useMemo(() => {
    if (!reviewIntent) return []
    if (reviewIntent.kind === "review") {
      return [
        { label: "Project", value: reviewIntent.project.businessName },
        { label: "Decision", value: labelize(decision) },
        ...(decision === "approved"
          ? [
              {
                label: "Approved amount",
                value: formatCurrency(Number(approvedAmount), currencyCode),
              },
              { label: "Structure", value: structureLabel(approvedStructure) },
              ...(approvedStructure === "repayable_facility"
                ? [
                    {
                      label: "Principal term",
                      value: `${approvedMonths} months`,
                    },
                  ]
                : [
                    {
                      label: "Accounting boundary",
                      value: "Evidence only",
                    },
                  ]),
            ]
          : []),
        { detail: notes, label: "Review evidence" },
      ]
    }
    if (reviewIntent.kind === "activate") {
      return [
        { label: "Project", value: reviewIntent.project.businessName },
        {
          label: "Approved structure",
          value: structureLabel(reviewIntent.project.approvedStructure),
        },
        {
          label: "Boundary",
          value:
            reviewIntent.project.boundary === "repayable_principal"
              ? "Principal only"
              : "Evidence only",
        },
        { detail: notes, label: "Activation evidence" },
      ]
    }
    return [
      { label: "Project", value: reviewIntent.project.businessName },
      { label: "Release date", value: formatDate(disbursedAt) },
      { label: "Evidence reference", value: reference },
      {
        label: "Effect",
        value: "Evidence recorded · no bank transfer",
      },
      ...(notes ? [{ detail: notes, label: "Release note" }] : []),
    ]
  }, [
    approvedAmount,
    approvedMonths,
    approvedStructure,
    currencyCode,
    decision,
    disbursedAt,
    notes,
    reference,
    reviewIntent,
  ])

  const detailProject = detail?.project ?? null
  const detailAction = detailProject?.allowedActions[0] ?? null

  if (qaState === "denied") {
    return (
      <SafeArea className="flex-1 bg-background">
        <View className={`flex-1 gap-5 pt-4 ${compactGutter}`}>
          <View className="w-full max-w-[560px] gap-5 self-center">
            <ScreenHeader title="Project financing" />
            <EmptyState
              description="Your current cooperative role cannot view or operate project financing records."
              icon="ShieldX"
              title="Project financing access required"
            />
          </View>
        </View>
      </SafeArea>
    )
  }

  return (
    <SafeArea className="flex-1 bg-background">
      <AppKeyboardAwareScrollView
        bottomOffset={144}
        contentContainerClassName={`gap-5 pb-28 pt-4 ${compactGutter}`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="admin-project-financing-operations-screen"
      >
        <View className="w-full max-w-[560px] gap-5 self-center">
          <ScreenHeader
            action={
              <Button
                accessibilityLabel="Refresh project financing operations"
                disabled={isLoading}
                onPress={loadWorkspace}
                size="icon"
                testID="project-financing-refresh"
                variant="ghost"
              >
                <Icon className="size-base text-foreground" name="RefreshCw" />
              </Button>
            }
            title="Project financing"
          />
          {isDestinationUnavailable ? (
            <NotificationDestinationNotice
              message="Request unavailable"
              onDismiss={() => setIsDestinationUnavailable(false)}
            />
          ) : null}

          <View className="flex-row items-center gap-2 border-b border-border pb-4">
            <View
              className={`size-2 rounded-full ${dataState === "error" ? "bg-destructive" : dataState === "live" ? "bg-success" : "bg-warn"}`}
            />
            <Text
              className={`text-xs font-bold ${dataState === "error" ? "text-destructive" : dataState === "live" ? "text-success" : "text-warn"}`}
            >
              {dataState === "error"
                ? "Refresh required"
                : dataState === "offline"
                  ? "Offline · cached records"
                  : dataState === "stale"
                    ? "Cached structure data"
                    : "Live structure data"}
            </Text>
          </View>

          {commandsBlocked ? (
            <View className="bg-warn/10 px-3 py-3">
              <Text className="text-warn text-sm leading-5">
                {qaState === "stale"
                  ? "Cached records remain visible. Refresh before reviewing, activating, or recording release evidence."
                  : "Records remain readable offline. Review, activation, and release evidence require a fresh online connection."}
              </Text>
            </View>
          ) : null}
          {loadError ? <ErrorBanner message={loadError} /> : null}

          <View className="border-b border-border pb-5">
            <View className="flex-row divide-x divide-border">
              <View className="min-w-0 flex-1 gap-1 pr-3">
                <Text className="text-2xl font-extrabold tracking-tight text-destructive">
                  {workspace?.summary.blockedCount ?? 0}
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Blocked
                </Text>
              </View>
              <View className="min-w-0 flex-1 gap-1 px-3">
                <Text className="text-success text-2xl font-extrabold tracking-tight">
                  {workspace?.summary.readyCount ?? 0}
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Ready
                </Text>
              </View>
              <View className="min-w-0 flex-[1.4] gap-1 pl-3">
                <Text
                  adjustsFontSizeToFit
                  className="text-2xl font-extrabold tracking-tight text-foreground"
                  minimumFontScale={0.72}
                  numberOfLines={1}
                >
                  {formatCompactCurrency(
                    workspace?.summary.outstandingPrincipal ?? 0,
                    currencyCode
                  )}
                </Text>
                <Text className="text-xs leading-5 text-muted-foreground">
                  Principal due
                </Text>
              </View>
            </View>
          </View>

          {workspace?.attention.length ? (
            <View>
              <View className="flex-row items-end justify-between gap-3 border-b border-border pb-4">
                <Text className="text-lg font-extrabold text-foreground">
                  Needs attention
                </Text>
                <Text className="text-xs font-medium text-muted-foreground">
                  Severity first
                </Text>
              </View>
              {workspace.attention.map((project, index) => (
                <AttentionRow
                  currencyCode={currencyCode}
                  key={project.id}
                  onPress={() => void openDetail(project.id)}
                  project={project}
                  showDivider={index < workspace.attention.length - 1}
                />
              ))}
            </View>
          ) : null}

          <View className="gap-3">
            <View className="flex-row gap-2">
              <Input
                accessibilityLabel="Search project financing operations"
                className="min-w-0 flex-1"
                onChangeText={setSearchDraft}
                onSubmitEditing={Keyboard.dismiss}
                placeholder="Search project, member, or number"
                returnKeyType="search"
                testID="project-financing-search-input"
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
            <ScrollView
              horizontal
              contentContainerClassName="gap-2"
              keyboardShouldPersistTaps="handled"
              showsHorizontalScrollIndicator={false}
            >
              {lanes.map((item) => (
                <Button
                  className="h-10 px-3"
                  key={item.value}
                  onPress={() => setLane(item.value)}
                  testID={`project-financing-lane-${item.value}`}
                  variant={lane === item.value ? "secondary" : "ghost"}
                >
                  <Text>{item.label}</Text>
                </Button>
              ))}
            </ScrollView>
          </View>

          <View>
            <View className="flex-row items-end justify-between gap-3 border-b border-border pb-4">
              <Text className="text-lg font-extrabold text-foreground">
                {lanes.find((item) => item.value === lane)?.label}
              </Text>
              <Text className="text-xs font-medium text-muted-foreground">
                {workspace ? `${workspace.total} records` : "Live queue"}
              </Text>
            </View>
            {isLoading && !workspace ? (
              <View className="items-center py-16">
                <LoadingSpinner />
              </View>
            ) : (
              <VirtualizedCardList
                data={workspace?.projects ?? []}
                empty={
                  <EmptyState
                    description="No project records match this lane and search."
                    icon="BriefcaseBusiness"
                    title="No project financing work"
                  />
                }
                estimatedItemSize={92}
                keyExtractor={(item) => item.id}
                maxHeight={560}
                renderItem={({ index, item }) => (
                  <ProjectRow
                    currencyCode={currencyCode}
                    onPress={() => void openDetail(item.id)}
                    project={item}
                    showDivider={index < (workspace?.projects.length ?? 0) - 1}
                  />
                )}
              />
            )}
            {workspace?.nextCursor ? (
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

          <View className="flex-row items-start gap-3 border-t border-border pt-4">
            <Icon className="size-sm text-warn mt-0.5" name="ShieldCheck" />
            <Text className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
              Repayable principal and evidence-only structures are deliberately
              separate. Release evidence never initiates a bank transfer.
            </Text>
          </View>
        </View>
      </AppKeyboardAwareScrollView>

      <FloatingBottomSheet
        accessibilityLabel={
          detailProject
            ? `${detailProject.businessName} project financing record`
            : "Project financing record"
        }
        hideHandle
        onClose={() => setDetailVisible(false)}
        onDismissed={() => {
          const queued = queuedFormRef.current
          queuedFormRef.current = null
          if (queued) prepareForm(queued)
          else setDetail(null)
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
                {detailProject?.businessName ?? "Loading record"}
              </Text>
              {detailProject ? (
                <Text className="text-sm text-muted-foreground">
                  {detailProject.member.fullName} ·{" "}
                  {detailProject.member.memberNumber}
                </Text>
              ) : null}
            </View>
            <Button
              accessibilityLabel="Close project financing record"
              onPress={() => setDetailVisible(false)}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="X" />
            </Button>
          </View>

          {isDetailLoading || !detailProject || !detail ? (
            <View className="items-center py-20">
              <LoadingSpinner />
            </View>
          ) : (
            <>
              <View className="flex-row items-end justify-between gap-3 border-b border-border pb-4">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-3xl font-extrabold tracking-tight text-foreground">
                    {formatCurrency(
                      detailProject.approvedAmount ??
                        detailProject.requestedAmount,
                      currencyCode
                    )}
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    {structureLabel(
                      detailProject.approvedStructure ??
                        detailProject.proposedStructure
                    )}
                  </Text>
                </View>
                <StatusBadge
                  label={labelize(detailProject.status)}
                  tone={getStatusBadgeTone(detailProject.status)}
                />
              </View>

              <BoundaryNotice project={detailProject} />

              <View>
                <Text className="border-b border-border pb-2 text-lg font-extrabold text-foreground">
                  Position
                </Text>
                <DetailRow
                  label="Requested"
                  value={formatCurrency(
                    detailProject.requestedAmount,
                    currencyCode
                  )}
                />
                {detailProject.approvedAmount !== null ? (
                  <DetailRow
                    label="Approved"
                    value={formatCurrency(
                      detailProject.approvedAmount,
                      currencyCode
                    )}
                  />
                ) : null}
                {detailProject.boundary === "repayable_principal" ? (
                  <>
                    <DetailRow
                      label="Paid principal"
                      value={formatCurrency(
                        detailProject.paidAmount ?? 0,
                        currencyCode
                      )}
                    />
                    <DetailRow
                      label="Outstanding principal"
                      value={formatCurrency(
                        detailProject.outstandingPrincipal ?? 0,
                        currencyCode
                      )}
                    />
                    <DetailRow
                      label="Approved term"
                      value={`${detailProject.approvedPaybackMonths ?? 0} months`}
                    />
                  </>
                ) : null}
              </View>

              <View>
                <Text className="border-b border-border pb-2 text-lg font-extrabold text-foreground">
                  Evidence timeline
                </Text>
                <View className="gap-1 border-b border-border py-3">
                  <Text className="text-sm font-bold text-foreground">
                    Request submitted
                  </Text>
                  <Text className="text-xs leading-5 text-muted-foreground">
                    {detailProject.projectPurpose ?? "No purpose note recorded"}
                  </Text>
                  <Text className="text-xs text-muted-foreground">
                    {formatDate(detailProject.requestedAt)} ·{" "}
                    {detailProject.member.fullName}
                  </Text>
                </View>
                {detailProject.reviewedAt ? (
                  <View className="gap-1 border-b border-border py-3">
                    <Text className="text-sm font-bold text-foreground">
                      Structure reviewed
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      {detailProject.reviewNotes ?? "No review note recorded"}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatDate(detailProject.reviewedAt)} ·{" "}
                      {detailProject.reviewedByUser?.fullName ?? "Reviewer"}
                    </Text>
                  </View>
                ) : null}
                {detail.activation ? (
                  <View className="gap-1 border-b border-border py-3">
                    <Text className="text-sm font-bold text-foreground">
                      Structure activated
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      {detail.activation.notes ??
                        "Activation evidence recorded"}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatDate(detail.activation.activatedAt)} ·{" "}
                      {detail.activation.actor?.fullName ?? "Authorized staff"}
                    </Text>
                  </View>
                ) : null}
                {detailProject.disbursedAt ? (
                  <View className="gap-1 border-b border-border py-3">
                    <Text className="text-sm font-bold text-foreground">
                      Release evidence recorded
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      {detailProject.disbursementReference ?? "No reference"} ·{" "}
                      {detailProject.disbursementNotes ?? "No note"}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatDate(detailProject.disbursedAt)} ·{" "}
                      {detailProject.disbursedByUser?.fullName ??
                        "Authorized staff"}
                    </Text>
                  </View>
                ) : null}
              </View>

              {detailProject.boundary === "repayable_principal" ? (
                <View>
                  <View className="flex-row items-end justify-between gap-3 border-b border-border pb-2">
                    <Text className="text-lg font-extrabold text-foreground">
                      Receipt allocations
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {detail.repayments.length} posted
                    </Text>
                  </View>
                  {detail.repayments.length ? (
                    detail.repayments.map((repayment) => (
                      <View
                        className="flex-row items-center gap-3 border-b border-border py-3"
                        key={repayment.id}
                      >
                        <View className="bg-success size-2 rounded-full" />
                        <View className="min-w-0 flex-1 gap-1">
                          <Text className="text-sm font-bold text-foreground">
                            {repayment.paymentReference ?? "Reviewed receipt"}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            Posted {formatDate(repayment.postedAt)}
                          </Text>
                        </View>
                        <Text className="text-sm font-extrabold text-foreground">
                          {formatCurrency(repayment.amount, currencyCode)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <EmptyState
                      description="Only approved receipt allocations appear here."
                      icon="ReceiptText"
                      title="No principal receipts posted"
                    />
                  )}
                </View>
              ) : null}

              {detailAction ? (
                <Button
                  className="h-12 w-full"
                  disabled={commandsBlocked}
                  onPress={() =>
                    openFormFromDetail({
                      kind:
                        detailAction === "record_disbursement"
                          ? "disbursement"
                          : detailAction,
                      project: detailProject,
                    })
                  }
                  testID={`project-financing-action-${detailAction}`}
                >
                  <Text>
                    {detailAction === "review"
                      ? "Review request"
                      : detailAction === "activate"
                        ? "Activate structure"
                        : "Record release evidence"}
                  </Text>
                </Button>
              ) : null}
            </>
          )}
        </View>
      </FloatingBottomSheet>

      <FullScreenFormSheet
        dirty={formIntent?.kind === "review" && formDirty}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              label="Quick fill project financing review"
              onPress={quickFill}
              placement="footer"
              portal={false}
            />
            <Button className="h-12 flex-1" onPress={validateForm}>
              <Text>Review decision</Text>
            </Button>
          </View>
        }
        onClose={() => setFormIntent(null)}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        title="Review project financing"
        visible={formIntent?.kind === "review"}
      >
        <FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />
        {formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Decision">
          <View className="flex-row gap-2">
            {(["approved", "under_review", "rejected"] as const).map(
              (value) => (
                <Button
                  className="min-w-0 flex-1 px-2"
                  key={value}
                  onPress={() => setDecision(value)}
                  variant={decision === value ? "secondary" : "outline"}
                >
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                    numberOfLines={1}
                  >
                    {labelize(value)}
                  </Text>
                </Button>
              )
            )}
          </View>
        </Field>
        {decision === "approved" ? (
          <>
            <Field label="Approved amount">
              <Input
                keyboardType="decimal-pad"
                onChangeText={setApprovedAmount}
                placeholder="2400000"
                testID="project-financing-approved-amount-input"
                value={approvedAmount}
              />
            </Field>
            <Field label="Approved structure">
              <View className="gap-2">
                {structureOptions.map((option) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: approvedStructure === option.value,
                    }}
                    className={`min-h-12 flex-row items-center gap-3 rounded-lg border px-3 py-2 ${approvedStructure === option.value ? "border-primary bg-primary/10" : "border-border bg-card"}`}
                    key={option.value}
                    onPress={() => {
                      setApprovedStructure(option.value)
                      if (option.value !== "repayable_facility") {
                        setApprovedMonths("")
                      }
                    }}
                  >
                    <View
                      className={`size-4 rounded-full border-2 ${approvedStructure === option.value ? "border-primary bg-primary" : "border-muted-foreground"}`}
                    />
                    <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                      {option.label}
                    </Text>
                    <Text
                      className={`text-xs font-bold ${option.value === "repayable_facility" ? "text-primary" : "text-warn"}`}
                    >
                      {option.value === "repayable_facility"
                        ? "Principal"
                        : "Evidence only"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Field>
            {approvedStructure === "repayable_facility" ? (
              <Field label="Approved repayment months">
                <Input
                  keyboardType="number-pad"
                  onChangeText={setApprovedMonths}
                  placeholder="12"
                  testID="project-financing-approved-months-input"
                  value={approvedMonths}
                />
              </Field>
            ) : (
              <View className="bg-warn/10 px-3 py-3">
                <Text className="text-warn text-xs leading-5">
                  No repayment term, receipt target, balance, or profit posting
                  will be created for this structure.
                </Text>
              </View>
            )}
          </>
        ) : null}
        <Field label="Review evidence">
          <Textarea
            onChangeText={setNotes}
            placeholder="Record the committee decision and accounting boundary."
            testID="project-financing-review-notes-input"
            value={notes}
          />
        </Field>
      </FullScreenFormSheet>

      <FullScreenFormSheet
        dirty={formIntent?.kind === "activate" && formDirty}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              label="Quick fill project activation"
              onPress={quickFill}
              placement="footer"
              portal={false}
            />
            <Button className="h-12 flex-1" onPress={validateForm}>
              <Text>Review activation</Text>
            </Button>
          </View>
        }
        onClose={() => setFormIntent(null)}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        title="Activate structure"
        visible={formIntent?.kind === "activate"}
      >
        {formIntent?.kind === "activate" ? (
          <BoundaryNotice project={formIntent.project} />
        ) : null}
        <FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />
        {formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Activation evidence">
          <Textarea
            onChangeText={setNotes}
            placeholder="Record the approved structure and evidence checked."
            testID="project-financing-activation-notes-input"
            value={notes}
          />
        </Field>
      </FullScreenFormSheet>

      <FullScreenFormSheet
        dirty={formIntent?.kind === "disbursement" && formDirty}
        footer={
          <View className="flex-row items-center gap-3">
            <DevQuickFill
              label="Quick fill project release evidence"
              onPress={quickFill}
              placement="footer"
              portal={false}
            />
            <Button className="h-12 flex-1" onPress={validateForm}>
              <Text>Review evidence</Text>
            </Button>
          </View>
        }
        onClose={() => {
          setCalendarVisible(false)
          setFormIntent(null)
        }}
        onDismissed={() => {
          const queued = queuedReviewRef.current
          queuedReviewRef.current = null
          if (queued) setReviewIntent(queued)
        }}
        overlay={
          <CalendarPickerSheet
            label="Release date"
            maximumDate={todayDateOnly()}
            onChange={setDisbursedAt}
            onClose={() => setCalendarVisible(false)}
            testID="project-financing-release-calendar"
            value={disbursedAt}
            visible={calendarVisible}
          />
        }
        title="Record release evidence"
        visible={formIntent?.kind === "disbursement"}
      >
        <View className="bg-warn/10 px-3 py-3">
          <Text className="text-warn text-xs leading-5">
            This records cooperative evidence only. It does not initiate or
            confirm a bank transfer outside the recorded reference.
          </Text>
        </View>
        <FormStateBanner hasDraft={formDirty} isStale={commandsBlocked} />
        {formError ? <ErrorBanner message={formError} /> : null}
        <Field label="Release date">
          <CalendarDateField
            accessibilityLabel="Release date"
            onPress={() => setCalendarVisible(true)}
            testID="project-financing-release-date-input"
            value={disbursedAt}
          />
        </Field>
        <Field label="Evidence reference">
          <Input
            autoCapitalize="characters"
            onChangeText={setReference}
            placeholder="PF-REL-0123"
            testID="project-financing-release-reference-input"
            value={reference}
          />
        </Field>
        <Field label="Release note (optional)">
          <Textarea
            onChangeText={setNotes}
            placeholder="Record the bank or committee evidence checked."
            testID="project-financing-release-notes-input"
            value={notes}
          />
        </Field>
      </FullScreenFormSheet>

      <SubmissionReviewSheet
        confirmLabel={
          reviewIntent?.kind === "review"
            ? "Confirm decision"
            : reviewIntent?.kind === "activate"
              ? "Activate structure"
              : "Record evidence"
        }
        description={
          reviewIntent?.kind === "review"
            ? "Confirm the server-owned decision, structure, and accounting boundary."
            : reviewIntent?.kind === "activate"
              ? "Activation claims the approved structure once and preserves its accounting boundary."
              : "The reference becomes release evidence; no bank transfer is initiated."
        }
        error={formError}
        isSubmitting={isSubmitting}
        onClose={() => setReviewIntent(null)}
        onConfirm={() => void runCommand()}
        onDismissed={() => {
          const message = queuedSuccessRef.current
          queuedSuccessRef.current = null
          if (message) setSuccess(message)
        }}
        rows={reviewRows}
        title={
          reviewIntent?.kind === "review"
            ? "Review project decision"
            : reviewIntent?.kind === "activate"
              ? "Review structure activation"
              : "Review release evidence"
        }
        visible={Boolean(reviewIntent)}
      />

      <SubmissionSuccessSheet
        description={success ?? "The project financing action was confirmed."}
        onClose={() => setSuccess(null)}
        title={
          success?.startsWith("The approved")
            ? "Decision recorded"
            : success?.startsWith("The principal") ||
                success?.startsWith("The evidence-only")
              ? "Structure activated"
              : "Evidence recorded"
        }
        visible={Boolean(success)}
      />
    </SafeArea>
  )
}
