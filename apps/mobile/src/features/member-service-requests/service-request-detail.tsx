import { EmptyState } from "@/components/app/empty-state"
import {
  ScreenHeaderButton,
  ScreenHero,
  ScreenShell,
} from "@/components/app/screen-shell"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { ActivityIndicator, ScrollView, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import {
  formatServiceDate,
  formatServiceMoney,
  type ServiceDesign,
  type ServiceRequest,
} from "./service-request-model"
import type { PayLink } from "./service-request-gate"
import { NextPaymentCard, PayButton } from "./service-request-pay"
import {
  isPaymentOverdue,
  nextRequestPayment,
  repaymentProgress,
  requestBadge,
  RequestSteps,
  RequestValues,
} from "./service-request-presentation"
import { RequestNotice } from "./service-request-overview"

function progressMessage(design: ServiceDesign, row: ServiceRequest) {
  switch (row.status) {
    case "pending":
      return `The office is reviewing this ${design.noun}. You’ll get a notification when it’s decided.`
    case "approved":
      return design.noun === "application"
        ? "Approved. The office will confirm the release for this cycle."
        : design.title === "Procurement"
          ? "Approved. The office will buy the item and set your repayment schedule."
          : "Approved. The finance team will contact you about the next step."
    case "completed":
      return "This request is complete."
    case "cancelled":
      return `This ${design.noun} was withdrawn.`
    default:
      return null
  }
}

export function ServiceRequestDetail({
  currency,
  design,
  loading,
  onBack,
  onRetry,
  onStart,
  payable = false,
  payLink = null,
  row,
  unavailable,
}: {
  currency: string
  design: ServiceDesign
  loading: boolean
  onBack: () => void
  onRetry?: () => void
  onStart?: () => void
  /** Procurement and foodstuff use the 02 Next payment card; project financing keeps its layout. */
  payable?: boolean
  payLink?: PayLink | null
  row: ServiceRequest | null
  unavailable?: boolean
}) {
  const colors = useColors()
  if (!row) {
    return (
      <ScreenShell back={onBack} title={design.title}>
        {loading ? (
          <ActivityIndicator accessibilityLabel="Loading request" />
        ) : (
          <EmptyState
            action={
              onRetry ? { label: "Try again", onPress: onRetry } : undefined
            }
            description={
              unavailable
                ? "This request is unavailable in the current member account."
                : "Check your connection and try again."
            }
            title={
              unavailable ? "Request unavailable" : "Couldn’t load this request"
            }
            tone="error"
          />
        )}
      </ScreenShell>
    )
  }
  const badge = requestBadge(row.status, design)
  const next = nextRequestPayment(row)
  const active = row.status === "active"
  const showBalance = active && row.outstanding !== null
  const completedPayments =
    row.payments?.filter((payment) => payment.status === "paid").length ?? 0
  const term = row.months
    ? `${row.months} months${row.monthly ? ` · ${formatServiceMoney(row.monthly, currency)}/mo` : ""}`
    : "Set during review"
  const late = isPaymentOverdue(next)
  const fullyPaid =
    payable && (row.status === "completed" || (active && row.outstanding === 0))
  const message = progressMessage(design, row)
  const steps =
    row.status === "completed"
      ? 5
      : row.status === "approved"
        ? 2
        : row.status === "active"
          ? 3
          : 1
  const details: [string, string | null][] = [
    ...row.details.slice(0, 1),
    [design.amountLabel, formatServiceMoney(row.amount, currency)],
    [design.termLabel, term],
    ...row.details.slice(1),
    ["Submitted", formatServiceDate(row.date)],
  ]

  return (
    <ScreenShell
      back={onBack}
      compactTitle
      contentClassName="gap-[20px] pt-0"
      hero={
        <ScreenHero className="gap-[16px] pb-[30px]">
          <View
            pointerEvents="none"
            className="bg-hero-foreground/[0.07] absolute -top-[150px] -right-[90px] size-[240px] rounded-full"
          />
          <View className="min-h-[44px] flex-row items-center justify-between">
            <ScreenHeaderButton
              accessibilityLabel="Go back"
              icon="ChevronLeft"
              onPress={onBack}
              tone="inverse"
            />
            <View className="bg-hero-foreground/15 min-h-[24px] justify-center rounded-full px-[9px]">
              <Text className="text-hero-foreground" variant="caption">
                {active && !showBalance ? "Active" : badge.label}
              </Text>
            </View>
          </View>
          <View className="gap-[6px]">
            <Text className="text-hero-foreground mb-[4px]" variant="title">
              {row.title}
            </Text>
            <Text className="text-hero-foreground/80" variant="label">
              {showBalance
                ? "Outstanding"
                : design.title === "Procurement"
                  ? "Item cost"
                  : "Amount"}
            </Text>
            <Text className="text-hero-foreground" variant="hero">
              {formatServiceMoney(
                showBalance ? (row.outstanding ?? 0) : row.amount,
                currency
              )}
            </Text>
            {showBalance ? (
              <>
                <View className="bg-hero-foreground/20 h-[8px] overflow-hidden rounded-full">
                  <View
                    style={{
                      backgroundColor: colors.heroAccent,
                      borderRadius: 4,
                      experimental_backgroundImage: `linear-gradient(90deg, ${colors.heroAccent}, ${colors.brandWarm})`,
                      height: 8,
                      width: `${repaymentProgress(row)}%`,
                    }}
                  />
                </View>
                <View className="flex-row flex-wrap items-center justify-between gap-[6px]">
                  <Text className="text-hero-foreground/80" variant="caption">
                    {formatServiceMoney(row.paid, currency)} paid of{" "}
                    {formatServiceMoney(
                      row.repaymentTotal ?? row.amount,
                      currency
                    )}
                  </Text>
                  {row.payments?.length ? (
                    <Text className="text-hero-foreground/80" variant="caption">
                      {row.payments.length - completedPayments} of{" "}
                      {row.payments.length} left
                    </Text>
                  ) : null}
                </View>
              </>
            ) : (
              <Text className="text-hero-foreground/80" variant="caption">
                {term}
              </Text>
            )}
          </View>
        </ScreenHero>
      }
      testID="service-detail"
      title={row.title}
    >
      {payable && (fullyPaid || (active && row.outstanding !== null)) ? (
        <View className="-mt-[30px]">
          <NextPaymentCard
            amount={next ? next.amount - next.paid : (row.outstanding ?? 0)}
            checkingAmount={row.checkingAmount}
            currency={currency}
            dueDate={next?.date}
            fullyPaid={fullyPaid}
            link={payLink}
            overdue={late}
          />
        </View>
      ) : active && (next || row.monthly) ? (
        <View className="-mt-[30px]">
          <Elevated
            className="min-h-[72px] flex-row items-center gap-[12px] rounded-[20px] border border-transparent bg-card p-[14px] dark:border-border"
            radius={20}
          >
            <View className="size-[44px] items-center justify-center rounded-[14px] bg-accent">
              <Icon
                className="size-[22px] text-accent-foreground"
                name="CalendarDays"
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-muted-foreground" variant="caption">
                {next
                  ? `Next payment · ${formatServiceDate(next.date)}`
                  : "Monthly payback"}
              </Text>
              <Text variant="money">
                {formatServiceMoney(
                  next ? next.amount - next.paid : (row.monthly ?? 0),
                  currency
                )}
              </Text>
            </View>
            {next ? (
              <StatusPill
                label={late ? "Overdue" : "On track"}
                tone={late ? "danger" : "success"}
              />
            ) : null}
          </Elevated>
        </View>
      ) : row.status === "rejected" ? (
        <View className="-mt-[30px]">
          <RequestNotice
            notice={{
              action: onStart
                ? { label: `Start a new ${design.noun}`, onPress: onStart }
                : undefined,
              description:
                row.reviewNotes ?? `This ${design.noun} wasn’t approved.`,
              icon: "MessageCircle",
              title: "Note from the office",
              tone: "danger",
            }}
          />
        </View>
      ) : message ? (
        <View className="-mt-[30px]">
          <Elevated
            className="min-h-[72px] flex-row items-center gap-[12px] rounded-[20px] border border-transparent bg-card p-[14px] dark:border-border"
            radius={20}
          >
            <View className="size-[44px] items-center justify-center rounded-[14px] bg-accent">
              <Icon
                className="size-[22px] text-accent-foreground"
                name={
                  row.status === "completed"
                    ? "Check"
                    : row.status === "approved"
                      ? "ShieldCheck"
                      : "Clock"
                }
              />
            </View>
            <Text
              className="text-foreground-soft min-w-0 flex-1"
              variant="small"
            >
              {message}
            </Text>
          </Elevated>
        </View>
      ) : null}
      {row.payments?.length ? (
        <View className="gap-[9px]">
          <View className="flex-row items-baseline justify-between gap-[12px]">
            <Text variant="section">Payments</Text>
            <Text className="text-muted-foreground" variant="label">
              {completedPayments} of {row.payments.length} paid
            </Text>
          </View>
          <Elevated
            className="overflow-hidden rounded-[20px] border border-transparent bg-card dark:border-border"
            radius={20}
          >
            {row.payments.map((payment, index) => {
              const paid = payment.status === "paid"
              const isNext = payment.id === next?.id
              return (
                <View
                  className={cn(
                    "min-h-[56px] flex-row items-center gap-[12px] px-[16px] py-[10px]",
                    index > 0 && "border-t border-border",
                    isNext && "bg-accent/55"
                  )}
                  key={payment.id}
                >
                  <View
                    className={cn(
                      "size-[30px] items-center justify-center rounded-[10px]",
                      isNext ? "bg-primary" : "bg-surface-raised"
                    )}
                  >
                    <Text
                      className={
                        isNext
                          ? "text-primary-foreground"
                          : "text-foreground-soft"
                      }
                      variant="caption"
                    >
                      {payment.number}
                    </Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold" variant="small">
                      {formatServiceDate(payment.date)}
                    </Text>
                    <Text
                      className={
                        isNext && row.checkingAmount
                          ? "text-tint-warm-foreground"
                          : isNext && late
                            ? "text-tint-danger-foreground"
                            : "text-muted-foreground"
                      }
                      variant="caption"
                    >
                      {paid
                        ? "Paid"
                        : payment.status === "cancelled"
                          ? "Cancelled"
                          : isNext && row.checkingAmount
                            ? "Being checked"
                            : isNext && late
                              ? "Overdue"
                              : isNext
                                ? "Next payment"
                                : payment.paid > 0
                                  ? "Partly paid"
                                  : "Scheduled"}
                    </Text>
                  </View>
                  {isNext && payLink && !row.checkingAmount ? (
                    <PayButton link={payLink} testID="schedule-pay" />
                  ) : (
                    <Text
                      className={paid ? "text-muted-foreground" : ""}
                      variant="money"
                    >
                      {formatServiceMoney(
                        paid ? payment.paid : payment.amount - payment.paid,
                        currency
                      )}
                    </Text>
                  )}
                  {paid ? (
                    <Icon
                      className="text-success size-[18px]"
                      name="CircleCheck"
                    />
                  ) : null}
                </View>
              )
            })}
          </Elevated>
        </View>
      ) : null}
      <View className="gap-[9px]">
        <Text variant="section">Details</Text>
        <Elevated
          className="rounded-[20px] border border-transparent bg-card px-[16px] py-[4px] dark:border-border"
          radius={20}
        >
          <RequestValues rows={details} />
        </Elevated>
      </View>
      {row.status !== "rejected" &&
      row.status !== "cancelled" &&
      (!active || !row.payments?.length) ? (
        <View className="gap-[9px]">
          <Text variant="section">Progress</Text>
          <Elevated
            className="rounded-[20px] border border-transparent bg-card px-[16px] py-[10px] dark:border-border"
            radius={20}
          >
            <RequestSteps
              current={steps}
              steps={
                row.outstanding === null && active
                  ? design.steps.filter((_, index) => index !== 3)
                  : design.steps
              }
              vertical
            />
          </Elevated>
        </View>
      ) : null}
    </ScreenShell>
  )
}

export function ServiceRequestSuccess({
  currency,
  design,
  onDone,
  onOpen,
  row,
}: {
  currency: string
  design: ServiceDesign
  onDone: () => void
  onOpen: () => void
  row: ServiceRequest
}) {
  const colors = useColors()
  const insets = useSafeAreaInsets()
  return (
    <View
      testID="service-success"
      style={{
        flex: 1,
        backgroundColor: colors.heroMid,
        experimental_backgroundImage: `linear-gradient(160deg, ${colors.heroStart} 0%, ${colors.heroMid} 55%, ${colors.heroEnd} 100%)`,
        paddingBottom: insets.bottom + 12,
        paddingTop: insets.top,
      }}
    >
      <ScreenStatusBar tone="hero" />
      <View className="bg-hero-foreground/5 absolute top-[60px] left-1/2 -ml-[180px] size-[360px] rounded-full" />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          paddingHorizontal: 26,
          paddingVertical: 28,
          paddingBottom: 68,
        }}
      >
        <View className="items-center gap-[12px]">
          <View className="bg-hero-foreground/5 mb-[8px] size-[112px] items-center justify-center rounded-full">
            <View className="bg-hero-foreground/15 size-[88px] items-center justify-center rounded-full">
              <Icon className="text-hero-foreground size-[42px]" name="Check" />
            </View>
          </View>
          <Text
            accessibilityRole="header"
            className="text-hero-foreground text-center"
            variant="screenTitle"
          >
            {design.noun === "application"
              ? "Application sent"
              : "Request sent"}
          </Text>
          <Text
            className="text-hero-foreground/80 mb-[14px] text-center"
            variant="body"
          >
            Your {design.noun} for {formatServiceMoney(row.amount, currency)} is
            with the office for review. You’ll get a notification when it’s
            decided.
          </Text>
          <View className="self-stretch">
            <RequestSteps current={1} inverse steps={design.steps} />
          </View>
        </View>
      </ScrollView>
      <View className="gap-[6px] px-[18px]">
        <Button
          className="bg-hero-foreground active:bg-hero-foreground/90"
          onPress={onOpen}
          variant="ghost"
        >
          <Text className="text-hero-end">View {design.noun}</Text>
        </Button>
        <Button
          className="bg-hero-foreground/15 active:bg-hero-foreground/25"
          onPress={onDone}
          variant="ghost"
        >
          <Text className="text-hero-foreground">Done</Text>
        </Button>
      </View>
    </View>
  )
}
