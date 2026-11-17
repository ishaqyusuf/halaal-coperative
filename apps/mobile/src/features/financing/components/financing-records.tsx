import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ReviewRow, ReviewSummary } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import {
  ListCard,
  RecordRow,
  TintedAvatar,
  type RowPosition,
} from "@/components/ui/list-card"
import { StatusPill, statusToneFor } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"
import { View } from "react-native"
import type {
  MobileFinancingProduct,
  MobileFinancingRequest,
} from "../model/member-financing-types"

export function formatFinanceMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    currency,
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

export function formatFinanceDate(value: string, includeYear = true) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: includeYear ? "numeric" : undefined,
    timeZone: "Africa/Lagos",
  }).format(new Date(value))
}

export function financeStatus(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase())
}

export function isOpenRequest(request: MobileFinancingRequest) {
  return ["draft", "submitted", "under_review", "pending_review"].includes(
    request.status
  )
}

export function chargeCollectionLabel(mode: string) {
  return mode === "pay_separately" || mode === "upfront"
    ? "Paid separately"
    : "Deducted from savings"
}

export function FinanceHeading({
  title,
  trailing,
}: {
  title: string
  trailing?: ReactNode
}) {
  return (
    <View className="min-h-[28px] flex-row items-center justify-between gap-3">
      <Text accessibilityRole="header" variant="section">
        {title}
      </Text>
      {trailing}
    </View>
  )
}

export function FinanceNotice({
  title,
  detail,
  onRetry,
  warning = false,
  icon = "Info",
}: {
  title: string
  icon?: string
  detail?: string
  onRetry?: () => void
  warning?: boolean
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      className={cn(
        "flex-row items-center gap-3 rounded-[16px] p-3",
        warning ? "bg-tint-warm" : "bg-tint-danger"
      )}
    >
      <Icon
        className={cn(
          "size-base",
          warning ? "text-tint-warm-foreground" : "text-tint-danger-foreground"
        )}
        name={icon}
      />
      <View className="flex-1 gap-1">
        <Text variant="label">{title}</Text>
        {detail ? <Text variant="small">{detail}</Text> : null}
      </View>
      {onRetry ? (
        <Button onPress={onRetry} variant="ghost">
          <Text>Retry</Text>
        </Button>
      ) : null}
    </View>
  )
}

export function FinancingRestricted({ onHelp }: { onHelp: () => void }) {
  return (
    <ListCard inset={false}>
      <EmptyState
        action={{ label: "Get help", onPress: onHelp }}
        className="rounded-[20px] bg-card"
        description="Financing opens once your cooperative links your member profile to this account."
        icon="Link2Off"
        title="Your member profile isn’t linked"
        tone="warning"
      />
    </ListCard>
  )
}

export function FinanceProductIcon({
  product,
}: {
  product: MobileFinancingProduct
}) {
  const quick = product.loanType === "quick"
  const alternate =
    !quick && product.loanType !== "normal" && product.loanType !== "murabaha"
  return (
    <View
      accessible={false}
      className={cn(
        "size-[40px] items-center justify-center rounded-[14px]",
        quick ? "bg-tint-warm" : alternate ? "bg-tint-lilac" : "bg-tint-sky"
      )}
    >
      <Icon
        className={cn(
          "size-base",
          quick
            ? "text-tint-warm-foreground"
            : alternate
              ? "text-tint-lilac-foreground"
              : "text-tint-sky-foreground"
        )}
        name={quick ? "Zap" : alternate ? "BriefcaseBusiness" : "Wrench"}
      />
    </View>
  )
}

export function FinanceRequestRow({
  request,
  currency,
  onOpen,
  position,
}: {
  request: MobileFinancingRequest
  currency: string
  onOpen: (request: MobileFinancingRequest) => void
  position?: RowPosition
}) {
  const status = financeStatus(request.status)
  const guarantors = request.guarantorApprovals
  const confirmed = guarantors.filter(
    (item) => item.status === "approved"
  ).length
  const open = isOpenRequest(request)
  const amount = formatFinanceMoney(request.requestedAmount, currency)
  return (
    <RecordRow
      accessibilityLabel={`${request.loanProductName}, ${amount}, ${status}${open && guarantors.length ? `, guarantors ${confirmed} of ${guarantors.length}` : ""}`}
      avatarIcon={
        request.status === "approved"
          ? "Check"
          : open
            ? "CalendarClock"
            : "ReceiptText"
      }
      meta={`${amount} · ${request.requestedTermMonths} months`}
      supporting={
        open && guarantors.length ? (
          <View className="flex-row flex-wrap items-center gap-1">
            {guarantors.map((guarantor) => (
              <View
                key={guarantor.id}
                className={cn(
                  "h-1 w-2 rounded-full",
                  guarantor.status === "approved"
                    ? "bg-primary"
                    : guarantor.status === "rejected"
                      ? "bg-destructive"
                      : "bg-border"
                )}
              />
            ))}
            <Text className="text-muted-foreground" variant="caption">
              Guarantors {confirmed} of {guarantors.length}
            </Text>
          </View>
        ) : undefined
      }
      onPress={() => onOpen(request)}
      position={position}
      title={request.loanProductName}
      trailing={
        <View className="items-end gap-1">
          <StatusPill
            label={status}
            tone={open ? "warning" : statusToneFor(status)}
          />
          <Text className="text-muted-foreground" variant="caption">
            {formatFinanceDate(request.requestedAt)}
          </Text>
        </View>
      }
    />
  )
}

export function FinancingTimeline({
  request,
  result = false,
}: {
  request: MobileFinancingRequest
  result?: boolean
}) {
  const guarantors = request.guarantorApprovals
  const waiting = guarantors.filter((item) => item.status === "pending")
  const approvedCount = guarantors.filter(
    (item) => item.status === "approved"
  ).length
  const declined = guarantors.some((item) => item.status === "rejected")
  const open = isOpenRequest(request)
  const approved = request.status === "approved"
  const steps = [
    {
      title: result ? "Request sent" : "Requested",
      detail: formatFinanceDate(request.requestedAt),
      icon: "Check",
      tone: "success",
    },
    {
      title: guarantors.length
        ? `Guarantors ${approvedCount} of ${guarantors.length}`
        : "Guarantors",
      detail:
        waiting.length && open
          ? `Waiting for ${waiting.map((item) => item.guarantorName).join(", ")}`
          : declined
            ? "A guarantor declined"
            : guarantors.length
              ? approvedCount === guarantors.length
                ? "All confirmed"
                : "Confirmation incomplete"
              : "None assigned",
      icon: "Users",
      tone: declined
        ? "danger"
        : waiting.length && open
          ? "warning"
          : guarantors.length && approvedCount === guarantors.length
            ? "success"
            : "neutral",
    },
    {
      title: "Cooperative review",
      detail:
        approved || request.status === "rejected"
          ? "Decision recorded"
          : open && !waiting.length && !declined
            ? "Your cooperative will review the request"
            : open
              ? "Starts once guarantors confirm"
              : "Request closed",
      icon: "CalendarClock",
      tone: approved ? "success" : "neutral",
    },
    {
      title: approved
        ? "Approved"
        : open
          ? "Decision and payout"
          : financeStatus(request.status),
      detail: approved
        ? "Payout follows cooperative processing"
        : open
          ? "Payout follows approval"
          : undefined,
      icon: approved ? "Check" : open ? "WalletCards" : "X",
      tone: approved ? "success" : !open ? "danger" : "neutral",
    },
  ]
  return (
    <View className="px-[14px] py-[10px]">
      {steps.map((step, index) => (
        <View className="min-h-[60px] flex-row gap-3" key={step.title}>
          <View className="items-center">
            <View
              className={cn(
                "size-[32px] items-center justify-center rounded-full",
                step.tone === "success"
                  ? "bg-success"
                  : step.tone === "warning"
                    ? "bg-tint-warm"
                    : step.tone === "danger"
                      ? "bg-tint-danger"
                      : "bg-surface-raised"
              )}
            >
              <Icon
                className={cn(
                  "size-sm",
                  step.tone === "success"
                    ? "text-hero-foreground"
                    : step.tone === "warning"
                      ? "text-tint-warm-foreground"
                      : step.tone === "danger"
                        ? "text-tint-danger-foreground"
                        : "text-muted-foreground"
                )}
                name={step.icon}
              />
            </View>
            {index < steps.length - 1 ? (
              <View className="my-1 w-px flex-1 bg-border" />
            ) : null}
          </View>
          <View className="flex-1 gap-1 pb-3">
            <Text variant="label">{step.title}</Text>
            {step.detail ? (
              <Text className="text-muted-foreground" variant="small">
                {step.detail}
              </Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  )
}

export function FinanceRequestDetail({
  request,
  currency,
  onClose,
}: {
  request: MobileFinancingRequest | null
  currency: string
  onClose: () => void
}) {
  const money = (amount: number) => formatFinanceMoney(amount, currency)
  return (
    <AppSheet
      onClose={onClose}
      title={request?.loanProductName}
      visible={Boolean(request)}
    >
      {request ? (
        <View className="gap-4">
          <View className="items-start gap-2">
            <StatusPill
              label={financeStatus(request.status)}
              tone={
                isOpenRequest(request)
                  ? "warning"
                  : statusToneFor(request.status)
              }
            />
            <Text tabular variant="screenTitle">
              {money(request.requestedAmount)}
            </Text>
            <Text className="text-muted-foreground" variant="small">
              {request.loanProductName} · {request.requestedTermMonths} months ·{" "}
              {money(request.estimatedMonthlyServicing)} a month
            </Text>
          </View>
          {request.reviewNotes ? (
            <FinanceNotice
              title="Review note"
              detail={request.reviewNotes}
              warning
            />
          ) : null}
          <ListCard inset={false}>
            <FinancingTimeline request={request} />
          </ListCard>
          {request.guarantorApprovals.length ? (
            <View className="gap-2">
              <FinanceHeading title="Guarantors" />
              <ListCard>
                {request.guarantorApprovals.map((item) => (
                  <RecordRow
                    key={item.id}
                    title={item.guarantorName}
                    leading={
                      <TintedAvatar
                        name={item.guarantorName}
                        icon={item.status === "approved" ? "Check" : "Users"}
                      />
                    }
                    meta={
                      item.respondedAt
                        ? `${item.guarantorMemberNumber} · ${formatFinanceDate(item.respondedAt)}`
                        : item.guarantorMemberNumber
                    }
                    status={
                      item.status === "approved"
                        ? "Confirmed"
                        : item.status === "rejected"
                          ? "Declined"
                          : "Waiting"
                    }
                    statusTone={statusToneFor(item.status)}
                  />
                ))}
              </ListCard>
            </View>
          ) : null}
          <ReviewSummary title="Amounts">
            <ReviewRow
              label="Requested amount"
              tabular
              value={money(request.requestedAmount)}
            />
            <ReviewRow
              label="Est. monthly principal"
              tabular
              value={money(request.estimatedMonthlyServicing)}
            />
            {request.extraMonthlySavingsAmount ? (
              <ReviewRow
                label="Extra monthly savings"
                tabular
                value={money(request.extraMonthlySavingsAmount)}
              />
            ) : null}
            <ReviewRow
              label="Eligibility at request"
              tabular
              value={money(request.eligibleAmountSnapshot)}
            />
          </ReviewSummary>
          {request.charges.length ? (
            <ReviewSummary title="Charges">
              {request.charges.map((charge) => (
                <FinanceChargeRow
                  charge={charge}
                  key={charge.id}
                  value={money(charge.amount)}
                  detail={`${chargeCollectionLabel(charge.collectionMode)} · ${financeStatus(charge.status)}`}
                />
              ))}
            </ReviewSummary>
          ) : null}
          {request.purpose ? (
            <View className="gap-2">
              <FinanceHeading title="Purpose" />
              <ListCard>
                <Text className="p-[14px]" variant="body">
                  {request.purpose}
                </Text>
              </ListCard>
            </View>
          ) : null}
        </View>
      ) : null}
    </AppSheet>
  )
}

export function FinanceChargeRow({
  charge,
  value,
  detail,
  updated = false,
}: {
  charge: { name: string; collectionMode: string }
  value: string
  detail?: string
  updated?: boolean
}) {
  return (
    <View
      className={cn(
        "min-h-[64px] flex-row items-center justify-between gap-3 px-[14px] py-3",
        updated && "bg-tint-warm"
      )}
    >
      <View className="flex-1 gap-1">
        <Text variant="body">{charge.name}</Text>
        <Text className="text-muted-foreground" variant="small">
          {detail ?? chargeCollectionLabel(charge.collectionMode)}
        </Text>
      </View>
      <Text className="shrink text-right" tabular variant="money">
        {value}
      </Text>
    </View>
  )
}
