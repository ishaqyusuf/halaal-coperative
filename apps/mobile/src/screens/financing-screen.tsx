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
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import {
  createMobileMemberFinancingRequest,
  getMobileMemberFinancing,
  type MobileLoanProductOption,
  type MobileMemberFinancing,
  type MobileMemberFinancingRequest,
  type MobileMemberSectionRow,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
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

function formatRowValue(row: MobileMemberSectionRow, currencyCode: string) {
  if (row.value === null || !row.format) return null

  return formatMobileMetricValue(
    {
      detail: row.detail,
      format: row.format,
      key: row.key,
      label: row.label,
      value: row.value,
    },
    currencyCode
  )
}

function ProductCard({
  isSelected,
  onPress,
  product,
}: {
  isSelected: boolean
  onPress: () => void
  product: MobileLoanProductOption
}) {
  return (
    <Button
      className="min-h-20 flex-1 items-start justify-start px-3 py-3"
      onPress={onPress}
      variant={isSelected ? "secondary" : "outline"}
    >
      <View className="gap-1">
        <Text className="text-sm font-semibold text-foreground">
          {product.name}
        </Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {formatStatus(product.loanType)} - up to {product.termMonths} months
        </Text>
        <Text className="text-xs leading-5 text-muted-foreground">
          {product.maxSavingsMultiple}x savings multiple
        </Text>
      </View>
    </Button>
  )
}

function RequestCard({
  currencyCode,
  isFirst,
  request,
}: {
  currencyCode: string
  isFirst: boolean
  request: MobileMemberFinancingRequest
}) {
  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {request.loanProductName}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {formatCurrency(request.requestedAmount, currencyCode)} over{" "}
            {request.requestedTermMonths} months
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
            {formatCurrency(request.estimatedMonthlyServicing, currencyCode)}
          </Text>
        </View>
        <View className="min-w-[120px] flex-1 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Eligible
          </Text>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {formatCurrency(request.eligibleAmountSnapshot, currencyCode)}
          </Text>
        </View>
      </View>

      {request.charges.length > 0 ? (
        <View className="gap-2 rounded-md bg-secondary p-3">
          <Text className="text-xs font-medium text-muted-foreground">
            Charges
          </Text>
          {request.charges.map((charge) => (
            <View
              className="flex-row items-center justify-between gap-3"
              key={charge.id}
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">
                  {charge.name}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {formatStatus(charge.status)} -{" "}
                  {formatStatus(charge.collectionMode)}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-foreground">
                {formatCurrency(charge.amount, currencyCode)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {request.purpose ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.purpose}
        </Text>
      ) : null}

      <Text className="text-xs font-medium text-muted-foreground">
        Requested {formatDate(request.requestedAt)}
        {request.guarantorApprovals.length
          ? ` - ${request.guarantorApprovals.length} guarantor request(s)`
          : ""}
      </Text>

      {request.reviewNotes ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {request.reviewNotes}
        </Text>
      ) : null}
    </View>
  )
}

export function FinancingScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [financing, setFinancing] = useState<MobileMemberFinancing | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState("")
  const [requestedAmount, setRequestedAmount] = useState("")
  const [requestedTermMonths, setRequestedTermMonths] = useState("")
  const [extraMonthlySavingsAmount, setExtraMonthlySavingsAmount] = useState("")
  const [purpose, setPurpose] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const canUseServerFinancing = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleFinancing = isMobileReadCacheStale(financing?.cache)
  const selectedProduct = financing?.products.find(
    (product) => product.id === selectedProductId
  )
  const financingDraft = useMemo(
    () => ({
      extraMonthlySavingsAmount,
      purpose,
      requestedAmount,
      requestedTermMonths,
      selectedProductId,
    }),
    [
      extraMonthlySavingsAmount,
      purpose,
      requestedAmount,
      requestedTermMonths,
      selectedProductId,
    ]
  )
  const clearFinancingDraft = useMobileFormDraft({
    enabled: canUseServerFinancing,
    key: "member.financing.create",
    onHydrate: (draft) => {
      setSelectedProductId(draft.selectedProductId)
      setRequestedAmount(draft.requestedAmount)
      setRequestedTermMonths(draft.requestedTermMonths)
      setExtraMonthlySavingsAmount(draft.extraMonthlySavingsAmount)
      setPurpose(draft.purpose)
    },
    value: financingDraft,
  })
  const amount = parseAmount(requestedAmount)
  const termMonths = parsePositiveInteger(requestedTermMonths)
  const extraSavings = parseAmount(extraMonthlySavingsAmount)
  const estimatedRequestCharges =
    financing?.loanRequestCharges.map((charge) => ({
      ...charge,
      estimatedAmount:
        charge.chargeValueType === "percentage"
          ? Number(((amount * charge.amount) / 100).toFixed(2))
          : charge.amount,
    })) ?? []
  const estimatedRequestChargeTotal = estimatedRequestCharges.reduce(
    (total, charge) => total + charge.estimatedAmount,
    0
  )
  const canSubmit = Boolean(
    selectedProduct &&
    amount > 0 &&
    termMonths > 0 &&
    termMonths <= selectedProduct.termMonths &&
    !hasStaleFinancing &&
    !isSubmitting
  )
  const stats = useMemo(
    () =>
      financing?.section.stats.map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      })) ?? [],
    [currencyCode, financing?.section.stats]
  )

  const loadFinancing = useCallback(() => {
    let mounted = true

    if (!canUseServerFinancing) {
      setFinancing(null)
      setError(null)
      setIsLoading(false)
      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileMemberFinancing()
      .then((response) => {
        if (mounted) {
          setFinancing(response)
          setSelectedProductId(
            (current) => current || response.products[0]?.id || ""
          )
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Financing is unavailable.")
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
  }, [canUseServerFinancing])

  useEffect(() => loadFinancing(), [loadFinancing])

  async function handleSubmit() {
    if (hasStaleFinancing) {
      setError("Refresh financing data before submitting a request.")
      return
    }

    if (!selectedProduct || !canSubmit) return

    setError(null)
    setSuccess(null)
    setIsSubmitting(true)

    try {
      await createMobileMemberFinancingRequest({
        extraMonthlySavingsAmount: extraSavings || undefined,
        loanProductId: selectedProduct.id,
        purpose: purpose.trim() || undefined,
        requestedAmount: amount,
        requestedTermMonths: termMonths,
      })
      await clearFinancingDraft()
      setRequestedAmount("")
      setRequestedTermMonths("")
      setExtraMonthlySavingsAmount("")
      setPurpose("")
      setSuccess("Financing request submitted.")
      loadFinancing()
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Financing request could not be submitted."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">Financing</Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Request cooperative financing and track review status.
          </Text>
        </View>

        {!canUseServerFinancing ? (
          <SectionCard icon="HandCoins" title="Financing">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to request and track
              financing.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerFinancing ? (
          <>
            <CachedReadBanner cache={financing?.cache} label="financing data" />

            {stats.length > 0 ? (
              <View className="flex-row flex-wrap gap-3">
                {stats.map((item) => (
                  <StatCard key={item.label} {...item} />
                ))}
              </View>
            ) : null}

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

            <SectionCard icon="WalletCards" title="Products">
              {isLoading ? (
                <LoadingSpinner />
              ) : financing?.products.length ? (
                <View className="flex-row flex-wrap gap-2">
                  {financing.products.map((product) => (
                    <ProductCard
                      isSelected={product.id === selectedProductId}
                      key={product.id}
                      onPress={() => setSelectedProductId(product.id)}
                      product={product}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No active financing products are available.
                </Text>
              )}
            </SectionCard>

            <SectionCard icon="Send" title="New request">
              <View className="gap-3">
                <Input
                  editable={!isSubmitting}
                  keyboardType="numeric"
                  onChangeText={setRequestedAmount}
                  placeholder="Requested amount"
                  value={requestedAmount}
                />
                <Input
                  editable={!isSubmitting}
                  keyboardType="numeric"
                  onChangeText={setRequestedTermMonths}
                  placeholder={
                    selectedProduct
                      ? `Repayment months, max ${selectedProduct.termMonths}`
                      : "Repayment months"
                  }
                  value={requestedTermMonths}
                />
                <Input
                  editable={!isSubmitting}
                  keyboardType="numeric"
                  onChangeText={setExtraMonthlySavingsAmount}
                  placeholder="Extra monthly savings"
                  value={extraMonthlySavingsAmount}
                />
                <Textarea
                  editable={!isSubmitting}
                  onChangeText={setPurpose}
                  placeholder="Purpose note"
                  value={purpose}
                />
                {estimatedRequestCharges.length > 0 ? (
                  <View className="gap-2 rounded-md bg-secondary p-3">
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="text-xs font-medium text-muted-foreground">
                        Applicable charges
                      </Text>
                      <Text className="text-sm font-semibold text-foreground">
                        {formatCurrency(
                          estimatedRequestChargeTotal,
                          currencyCode
                        )}
                      </Text>
                    </View>
                    {estimatedRequestCharges.map((charge) => (
                      <View
                        className="flex-row items-center justify-between gap-3"
                        key={charge.id}
                      >
                        <Text className="flex-1 text-xs text-muted-foreground">
                          {charge.name}
                        </Text>
                        <Text className="text-xs font-medium text-foreground">
                          {formatCurrency(charge.estimatedAmount, currencyCode)}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                <Button
                  className="h-12"
                  disabled={!canSubmit}
                  onPress={handleSubmit}
                >
                  <Icon
                    name="Send"
                    className="size-base text-primary-foreground"
                  />
                  <Text>{isSubmitting ? "Submitting" : "Submit request"}</Text>
                </Button>
              </View>
            </SectionCard>

            <SectionCard icon="ListChecks" title="Current records">
              {isLoading ? (
                <LoadingSpinner />
              ) : financing?.section.rows.length ? (
                <View className="gap-3">
                  {financing.section.rows.map((row) => {
                    const formattedValue = formatRowValue(row, currencyCode)

                    return (
                      <View
                        className="flex-row items-start gap-3"
                        key={row.key}
                      >
                        <View className="h-8 w-8 items-center justify-center rounded-md bg-secondary">
                          <Icon
                            name={formattedValue ? "CircleDollarSign" : "Check"}
                            className="size-sm text-success"
                          />
                        </View>
                        <View className="flex-1 gap-1">
                          <View className="flex-row items-start justify-between gap-3">
                            <Text className="flex-1 text-sm font-semibold text-foreground">
                              {row.label}
                            </Text>
                            {formattedValue ? (
                              <Text className="text-sm font-semibold text-foreground">
                                {formattedValue}
                              </Text>
                            ) : null}
                          </View>
                          <Text className="text-sm leading-5 text-muted-foreground">
                            {row.detail}
                          </Text>
                          {row.status ? (
                            <Text className="text-xs font-medium text-muted-foreground">
                              {row.status}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    )
                  })}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No financing records are available.
                </Text>
              )}
            </SectionCard>

            <SectionCard icon="ClipboardList" title="Request history">
              {isLoading ? (
                <LoadingSpinner />
              ) : financing?.requests.length ? (
                <View className="gap-3">
                  {financing.requests.map((request, index) => (
                    <RequestCard
                      currencyCode={currencyCode}
                      isFirst={index === 0}
                      key={request.id}
                      request={request}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No financing requests have been submitted from this member
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
