import { CachedReadBanner } from "@/components/app/cached-read-banner"
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
  createMobileMemberProcurementRequest,
  getMobileMemberProcurement,
  type MobileMemberProcurement,
  type MobileMemberProcurementRequest,
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

function ProcurementRequestCard({
  currencyCode,
  isFirst,
  request,
}: {
  currencyCode: string
  isFirst: boolean
  request: MobileMemberProcurementRequest
}) {
  const dueItems = request.scheduleItems.filter((item) =>
    ["due", "overdue", "partially_paid"].includes(item.status)
  )

  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {request.itemName}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatCurrency(request.requestedCost, currencyCode)} over{" "}
            {request.requestedRepaymentMonths} months
          </Text>
        </View>
        <Text className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
          {formatStatus(request.status)}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Monthly
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(request.estimatedMonthlyRepayment, currencyCode)}
          </Text>
        </View>
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Outstanding
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(request.outstandingAmount, currencyCode)}
          </Text>
        </View>
      </View>

      {request.vendorName ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.vendorName}
        </Text>
      ) : null}

      {request.itemDescription ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.itemDescription}
        </Text>
      ) : null}

      {request.approvedCost ? (
        <Text className="text-sm leading-5 text-foreground">
          Approved {formatCurrency(request.approvedCost, currencyCode)} over{" "}
          {request.approvedRepaymentMonths ?? 0} months.
        </Text>
      ) : null}

      {request.purchasedAt ? (
        <Text className="text-sm leading-5 text-foreground">
          Purchased {formatDate(request.purchasedAt)}
          {request.purchaseReference ? ` - ${request.purchaseReference}` : ""}
        </Text>
      ) : null}

      <Text className="text-xs font-medium text-muted-foreground">
        Requested {formatDate(request.requestedAt)}
        {dueItems.length ? ` - ${dueItems.length} due item(s)` : ""}
      </Text>

      {request.reviewNotes ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.reviewNotes}
        </Text>
      ) : null}
    </View>
  )
}

export function ProcurementScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [procurement, setProcurement] =
    useState<MobileMemberProcurement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [itemName, setItemName] = useState("")
  const [vendorName, setVendorName] = useState("")
  const [requestedCost, setRequestedCost] = useState("")
  const [requestedRepaymentMonths, setRequestedRepaymentMonths] = useState("")
  const [itemDescription, setItemDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const canUseServerProcurement = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleProcurement = isMobileReadCacheStale(procurement?.cache)
  const cost = parseAmount(requestedCost)
  const repaymentMonths = parsePositiveInteger(requestedRepaymentMonths)
  const canSubmit = Boolean(
    itemName.trim().length >= 2 &&
    cost > 0 &&
    repaymentMonths > 0 &&
    !hasStaleProcurement &&
    !isSubmitting
  )
  const stats = useMemo(
    () => [
      {
        detail: "Submitted or under review",
        label: "Pending",
        value: String(procurement?.summary.pendingRequests ?? 0),
      },
      {
        detail: "Approved, purchased, active, or completed",
        label: "Approved",
        value: String(procurement?.summary.approvedRequests ?? 0),
      },
      {
        detail: "Due repayment schedule items",
        label: "Due",
        value: String(procurement?.summary.dueScheduleItems ?? 0),
      },
      {
        detail: "Open procurement balance",
        label: "Outstanding",
        value: formatCurrency(
          procurement?.summary.outstandingAmount ?? 0,
          currencyCode
        ),
      },
    ],
    [
      currencyCode,
      procurement?.summary.approvedRequests,
      procurement?.summary.dueScheduleItems,
      procurement?.summary.outstandingAmount,
      procurement?.summary.pendingRequests,
    ]
  )

  const loadProcurement = useCallback(() => {
    let mounted = true

    if (!canUseServerProcurement) {
      setProcurement(null)
      setError(null)
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileMemberProcurement()
      .then((response) => {
        if (mounted) {
          setProcurement(response)
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
  }, [canUseServerProcurement])

  useEffect(() => loadProcurement(), [loadProcurement])

  async function handleSubmit() {
    if (hasStaleProcurement) {
      setError("Refresh procurement data before submitting a request.")
      return
    }

    if (!canSubmit) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMobileMemberProcurementRequest({
        itemDescription: itemDescription.trim() || undefined,
        itemName: itemName.trim(),
        requestedCost: cost,
        requestedRepaymentMonths: repaymentMonths,
        vendorName: vendorName.trim() || undefined,
      })
      setItemName("")
      setVendorName("")
      setRequestedCost("")
      setRequestedRepaymentMonths("")
      setItemDescription("")
      setSuccess("Procurement request submitted.")
      loadProcurement()
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

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">
            Procurement
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Request cooperative item purchases and track repayment status.
          </Text>
        </View>

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
            <CachedReadBanner
              cache={procurement?.cache}
              label="procurement data"
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

            <SectionCard icon="PackagePlus" title="New item request">
              <View className="gap-3">
                <Input
                  editable={!isSubmitting}
                  onChangeText={setItemName}
                  placeholder="Item name"
                  value={itemName}
                />
                <Input
                  editable={!isSubmitting}
                  onChangeText={setVendorName}
                  placeholder="Vendor"
                  value={vendorName}
                />
                <Input
                  editable={!isSubmitting}
                  keyboardType="numeric"
                  onChangeText={setRequestedCost}
                  placeholder="Requested cost"
                  value={requestedCost}
                />
                <Input
                  editable={!isSubmitting}
                  keyboardType="numeric"
                  onChangeText={setRequestedRepaymentMonths}
                  placeholder="Repayment months"
                  value={requestedRepaymentMonths}
                />
                <Textarea
                  editable={!isSubmitting}
                  onChangeText={setItemDescription}
                  placeholder="Description"
                  value={itemDescription}
                />
                <MobileChargeSummary
                  basisAmount={cost}
                  charges={procurement?.chargeOptions ?? []}
                  currencyCode={currencyCode}
                />
                <Button
                  className="h-12"
                  disabled={!canSubmit}
                  onPress={handleSubmit}
                >
                  <Icon
                    name="Send"
                    className="size-base text-primary-foreground"
                  />
                  <Text>{isSubmitting ? "Submitting" : "Send request"}</Text>
                </Button>
              </View>
            </SectionCard>

            <SectionCard icon="ClipboardList" title="Request history">
              {isLoading ? (
                <LoadingSpinner />
              ) : procurement?.requests.length ? (
                <View className="gap-3">
                  {procurement.requests.map((request, index) => (
                    <ProcurementRequestCard
                      currencyCode={currencyCode}
                      isFirst={index === 0}
                      key={request.id}
                      request={request}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No procurement requests have been submitted from this member
                  profile.
                </Text>
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
