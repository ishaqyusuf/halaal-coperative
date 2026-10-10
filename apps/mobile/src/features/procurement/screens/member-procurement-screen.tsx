import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { FullScreenFormSheet } from "@/components/app/full-screen-form-sheet"
import { SectionCard } from "@/components/app/section-card"
import { ScreenHeader } from "@/components/app/screen-header"
import { ScreenBackButton } from "@/components/app/screen-back-button"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
import { SubmissionSuccessSheet } from "@/components/app/submission-success-sheet"
import { WorkflowDetailSheet } from "@/components/app/workflow-detail-sheet"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { MemberProcurementOverview } from "@/features/procurement/components/member-procurement-overview"
import { ProcurementOfflineTrustRail } from "@/features/procurement/components/procurement-offline-trust-rail"
import { MemberProcurementRequestRow } from "@/features/procurement/components/member-procurement-request-row"
import {
  getMobileMemberProcurement,
  getMobileMemberProcurementRequest,
  getMobileMemberProcurementRequests,
} from "@/features/procurement/api/member-procurement-api"
import type {
  MobileMemberProcurement,
  MobileMemberProcurementRequest,
  MobileProcurementRequestCreateInput,
  MobileWorkflowChargeOption,
} from "@/features/procurement/model/member-procurement-types"
import {
  CooperativeServiceFreshness,
  CooperativeServiceStateNotice,
} from "@/features/member-cooperative-services/public/cooperative-service-state-notice"
import type { MobileMemberCooperativeServiceQaState } from "@/features/member-cooperative-services/public/member-cooperative-service-qa-state"
import { presentMemberProcurementForQa } from "@/features/procurement/model/member-procurement-qa"
import { canStartMemberProcurementRequest } from "@/features/procurement/model/member-procurement-offline-policy"
import { NotificationDestinationNotice } from "@/features/notifications/public/notification-destination-notice"
import {
  formatProcurementCurrency as formatCurrency,
  formatProcurementDate as formatDate,
  formatProcurementStatus as formatStatus,
  getProcurementPurchaseReferenceDetail,
  presentMemberProcurementOverview,
} from "@/features/procurement/model/member-procurement-presentation"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Keyboard, ScrollView, View } from "react-native"

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, "").trim())

  return Number.isFinite(amount) ? amount : 0
}

function parsePositiveInteger(value: string) {
  const amount = Number(value.trim())

  return Number.isInteger(amount) && amount > 0 ? amount : 0
}

function estimateChargeAmount(
  charge: MobileWorkflowChargeOption,
  basisAmount: number
) {
  if (charge.chargeValueType === "percentage") {
    return Number(((Math.max(0, basisAmount) * charge.amount) / 100).toFixed(2))
  }

  return charge.amount
}

function MobileChargeSummary({
  basisAmount,
  charges,
  currencyCode,
}: {
  basisAmount: number
  charges: MobileWorkflowChargeOption[]
  currencyCode: string
}) {
  const estimatedCharges = charges
    .map((charge) => ({
      ...charge,
      estimatedAmount: estimateChargeAmount(charge, basisAmount),
    }))
    .filter((charge) => charge.estimatedAmount > 0)
  const total = estimatedCharges.reduce(
    (sum, charge) => sum + charge.estimatedAmount,
    0
  )

  if (estimatedCharges.length === 0) return null

  return (
    <View className="gap-2 rounded-lg bg-secondary p-3">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-sm font-semibold text-foreground">
          Applicable charges
        </Text>
        <Text className="text-sm font-semibold text-foreground">
          {formatCurrency(total, currencyCode)}
        </Text>
      </View>
      {estimatedCharges.map((charge) => (
        <View
          className="flex-row items-center justify-between gap-3"
          key={`${charge.id}-${charge.collectionMode}`}
        >
          <Text className="flex-1 text-xs text-muted-foreground">
            {charge.name} - {formatStatus(charge.collectionMode)}
          </Text>
          <Text className="text-xs font-medium text-foreground">
            {formatCurrency(charge.estimatedAmount, currencyCode)}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function MemberProcurementScreen({
  initialEntityId = null,
  isOffline = false,
  onCheckConnection,
  onCreateRequest,
  qaState = null,
}: {
  initialEntityId?: string | null
  isOffline?: boolean
  onCheckConnection: () => Promise<void>
  onCreateRequest: (
    input: MobileProcurementRequestCreateInput
  ) => Promise<MobileMemberProcurementRequest>
  qaState?: MobileMemberCooperativeServiceQaState | null
}) {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [procurement, setProcurement] =
    useState<MobileMemberProcurement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [itemName, setItemName] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [requestedCost, setRequestedCost] = useState("")
  const [requestedRepaymentMonths, setRequestedRepaymentMonths] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [submissionKey, setSubmissionKey] = useState(createClientSubmissionKey)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isFormVisible, setIsFormVisible] = useState(false)
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const queuedSuccessRef = useRef<string | null>(null)
  const handledNotificationEntityRef = useRef<string | null>(null)
  const [isDestinationUnavailable, setIsDestinationUnavailable] =
    useState(false)
  const [selectedRequest, setSelectedRequest] =
    useState<MobileMemberProcurementRequest | null>(null)
  const canUseServerProcurement = canUseMobileFeatureData(profile, "member")
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleProcurement = isMobileReadCacheStale(procurement?.cache)
  const procurementOverview = procurement
    ? presentMemberProcurementOverview(procurement, currencyCode)
    : null
  const canStartProcurementRequest = canStartMemberProcurementRequest({
    canCreateRequest: Boolean(procurement?.canCreateRequest),
    isOffline,
    isStale: hasStaleProcurement,
  })
  const procurementDraft = useMemo(
    () => ({
      itemDescription,
      itemName,
      requestedCost,
      requestedRepaymentMonths,
      submissionKey,
      vendorName,
    }),
    [
      itemDescription,
      itemName,
      requestedCost,
      requestedRepaymentMonths,
      submissionKey,
      vendorName,
    ]
  )
  const clearProcurementDraft = useMobileFormDraft({
    enabled: canUseServerProcurement,
    key: "member.procurement.create",
    onHydrate: (draft) => {
      setItemName(draft.itemName)
      setVendorName(draft.vendorName)
      setRequestedCost(draft.requestedCost)
      setRequestedRepaymentMonths(draft.requestedRepaymentMonths)
      setSubmissionKey(draft.submissionKey || createClientSubmissionKey())
      setItemDescription(draft.itemDescription)
    },
    value: procurementDraft,
  })
  const cost = parseAmount(requestedCost)
  const repaymentMonths = parsePositiveInteger(requestedRepaymentMonths)
  const canSubmit = Boolean(
    procurement?.canCreateRequest &&
    itemName.trim().length >= 2 &&
    cost > 0 &&
    repaymentMonths > 0 &&
    repaymentMonths <= (procurement?.policy.maximumPaybackMonths ?? 0) &&
    !isOffline &&
    !hasStaleProcurement &&
    !isSubmitting
  )
  const hasProcurementDraft = Boolean(
    itemName.trim() ||
    vendorName.trim() ||
    requestedCost.trim() ||
    requestedRepaymentMonths.trim() ||
    itemDescription.trim()
  )
  const reviewRows = [
    {
      detail: vendorName.trim() || "Vendor not specified",
      icon: "PackageSearch",
      label: itemName.trim() || "Item request",
      value: cost ? formatCurrency(cost, currencyCode) : "Not set",
    },
    {
      detail: "Requested repayment duration",
      icon: "CalendarClock",
      label: "Repayment months",
      value: repaymentMonths ? String(repaymentMonths) : "Not set",
    },
  ]
  const loadProcurement = useCallback(
    (_refreshVersion?: number) => {
      let mounted = true

      if (!canUseServerProcurement) {
        setProcurement(null)
        setError(null)
        setIsLoading(false)
        return () => {
          mounted = false
        }
      }

      if (qaState === "error") {
        setProcurement(null)
        setError("Procurement could not load. No request was changed.")
        setIsLoading(false)
        return () => {
          mounted = false
        }
      }

      if (qaState === "loading") {
        setProcurement(null)
        setError(null)
        setIsLoading(true)
        return () => {
          mounted = false
        }
      }

      setIsLoading(true)
      setError(null)

      void getMobileMemberProcurement()
        .then((response) => {
          if (mounted) {
            setProcurement(presentMemberProcurementForQa(response, qaState))
          }
        })
        .catch(() => {
          if (mounted) {
            setError("Procurement is unavailable.")
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
    },
    [canUseServerProcurement, qaState]
  )

  useEffect(() => loadProcurement(refreshKey), [loadProcurement, refreshKey])

  useEffect(() => {
    if (isOffline) setIsReviewingSubmit(false)
  }, [isOffline])

  useEffect(() => {
    if (
      !initialEntityId ||
      !canUseServerProcurement ||
      handledNotificationEntityRef.current === initialEntityId
    ) {
      return
    }

    handledNotificationEntityRef.current = initialEntityId
    let mounted = true
    setIsDestinationUnavailable(false)

    void getMobileMemberProcurementRequest(initialEntityId)
      .then((detail) => {
        if (!mounted) return
        if (detail) {
          setSelectedRequest(detail)
          return
        }
        setIsDestinationUnavailable(true)
      })
      .catch(() => {
        if (mounted) setIsDestinationUnavailable(true)
      })

    return () => {
      mounted = false
    }
  }, [canUseServerProcurement, initialEntityId])

  async function loadMoreRequests() {
    const cursor = procurement?.requestNextCursor
    if (!cursor || isLoadingMore || isOffline) return

    setIsLoadingMore(true)
    try {
      const page = await getMobileMemberProcurementRequests({ cursor })
      setProcurement((current) =>
        current
          ? {
              ...current,
              requestNextCursor: page.nextCursor,
              requests: [...current.requests, ...page.data],
            }
          : current
      )
    } catch {
      setError("More procurement requests could not be loaded.")
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function openRequestDetail(request: MobileMemberProcurementRequest) {
    setSelectedRequest(request)
    if (isOffline) return
    try {
      const detail = await getMobileMemberProcurementRequest(request.id)
      if (detail) setSelectedRequest(detail)
    } catch {
      setError("Procurement request details could not be refreshed.")
    }
  }

  async function handleSubmit() {
    if (isOffline) {
      setIsReviewingSubmit(false)
      setError("Reconnect before submitting. Your draft is saved.")
      return
    }

    if (hasStaleProcurement) {
      setError("Refresh procurement data before submitting a request.")
      return
    }

    if (!canSubmit) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await onCreateRequest({
        itemDescription: itemDescription.trim() || undefined,
        itemName: itemName.trim(),
        requestedCost: cost,
        requestedRepaymentMonths: repaymentMonths,
        submissionKey,
        vendorName: vendorName.trim() || undefined,
      })
      await clearProcurementDraft()
      queuedSuccessRef.current = "Procurement request submitted."
      setIsReviewingSubmit(false)
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Procurement request could not be submitted."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCheckConnection() {
    if (isCheckingConnection) return
    setIsCheckingConnection(true)
    try {
      await onCheckConnection()
    } finally {
      setIsCheckingConnection(false)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <ScreenHeader
          leading={<ScreenBackButton onPress={() => router.back()} />}
          title="Procurement"
        />

        {isDestinationUnavailable ? (
          <NotificationDestinationNotice
            onDismiss={() => setIsDestinationUnavailable(false)}
          />
        ) : null}

        {!canUseServerProcurement ? (
          <SectionCard icon="PackageSearch" title="Procurement">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to request and track item
              purchases.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerProcurement ? (
          <>
            {isOffline ? (
              <ProcurementOfflineTrustRail
                isChecking={isCheckingConnection}
                onCheckConnection={() => void handleCheckConnection()}
              />
            ) : hasStaleProcurement ? (
              <CooperativeServiceFreshness
                cache={procurement?.cache}
                label="procurement history"
                onRefresh={() => setRefreshKey((value) => value + 1)}
              />
            ) : null}

            {error ? (
              <CooperativeServiceStateNotice
                actionLabel="Try again"
                description={error}
                onAction={() => setRefreshKey((value) => value + 1)}
                title="Procurement couldn’t load"
                tone="danger"
              />
            ) : null}

            {isLoading && !procurement ? <LoadingSpinner /> : null}

            {procurement ? (
              <>
                <MemberProcurementOverview
                  currencyCode={currencyCode}
                  onOpenActiveRequest={() => {
                    if (procurementOverview?.activeRequest) {
                      void openRequestDetail(procurementOverview.activeRequest)
                    }
                  }}
                  procurement={procurement}
                />

                {canStartProcurementRequest ? (
                  <Button
                    accessibilityHint="Opens a keyboard-safe request form"
                    className="bg-brand active:bg-brand/90 h-12"
                    onPress={() => setIsFormVisible(true)}
                  >
                    <Icon
                      name="PackagePlus"
                      className="size-base text-brand-foreground"
                    />
                    <Text className="text-brand-foreground">
                      {hasProcurementDraft ? "Continue request" : "New request"}
                    </Text>
                  </Button>
                ) : !hasStaleProcurement ? (
                  <CooperativeServiceStateNotice
                    reasons={
                      procurement.restrictionReasons.length
                        ? procurement.restrictionReasons
                        : [
                            "New procurement requests are currently unavailable.",
                          ]
                    }
                    title="New request unavailable"
                  />
                ) : null}

                {procurementOverview &&
                (procurementOverview.historyRequests.length ||
                  !procurementOverview.activeRequest) ? (
                  <View className="gap-3 pb-5">
                    <View className="flex-row items-baseline justify-between gap-3">
                      <Text className="text-xl font-extrabold tracking-[-0.4px] text-foreground">
                        {procurementOverview.activeRequest
                          ? "History"
                          : "Requests"}
                      </Text>
                      {procurementOverview.historyRequests.length ? (
                        <Text className="text-xs font-medium text-muted-foreground">
                          {procurementOverview.historyRequests.length} request
                          {procurementOverview.historyRequests.length === 1
                            ? ""
                            : "s"}
                        </Text>
                      ) : null}
                    </View>
                    <VirtualizedCardList
                      data={procurementOverview.historyRequests}
                      empty={
                        <EmptyState
                          icon="PackageSearch"
                          title="No procurement requests"
                        />
                      }
                      estimatedItemSize={104}
                      keyExtractor={(request) => request.id}
                      renderItem={({ index, item: request }) => (
                        <MemberProcurementRequestRow
                          currencyCode={currencyCode}
                          isFirst={index === 0}
                          onPress={() => void openRequestDetail(request)}
                          request={request}
                        />
                      )}
                    />
                    {procurement.requestNextCursor && !isOffline ? (
                      <Button
                        className="mt-3 h-11"
                        disabled={isLoadingMore}
                        onPress={() => void loadMoreRequests()}
                        variant="outline"
                      >
                        <Icon
                          className="size-base text-foreground"
                          name="Plus"
                        />
                        <Text>
                          {isLoadingMore ? "Loading" : "Load more requests"}
                        </Text>
                      </Button>
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
      <FullScreenFormSheet
        dirty={hasProcurementDraft}
        footer={
          <Button
            accessibilityState={{ busy: isSubmitting }}
            className={cn(
              "bg-brand active:bg-brand/90 min-h-12",
              !canSubmit && "bg-muted opacity-100 active:bg-muted"
            )}
            disabled={!canSubmit || isSubmitting}
            onPress={() => {
              Keyboard.dismiss()
              if (isOffline) return
              setIsReviewingSubmit(true)
            }}
          >
            <Icon
              name="ChevronRight"
              className={cn(
                "size-base text-brand-foreground",
                !canSubmit && "text-muted-foreground"
              )}
            />
            <Text
              className={cn(
                "text-brand-foreground",
                !canSubmit && "text-muted-foreground"
              )}
            >
              {isSubmitting ? "Submitting" : "Review request"}
            </Text>
          </Button>
        }
        isSubmitting={isSubmitting}
        overlayActive={isReviewingSubmit}
        onClose={() => setIsFormVisible(false)}
        onDismissed={() => {
          if (!queuedSuccessRef.current) return
          setSuccess(queuedSuccessRef.current)
          queuedSuccessRef.current = null
        }}
        overlay={
          <>
            {!hasProcurementDraft && !isOffline ? (
              <DevQuickFill
                bottomOffset={92}
                label="Quick fill procurement request"
                onPress={() => {
                  const preset = mobileDevQuickFill.procurement
                  setItemName(preset.itemName)
                  setVendorName(preset.vendorName)
                  setRequestedCost(preset.requestedCost)
                  setRequestedRepaymentMonths(preset.requestedRepaymentMonths)
                  setItemDescription(preset.itemDescription)
                }}
                portal={false}
              />
            ) : null}
            <SubmissionReviewSheet
              isSubmitting={isSubmitting}
              onClose={() => setIsReviewingSubmit(false)}
              onConfirm={handleSubmit}
              onDismissed={() => {
                if (!queuedSuccessRef.current) return
                setItemName("")
                setVendorName("")
                setRequestedCost("")
                setRequestedRepaymentMonths("")
                setItemDescription("")
                setSubmissionKey(createClientSubmissionKey())
                setIsFormVisible(false)
                loadProcurement()
              }}
              rows={reviewRows}
              title="Review procurement request"
              visible={isReviewingSubmit && !isOffline}
            />
          </>
        }
        title="New procurement request"
        visible={isFormVisible}
      >
        {hasStaleProcurement || isOffline ? (
          <FormStateBanner
            hasDraft={hasProcurementDraft}
            isStale={hasStaleProcurement || isOffline}
          />
        ) : null}
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Item name
          </Text>
          <Input
            accessibilityLabel="Procurement item name"
            editable={!isSubmitting}
            onChangeText={setItemName}
            placeholder="e.g. Sewing machine"
            value={itemName}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Vendor (optional)
          </Text>
          <Input
            accessibilityLabel="Procurement vendor"
            editable={!isSubmitting}
            onChangeText={setVendorName}
            placeholder="e.g. City Equipment"
            value={vendorName}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Requested cost ({currencyCode})
          </Text>
          <Input
            accessibilityLabel="Procurement requested cost"
            editable={!isSubmitting}
            keyboardType="numeric"
            onChangeText={setRequestedCost}
            placeholder="e.g. 120000"
            value={requestedCost}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Repayment months · up to{" "}
            {procurement?.policy.maximumPaybackMonths ?? 0}
          </Text>
          <Input
            accessibilityLabel="Procurement repayment months"
            editable={!isSubmitting}
            keyboardType="numeric"
            onChangeText={setRequestedRepaymentMonths}
            placeholder="e.g. 6"
            value={requestedRepaymentMonths}
          />
          {repaymentMonths > (procurement?.policy.maximumPaybackMonths ?? 0) ? (
            <Text className="text-xs leading-5 text-destructive">
              The cooperative permits at most{" "}
              {procurement?.policy.maximumPaybackMonths ?? 0} months.
            </Text>
          ) : null}
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold text-foreground">
            Description (optional)
          </Text>
          <Textarea
            className="min-h-24"
            numberOfLines={3}
            accessibilityLabel="Procurement item description"
            editable={!isSubmitting}
            onChangeText={setItemDescription}
            placeholder="What will you use it for?"
            value={itemDescription}
          />
        </View>
        <MobileChargeSummary
          basisAmount={cost}
          charges={procurement?.chargeOptions ?? []}
          currencyCode={currencyCode}
        />
      </FullScreenFormSheet>
      <SubmissionSuccessSheet
        description={success ?? "Your procurement request has been sent."}
        onClose={() => setSuccess(null)}
        title="Procurement request sent"
        visible={Boolean(success)}
      />
      <WorkflowDetailSheet
        onClose={() => setSelectedRequest(null)}
        onOpenNotifications={() => {
          setSelectedRequest(null)
          router.push("/notifications")
        }}
        onOpenReceipts={() => {
          setSelectedRequest(null)
          router.push("/(member)/receipts")
        }}
        rows={
          selectedRequest
            ? [
                {
                  detail: `Requested ${formatDate(selectedRequest.requestedAt)}`,
                  icon: "PackageSearch",
                  label: "Status",
                  value: formatStatus(selectedRequest.status),
                },
                {
                  detail: `${selectedRequest.requestedRepaymentMonths} month repayment request`,
                  icon: "CircleDollarSign",
                  label: "Requested cost",
                  value: formatCurrency(
                    selectedRequest.requestedCost,
                    currencyCode
                  ),
                },
                {
                  detail: `Estimated monthly ${formatCurrency(
                    selectedRequest.estimatedMonthlyRepayment,
                    currencyCode
                  )}`,
                  icon: "CalendarClock",
                  label: "Outstanding",
                  value: formatCurrency(
                    selectedRequest.outstandingAmount,
                    currencyCode
                  ),
                },
                ...(selectedRequest.vendorName
                  ? [
                      {
                        detail: selectedRequest.itemDescription ?? undefined,
                        icon: "Landmark",
                        label: "Vendor",
                        value: selectedRequest.vendorName,
                      },
                    ]
                  : []),
                ...(selectedRequest.purchasedAt
                  ? [
                      {
                        detail: getProcurementPurchaseReferenceDetail(
                          selectedRequest.purchaseReference
                        ),
                        icon: "ReceiptText",
                        label: "Purchased",
                        value: formatDate(selectedRequest.purchasedAt),
                      },
                    ]
                  : []),
                ...(selectedRequest.reviewNotes
                  ? [
                      {
                        detail: selectedRequest.reviewNotes,
                        icon: "MessageSquareText",
                        label: "Review note",
                      },
                    ]
                  : []),
              ]
            : []
        }
        title={selectedRequest?.itemName ?? "Procurement request"}
        visible={Boolean(selectedRequest)}
      />
    </SafeArea>
  )
}
