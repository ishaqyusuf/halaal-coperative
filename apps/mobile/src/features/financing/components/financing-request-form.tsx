import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import {
  ResultScreen,
  ReviewRow,
  ReviewSummary,
  SubmittingState,
} from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { ListCard } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { Input } from "@/components/ui/input"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { mobileDevQuickFill } from "@/dev/mobile-dev-quick-fill"
import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useDebounce } from "@/hooks/use-debounce"
import { useMobileFormDraft } from "@/hooks/use-mobile-form-draft"
import { cn } from "@/lib/utils"
import { randomUUID } from "expo-crypto"
import { useMemo, useRef, useState } from "react"
import { Keyboard, View } from "react-native"
import Animated, { FadeInRight, ReduceMotion } from "react-native-reanimated"
import {
  createMemberFinancingRequest,
  quoteMemberFinancing,
} from "../api/member-financing-api"
import type {
  MobileFinancingProduct,
  MobileFinancingQuote,
  MobileFinancingRequest,
} from "../model/member-financing-types"
import {
  FinanceChargeRow,
  FinanceHeading,
  FinanceNotice,
  FinanceProductIcon,
  FinancingTimeline,
  financeStatus,
  formatFinanceMoney,
} from "./financing-records"

type Draft = {
  extraMonthlySavingsAmount: string
  purpose: string
  requestedAmount: string
  requestedTermMonths: string
  selectedProductId: string
}

const emptyDraft: Draft = {
  extraMonthlySavingsAmount: "",
  purpose: "",
  requestedAmount: "",
  requestedTermMonths: "",
  selectedProductId: "",
}

const estimateNote =
  "Monthly principal excludes the listed charges. Approval, repayment dates and total payable depend on your cooperative’s final agreement."

type FormStage =
  | "product"
  | "amount"
  | "details"
  | "review"
  | "submitting"
  | "error"
  | "success"
const formSteps = ["product", "amount", "details"] as const

export function FinancingRequestForm({
  currency,
  enabled,
  online,
  products,
  scope,
  stale,
  trigger,
  onCreated,
  onView,
}: {
  currency: string
  enabled: boolean
  online: boolean
  products: MobileFinancingProduct[]
  scope: readonly unknown[]
  stale: boolean
  trigger: (actions: {
    hasDraft: boolean
    open: (productId?: string) => void
  }) => React.ReactNode
  onCreated: (request: MobileFinancingRequest) => void
  onView: (request: MobileFinancingRequest) => void
}) {
  const [visible, setVisible] = useState(false)
  const [stage, setStage] = useState<FormStage>("product")
  const [draft, setDraft] = useState(emptyDraft)
  const [review, setReview] = useState<MobileFinancingQuote | null>(null)
  const [previousReview, setPreviousReview] =
    useState<MobileFinancingQuote | null>(null)
  const [created, setCreated] = useState<MobileFinancingRequest | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const submitting = useRef(false)
  const submissionId = useRef<string | null>(null)
  const pendingDetail = useRef<MobileFinancingRequest | null>(null)
  const clearDraft = useMobileFormDraft({
    enabled,
    key: "member.financing.create",
    onHydrate: setDraft,
    value: draft,
  })

  const product =
    products.find((item) => item.id === draft.selectedProductId) ?? products[0]
  const amount = Number(draft.requestedAmount.replaceAll(",", ""))
  const term = Number(draft.requestedTermMonths)
  const extra = Number(draft.extraMonthlySavingsAmount.replaceAll(",", ""))
  const termValid =
    Number.isInteger(term) && term > 0 && term <= (product?.termMonths ?? 0)
  const input = useMemo(
    () =>
      product &&
      amount > 0 &&
      Number.isFinite(amount) &&
      termValid &&
      Number.isFinite(extra)
        ? {
            loanProductId: product.id,
            requestedAmount: amount,
            requestedTermMonths: term,
            extraMonthlySavingsAmount: extra || undefined,
          }
        : null,
    [amount, extra, product, term, termValid]
  )
  const debounced = useDebounce(input, 300)
  const quoting = stage === "amount" || stage === "details"
  const quote = useAppQuery({
    queryKey: appQueryKey("member.financing.quote", ...scope, debounced),
    queryFn: () => quoteMemberFinancing(debounced!),
    enabled: visible && online && Boolean(debounced && input) && quoting,
    refetchOnScreenFocus: false,
    staleTime: 0,
  })
  const updating = Boolean(
    input &&
    online &&
    (input !== debounced || quote.isFetching || quote.isPlaceholderData)
  )
  const ready = Boolean(
    online &&
    !stale &&
    input &&
    input === debounced &&
    !updating &&
    !quote.isError &&
    quote.data?.canSubmit
  )
  const currentQuote = input && debounced ? quote.data : undefined
  const step = formSteps.findIndex((item) => item === stage)
  const hasDraft = Boolean(
    draft.requestedAmount ||
    draft.requestedTermMonths ||
    draft.extraMonthlySavingsAmount ||
    draft.purpose
  )
  const changed = failure?.includes("Financing charges changed") ?? false
  const money = (value: number) => formatFinanceMoney(value, currency)

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    if (draft[key] !== value) submissionId.current = null
    setDraft((current) => ({ ...current, [key]: value }))
    setPreviousReview(null)
  }

  function open(productId?: string) {
    if (!product) return
    if (productId) update("selectedProductId", productId)
    setStage("product")
    setReview(null)
    setPreviousReview(null)
    setCreated(null)
    setFailure(null)
    setVisible(true)
  }

  function moveTo(next: FormStage) {
    Keyboard.dismiss()
    setStage(next)
  }

  async function submit() {
    if (!review || !input || stale || !online || submitting.current) return
    submitting.current = true
    submissionId.current ??= randomUUID()
    moveTo("submitting")
    try {
      const request = await createMemberFinancingRequest({
        ...input,
        chargeQuoteHash: review.chargeQuoteHash,
        clientRequestId: submissionId.current,
        purpose: draft.purpose.trim() || undefined,
      })
      setCreated(request)
      submissionId.current = null
      setDraft(emptyDraft)
      void clearDraft().catch(() => {})
      setStage("success")
      onCreated(request)
    } catch (error) {
      setFailure(
        error instanceof Error
          ? error.message
          : "Check your connection and try again."
      )
      setStage("error")
    } finally {
      submitting.current = false
    }
  }

  async function reviewNewCharges() {
    const fresh = await quote.refetch()
    if (!fresh.isSuccess || !fresh.data.canSubmit) {
      moveTo("amount")
      return
    }
    setPreviousReview(review)
    setReview(fresh.data)
    moveTo("review")
  }

  const result =
    stage === "success" && created ? (
      <ResultScreen
        align="top"
        description={`Your ${money(created.requestedAmount)} ${created.loanProductName.toLowerCase()} request is with your cooperative. We’ll notify you as it progresses.`}
        details={<FinancingTimeline request={created} result />}
        primary={{
          label: "View request",
          onPress: () => {
            pendingDetail.current = created
            setVisible(false)
          },
        }}
        secondary={{
          label: "Done",
          onPress: () => setVisible(false),
          variant: "ghost",
        }}
        title="Request sent"
        tone="success"
      />
    ) : stage === "error" ? (
      <ResultScreen
        align="top"
        badgeIcon={changed ? "AlertTriangle" : "WifiOff"}
        description={
          changed
            ? "The charges changed after your estimate. Review the new amounts before sending again."
            : `${failure ?? "Check your connection and try again."} Your draft is still available.`
        }
        primary={
          online && !stale
            ? {
                label: changed ? "Review new amounts" : "Try again",
                onPress: changed
                  ? () => void reviewNewCharges()
                  : () => void submit(),
                loading: changed && quote.isFetching,
              }
            : undefined
        }
        secondary={{
          label: "Edit request",
          onPress: () => moveTo("details"),
          variant: "ghost",
        }}
        title={changed ? "Charges changed" : "Couldn’t send your request"}
        tone="error"
      />
    ) : stage === "submitting" ? (
      <SubmittingState title="Sending your request" />
    ) : null

  const back =
    stage === "review"
      ? () => moveTo("details")
      : step > 0
        ? () => moveTo(formSteps[step - 1]!)
        : undefined

  return (
    <>
      {trigger({ hasDraft, open })}
      <AppSheet
        headerTrailing={step >= 0 ? `${step + 1} of 4` : undefined}
        isSubmitting={stage === "submitting"}
        onBack={back}
        onClose={() => setVisible(false)}
        onDismissed={() => {
          if (pendingDetail.current) {
            onView(pendingDetail.current)
            pendingDetail.current = null
          }
        }}
        overlay={
          result ? (
            <View className="absolute inset-0">{result}</View>
          ) : undefined
        }
        overlayActive={Boolean(result)}
        title={stage === "review" ? "Review request" : "New financing request"}
        variant="form"
        visible={visible}
        footer={
          !result ? (
            <View className="gap-2">
              {stage === "amount" ? (
                <DevQuickFill
                  placement="footer"
                  portal={false}
                  onPress={() => {
                    submissionId.current = null
                    setDraft((current) => ({
                      ...current,
                      ...mobileDevQuickFill.financing,
                    }))
                  }}
                />
              ) : null}
              <Button
                disabled={
                  stage === "product"
                    ? !product
                    : stage === "review"
                      ? !online || stale
                      : !ready
                }
                onPress={() => {
                  if (stage === "product") moveTo("amount")
                  else if (stage === "amount") moveTo("details")
                  else if (stage === "details" && ready && quote.data) {
                    setReview(quote.data)
                    moveTo("review")
                  } else if (stage === "review") void submit()
                }}
              >
                <Text>
                  {stage === "review"
                    ? "Send request"
                    : stage === "details"
                      ? "Review request"
                      : "Continue"}
                </Text>
              </Button>
            </View>
          ) : undefined
        }
      >
        <Animated.View
          entering={FadeInRight.duration(180).reduceMotion(ReduceMotion.System)}
          key={stage}
        >
          <View className="gap-4">
            {step >= 0 ? (
              <View className="flex-row gap-1" importantForAccessibility="no">
                {[0, 1, 2, 3].map((index) => (
                  <View
                    key={index}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      index <= step ? "bg-primary" : "bg-border"
                    )}
                  />
                ))}
              </View>
            ) : null}
            {!online ? (
              <FinanceNotice
                title="You’re offline"
                detail="Connect to get an estimate and send your draft."
                warning
              />
            ) : null}
            {online && stale ? (
              <FinanceNotice
                title="Refresh needed"
                detail="Refresh Finance before you send this request."
                warning
              />
            ) : null}
            {stage === "product" ? (
              <>
                <StepHeading
                  title="Choose a product"
                  subtitle="You can change this before you send."
                />
                <View accessibilityRole="radiogroup" className="gap-3">
                  {products.map((item) => (
                    <ProductOption
                      key={item.id}
                      onSelect={() => update("selectedProductId", item.id)}
                      product={item}
                      selected={item.id === product?.id}
                    />
                  ))}
                </View>
              </>
            ) : null}
            {stage === "amount" && product ? (
              <>
                <StepHeading
                  title="Amount and term"
                  subtitle={`${product.name} · up to ${product.termMonths} months`}
                />
                <FormField
                  label="Amount"
                  error={amountError(currentQuote, updating, money)}
                  helper={
                    product.eligibleAmount != null
                      ? `Up to ${money(product.eligibleAmount)}`
                      : undefined
                  }
                >
                  <MoneyField
                    allowDecimals
                    currencyCode={currency}
                    testID="financing-amount"
                    onChangeValue={(value) => update("requestedAmount", value)}
                    value={draft.requestedAmount}
                  />
                </FormField>
                <FormField
                  label="Repayment months"
                  error={
                    term > product.termMonths
                      ? `Up to ${product.termMonths} months for ${product.name}.`
                      : undefined
                  }
                  helper={`1 to ${product.termMonths} months`}
                >
                  <Input
                    keyboardType="number-pad"
                    maxLength={3}
                    onChangeText={(value) =>
                      update("requestedTermMonths", value.replace(/\D/g, ""))
                    }
                    placeholder="e.g. 12"
                    trailing={
                      <Text className="text-muted-foreground" variant="small">
                        months
                      </Text>
                    }
                    value={draft.requestedTermMonths}
                  />
                </FormField>
                <View className="flex-row flex-wrap gap-2">
                  {[3, 6, 12, 18, 24]
                    .filter((months) => months <= product.termMonths)
                    .map((months) => (
                      <Button
                        accessibilityState={{ selected: term === months }}
                        className={cn(
                          "rounded-full border px-3",
                          term === months ? "border-primary" : "border-border"
                        )}
                        key={months}
                        onPress={() => {
                          update("requestedTermMonths", String(months))
                          Keyboard.dismiss()
                        }}
                        size="sm"
                        variant={term === months ? "secondary" : "outline"}
                      >
                        <Text>{months} mo</Text>
                      </Button>
                    ))}
                </View>
                <QuoteEstimate
                  money={money}
                  offline={!online}
                  quote={currentQuote}
                  updating={updating}
                  error={Boolean(input) && quote.isError}
                  onRetry={() => void quote.refetch()}
                />
              </>
            ) : null}
            {stage === "details" ? (
              <>
                <StepHeading
                  title="A few details"
                  subtitle="Both are optional."
                />
                <FormField
                  label="Extra monthly savings"
                  helper="Added to your monthly commitment while you repay."
                  optional
                >
                  <MoneyField
                    allowDecimals
                    currencyCode={currency}
                    onChangeValue={(value) =>
                      update("extraMonthlySavingsAmount", value)
                    }
                    value={draft.extraMonthlySavingsAmount}
                  />
                </FormField>
                <FormField
                  label="Purpose"
                  helper="Your cooperative sees this when it reviews your request."
                  optional
                >
                  <Textarea
                    accessibilityLabel="Purpose"
                    maxLength={1000}
                    onChangeText={(value) => update("purpose", value)}
                    placeholder="What will this financing support?"
                    value={draft.purpose}
                  />
                </FormField>
                {updating ? (
                  <Text className="text-muted-foreground" variant="small">
                    Updating estimate…
                  </Text>
                ) : null}
                {quote.isError ? (
                  <FinanceNotice
                    title="Couldn’t update the estimate"
                    onRetry={() => void quote.refetch()}
                  />
                ) : null}
                {!updating && quote.data && !quote.data.canSubmit ? (
                  <FinanceNotice
                    title="Review the amount and term"
                    detail={quote.data.blockers[0]?.message}
                  />
                ) : null}
              </>
            ) : null}
            {stage === "review" && review ? (
              <QuoteReview
                extra={extra}
                money={money}
                previous={previousReview}
                purpose={draft.purpose.trim()}
                quote={review}
              />
            ) : null}
          </View>
        </Animated.View>
      </AppSheet>
    </>
  )
}

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="gap-1">
      <Text accessibilityRole="header" variant="title">
        {title}
      </Text>
      <Text className="text-muted-foreground" variant="small">
        {subtitle}
      </Text>
    </View>
  )
}

function ProductOption({
  product,
  selected,
  onSelect,
}: {
  product: MobileFinancingProduct
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Button
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      className={cn(
        "h-auto min-h-[74px] justify-start rounded-[18px] border bg-card px-[14px] py-3",
        selected ? "border-primary" : "border-border"
      )}
      onPress={onSelect}
      variant="outline"
    >
      <View
        className={cn(
          "size-5 items-center justify-center rounded-full border",
          selected ? "border-primary" : "border-muted-foreground"
        )}
      >
        {selected ? (
          <View className="size-2.5 rounded-full bg-primary" />
        ) : null}
      </View>
      <View className="flex-1 gap-1">
        <Text variant="section">{product.name}</Text>
        <Text className="text-muted-foreground" variant="small">
          {financeStatus(product.loanType)} · up to {product.termMonths} months
          · {product.maxSavingsMultiple}× savings
        </Text>
      </View>
      <FinanceProductIcon product={product} />
    </Button>
  )
}

function amountError(
  quote: MobileFinancingQuote | undefined,
  updating: boolean,
  money: (value: number) => string
) {
  if (updating || !quote) return undefined
  if (quote.blockers.some((item) => item.key === "eligibility_exceeded")) {
    return `Above your limit of ${money(quote.eligibleAmount)} for this product.`
  }
  if (quote.blockers.some((item) => item.key === "cycle_capacity_exceeded")) {
    return `Only ${money(quote.capacityRemaining)} is left in this cycle.`
  }
}

function QuoteEstimate({
  money,
  quote,
  updating,
  offline,
  error,
  onRetry,
}: {
  money: (value: number) => string
  quote?: MobileFinancingQuote
  updating: boolean
  offline: boolean
  error: boolean
  onRetry: () => void
}) {
  const blockers = quote?.blockers.filter(
    (item) =>
      !["eligibility_exceeded", "cycle_capacity_exceeded"].includes(item.key)
  )
  return (
    <View className="gap-2">
      <FinanceHeading
        title="Estimate"
        trailing={
          updating ? (
            <Text variant="caption">Checking…</Text>
          ) : !offline && !error && quote ? (
            <StatusPill
              label={quote.canSubmit ? "Can submit" : "Needs attention"}
              tone={quote.canSubmit ? "success" : "danger"}
            />
          ) : undefined
        }
      />
      {offline ? (
        <ListCard>
          <Text className="p-[14px]" variant="small">
            An estimate needs a connection.
          </Text>
        </ListCard>
      ) : error ? (
        <FinanceNotice title="Couldn’t prepare an estimate" onRetry={onRetry} />
      ) : !quote ? (
        <ListCard>
          <Text className="p-[14px] text-muted-foreground" variant="small">
            {updating
              ? "Preparing your estimate…"
              : "Enter an amount and months to see your eligibility, charges and monthly principal."}
          </Text>
        </ListCard>
      ) : (
        <>
          {!updating && blockers?.length ? (
            <FinanceNotice
              title="Request needs attention"
              detail={blockers.map((item) => item.message).join("\n")}
            />
          ) : null}
          {!updating && quote.warnings.length ? (
            <FinanceNotice
              title="Financing availability"
              detail={quote.warnings.map((item) => item.message).join("\n")}
              warning
            />
          ) : null}
          <ListCard inset={false}>
            <ReviewRow
              label="Eligibility limit"
              tabular
              value={money(quote.eligibleAmount)}
            />
            <ReviewRow
              label="Cycle capacity"
              tabular
              value={money(quote.capacityRemaining)}
            />
            <FinanceAmountRow
              label="Est. monthly principal"
              value={money(quote.estimatedMonthlyServicing)}
            />
            {quote.charges.map((charge) => (
              <FinanceChargeRow
                charge={charge}
                key={charge.id}
                value={money(charge.amount)}
              />
            ))}
          </ListCard>
          <Text className="text-muted-foreground" variant="small">
            {estimateNote}
          </Text>
        </>
      )}
    </View>
  )
}

function FinanceAmountRow({
  label,
  detail,
  value,
}: {
  label: string
  detail?: string
  value: string
}) {
  return (
    <View className="min-h-[54px] flex-row items-center justify-between gap-3 px-[14px] py-3">
      <View className="flex-1 gap-1">
        <Text className="font-bold" variant="body">
          {label}
        </Text>
        {detail ? (
          <Text className="text-muted-foreground" variant="small">
            {detail}
          </Text>
        ) : null}
      </View>
      <Text className="shrink text-right" tabular variant="money">
        {value}
      </Text>
    </View>
  )
}

function QuoteReview({
  quote,
  previous,
  purpose,
  extra,
  money,
}: {
  quote: MobileFinancingQuote
  previous: MobileFinancingQuote | null
  purpose: string
  extra: number
  money: (value: number) => string
}) {
  return (
    <>
      {previous ? (
        <FinanceNotice
          title="Charges updated"
          detail="Review the current charges before you send."
          warning
        />
      ) : null}
      <ListCard>
        <View className="items-center gap-2 px-4 py-5">
          <Text className="text-muted-foreground" variant="label">
            {quote.product.name}
          </Text>
          <Text tabular variant="hero">
            {money(quote.requestedAmount)}
          </Text>
          <Text className="text-muted-foreground" variant="small">
            over {quote.requestedTermMonths} months
          </Text>
        </View>
      </ListCard>
      <ReviewSummary title="Repayment">
        <FinanceAmountRow
          label="Est. monthly principal"
          detail={`${quote.requestedTermMonths} month schedule`}
          value={money(quote.estimatedMonthlyServicing)}
        />
        {extra > 0 ? (
          <FinanceAmountRow
            label="Extra monthly savings"
            detail="Added to your commitment"
            value={money(extra)}
          />
        ) : null}
      </ReviewSummary>
      <View className="gap-2">
        <FinanceHeading
          title="Charges"
          trailing={
            <Text className="text-muted-foreground" tabular variant="label">
              {money(quote.feeTotal)}
            </Text>
          }
        />
        <ListCard inset={false}>
          {quote.charges.length ? (
            quote.charges.map((charge) => {
              const old = previous?.charges.find(
                (item) => item.code === charge.code
              )
              return (
                <FinanceChargeRow
                  charge={charge}
                  key={charge.id}
                  updated={Boolean(
                    previous &&
                    (old?.amount !== charge.amount ||
                      old?.collectionMode !== charge.collectionMode)
                  )}
                  value={money(charge.amount)}
                />
              )
            })
          ) : (
            <ReviewRow label="Application charges" tabular value={money(0)} />
          )}
        </ListCard>
      </View>
      {purpose ? (
        <View className="gap-2">
          <FinanceHeading title="Purpose" />
          <ListCard>
            <Text className="p-[14px]" variant="body">
              {purpose}
            </Text>
          </ListCard>
        </View>
      ) : null}
      <Text className="text-muted-foreground" variant="small">
        {estimateNote}
      </Text>
    </>
  )
}
