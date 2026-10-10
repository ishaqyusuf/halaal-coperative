import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { CalendarDateField } from "@/components/app/calendar-date-field"
import { CalendarPickerSheet } from "@/components/app/calendar-picker-sheet"
import { useFormCalendar } from "@/hooks/use-form-calendar"
import { CompactFormSheet } from "@/components/app/compact-form-sheet"
import { ConfirmationRow } from "@/components/app/confirmation-row"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
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
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { useDebounce } from "@/hooks/use-debounce"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { captureMobileError } from "@/lib/sentry"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useFocusEffect } from "@react-navigation/native"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Pressable, View } from "react-native"
import {
  applyChargeApplication,
  getChargeApplication,
  getChargeFormOptions,
  getChargeWorkspace,
  reverseChargeApplication,
  settleChargeApplication,
  waiveChargeApplication,
} from "../api/admin-charge-operations-api"
import {
  ChargeAppliedSuccessSheet,
  type ChargeAppliedReceipt,
} from "../components/charge-applied-success-sheet"
import {
  ChargeReplaySuccessSheet,
  type ChargeReplayReceipt,
} from "../components/charge-replay-success-sheet"
import {
  type AdminChargeOperationsQaState,
  duplicateChargeResponseLossQaState,
  isCommittedChargeResponseLoss,
} from "../model/admin-charge-response-loss"
import type {
  ChargeApplicationDetail,
  ChargeApplicationRow,
  ChargeCollectionMode,
  ChargeFilters,
  ChargeFormOptions,
  ChargeLane,
  ChargeRuleRow,
  ChargeStatus,
  ChargeWorkspace,
} from "../model/admin-charge-operations-types"

const lanes: { label: string; value: ChargeLane }[] = [
  { label: "Applications", value: "applications" },
  { label: "Levies", value: "levies" },
  { label: "Rules", value: "rules" },
]

const statuses: { label: string; value: ChargeStatus }[] = [
  { label: "Pending", value: "pending" },
  { label: "Posted", value: "posted" },
  { label: "Waived", value: "waived" },
  { label: "Reversed", value: "reversed" },
]

const purposes = [
  "general",
  "membership_fee",
  "loan_fee",
  "member_share",
  "penalty",
] as const

const workflows = [
  "commitment_collection",
  "loan_request",
  "loan",
  "procurement_request",
  "food_purchase_application",
  "project_financing_request",
] as const

type CommandIntent =
  | {
      kind: "apply"
      input: Parameters<typeof applyChargeApplication>[0]
      receipt: {
        amount: number
        collectionMode: ChargeCollectionMode
        definitionName: string
        memberName: string
        memberNumber: string
      }
      summary: string
    }
  | {
      kind: "settle"
      input: Parameters<typeof settleChargeApplication>[0]
      summary: string
    }
  | {
      kind: "waive"
      input: Parameters<typeof waiveChargeApplication>[0]
      summary: string
    }
  | {
      kind: "reverse"
      input: Parameters<typeof reverseChargeApplication>[0]
      summary: string
    }

type ChargeCommandSuccess =
  | { kind: "applied"; receipt: ChargeAppliedReceipt }
  | { description: string; kind: "default" }
  | { kind: "replayed-apply"; receipt: ChargeReplayReceipt }

function labelize(value: string) {
  return value
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function compactIdentifier(value: string | null | undefined) {
  if (!value) return "Unavailable"
  return value.length > 16 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatDateOnly(value: string | Date | null | undefined) {
  if (!value) return "Unavailable"
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : date.toISOString().slice(0, 10)
}

function formatCompactCurrency(value: number, currencyCode: string) {
  if (Math.abs(value) < 1_000) return formatCurrency(value, currencyCode)
  const divisor = Math.abs(value) >= 1_000_000 ? 1_000_000 : 1_000
  const suffix = divisor === 1_000_000 ? "m" : "k"
  return `${new Intl.NumberFormat("en-NG", {
    currency: currencyCode,
    maximumFractionDigits: 1,
    style: "currency",
  }).format(value / divisor)}${suffix}`
}

function parsePositiveNumber(value: string) {
  if (!value.trim()) return undefined
  const number = Number(value.replace(/,/g, ""))
  return Number.isFinite(number) && number > 0 ? number : null
}

function isoDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function isRuleRow(
  row: ChargeApplicationRow | ChargeRuleRow
): row is ChargeRuleRow {
  return "versions" in row
}

function statusDot(status: ChargeStatus) {
  if (status === "posted") return "bg-success"
  if (status === "pending") return "bg-warn"
  if (status === "reversed") return "bg-destructive"
  return "bg-muted-foreground"
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text className="text-sm font-bold text-foreground">{children}</Text>
}

function SubmitError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <View className="bg-destructive/10 px-3 py-2">
      <Text className="text-sm leading-5 font-medium text-destructive">
        {message}
      </Text>
    </View>
  )
}

function ApplicationRow({
  currencyCode,
  item,
  onPress,
}: {
  currencyCode: string
  item: ChargeApplicationRow
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityHint="Opens charge definition, posting, workflow, and audit evidence"
      accessibilityLabel={`${item.memberName}, ${item.definitionName}, ${formatCurrency(item.amount, currencyCode)}, ${labelize(item.status)}`}
      accessibilityRole="button"
      className="min-h-20 flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/40"
      onPress={onPress}
      testID={`charge-application-${item.id}`}
    >
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-start justify-between gap-3">
          <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
            {item.memberName}
          </Text>
          <Text className="text-sm font-extrabold text-foreground">
            {formatCurrency(item.amount, currencyCode)}
          </Text>
        </View>
        <Text className="text-xs leading-5 text-muted-foreground">
          {item.definitionName} · {item.memberNumber}
        </Text>
        <View className="flex-row items-center gap-2">
          <View className={`size-2 rounded-full ${statusDot(item.status)}`} />
          <Text className="text-xs font-medium text-muted-foreground">
            {labelize(item.status)} · {labelize(item.collectionMode)}
          </Text>
        </View>
      </View>
      <Icon className="size-sm text-muted-foreground" name="ChevronRight" />
    </Pressable>
  )
}

function RuleRow({
  currencyCode,
  item,
}: {
  currencyCode: string
  item: ChargeRuleRow
}) {
  const version = item.versions[0]
  return (
    <View className="gap-1 border-b border-border py-3">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
          {item.name}
        </Text>
        <Text className="text-sm font-extrabold text-foreground">
          {version
            ? item.chargeValueType === "percentage"
              ? `${version.amount}%`
              : formatCurrency(version.amount, currencyCode)
            : "No version"}
        </Text>
      </View>
      <Text className="text-xs leading-5 text-muted-foreground">
        {item.code} · {labelize(item.chargeFrequency)} ·{" "}
        {labelize(item.purpose)}
      </Text>
      <Text className="text-xs font-medium text-muted-foreground">
        {item.applicability.length
          ? item.applicability
              .map(
                (row) => `${labelize(row.workflow)} · ${labelize(row.trigger)}`
              )
              .join(" · ")
          : "No active workflow"}
      </Text>
    </View>
  )
}

export function AdminChargeOperationsScreen({
  qaState = null,
}: {
  qaState?: AdminChargeOperationsQaState | null
}) {
  const runtime = useMobileRuntime()
  const [lane, setLane] = useState<ChargeLane>("applications")
  const [searchDraft, setSearchDraft] = useState("")
  const debouncedSearch = useDebounce(searchDraft.trim(), 350)
  const [filters, setFilters] = useState<ChargeFilters>({})
  const [draftFilters, setDraftFilters] = useState<ChargeFilters>({})
  const [workspace, setWorkspace] = useState<ChargeWorkspace | null>(null)
  const [rows, setRows] = useState<(ChargeApplicationRow | ChargeRuleRow)[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filterVisible, setFilterVisible] = useState(false)
  const filterCalendar = useFormCalendar(filterVisible)
  const [detail, setDetail] = useState<ChargeApplicationDetail | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [formOptions, setFormOptions] = useState<ChargeFormOptions | null>(null)
  const [formMode, setFormMode] = useState<"apply" | "settle" | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState("")
  const [selectedDefinitionId, setSelectedDefinitionId] = useState("")
  const [applySelectionTouched, setApplySelectionTouched] = useState(false)
  const [pickerMode, setPickerMode] = useState<"member" | "definition" | null>(
    null
  )
  const [pickerSearch, setPickerSearch] = useState("")
  const [basisAmount, setBasisAmount] = useState("")
  const [assessedAt, setAssessedAt] = useState(() => todayDateOnly())
  const [notes, setNotes] = useState("")
  const [paymentReference, setPaymentReference] = useState("")
  const [paidAt, setPaidAt] = useState(() => todayDateOnly())
  const [calendarIntent, setCalendarIntent] = useState<
    "assessment" | "payment" | null
  >(null)
  const [correctionMode, setCorrectionMode] = useState<
    "reverse" | "waive" | null
  >(null)
  const [correctionReason, setCorrectionReason] = useState("")
  const correctionReasonRef = useRef("")
  const [review, setReview] = useState<CommandIntent | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<ChargeCommandSuccess | null>(null)
  const queuedSuccessRef = useRef<ChargeCommandSuccess | null>(null)
  const queuedSuccessHostRef = useRef<"correction" | "form" | null>(null)
  const [simulateCommittedResponseLoss, setSimulateCommittedResponseLoss] =
    useState(qaState === duplicateChargeResponseLossQaState)
  const [isConfirmingResponseLoss, setIsConfirmingResponseLoss] =
    useState(false)

  useEffect(() => {
    if (qaState === duplicateChargeResponseLossQaState) {
      setSimulateCommittedResponseLoss(true)
    }
  }, [qaState])

  const load = useCallback(
    async (cursor?: string | null, append = false) => {
      if (append) setIsLoadingMore(true)
      else setIsLoading(true)
      setLoadError(null)
      try {
        const result = await getChargeWorkspace({
          cursor,
          filters,
          lane,
          search: debouncedSearch || undefined,
        })
        setWorkspace(result)
        setRows((current) =>
          append ? [...current, ...result.data] : result.data
        )
      } catch (error) {
        captureMobileError(error, "mobile.charge_operations")
        setLoadError(
          error instanceof Error
            ? error.message
            : "Charges could not be loaded."
        )
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [debouncedSearch, filters, lane]
  )

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  const loadOptions = useCallback(async () => {
    try {
      const options = await getChargeFormOptions()
      setFormOptions(options)
      setSelectedMemberId((current) => current || options.members[0]?.id || "")
      setSelectedDefinitionId(
        (current) => current || options.definitions[0]?.id || ""
      )
    } catch (error) {
      captureMobileError(error, "mobile.charge_operations")
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Form options could not be loaded."
      )
    }
  }, [])

  const openDetail = useCallback(async (applicationId: string) => {
    setDetailVisible(true)
    setIsDetailLoading(true)
    setSubmitError(null)
    try {
      setDetail(await getChargeApplication(applicationId))
    } catch (error) {
      captureMobileError(error, "mobile.charge_operations")
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Charge detail could not be loaded."
      )
    } finally {
      setIsDetailLoading(false)
    }
  }, [])

  const stale = isMobileReadCacheStale(workspace?.cache)
  const isWritable =
    runtime.state.connectivity === "online" && !stale && !isSubmitting
  const currencyCode = workspace?.currencyCode ?? "NGN"
  const selectedDefinition = formOptions?.definitions.find(
    (item) => item.id === selectedDefinitionId
  )
  const selectedMember = formOptions?.members.find(
    (item) => item.id === selectedMemberId
  )
  const parsedBasis = parsePositiveNumber(basisAmount)
  const expectedAmount = selectedDefinition
    ? selectedDefinition.chargeValueType === "percentage"
      ? typeof parsedBasis === "number"
        ? Number(((parsedBasis * selectedDefinition.rate) / 100).toFixed(2))
        : 0
      : selectedDefinition.rate
    : 0

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const normalizedPickerSearch = pickerSearch.trim().toLowerCase()
  const filteredPickerMembers = useMemo(
    () =>
      (formOptions?.members ?? []).filter(
        (member) =>
          !normalizedPickerSearch ||
          member.fullName.toLowerCase().includes(normalizedPickerSearch) ||
          member.memberNumber.toLowerCase().includes(normalizedPickerSearch)
      ),
    [formOptions?.members, normalizedPickerSearch]
  )
  const filteredPickerDefinitions = useMemo(
    () =>
      (formOptions?.definitions ?? []).filter(
        (definition) =>
          !normalizedPickerSearch ||
          definition.name.toLowerCase().includes(normalizedPickerSearch) ||
          definition.code.toLowerCase().includes(normalizedPickerSearch)
      ),
    [formOptions?.definitions, normalizedPickerSearch]
  )

  const updateCorrectionReason = (value: string) => {
    correctionReasonRef.current = value
    setCorrectionReason(value)
  }

  const resetForms = () => {
    const today = todayDateOnly()
    setCalendarIntent(null)
    setAssessedAt(today)
    setPaidAt(today)
    setBasisAmount("")
    setNotes("")
    setPaymentReference("")
    updateCorrectionReason("")
    setSubmitError(null)
  }

  const openApply = () => {
    resetForms()
    setApplySelectionTouched(false)
    setPickerMode(null)
    setPickerSearch("")
    setFormMode("apply")
    void loadOptions()
  }

  const selectLane = (nextLane: ChargeLane) => {
    setLane(nextLane)
    setFilterVisible(false)
    setDraftFilters({})
    setFilters((current) =>
      nextLane === "rules"
        ? {
            purpose: current.purpose,
            workflow: current.workflow,
          }
        : current
    )
  }

  const reviewApply = () => {
    const date = isoDate(assessedAt)
    if (!selectedMember || !selectedDefinition || !date) {
      setSubmitError("Choose a member, charge rule, and valid assessment date.")
      return
    }
    if (
      selectedDefinition.chargeValueType === "percentage" &&
      typeof parsedBasis !== "number"
    ) {
      setSubmitError(
        "Enter a positive amount basis for this percentage charge."
      )
      return
    }
    setSubmitError(null)
    setIsConfirmingResponseLoss(false)
    setReview({
      input: {
        assessedAt: date,
        basisAmount: typeof parsedBasis === "number" ? parsedBasis : null,
        chargeDefinitionId: selectedDefinition.id,
        commandId: createClientSubmissionKey(),
        expectedAmount,
        expectedState: "available",
        memberId: selectedMember.id,
        notes: notes.trim() || null,
      },
      kind: "apply",
      receipt: {
        amount: expectedAmount,
        collectionMode: selectedDefinition.collectionMode,
        definitionName: selectedDefinition.name,
        memberName: selectedMember.fullName,
        memberNumber: selectedMember.memberNumber,
      },
      summary: `${selectedDefinition.name} for ${selectedMember.fullName}`,
    })
  }

  const reviewSettlement = () => {
    const date = isoDate(paidAt)
    if (!detail || !date || paymentReference.trim().length < 3) {
      setSubmitError("Enter a valid payment date and reference.")
      return
    }
    setSubmitError(null)
    setReview({
      input: {
        applicationId: detail.id,
        commandId: createClientSubmissionKey(),
        expectedState: detail.workspaceState,
        notes: notes.trim() || null,
        paidAt: date,
        reference: paymentReference.trim(),
      },
      kind: "settle",
      summary: `${detail.definitionName} payment from ${detail.memberName}`,
    })
  }

  const reviewCorrection = () => {
    const reason = correctionReasonRef.current.trim()
    if (!detail || !correctionMode || reason.length < 8) {
      setSubmitError(
        "Enter a clear correction reason of at least 8 characters."
      )
      return
    }
    setSubmitError(null)
    const input = {
      applicationId: detail.id,
      commandId: createClientSubmissionKey(),
      expectedState: detail.workspaceState,
      reason,
    }
    setReview({
      input,
      kind: correctionMode,
      summary: `${labelize(correctionMode)} ${detail.definitionName} for ${detail.memberName}`,
    })
  }

  const submitReview = async () => {
    if (!review || !isWritable) return
    const command = review
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const result = await runtime.runOnlineOperation(
        "financial-command",
        async () => {
          if (command.kind === "apply") {
            const simulateResponseLoss = simulateCommittedResponseLoss
            if (simulateResponseLoss) setSimulateCommittedResponseLoss(false)
            return applyChargeApplication(command.input, {
              simulateResponseLossAfterCommit: simulateResponseLoss,
            })
          }
          if (command.kind === "settle")
            return settleChargeApplication(command.input)
          if (command.kind === "waive")
            return waiveChargeApplication(command.input)
          return reverseChargeApplication(command.input)
        }
      )
      queuedSuccessRef.current =
        command.kind === "apply"
          ? result.replayed
            ? {
                kind: "replayed-apply",
                receipt: {
                  amount: formatCurrency(command.receipt.amount, currencyCode),
                  definitionName: command.receipt.definitionName,
                  memberName: command.receipt.memberName,
                  memberNumber: command.receipt.memberNumber,
                },
              }
            : {
                kind: "applied",
                receipt: {
                  amount: formatCurrency(command.receipt.amount, currencyCode),
                  collectionMode: command.receipt.collectionMode,
                  definitionName: command.receipt.definitionName,
                  memberName: command.receipt.memberName,
                  status: labelize(result.state),
                },
              }
          : {
              description: `${command.summary} was recorded with audit evidence.`,
              kind: "default",
            }
      setIsConfirmingResponseLoss(false)
      queuedSuccessHostRef.current =
        command.kind === "apply" || command.kind === "settle"
          ? "form"
          : "correction"
      setReview(null)
      if (command.kind === "waive" || command.kind === "reverse") {
        setCorrectionMode(null)
      }
      await load()
    } catch (error) {
      captureMobileError(error, "mobile.charge_operations")
      setIsConfirmingResponseLoss(isCommittedChargeResponseLoss(error))
      setSubmitError(
        error instanceof Error
          ? error.message
          : "The charge command could not be completed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const reviewRows = useMemo(() => {
    if (!review) return []
    const amount =
      review.kind === "apply"
        ? review.input.expectedAmount
        : (detail?.amount ?? 0)
    return [
      { label: "Operation", value: labelize(review.kind) },
      { label: "Record", value: review.summary },
      { label: "Amount", value: formatCurrency(amount, currencyCode) },
      {
        label: "Expected state",
        value: review.input.expectedState,
      },
    ]
  }, [currencyCode, detail?.amount, review])
  const correctionReview =
    review?.kind === "waive" || review?.kind === "reverse" ? review : null

  return (
    <SafeArea className="flex-1 bg-background">
      <View className="flex-1 px-5 pt-4">
        <ScreenHeader
          action={
            <Button
              accessibilityLabel="Refresh charges"
              onPress={() => void load()}
              size="icon"
              variant="ghost"
            >
              <Icon className="size-base text-foreground" name="RefreshCw" />
            </Button>
          }
          title="Charges"
        />
        {workspace?.cache ? (
          <View className="mt-3">
            <CachedReadBanner
              cache={workspace.cache}
              label="charge operations"
            />
          </View>
        ) : workspace ? (
          <View className="mt-3 flex-row items-center gap-2">
            <View className="bg-success size-2 rounded-full" />
            <Text className="text-success text-xs font-medium">
              Updated just now
            </Text>
          </View>
        ) : null}
        {runtime.state.connectivity !== "online" ? (
          <View className="bg-warn/10 mt-3 px-3 py-2">
            <Text className="text-warn text-sm leading-5">
              Cached charge evidence remains available. Financial commands
              require a live connection.
            </Text>
          </View>
        ) : null}
        <View className="mt-4 flex-row rounded-xl bg-secondary p-1">
          {lanes.map((item) => (
            <Button
              className="h-10 flex-1 px-2"
              key={item.value}
              onPress={() => selectLane(item.value)}
              testID={`charge-lane-${item.value}`}
              variant={lane === item.value ? "outline" : "ghost"}
            >
              <Text className="text-xs font-bold">{item.label}</Text>
            </Button>
          ))}
        </View>
        {workspace ? (
          <View className="mt-3 flex-row border-y border-border py-3">
            {[
              {
                label: "Outstanding",
                value: formatCompactCurrency(
                  workspace.stats.outstanding,
                  currencyCode
                ),
              },
              {
                label: "This month",
                value: formatCompactCurrency(
                  workspace.stats.postedThisMonth,
                  currencyCode
                ),
              },
              {
                label: "Corrections",
                value: String(workspace.stats.corrections),
              },
            ].map((stat, index) => (
              <View
                className={`min-w-0 flex-1 gap-1 px-3 ${index ? "border-l border-border" : ""}`}
                key={stat.label}
              >
                <Text className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </Text>
                <Text
                  adjustsFontSizeToFit
                  className="text-lg font-extrabold text-foreground"
                  minimumFontScale={0.7}
                  numberOfLines={1}
                >
                  {stat.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
        <View className="mt-3 flex-row gap-2">
          <Input
            accessibilityLabel={`Search charge ${lane}`}
            className="flex-1"
            onChangeText={setSearchDraft}
            placeholder={
              lane === "rules"
                ? "Search rule or code"
                : "Search member or charge"
            }
            returnKeyType="search"
            testID="charge-search-input"
            value={searchDraft}
          />
          <Button
            accessibilityLabel={`Filter charges${activeFilterCount ? `, ${activeFilterCount} active` : ""}`}
            onPress={() => {
              setDraftFilters(filters)
              setFilterVisible(true)
              if (lane !== "rules") void loadOptions()
            }}
            size="icon"
            variant={activeFilterCount ? "secondary" : "outline"}
          >
            <Icon
              className="size-base text-foreground"
              name="SlidersHorizontal"
            />
          </Button>
        </View>
        <View className="mt-4 min-h-0 flex-1">
          {isLoading ? (
            <View className="mt-12">
              <LoadingSpinner />
            </View>
          ) : loadError ? (
            <View className="gap-3 py-8">
              <Text className="text-sm leading-5 text-destructive">
                {loadError}
              </Text>
              <Button
                className="self-start"
                onPress={() => void load()}
                variant="outline"
              >
                <Text>Retry</Text>
              </Button>
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between border-b border-border pb-2">
                <Text className="text-lg font-extrabold text-foreground">
                  {lane === "rules"
                    ? "Charge rules"
                    : lane === "levies"
                      ? "Monthly levy rows"
                      : "Charge applications"}
                </Text>
                <Text className="text-xs font-medium text-muted-foreground">
                  {lane === "rules" ? "Effective versions" : "Newest first"}
                </Text>
              </View>
              <VirtualizedCardList
                data={rows}
                empty={
                  <EmptyState
                    description={
                      debouncedSearch || activeFilterCount
                        ? "Clear or adjust the search and filters."
                        : `No ${lane} records are available yet.`
                    }
                    title={
                      debouncedSearch || activeFilterCount
                        ? "No matching records"
                        : `No ${lane} yet`
                    }
                  />
                }
                estimatedItemSize={82}
                keyExtractor={(item) => item.id}
                maxHeight={520}
                renderItem={({ item }) =>
                  isRuleRow(item) ? (
                    <RuleRow currencyCode={currencyCode} item={item} />
                  ) : (
                    <ApplicationRow
                      currencyCode={currencyCode}
                      item={item}
                      onPress={() => void openDetail(item.id)}
                    />
                  )
                }
              />
              {workspace?.nextCursor ? (
                <Button
                  className="mt-3"
                  disabled={isLoadingMore}
                  onPress={() => void load(workspace.nextCursor, true)}
                  variant="outline"
                >
                  <Text>{isLoadingMore ? "Loading" : "Load more"}</Text>
                </Button>
              ) : null}
            </>
          )}
        </View>
        {workspace?.capabilities.manage ? (
          <View className="absolute right-5 bottom-5">
            <Button
              className="rounded-full px-5"
              disabled={!isWritable}
              onPress={openApply}
            >
              <Icon className="size-base text-primary-foreground" name="Plus" />
              <Text>Apply charge</Text>
            </Button>
          </View>
        ) : null}
      </View>

      <FloatingBottomSheet
        accessibilityLabel="Charge filters"
        footer={
          <View className="flex-row gap-2 px-5 pt-3 pb-5">
            <Button
              className="flex-1"
              onPress={() => {
                setDraftFilters({})
                setFilters({})
                setFilterVisible(false)
              }}
              variant="outline"
            >
              <Text>Clear</Text>
            </Button>
            <Button
              className="flex-1"
              onPress={() => {
                setFilters(draftFilters)
                setFilterVisible(false)
              }}
            >
              <Text>Apply filters</Text>
            </Button>
          </View>
        }
        onClose={() => setFilterVisible(false)}
        overlay={filterCalendar.overlay}
        overlayActive={filterCalendar.isOpen}
        presentation="compact"
        scrollable="auto"
        title={lane === "rules" ? "Filter rules" : "Filter charges"}
        visible={filterVisible}
      >
        <View className="gap-5 px-5 pt-3 pb-4">
          {lane !== "rules" ? (
            <>
              <View className="gap-2">
                <FieldLabel>Status</FieldLabel>
                <View className="flex-row flex-wrap gap-2">
                  {statuses.map((item) => (
                    <Button
                      key={item.value}
                      onPress={() =>
                        setDraftFilters((current) => ({
                          ...current,
                          status:
                            current.status === item.value ? null : item.value,
                        }))
                      }
                      size="sm"
                      variant={
                        draftFilters.status === item.value
                          ? "secondary"
                          : "outline"
                      }
                    >
                      <Text>{item.label}</Text>
                    </Button>
                  ))}
                </View>
              </View>
              <View className="gap-2">
                <FieldLabel>Collection mode</FieldLabel>
                {(
                  [
                    "deduct_from_savings",
                    "pay_separately",
                  ] as ChargeCollectionMode[]
                ).map((value) => (
                  <Button
                    key={value}
                    onPress={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        collectionMode:
                          current.collectionMode === value ? null : value,
                      }))
                    }
                    variant={
                      draftFilters.collectionMode === value
                        ? "secondary"
                        : "outline"
                    }
                  >
                    <Text>{labelize(value)}</Text>
                  </Button>
                ))}
              </View>
              <View className="gap-2">
                <FieldLabel>Member</FieldLabel>
                <Button
                  className="justify-start"
                  onPress={() =>
                    setDraftFilters((current) => ({
                      ...current,
                      memberId: null,
                    }))
                  }
                  variant={!draftFilters.memberId ? "secondary" : "outline"}
                >
                  <Text>All members</Text>
                </Button>
                {formOptions?.members.slice(0, 8).map((member) => (
                  <Button
                    className="justify-start"
                    key={member.id}
                    onPress={() =>
                      setDraftFilters((current) => ({
                        ...current,
                        memberId: member.id,
                      }))
                    }
                    variant={
                      draftFilters.memberId === member.id
                        ? "secondary"
                        : "outline"
                    }
                  >
                    <Text>
                      {member.fullName} · {member.memberNumber}
                    </Text>
                  </Button>
                ))}
              </View>
            </>
          ) : null}
          <View className="gap-2">
            <FieldLabel>Purpose</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {purposes.map((value) => (
                <Button
                  key={value}
                  onPress={() =>
                    setDraftFilters((current) => ({
                      ...current,
                      purpose: current.purpose === value ? null : value,
                    }))
                  }
                  size="sm"
                  variant={
                    draftFilters.purpose === value ? "secondary" : "outline"
                  }
                >
                  <Text>{labelize(value)}</Text>
                </Button>
              ))}
            </View>
          </View>
          <View className="gap-2">
            <FieldLabel>Workflow</FieldLabel>
            {workflows.map((value) => (
              <Button
                className="justify-start"
                key={value}
                onPress={() =>
                  setDraftFilters((current) => ({
                    ...current,
                    workflow: current.workflow === value ? null : value,
                  }))
                }
                variant={
                  draftFilters.workflow === value ? "secondary" : "outline"
                }
              >
                <Text>{labelize(value)}</Text>
              </Button>
            ))}
          </View>
          {lane !== "rules" ? (
            <View className="gap-2">
              <FieldLabel>Period</FieldLabel>
              <View className="gap-3">
                <CalendarDateField
                  accessibilityLabel="Period start date"
                  onPress={() =>
                    filterCalendar.open({
                      label: "From date",
                      value: draftFilters.fromDate?.slice(0, 10) ?? "",
                      onChange: (value) =>
                        setDraftFilters((current) => ({
                          ...current,
                          fromDate: isoDate(value),
                        })),
                    })
                  }
                  placeholder="From date"
                  value={draftFilters.fromDate?.slice(0, 10) ?? ""}
                />
                <CalendarDateField
                  accessibilityLabel="Period end date"
                  onPress={() =>
                    filterCalendar.open({
                      label: "To date",
                      minimumDate: draftFilters.fromDate?.slice(0, 10),
                      value: draftFilters.toDate
                        ? new Date(
                            new Date(draftFilters.toDate).getTime() - 86_400_000
                          )
                            .toISOString()
                            .slice(0, 10)
                        : "",
                      onChange: (value) =>
                        setDraftFilters((current) => ({
                          ...current,
                          toDate: new Date(
                            new Date(`${value}T00:00:00.000Z`).getTime() +
                              86_400_000
                          ).toISOString(),
                        })),
                    })
                  }
                  placeholder="To date"
                  value={
                    draftFilters.toDate
                      ? new Date(
                          new Date(draftFilters.toDate).getTime() - 86_400_000
                        )
                          .toISOString()
                          .slice(0, 10)
                      : ""
                  }
                />
              </View>
            </View>
          ) : null}
        </View>
      </FloatingBottomSheet>

      <FloatingBottomSheet
        accessibilityLabel="Charge detail"
        onClose={() => setDetailVisible(false)}
        presentation="large"
        scrollable="auto"
        title="Charge evidence"
        visible={detailVisible}
      >
        <View className="gap-5 px-5 pt-3 pb-6">
          {isDetailLoading ? (
            <LoadingSpinner />
          ) : detail ? (
            <>
              <View className="gap-1 border-b border-border pb-4">
                <View className="flex-row items-start justify-between gap-3">
                  <Text className="min-w-0 flex-1 text-xl font-extrabold text-foreground">
                    {detail.definitionName}
                  </Text>
                  <Text className="text-xl font-extrabold text-foreground">
                    {formatCurrency(detail.amount, currencyCode)}
                  </Text>
                </View>
                <Text className="text-sm text-muted-foreground">
                  {detail.memberName} · {detail.memberNumber}
                </Text>
                <View className="mt-2 flex-row items-center gap-2">
                  <View
                    className={`size-2 rounded-full ${statusDot(detail.status)}`}
                  />
                  <Text className="text-xs font-bold text-muted-foreground">
                    {labelize(detail.status)} ·{" "}
                    {labelize(detail.collectionMode)}
                  </Text>
                </View>
              </View>
              <View className="gap-3">
                {[
                  [
                    "Definition version",
                    compactIdentifier(detail.definition.versionId),
                  ],
                  [
                    "Effective from",
                    formatDateOnly(detail.definition.versionEffectiveFrom),
                  ],
                  [
                    "Amount rule",
                    detail.definition.chargeValueType === "percentage"
                      ? `${detail.definition.effectiveAmount}% of ${formatCurrency(detail.amountBasis ?? 0, currencyCode)}`
                      : `Fixed ${formatCurrency(detail.definition.effectiveAmount, currencyCode)}`,
                  ],
                  ["Trigger", labelize(detail.trigger)],
                  ["Workflow", labelize(detail.workflow)],
                  ["Period", detail.periodLabel],
                  [
                    "Posting",
                    detail.ledger
                      ? `Ledger ${compactIdentifier(detail.ledger.id)}`
                      : "No ledger posting",
                  ],
                ].map(([label, value]) => (
                  <View
                    className="flex-row justify-between gap-4 border-b border-border pb-3"
                    key={label}
                  >
                    <Text className="text-sm text-muted-foreground">
                      {label}
                    </Text>
                    <Text className="max-w-[62%] text-right text-sm font-bold text-foreground">
                      {value}
                    </Text>
                  </View>
                ))}
              </View>
              {detail.target ? (
                <View className="gap-1 border-b border-border pb-4">
                  <Text className="text-sm font-bold text-foreground">
                    Linked workflow
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {detail.target.label} · {labelize(detail.target.state)}
                  </Text>
                </View>
              ) : null}
              <View className="gap-2">
                <Text className="text-sm font-bold text-foreground">
                  Audit history
                </Text>
                {detail.audit.length ? (
                  detail.audit.map((item) => (
                    <View className="border-b border-border py-2" key={item.id}>
                      <Text className="text-sm font-bold text-foreground">
                        {labelize(item.action)}
                      </Text>
                      <Text className="mt-1 text-xs text-muted-foreground">
                        {new Date(item.occurredAt).toLocaleString()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-sm text-muted-foreground">
                    No audit events were returned.
                  </Text>
                )}
              </View>
              {detail.status === "pending" &&
              detail.collectionMode === "pay_separately" &&
              workspace?.capabilities.manage ? (
                <Button
                  disabled={!isWritable}
                  onPress={() => {
                    resetForms()
                    setDetailVisible(false)
                    setFormMode("settle")
                  }}
                >
                  <Text>Settle separate payment</Text>
                </Button>
              ) : null}
              {workspace?.capabilities.correct &&
              ["pending", "posted"].includes(detail.status) ? (
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    disabled={!isWritable}
                    onPress={() => {
                      resetForms()
                      setDetailVisible(false)
                      setCorrectionMode("waive")
                    }}
                    variant="outline"
                  >
                    <Text>Waive</Text>
                  </Button>
                  {detail.status === "posted" ? (
                    <Button
                      className="flex-1"
                      disabled={!isWritable}
                      onPress={() => {
                        resetForms()
                        setDetailVisible(false)
                        setCorrectionMode("reverse")
                      }}
                      variant="destructive"
                    >
                      <Text>Reverse</Text>
                    </Button>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : (
            <SubmitError message={submitError} />
          )}
        </View>
      </FloatingBottomSheet>

      <FullScreenFormSheet
        dirty={Boolean(
          applySelectionTouched ||
          basisAmount ||
          notes ||
          assessedAt !== todayDateOnly()
        )}
        footer={
          <View className="mx-4 flex-row items-center gap-3">
            <DevQuickFill
              onPress={() => {
                setSubmitError(null)
                setBasisAmount(mobileDevQuickFill.adminCharges.basisAmount)
                setNotes(mobileDevQuickFill.adminCharges.notes)
              }}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={!isWritable}
              onPress={reviewApply}
            >
              <Text>Review charge</Text>
            </Button>
          </View>
        }
        onClose={() => {
          setCalendarIntent(null)
          setPickerMode(null)
          setFormMode(null)
        }}
        onDismissed={() => {
          if (
            queuedSuccessHostRef.current !== "form" ||
            !queuedSuccessRef.current
          )
            return
          setSuccess(queuedSuccessRef.current)
          queuedSuccessRef.current = null
          queuedSuccessHostRef.current = null
        }}
        overlay={
          <CalendarPickerSheet
            label="Assessment date"
            maximumDate={todayDateOnly()}
            onChange={setAssessedAt}
            onClose={() => setCalendarIntent(null)}
            testID="charge-assessment-date-calendar"
            value={assessedAt}
            visible={calendarIntent === "assessment"}
          />
        }
        overlayActive={calendarIntent === "assessment"}
        title="Apply charge"
        visible={formMode === "apply"}
      >
        <FormStateBanner
          hasDraft={Boolean(basisAmount || notes)}
          isStale={stale}
        />
        <SubmitError message={submitError} />
        <View className="gap-2">
          <FieldLabel>Member</FieldLabel>
          <Pressable
            accessibilityHint="Opens a searchable member picker"
            accessibilityLabel={
              selectedMember
                ? `Member, ${selectedMember.fullName}, ${selectedMember.memberNumber}`
                : "Choose member"
            }
            accessibilityRole="button"
            className="min-h-16 flex-row items-center justify-between gap-4 border-b border-border py-3 active:bg-accent/40"
            onPress={() => {
              setPickerSearch("")
              setPickerMode("member")
            }}
            testID="charge-member-picker"
          >
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-bold text-foreground">
                {selectedMember?.fullName ?? "Choose member"}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {selectedMember?.memberNumber ?? "Search by name or number"}
              </Text>
            </View>
            <Icon
              className="size-sm text-muted-foreground"
              name="ChevronRight"
            />
          </Pressable>
        </View>
        <View className="gap-2">
          <FieldLabel>Charge rule</FieldLabel>
          <Pressable
            accessibilityHint="Opens a searchable charge-rule picker"
            accessibilityLabel={
              selectedDefinition
                ? `Charge rule, ${selectedDefinition.name}`
                : "Choose charge rule"
            }
            accessibilityRole="button"
            className="min-h-16 flex-row items-center justify-between gap-4 border-b border-border py-3 active:bg-accent/40"
            onPress={() => {
              setPickerSearch("")
              setPickerMode("definition")
            }}
            testID="charge-definition-picker"
          >
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-sm font-bold text-foreground">
                {selectedDefinition?.name ?? "Choose charge rule"}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {selectedDefinition
                  ? `${
                      selectedDefinition.chargeValueType === "percentage"
                        ? `${selectedDefinition.rate}%`
                        : formatCurrency(selectedDefinition.rate, currencyCode)
                    } · ${labelize(selectedDefinition.collectionMode)}`
                  : "Search active definitions"}
              </Text>
            </View>
            <Icon
              className="size-sm text-muted-foreground"
              name="ChevronRight"
            />
          </Pressable>
        </View>
        {selectedDefinition?.chargeValueType === "percentage" ? (
          <View className="gap-2">
            <FieldLabel>Amount basis</FieldLabel>
            <Input
              accessibilityLabel="Charge amount basis"
              keyboardType="decimal-pad"
              onChangeText={setBasisAmount}
              placeholder="e.g. 600,000"
              testID="charge-basis-input"
              value={basisAmount}
            />
          </View>
        ) : null}
        <View className="gap-2">
          <FieldLabel>Assessment date</FieldLabel>
          <CalendarDateField
            accessibilityLabel="Charge assessment date"
            onPress={() => setCalendarIntent("assessment")}
            testID="charge-assessed-at-input"
            value={assessedAt}
          />
        </View>
        <View className="border-y border-border py-4">
          <Text className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
            Server-reviewed amount
          </Text>
          <Text className="mt-1 text-2xl font-extrabold text-foreground">
            {selectedDefinition?.chargeValueType === "percentage" &&
            typeof parsedBasis !== "number"
              ? "—"
              : formatCurrency(expectedAmount, currencyCode)}
          </Text>
          <Text className="mt-1 text-xs leading-5 text-muted-foreground">
            {selectedDefinition
              ? `${labelize(selectedDefinition.collectionMode)} · ${labelize(selectedDefinition.chargeFrequency)}`
              : "Select a rule"}
          </Text>
        </View>
        <View className="gap-2">
          <FieldLabel>Evidence note (optional)</FieldLabel>
          <Textarea
            accessibilityLabel="Charge evidence note"
            onChangeText={setNotes}
            placeholder="Why is this charge being applied?"
            testID="charge-notes-input"
            value={notes}
          />
        </View>
      </FullScreenFormSheet>

      <FloatingBottomSheet
        accessibilityLabel={
          pickerMode === "member" ? "Choose member" : "Choose charge rule"
        }
        keyboardExpandable
        onClose={() => {
          setPickerMode(null)
          setPickerSearch("")
        }}
        presentation="compact"
        scrollable="auto"
        title={pickerMode === "member" ? "Choose member" : "Choose charge rule"}
        visible={Boolean(pickerMode)}
      >
        <View className="gap-3 px-5 pt-3 pb-6">
          <Input
            accessibilityLabel={
              pickerMode === "member" ? "Search members" : "Search charge rules"
            }
            autoCapitalize="none"
            onChangeText={setPickerSearch}
            placeholder={
              pickerMode === "member"
                ? "Search member or number"
                : "Search rule or code"
            }
            returnKeyType="search"
            testID="charge-picker-search"
            value={pickerSearch}
          />
          {pickerMode === "member"
            ? filteredPickerMembers.map((member) => (
                <Pressable
                  accessibilityLabel={`${member.fullName}, ${member.memberNumber}${selectedMemberId === member.id ? ", selected" : ""}`}
                  accessibilityRole="button"
                  className="min-h-14 flex-row items-center justify-between gap-4 border-b border-border py-3 active:bg-accent/40"
                  key={member.id}
                  onPress={() => {
                    setSelectedMemberId(member.id)
                    setApplySelectionTouched(true)
                    setPickerMode(null)
                    setPickerSearch("")
                  }}
                  testID={`charge-member-option-${member.id}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-sm font-bold text-foreground">
                      {member.fullName}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {member.memberNumber}
                    </Text>
                  </View>
                  {selectedMemberId === member.id ? (
                    <Icon className="size-sm text-success" name="CircleCheck" />
                  ) : null}
                </Pressable>
              ))
            : filteredPickerDefinitions.map((definition) => (
                <Pressable
                  accessibilityLabel={`${definition.name}, ${
                    definition.chargeValueType === "percentage"
                      ? `${definition.rate} percent`
                      : formatCurrency(definition.rate, currencyCode)
                  }${selectedDefinitionId === definition.id ? ", selected" : ""}`}
                  accessibilityRole="button"
                  className="min-h-14 flex-row items-center justify-between gap-4 border-b border-border py-3 active:bg-accent/40"
                  key={definition.id}
                  onPress={() => {
                    setSelectedDefinitionId(definition.id)
                    setApplySelectionTouched(true)
                    setBasisAmount("")
                    setPickerMode(null)
                    setPickerSearch("")
                  }}
                  testID={`charge-definition-option-${definition.id}`}
                >
                  <View className="min-w-0 flex-1 gap-1">
                    <Text className="text-sm font-bold text-foreground">
                      {definition.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">
                      {definition.chargeValueType === "percentage"
                        ? `${definition.rate}%`
                        : formatCurrency(definition.rate, currencyCode)}{" "}
                      · {labelize(definition.collectionMode)}
                    </Text>
                  </View>
                  {selectedDefinitionId === definition.id ? (
                    <Icon className="size-sm text-success" name="CircleCheck" />
                  ) : null}
                </Pressable>
              ))}
          {(pickerMode === "member" && !filteredPickerMembers.length) ||
          (pickerMode === "definition" && !filteredPickerDefinitions.length) ? (
            <EmptyState
              description="Try another name, number, rule, or code."
              title="No matching options"
            />
          ) : null}
        </View>
      </FloatingBottomSheet>

      <FullScreenFormSheet
        dirty={Boolean(paymentReference || notes || paidAt !== todayDateOnly())}
        footer={
          <View className="mx-4 flex-row items-center gap-3">
            <DevQuickFill
              onPress={() => {
                setSubmitError(null)
                setPaymentReference(
                  mobileDevQuickFill.adminCharges.paymentReference
                )
                setNotes(mobileDevQuickFill.adminCharges.notes)
              }}
              placement="footer"
              portal={false}
            />
            <Button
              className="flex-1"
              disabled={!isWritable}
              onPress={reviewSettlement}
            >
              <Text>Review settlement</Text>
            </Button>
          </View>
        }
        onClose={() => {
          setCalendarIntent(null)
          setFormMode(null)
          if (detail) setDetailVisible(true)
        }}
        onDismissed={() => {
          if (
            queuedSuccessHostRef.current !== "form" ||
            !queuedSuccessRef.current
          )
            return
          setSuccess(queuedSuccessRef.current)
          queuedSuccessRef.current = null
          queuedSuccessHostRef.current = null
        }}
        overlay={
          <CalendarPickerSheet
            label="Payment date"
            maximumDate={todayDateOnly()}
            onChange={setPaidAt}
            onClose={() => setCalendarIntent(null)}
            testID="charge-payment-date-calendar"
            value={paidAt}
            visible={calendarIntent === "payment"}
          />
        }
        overlayActive={calendarIntent === "payment"}
        title="Settle charge"
        visible={formMode === "settle"}
      >
        <FormStateBanner
          hasDraft={Boolean(paymentReference || notes)}
          isStale={stale}
        />
        <SubmitError message={submitError} />
        {detail ? (
          <View className="gap-1 border-y border-border py-4">
            <Text className="text-sm font-bold text-foreground">
              {detail.definitionName}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {detail.memberName} · {detail.memberNumber}
            </Text>
            <Text className="mt-2 text-2xl font-extrabold text-foreground">
              {formatCurrency(detail.amount, currencyCode)}
            </Text>
            <Text className="text-warn text-xs font-medium">
              Pending · Pay separately
            </Text>
          </View>
        ) : null}
        <View className="gap-2">
          <FieldLabel>Payment reference</FieldLabel>
          <Input
            accessibilityLabel="Separate payment reference"
            autoCapitalize="characters"
            onChangeText={setPaymentReference}
            placeholder="BANK-TRANSFER-REFERENCE"
            testID="charge-payment-reference-input"
            value={paymentReference}
          />
        </View>
        <View className="gap-2">
          <FieldLabel>Payment date</FieldLabel>
          <CalendarDateField
            accessibilityLabel="Separate payment date"
            onPress={() => setCalendarIntent("payment")}
            testID="charge-paid-at-input"
            value={paidAt}
          />
        </View>
        <View className="gap-2">
          <FieldLabel>Settlement evidence (optional)</FieldLabel>
          <Textarea
            accessibilityLabel="Settlement evidence note"
            onChangeText={setNotes}
            placeholder="Record the verified payment evidence."
            testID="charge-settlement-notes-input"
            value={notes}
          />
        </View>
      </FullScreenFormSheet>

      <CompactFormSheet
        dirty={!correctionReview && Boolean(correctionReason)}
        footer={
          correctionReview ? (
            <View className="flex-row gap-2 px-5 pt-3 pb-5">
              <Button
                className="h-11 flex-1"
                disabled={isSubmitting}
                onPress={() => setReview(null)}
                variant="outline"
              >
                <Text>Review again</Text>
              </Button>
              <Button
                className="h-11 flex-1"
                disabled={isSubmitting}
                onPress={() => void submitReview()}
                variant={
                  correctionReview.kind === "reverse"
                    ? "destructive"
                    : "default"
                }
              >
                <Icon
                  className="size-base text-primary-foreground"
                  name="Send"
                />
                <Text>
                  {isSubmitting
                    ? "Submitting"
                    : correctionReview.kind === "reverse"
                      ? "Confirm reversal"
                      : "Confirm and record"}
                </Text>
              </Button>
            </View>
          ) : (
            <View className="flex-row items-center gap-3 px-5 pt-3 pb-5">
              <DevQuickFill
                onPress={() => {
                  setSubmitError(null)
                  updateCorrectionReason(
                    mobileDevQuickFill.adminCharges.correctionReason
                  )
                }}
                placement="footer"
                portal={false}
              />
              <Button
                className="flex-1"
                disabled={!isWritable}
                onPress={reviewCorrection}
                variant={
                  correctionMode === "reverse" ? "destructive" : "default"
                }
              >
                <Text>Review {correctionMode ?? "correction"}</Text>
              </Button>
            </View>
          )
        }
        onClose={() => {
          setReview(null)
          updateCorrectionReason("")
          setSubmitError(null)
          setCorrectionMode(null)
          if (detail) setDetailVisible(true)
        }}
        onDismissed={() => {
          if (
            queuedSuccessHostRef.current !== "correction" ||
            !queuedSuccessRef.current
          )
            return
          setSuccess(queuedSuccessRef.current)
          queuedSuccessRef.current = null
          queuedSuccessHostRef.current = null
        }}
        title={
          correctionReview
            ? "Review charge command"
            : correctionMode
              ? `${labelize(correctionMode)} charge`
              : "Correct charge"
        }
        visible={Boolean(correctionMode || correctionReview)}
      >
        {correctionReview ? (
          <View className="gap-4">
            <Text className="text-sm leading-5 text-muted-foreground">
              Confirm the member, amount, expected state, and governed financial
              effect before submitting.
            </Text>
            <SubmitError message={submitError} />
            <View className="gap-2">
              {reviewRows.map((row) => (
                <ConfirmationRow
                  key={`${row.label}-${row.value ?? ""}`}
                  {...row}
                />
              ))}
            </View>
          </View>
        ) : (
          <>
            <SubmitError message={submitError} />
            <View className="bg-warn/10 px-3 py-2">
              <Text className="text-warn text-sm leading-5">
                This keeps the original application and posts any required
                opposite ledger entry. It cannot silently edit financial
                history.
              </Text>
            </View>
            <View className="gap-2">
              <FieldLabel>Reason</FieldLabel>
              <Textarea
                accessibilityLabel="Charge correction reason"
                onChangeText={updateCorrectionReason}
                placeholder="Explain the approved correction and evidence."
                testID="charge-correction-reason-input"
                value={correctionReason}
              />
            </View>
          </>
        )}
      </CompactFormSheet>

      <SubmissionReviewSheet
        confirmLabel={
          isConfirmingResponseLoss
            ? "Retry and confirm"
            : review?.kind === "reverse"
              ? "Confirm reversal"
              : "Confirm and record"
        }
        description="Confirm the member, amount, expected state, and governed financial effect before submitting."
        error={submitError}
        isSubmitting={isSubmitting}
        onClose={() => setReview(null)}
        onConfirm={() => void submitReview()}
        onDismissed={() => {
          if (!queuedSuccessRef.current) return
          if (queuedSuccessHostRef.current === "form") {
            setFormMode(null)
            setDetailVisible(false)
            resetForms()
            return
          }
          if (queuedSuccessHostRef.current === "correction") {
            setCorrectionMode(null)
            updateCorrectionReason("")
            setDetailVisible(false)
          }
        }}
        rows={reviewRows}
        title="Review charge command"
        visible={Boolean(review && !correctionReview)}
      />
      {success?.kind === "applied" ? (
        <ChargeAppliedSuccessSheet
          onClose={() => setSuccess(null)}
          receipt={success.receipt}
          visible
        />
      ) : success?.kind === "replayed-apply" ? (
        <ChargeReplaySuccessSheet
          onClose={() => setSuccess(null)}
          receipt={success.receipt}
          visible
        />
      ) : (
        <SubmissionSuccessSheet
          description={success?.description ?? ""}
          onClose={() => setSuccess(null)}
          title="Charge evidence saved"
          visible={success?.kind === "default"}
        />
      )}
    </SafeArea>
  )
}
