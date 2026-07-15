import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { SubmissionReviewSheet } from "@/components/app/submission-review-sheet"
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
import {
  createMobileMemberFoodPurchaseApplication,
  getMobileMemberFoodPurchase,
  type MobileFoodPurchaseApplication,
  type MobileFoodPurchaseCycle,
  type MobileMemberFoodPurchase,
  type MobileWorkflowChargeOption,
} from "@/lib/mobile-home-api"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { isMockSessionToken } from "@/lib/session-store"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, "").trim())

  return Number.isFinite(amount) ? amount : 0
}

function parsePositiveInteger(value: string) {
  const amount = Number(value.trim())

  return Number.isInteger(amount) && amount > 0 ? amount : 0
}

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded"

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("en", {
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

function FoodPurchaseCycleButton({
  currencyCode,
  cycle,
  isSelected,
  onPress,
}: {
  currencyCode: string
  cycle: MobileFoodPurchaseCycle
  isSelected: boolean
  onPress: () => void
}) {
  return (
    <Button
      className="h-auto items-start justify-start px-3 py-3"
      onPress={onPress}
      variant={isSelected ? "secondary" : "outline"}
    >
      <View className="flex-1 gap-1">
        <Text className="text-sm font-semibold text-foreground">
          {formatMonth(cycle.periodMonth)}
        </Text>
        <Text className="text-xs leading-4 text-muted-foreground">
          {formatCurrency(cycle.releasedAmount, currencyCode)} released
        </Text>
        {cycle.releaseNotes ? (
          <Text className="text-xs leading-4 text-muted-foreground">
            {cycle.releaseNotes}
          </Text>
        ) : null}
      </View>
      {isSelected ? (
        <Icon name="Check" className="size-sm text-foreground" />
      ) : null}
    </Button>
  )
}

function FoodPurchaseApplicationCard({
  application,
  currencyCode,
  isFirst,
}: {
  application: MobileFoodPurchaseApplication
  currencyCode: string
  isFirst: boolean
}) {
  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {application.itemDescription || "Foodstuff Purchase request"}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatMonth(application.cycle.periodMonth)} cycle
          </Text>
        </View>
        <StatusBadge
          label={formatStatus(application.status)}
          tone={getStatusBadgeTone(application.status)}
        />
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Requested
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(application.requestedAmount, currencyCode)}
          </Text>
        </View>
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Payback
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {application.requestedPaybackMonths} month(s)
          </Text>
        </View>
      </View>

      {application.approvedAmount ? (
        <Text className="text-sm leading-5 text-foreground">
          Approved {formatCurrency(application.approvedAmount, currencyCode)}{" "}
          over {application.approvedPaybackMonths ?? 0} month(s).
        </Text>
      ) : null}

      {application.paidAmount > 0 || application.paidAt ? (
        <Text className="text-sm leading-5 text-foreground">
          Paid {formatCurrency(application.paidAmount, currencyCode)} on{" "}
          {formatDate(application.paidAt)}
        </Text>
      ) : null}

      <Text className="text-xs font-medium text-muted-foreground">
        Requested {formatDate(application.requestedAt)}
      </Text>

      {application.requestNotes ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {application.requestNotes}
        </Text>
      ) : null}

      {application.reviewNotes ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {application.reviewNotes}
        </Text>
      ) : null}
    </View>
  )
}

export function FoodPurchaseScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [foodPurchase, setFoodPurchase] =
    useState<MobileMemberFoodPurchase | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cycleId, setCycleId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedPaybackMonths, setRequestedPaybackMonths] = useState("1")
  const [itemDescription, setItemDescription] = useState("")
  const [requestNotes, setRequestNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isReviewingSubmit, setIsReviewingSubmit] = useState(false)
  const canUseServerFoodPurchase = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleFoodPurchase = isMobileReadCacheStale(foodPurchase?.cache)
  const foodPurchaseDraft = useMemo(
    () => ({
      cycleId,
      itemDescription,
      requestedAmount,
      requestedPaybackMonths,
      requestNotes,
    }),
    [
      cycleId,
      itemDescription,
      requestedAmount,
      requestedPaybackMonths,
      requestNotes,
    ]
  )
  const clearFoodPurchaseDraft = useMobileFormDraft({
    enabled: canUseServerFoodPurchase,
    key: "member.food-purchase.create",
    onHydrate: (draft) => {
      setCycleId(draft.cycleId)
      setRequestedAmount(draft.requestedAmount)
      setRequestedPaybackMonths(draft.requestedPaybackMonths)
      setItemDescription(draft.itemDescription)
      setRequestNotes(draft.requestNotes)
    },
    value: foodPurchaseDraft,
  })
  const openCycles = useMemo(
    () => foodPurchase?.cycles.filter((cycle) => cycle.status === "open") ?? [],
    [foodPurchase?.cycles]
  )
  const amount = parseAmount(requestedAmount)
  const paybackMonths = parsePositiveInteger(requestedPaybackMonths)
  const canSubmit = Boolean(
    foodPurchase?.canCreateApplication &&
    cycleId &&
    amount > 0 &&
    paybackMonths > 0 &&
    !hasStaleFoodPurchase &&
    !isSubmitting
  )
  const selectedCycle = foodPurchase?.cycles.find(
    (cycle) => cycle.id === cycleId
  )
  const hasFoodPurchaseDraft = Boolean(
    requestedAmount.trim() ||
    requestedPaybackMonths.trim() !== "1" ||
    itemDescription.trim() ||
    requestNotes.trim()
  )
  const reviewRows = [
    {
      detail: selectedCycle
        ? `${formatMonth(selectedCycle.periodMonth)} cycle`
        : "No open cycle selected",
      icon: "ShoppingBasket",
      label: "Foodstuff Purchase",
      value: amount ? formatCurrency(amount, currencyCode) : "Not set",
    },
    {
      detail: "Requested repayment duration",
      icon: "CalendarClock",
      label: "Payback months",
      value: paybackMonths ? String(paybackMonths) : "Not set",
    },
  ]
  const stats = useMemo(
    () => [
      {
        detail: "Accepting member applications",
        label: "Open cycles",
        value: String(foodPurchase?.summary.openCycles ?? 0),
      },
      {
        detail: "Waiting for committee review",
        label: "Pending",
        value: String(foodPurchase?.summary.pendingApplications ?? 0),
      },
      {
        detail: "Approved by operations",
        label: "Approved",
        value: String(foodPurchase?.summary.approvedApplications ?? 0),
      },
      {
        detail: "Submitted applications",
        label: "Total",
        value: String(foodPurchase?.summary.totalApplications ?? 0),
      },
    ],
    [
      foodPurchase?.summary.approvedApplications,
      foodPurchase?.summary.openCycles,
      foodPurchase?.summary.pendingApplications,
      foodPurchase?.summary.totalApplications,
    ]
  )

  const loadFoodPurchase = useCallback(() => {
    let mounted = true

    if (!canUseServerFoodPurchase) {
      setFoodPurchase(null)
      setError(null)
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileMemberFoodPurchase()
      .then((response) => {
        if (mounted) {
          setFoodPurchase(response)
          setCycleId((currentCycleId) => {
            if (
              currentCycleId &&
              response.cycles.some(
                (cycle) =>
                  cycle.id === currentCycleId && cycle.status === "open"
              )
            ) {
              return currentCycleId
            }

            return (
              response.cycles.find((cycle) => cycle.status === "open")?.id ?? ""
            )
          })
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Foodstuff Purchase is unavailable.")
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
  }, [canUseServerFoodPurchase])

  useEffect(() => loadFoodPurchase(), [loadFoodPurchase])

  async function handleSubmit() {
    if (hasStaleFoodPurchase) {
      setError("Refresh Foodstuff Purchase data before submitting.")
      return
    }

    if (!canSubmit) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMobileMemberFoodPurchaseApplication({
        cycleId,
        itemDescription: itemDescription.trim() || undefined,
        requestedAmount: amount,
        requestedPaybackMonths: paybackMonths,
        requestNotes: requestNotes.trim() || undefined,
      })
      await clearFoodPurchaseDraft()
      setRequestedAmount("")
      setRequestedPaybackMonths("1")
      setItemDescription("")
      setRequestNotes("")
      setSuccess("Foodstuff Purchase application submitted.")
      setIsReviewingSubmit(false)
      loadFoodPurchase()
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Foodstuff Purchase application could not be submitted."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">
            Foodstuff Purchase
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Apply for monthly cooperative food support and track approval or
            repayment status.
          </Text>
        </View>

        {!canUseServerFoodPurchase ? (
          <SectionCard icon="ShoppingBasket" title="Foodstuff Purchase">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to apply for Foodstuff
              Purchase support.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerFoodPurchase ? (
          <>
            <CachedReadBanner
              cache={foodPurchase?.cache}
              label="Foodstuff Purchase data"
            />

            <View className="flex-row flex-wrap gap-3">
              {stats.map((item) => (
                <StatCard key={item.label} {...item} />
              ))}
            </View>

            {error ? (
              <Text className="text-sm font-medium text-destructive">
                {error}
              </Text>
            ) : null}
            {success ? (
              <Text className="text-success text-sm font-medium">
                {success}
              </Text>
            ) : null}

            {foodPurchase?.canCreateApplication ? (
              <SectionCard icon="ShoppingBasket" title="New application">
                <View className="gap-3">
                  <FormStateBanner
                    hasDraft={hasFoodPurchaseDraft}
                    isStale={hasStaleFoodPurchase}
                  />
                  {isLoading ? (
                    <LoadingSpinner />
                  ) : openCycles.length ? (
                    <View className="gap-2">
                      {openCycles.map((cycle) => (
                        <FoodPurchaseCycleButton
                          currencyCode={currencyCode}
                          cycle={cycle}
                          isSelected={cycle.id === cycleId}
                          key={cycle.id}
                          onPress={() => setCycleId(cycle.id)}
                        />
                      ))}
                    </View>
                  ) : (
                    <EmptyState
                      description="The cooperative office has not opened a Foodstuff Purchase cycle for applications."
                      icon="CalendarClock"
                      title="No open cycle"
                    />
                  )}
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">
                      Requested amount
                    </Text>
                    <Input
                      accessibilityLabel="Foodstuff Purchase requested amount"
                      editable={!isSubmitting}
                      keyboardType="numeric"
                      onChangeText={setRequestedAmount}
                      placeholder="Requested amount"
                      value={requestedAmount}
                    />
                  </View>
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">
                      Payback months
                    </Text>
                    <Input
                      accessibilityLabel="Foodstuff Purchase payback months"
                      editable={!isSubmitting}
                      keyboardType="numeric"
                      onChangeText={setRequestedPaybackMonths}
                      placeholder="Payback months"
                      value={requestedPaybackMonths}
                    />
                  </View>
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">
                      Items requested
                    </Text>
                    <Textarea
                      accessibilityLabel="Foodstuff Purchase items requested"
                      editable={!isSubmitting}
                      onChangeText={setItemDescription}
                      placeholder="Items requested"
                      value={itemDescription}
                    />
                  </View>
                  <View className="gap-2">
                    <Text className="text-sm font-semibold text-foreground">
                      Notes
                    </Text>
                    <Textarea
                      accessibilityLabel="Foodstuff Purchase notes"
                      editable={!isSubmitting}
                      onChangeText={setRequestNotes}
                      placeholder="Notes"
                      value={requestNotes}
                    />
                  </View>
                  <MobileChargeSummary
                    basisAmount={amount}
                    charges={foodPurchase?.chargeOptions ?? []}
                    currencyCode={currencyCode}
                  />
                  <Button
                    className="h-12"
                    disabled={!canSubmit}
                    onPress={() => setIsReviewingSubmit(true)}
                  >
                    <Icon
                      name="Send"
                      className="size-base text-primary-foreground"
                    />
                    <Text>
                      {isSubmitting ? "Submitting" : "Send application"}
                    </Text>
                  </Button>
                </View>
              </SectionCard>
            ) : (
              <SectionCard icon="ShoppingBasket" title="Foodstuff Purchase">
                <Text className="text-sm leading-5 text-muted-foreground">
                  New Foodstuff Purchase applications are handled by the
                  cooperative office. Existing applications remain visible here.
                </Text>
              </SectionCard>
            )}

            <SectionCard icon="ClipboardList" title="Application history">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <VirtualizedCardList
                  data={foodPurchase?.applications ?? []}
                  empty={
                    <EmptyState
                      description="Submitted Foodstuff Purchase applications will appear here."
                      icon="ShoppingBasket"
                      title="No Foodstuff Purchase applications"
                    />
                  }
                  estimatedItemSize={176}
                  keyExtractor={(application) => application.id}
                  renderItem={({ index, item: application }) => (
                    <FoodPurchaseApplicationCard
                      application={application}
                      currencyCode={currencyCode}
                      isFirst={index === 0}
                    />
                  )}
                />
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
      <SubmissionReviewSheet
        description="Review this Foodstuff Purchase application before sending it to the cooperative office."
        isSubmitting={isSubmitting}
        onClose={() => setIsReviewingSubmit(false)}
        onConfirm={handleSubmit}
        rows={reviewRows}
        title="Review Foodstuff Purchase"
        visible={isReviewingSubmit}
      />
    </SafeArea>
  )
}
