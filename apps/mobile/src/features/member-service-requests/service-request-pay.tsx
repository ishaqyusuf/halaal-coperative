import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { useRouter } from "expo-router"
import { View } from "react-native"
import type {
  PayLink,
  RequestGate,
  RequestGateStep,
} from "./service-request-gate"
import { formatServiceDate, formatServiceMoney } from "./service-request-model"

const tints = {
  neutral: ["bg-surface-raised", "text-foreground-soft"],
  sky: ["bg-tint-sky", "text-tint-sky-foreground"],
  warm: ["bg-tint-warm", "text-tint-warm-foreground"],
  brand: ["bg-accent", "text-accent-foreground"],
  danger: ["bg-tint-danger", "text-tint-danger-foreground"],
} as const

/** Opens Record payment with the request's payable preselected (T30 kit link). */
export function usePayLink() {
  const router = useRouter()
  return (link: PayLink) => router.push(link)
}

export function PayButton({
  label = "Pay",
  link,
  testID,
}: {
  label?: string
  link: PayLink
  testID?: string
}) {
  const pay = usePayLink()
  return (
    <Button
      accessibilityHint="Opens Record payment for this amount"
      onPress={() => pay(link)}
      size="sm"
      testID={testID}
    >
      <Icon className="size-[18px] text-primary-foreground" name="Wallet" />
      <Text>{label}</Text>
    </Button>
  )
}

function GateStep({ index, step }: { index: number; step: RequestGateStep }) {
  return (
    <View
      className={cn(
        "flex-row items-start gap-[12px] p-[14px]",
        index > 0 && "border-t border-border"
      )}
    >
      <View
        accessibilityLabel={step.done ? "Done" : "Still needed"}
        className={cn(
          "size-[26px] items-center justify-center rounded-full border-2",
          step.done ? "border-primary bg-primary" : "border-brand-warm"
        )}
      >
        {step.done ? (
          <Icon className="size-[14px] text-primary-foreground" name="Check" />
        ) : null}
      </View>
      <View className="min-w-0 flex-1 gap-[2px]">
        <Text className="font-bold" variant="small">
          {step.title}
        </Text>
        <Text className="text-muted-foreground" variant="caption">
          {step.detail}
        </Text>
      </View>
      {step.pay ? (
        <PayButton link={step.pay} testID={`gate-pay-${step.key}`} />
      ) : null}
    </View>
  )
}

/**
 * Direction 01: one centred card with an icon, a plain explanation and one
 * action. "Not eligible yet" adds the checklist with an inline Pay.
 */
export function RequestGateCard({
  gate,
  onAction,
}: {
  gate: RequestGate
  onAction: () => void
}) {
  const [background, ink] = tints[gate.tint]
  return (
    <View testID={`request-gate-${gate.state}`}>
      <Elevated
        className="rounded-[20px] border border-transparent bg-card dark:border-border"
        radius={20}
      >
        <View
          accessibilityLiveRegion="polite"
          className="items-center gap-[8px] px-[22px] pt-[30px] pb-[20px]"
        >
          <View
            className={cn(
              "mb-[6px] size-[76px] items-center justify-center rounded-[26px]",
              background
            )}
          >
            <Icon className={cn("size-[34px]", ink)} name={gate.icon} />
          </View>
          <Text
            accessibilityRole="header"
            className="text-center"
            variant="title"
          >
            {gate.title}
          </Text>
          <Text
            className="max-w-[290px] text-center text-muted-foreground"
            variant="small"
          >
            {gate.description}
          </Text>
          {gate.steps?.length ? (
            <View className="mt-[8px] self-stretch overflow-hidden rounded-[18px] border border-border">
              {gate.steps.map((step, index) => (
                <GateStep index={index} key={step.key} step={step} />
              ))}
            </View>
          ) : null}
          <Button className="mt-[10px] self-stretch" onPress={onAction}>
            <Text>{gate.action.label}</Text>
          </Button>
        </View>
      </Elevated>
    </View>
  )
}

/**
 * Direction 02 "Next payment" card for procurement and foodstuff requests:
 * amount, due date and Pay; overdue turns the caption and border red.
 */
export function NextPaymentCard({
  amount,
  checkingAmount,
  currency,
  dueDate,
  fullyPaid,
  link,
  overdue,
}: {
  amount: number
  checkingAmount?: number
  currency: string
  dueDate?: string
  fullyPaid: boolean
  link: PayLink | null
  overdue: boolean
}) {
  if (fullyPaid || checkingAmount) {
    const paid = fullyPaid
    return (
      <View
        accessibilityLiveRegion="polite"
        className={cn(
          "flex-row items-start gap-[12px] rounded-[20px] px-[14px] py-[14px]",
          paid ? "bg-tint-success" : "bg-tint-warm"
        )}
        testID={paid ? "next-payment-paid" : "next-payment-checking"}
      >
        <View className="size-[40px] items-center justify-center rounded-[12px] bg-card/65">
          <Icon
            className={cn(
              "size-[20px]",
              paid
                ? "text-tint-success-foreground"
                : "text-tint-warm-foreground"
            )}
            name={paid ? "BadgeCheck" : "Clock"}
          />
        </View>
        <View className="min-w-0 flex-1 gap-[2px]">
          <Text variant="section">
            {paid
              ? "Fully paid"
              : `${formatServiceMoney(checkingAmount ?? 0, currency)} is being checked`}
          </Text>
          <Text className="text-foreground-soft" variant="small">
            {paid
              ? "Nothing left to pay."
              : "It applies once finance confirms your payment."}
          </Text>
        </View>
      </View>
    )
  }
  const caption = dueDate
    ? `${overdue ? "Overdue · was due" : "Next payment · due"} ${formatServiceDate(dueDate)}`
    : "Left to pay"
  return (
    <View testID="next-payment-card">
      <Elevated
        className={cn(
          "rounded-[20px] border bg-card p-[16px]",
          overdue
            ? "border-destructive"
            : "border-transparent dark:border-border"
        )}
        radius={20}
      >
        <Text
          className={cn(
            "uppercase",
            overdue ? "text-tint-danger-foreground" : "text-muted-foreground"
          )}
          variant="caption"
        >
          {caption}
        </Text>
        <View className="mt-[6px] flex-row items-center justify-between gap-[12px]">
          <Text className="text-[26px] leading-[32px]" tabular variant="money">
            {formatServiceMoney(amount, currency)}
          </Text>
          {link ? <PayButton link={link} testID="next-payment-pay" /> : null}
        </View>
      </Elevated>
    </View>
  )
}
