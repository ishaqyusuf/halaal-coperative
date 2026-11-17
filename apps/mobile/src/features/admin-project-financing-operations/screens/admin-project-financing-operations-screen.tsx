import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Elevated } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import {
  mobileDevQuickFill,
  mobileDevQuickFillReference,
} from "@/dev/mobile-dev-quick-fill"
import { shortDate , ServiceOpsDetailSheet , ServiceOpsLanes , useOpsLane } from "@/features/admin-service-operations/public/service-ops"
import {
  OpsContextCard,
  ServiceOpsFlowSheet,
  type OpsFlowStep,

  OpsResult,
  OpsReviewSpec} from "@/features/admin-service-operations/public/service-ops"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import {
  appQueryKey,
  useAppQuery,
  useInvalidateAppQueries,
} from "@/hooks/use-app-query"
import { useDebounce } from "@/hooks/use-debounce"
import { readErrorCode } from "@/lib/app-query-policy"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { formatMoney } from "@/lib/money"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { captureMobileError } from "@/lib/sentry"
import { cn } from "@/lib/utils"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { MobileOfflineOperationError } from "@/runtime/mobile-runtime-state"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"
import { useEffect, useRef, useState } from "react"
import { Pressable, View } from "react-native"
import {
  activateProjectFinancingOperation,
  getProjectFinancingOperationDetail,
  getProjectFinancingOperationsSummary,
  getProjectFinancingOperationsWorkspace,
  recordProjectFinancingDisbursement,
  reviewProjectFinancingOperation,
} from "../api/admin-project-financing-operations-api"
import type {
  ProjectFinancingAction,
  ProjectFinancingLane,
  ProjectFinancingProject,
  ProjectFinancingStructure,
  ProjectFinancingWorkspace,
} from "../model/admin-project-financing-operations-types"
import { getProjectFinancingDetailFailureKind } from "../model/project-financing-detail-failure"
import {
  actionLabel,
  primaryAction,
  projectDetail,
  projectFinancingHero,
  projectFinancingLanes,
  projectRow,
  structureName,
  structureOptions,
} from "../model/project-financing-ops-presentation"

// Form inputs render inside ServiceOpsFlowSheet, which presents them in
// <AppSheet variant="form"> (keyboard-aware full-screen form, T21).
type Decision = "approved" | "rejected" | "under_review"
type Structure = Exclude<ProjectFinancingStructure, "undecided">

const feature = "admin-project-financing"

export function AdminProjectFinancingOperationsScreen({
  initialEntityId = null,
}: {
  initialEntityId?: string | null
}) {
  const runtime = useMobileRuntime()
  const offline = runtime.state.connectivity !== "online"
  const invalidate = useInvalidateAppQueries()
  const scope = getMobilePersistenceScope()?.key
  const summaryKey = appQueryKey(feature, scope, "summary")
  const lanesKey = appQueryKey(feature, scope, "lane")
  const detailKey = (id: string | null) => appQueryKey(feature, scope, "detail", id)

  const [lane, setLane] = useState<ProjectFinancingLane>("needs_action")
  const [visited, setVisited] = useState<Record<ProjectFinancingLane, boolean>>({
    active: false,
    closed: false,
    needs_action: true,
  })
  const [search, setSearch] = useState("")
  const term = useDebounce(search.trim().slice(0, 120), 350)
  const summary = useAppQuery({
    queryFn: getProjectFinancingOperationsSummary,
    queryKey: summaryKey,
  })
  const laneRead = (value: ProjectFinancingLane) => ({
    enabled: visited[value],
    fetchPage: (cursor: string | null) =>
      getProjectFinancingOperationsWorkspace({
        cursor: cursor ?? undefined,
        lane: value,
        search: term || undefined,
      }),
    offline,
    queryKey: appQueryKey(feature, scope, "lane", value, term),
    selectItems: (page: ProjectFinancingWorkspace) => page.projects,
    toRow: projectRow,
  })
  const needsAction = useOpsLane(laneRead("needs_action"))
  const active = useOpsLane(laneRead("active"))
  const closed = useOpsLane(laneRead("closed"))
  const lanes = { active, closed, needs_action: needsAction }
  const capabilities = needsAction.first?.capabilities ?? lanes[lane].first?.capabilities
  const currencyCode = summary.data?.currencyCode ?? lanes[lane].first?.currencyCode ?? "NGN"
  const money = (value: number) => formatMoney(value, { currencyCode })
  const stale = isMobileReadCacheStale(summary.data?.cache) || lanes[lane].stale
  const writesBlocked = offline || stale
  const findProject = (id: string) =>
    Object.values(lanes)
      .flatMap((entry) => entry.raw)
      .find((item) => item.id === id)

  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [destinationMissing, setDestinationMissing] = useState(false)
  const detail = useAppQuery({
    enabled: Boolean(detailId),
    placeholderData: undefined,
    queryFn: () => getProjectFinancingOperationDetail(detailId!),
    queryKey: detailKey(detailId),
  })
  const handledEntity = useRef<string | null>(null)
  useEffect(() => {
    if (!initialEntityId || handledEntity.current === initialEntityId) return
    handledEntity.current = initialEntityId
    setDetailId(initialEntityId)
    setDetailOpen(true)
  }, [initialEntityId])
  useEffect(() => {
    if (
      detailOpen &&
      detail.isError &&
      detailId === initialEntityId &&
      getProjectFinancingDetailFailureKind(detail.error) === "request_unavailable"
    ) {
      setDetailOpen(false)
      setDestinationMissing(true)
    }
  }, [detail.error, detail.isError, detailId, detailOpen, initialEntityId])

  // Write flow.
  const [step, setStep] = useState<OpsFlowStep>("closed")
  const [kind, setKind] = useState<ProjectFinancingAction>("review")
  const [target, setTarget] = useState<ProjectFinancingProject | null>(null)
  const [decision, setDecision] = useState<Decision>("approved")
  const [structure, setStructure] = useState<Structure>("repayable_facility")
  const [amount, setAmount] = useState("")
  const [months, setMonths] = useState("")
  const [notes, setNotes] = useState("")
  const [releaseDate, setReleaseDate] = useState(todayDateOnly())
  const [reference, setReference] = useState("")
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<OpsResult | null>(null)
  const commandId = useRef<string | null>(null)
  const queued = useRef<{ kind: ProjectFinancingAction; project: ProjectFinancingProject } | null>(null)
  const reopenDetail = useRef(false)

  function openForm(nextKind: ProjectFinancingAction, project: ProjectFinancingProject) {
    const proposed = project.approvedStructure ?? project.proposedStructure
    setKind(nextKind)
    setTarget(project)
    setDecision("approved")
    setStructure(proposed === "undecided" ? "repayable_facility" : proposed)
    setAmount(String(project.approvedAmount ?? project.requestedAmount))
    setMonths(String(project.approvedPaybackMonths ?? project.requestedPaybackMonths ?? 12))
    setNotes("")
    setReleaseDate(todayDateOnly())
    setReference("")
    setShowErrors(false)
    setResult(null)
    commandId.current = null
    setStep("form")
  }

  const repayable = structure === "repayable_facility"
  const errors: Record<string, string> = {}
  if (target) {
    if (kind === "review") {
      if (decision === "approved") {
        if (!(Number(amount) > 0)) errors.amount = "Enter the approved amount."
        if (repayable && !(Number.isInteger(Number(months)) && Number(months) > 0))
          errors.months = "Enter a whole number of months."
      }
      if (decision !== "under_review" && notes.trim().length < 2)
        errors.notes = "Add the evidence for this decision."
    } else if (kind === "activate") {
      if (notes.trim().length < 2) errors.notes = "Add the activation evidence."
    } else {
      if (!releaseDate) errors.releaseDate = "Choose the release date."
      if (reference.trim().length < 2) errors.reference = "Add the release reference."
    }
  }
  const valid = Object.keys(errors).length === 0
  const err = (key: string) => (showErrors ? errors[key] : undefined)

  const decisionLabel = decision === "approved" ? "Approve" : decision === "rejected" ? "Reject" : "Keep in review"
  const reviewSpec: OpsReviewSpec | null = !target
    ? null
    : kind === "review"
      ? {
          confirmLabel:
            decision === "approved" ? "Approve project" : decision === "rejected" ? "Reject project" : "Keep in review",
          note:
            decision === "approved" && !repayable
              ? "Evidence only: no repayment or profit ledger is created."
              : undefined,
          rows: [
            ["Project", target.businessName],
            ["Decision", decisionLabel],
            ...(decision === "approved"
              ? ([
                  ["Structure", structureName(structure)],
                  ["Amount", money(Number(amount || 0))],
                  ...(repayable ? ([["Term", `${months} months`]] as [string, string][]) : []),
                ] as [string, string][])
              : []),
          ],
          title: "Confirm decision",
        }
      : kind === "activate"
        ? {
            confirmLabel: "Activate",
            rows: [
              ["Project", target.businessName],
              ["Structure", structureName(target.approvedStructure)],
              ["Amount", money(target.approvedAmount ?? target.requestedAmount)],
            ],
            title: "Confirm activation",
          }
        : {
            confirmLabel: "Record release",
            rows: [
              ["Project", target.businessName],
              ["Release date", releaseDate ? shortDate(releaseDate, true) : "—"],
              ["Reference", reference.trim() || "—"],
              ["Amount", money(target.approvedAmount ?? target.requestedAmount)],
            ],
            title: "Confirm release",
          }

  function goReview() {
    setShowErrors(true)
    if (!valid || writesBlocked) return
    commandId.current = createClientSubmissionKey()
    setStep("review")
  }

  async function confirm() {
    if (!target || submitting) return
    const id = commandId.current ?? createClientSubmissionKey()
    commandId.current = id
    setSubmitting(true)
    try {
      if (kind === "review") {
        await reviewProjectFinancingOperation({
          approvedAmount: decision === "approved" ? Number(amount) : undefined,
          approvedPaybackMonths: decision === "approved" && repayable ? Number(months) : undefined,
          approvedStructure: decision === "approved" ? structure : undefined,
          commandId: id,
          expectedState: target.status as "submitted" | "under_review",
          notes: notes.trim() || undefined,
          projectFinancingRequestId: target.id,
          status: decision,
        })
      } else if (kind === "activate") {
        await activateProjectFinancingOperation({
          commandId: id,
          expectedState: "approved",
          notes: notes.trim(),
          projectFinancingRequestId: target.id,
        })
      } else {
        await recordProjectFinancingDisbursement({
          commandId: id,
          disbursedAt: releaseDate,
          expectedState: "active",
          notes: notes.trim() || undefined,
          projectFinancingRequestId: target.id,
          reference: reference.trim(),
        })
      }
      setResult(
        kind === "review"
          ? {
              body:
                decision === "approved"
                  ? `${target.businessName} can be activated next.`
                  : decision === "rejected"
                    ? `${target.businessName} is closed.`
                    : "The project stays in review.",
              kind: "success",
              secondaryLabel: "Open record",
              title: decision === "approved" ? "Project approved" : "Decision recorded",
            }
          : kind === "activate"
            ? {
                body: "Record the release once the funds are paid.",
                kind: "success",
                secondaryLabel: "Open record",
                title: "Structure activated",
              }
            : {
                body: `${target.businessName} is now active.`,
                kind: "success",
                secondaryLabel: "Open record",
                title: "Release recorded",
              }
      )
      setStep("result")
      void invalidate(summaryKey, lanesKey, detailKey(target.id))
    } catch (error) {
      const code = readErrorCode(error)
      const conflict = code === "CONFLICT" || code === "PRECONDITION_FAILED"
      if (!(error instanceof MobileOfflineOperationError))
        captureMobileError(error, "mobile.project_financing_operations")
      if (conflict) {
        commandId.current = null
        void invalidate(summaryKey, lanesKey, detailKey(target.id))
      }
      setResult({ kind: conflict ? "conflict" : "error" })
      setStep("result")
    } finally {
      setSubmitting(false)
    }
  }

  const opened = detail.data
  const openedAction = opened ? primaryAction(opened.project) : null
  const canRun = (action: ProjectFinancingAction) =>
    action === "review"
      ? capabilities?.review
      : action === "activate"
        ? capabilities?.activate
        : capabilities?.recordDisbursement
  const formTitle = kind === "review" ? "Review project" : kind === "activate" ? "Activate structure" : "Record release"
  const quick = mobileDevQuickFill.adminProjectFinancingOperations

  return (
    <>
      <ServiceOpsLanes
        currencyCode={currencyCode}
        hero={projectFinancingHero(summary.data)}
        heroAction={{
          icon: "RefreshCw",
          label: "Refresh project financing",
          onPress: () => {
            void summary.refetch({ cancelRefetch: false })
            lanes[lane].state.refetch()
          },
        }}
        icon="BriefcaseBusiness"
        lane={lane}
        laneState={(value) => ({
          ...lanes[value].state,
          items: lanes[value].raw.map((project) => {
            const row = projectRow(project)
            const action = primaryAction(project)
            return action && canRun(action) ? row : { ...row, actionLabel: undefined }
          }),
        })}
        lanes={projectFinancingLanes(summary.data)}
        offline={offline}
        onAction={(row) => {
          const project = findProject(row.id)
          const action = project ? primaryAction(project) : null
          if (project && action) openForm(action, project)
        }}
        onLaneChange={(value) => {
          setLane(value)
          setVisited((current) => (current[value] ? current : { ...current, [value]: true }))
        }}
        onOpen={(row) => {
          setDetailId(row.id)
          setDetailOpen(true)
        }}
        onRefresh={() => {
          void summary.refetch({ cancelRefetch: false })
          lanes[lane].state.refetch()
        }}
        refreshing={summary.isRefetching || lanes[lane].state.refreshing}
        search={search}
        searchPlaceholder="Search project or member"
        searchTerm={term}
        setSearch={setSearch}
        stale={stale}
        summaryError={summary.isError}
        testIdPrefix="project-financing"
        title="Project financing"
        topSlot={
          destinationMissing ? (
            <NotificationDestinationNotice onDismiss={() => setDestinationMissing(false)} />
          ) : null
        }
        writesBlocked={writesBlocked}
      />

      <ServiceOpsDetailSheet
        action={
          opened && openedAction
            ? {
                disabled: writesBlocked || !canRun(openedAction),
                label: actionLabel[openedAction],
                onPress: () => {
                  queued.current = { kind: openedAction, project: opened.project }
                  setDetailOpen(false)
                },
                testID: "project-financing-detail-action",
              }
            : null
        }
        currencyCode={currencyCode}
        detail={opened ? projectDetail(opened, currencyCode) : undefined}
        error={detail.isError}
        loading={detail.isPending}
        offline={offline}
        onClose={() => setDetailOpen(false)}
        onDismissed={() => {
          const next = queued.current
          queued.current = null
          if (next) openForm(next.kind, next.project)
        }}
        onRetry={() => void detail.refetch()}
        retrying={detail.isRefetching}
        title="Project financing"
        visible={detailOpen}
      />

      <ServiceOpsFlowSheet
        cta={kind === "review" ? "Review decision" : kind === "activate" ? "Review activation" : "Review release"}
        dirty={Boolean(notes.trim() || reference.trim())}
        footerExtra={
          <DevQuickFill
            label={`Quick fill ${formTitle.toLowerCase()}`}
            onPress={() => {
              if (kind === "review")
                setNotes(repayable ? quick.reviewFacilityNotes : quick.reviewEvidenceOnlyNotes)
              else if (kind === "activate")
                setNotes(
                  target?.boundary === "repayable_principal"
                    ? quick.activatePrincipalNotes
                    : quick.activateEvidenceOnlyNotes
                )
              else {
                setReference(mobileDevQuickFillReference("QA-REL"))
                setNotes(quick.releaseNotes)
              }
            }}
            placement="footer"
            portal={false}
          />
        }
        offline={offline}
        onClose={() => {
          setStep("closed")
          setResult(null)
        }}
        onConfirm={confirm}
        onDismissed={() => {
          if (!reopenDetail.current || !target) return
          reopenDetail.current = false
          setDetailId(target.id)
          setDetailOpen(true)
        }}
        onRetry={confirm}
        onReview={goReview}
        onSecondary={() => {
          reopenDetail.current = true
          setStep("closed")
          setResult(null)
        }}
        result={result}
        review={reviewSpec}
        setStep={setStep}
        step={step}
        submitting={submitting}
        title={formTitle}
      >
        {target ? (
          <>
            <OpsContextCard
              amount={money(target.approvedAmount ?? target.requestedAmount)}
              subtitle={`${target.member.fullName} · ${structureName(target.approvedStructure ?? target.proposedStructure)}`}
              title={target.businessName}
            />
            {kind === "review" ? (
              <>
                <FormField label="Decision">
                  <SegmentedControl
                    accessibilityLabel="Decision"
                    onChange={setDecision}
                    options={[
                      { label: "Approve", value: "approved" as const },
                      { label: "Keep in review", value: "under_review" as const },
                      { label: "Reject", value: "rejected" as const },
                    ]}
                    value={decision}
                  />
                </FormField>
                {decision === "approved" ? (
                  <>
                    <FormField label="Structure">
                      <View accessibilityRole="radiogroup" className="gap-[8px]">
                        {structureOptions.map((option) => {
                          const selected = structure === option.value
                          return (
                            <Pressable
                              accessibilityRole="radio"
                              accessibilityState={{ checked: selected }}
                              className={cn(
                                "min-h-[60px] flex-row items-center gap-[12px] rounded-[16px] border px-[14px] py-[10px] active:opacity-80",
                                selected ? "border-primary bg-accent" : "border-border bg-card"
                              )}
                              key={option.value}
                              onPress={() => setStructure(option.value)}
                              testID={`project-financing-structure-${option.value}`}
                            >
                              <View
                                className={cn(
                                  "size-[20px] items-center justify-center rounded-full border-2",
                                  selected ? "border-primary" : "border-border"
                                )}
                              >
                                {selected ? <View className="size-[10px] rounded-full bg-primary" /> : null}
                              </View>
                              <View className="min-w-0 flex-1">
                                <Text className="font-bold" variant="small">
                                  {option.label}
                                </Text>
                                <Text className="text-muted-foreground" variant="caption">
                                  {option.description}
                                </Text>
                              </View>
                            </Pressable>
                          )
                        })}
                      </View>
                    </FormField>
                    <FormField error={err("amount")} helper={`Requested ${money(target.requestedAmount)}`} label="Approved amount">
                      <MoneyField
                        accessibilityLabel="Approved amount"
                        currencyCode={currencyCode}
                        onChangeValue={(raw) => setAmount(raw)}
                        testID="project-financing-review-amount"
                        value={amount}
                      />
                    </FormField>
                    {repayable ? (
                      <FormField error={err("months")} label="Payback months">
                        <Input
                          accessibilityLabel="Payback months"
                          keyboardType="number-pad"
                          maxLength={3}
                          onChangeText={(value) => setMonths(value.replace(/\D/g, ""))}
                          testID="project-financing-review-months"
                          value={months}
                        />
                      </FormField>
                    ) : null}
                  </>
                ) : null}
                <FormField error={err("notes")} label="Review evidence" optional={decision === "under_review"}>
                  <Textarea
                    accessibilityLabel="Review evidence"
                    className="min-h-[104px] rounded-[14px] px-[14px] py-[13px]"
                    maxLength={2000}
                    onChangeText={setNotes}
                    placeholder="Committee decision and evidence"
                    testID="project-financing-review-notes"
                    value={notes}
                  />
                </FormField>
              </>
            ) : kind === "activate" ? (
              <>
                <FormField label="Approved terms">
                  <Elevated className="rounded-[16px] bg-card px-[14px] py-[8px]" radius={16}>
                    {[
                      ["Structure", structureName(target.approvedStructure)],
                      ["Approved amount", money(target.approvedAmount ?? target.requestedAmount)],
                      ["Boundary", target.boundary === "repayable_principal" ? "Repayable principal" : "Evidence only"],
                    ].map(([label, value]) => (
                      <View className="min-h-[36px] flex-row items-center justify-between" key={label}>
                        <Text className="text-muted-foreground" variant="small">
                          {label}
                        </Text>
                        <Text className="font-bold" variant="small">
                          {value}
                        </Text>
                      </View>
                    ))}
                  </Elevated>
                </FormField>
                <FormField error={err("notes")} label="Activation evidence">
                  <Textarea
                    accessibilityLabel="Activation evidence"
                    className="min-h-[104px] rounded-[14px] px-[14px] py-[13px]"
                    maxLength={2000}
                    onChangeText={setNotes}
                    placeholder="Signed agreement, guarantors and account details checked"
                    testID="project-financing-activate-notes"
                    value={notes}
                  />
                </FormField>
              </>
            ) : (
              <>
                <FormField error={err("releaseDate")} label="Release date">
                  <DateField
                    maximumDate={todayDateOnly()}
                    onChange={setReleaseDate}
                    sheetTitle="Release date"
                    testID="project-financing-release-date"
                    value={releaseDate}
                  />
                </FormField>
                <FormField error={err("reference")} label="Release reference">
                  <Input
                    accessibilityLabel="Release reference"
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={120}
                    onChangeText={setReference}
                    placeholder="Bank transfer reference"
                    testID="project-financing-release-reference"
                    value={reference}
                  />
                </FormField>
                <FormField label="Release note" optional>
                  <Textarea
                    accessibilityLabel="Release note"
                    className="min-h-[96px] rounded-[14px] px-[14px] py-[13px]"
                    maxLength={2000}
                    onChangeText={setNotes}
                    placeholder="Paid to the project’s bank account"
                    value={notes}
                  />
                </FormField>
              </>
            )}
          </>
        ) : null}
      </ServiceOpsFlowSheet>
    </>
  )
}
