import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import type {
  RequestStatus,
  ServiceDesign,
  ServiceRequest,
} from "./service-request-model"

export function ServiceTile({
  design,
  size = 44,
}: {
  design: ServiceDesign
  size?: 44 | 60
}) {
  return (
    <View
      className={cn(
        "shrink-0 items-center justify-center",
        size === 44
          ? "size-[44px] rounded-[14px]"
          : "size-[60px] rounded-[18px]",
        design.tile
      )}
    >
      <Icon
        className={cn(
          size === 44 ? "size-[22px]" : "size-[28px]",
          design.iconColor
        )}
        name={design.icon}
      />
    </View>
  )
}

export function requestBadge(status: RequestStatus, design: ServiceDesign) {
  switch (status) {
    case "active":
      return {
        label: design.activeLabel,
        ink: "text-tint-sky-foreground",
        dot: "bg-tint-sky-foreground",
      }
    case "approved":
      return { label: "Approved", ink: "text-primary", dot: "bg-primary" }
    case "completed":
      return {
        label: design.completedLabel,
        ink: "text-tint-success-foreground",
        dot: "bg-success",
      }
    case "rejected":
      return {
        label: "Not approved",
        ink: "text-tint-danger-foreground",
        dot: "bg-destructive",
      }
    case "cancelled":
      return {
        label: "Withdrawn",
        ink: "text-muted-foreground",
        dot: "bg-muted-foreground",
      }
    case "pending":
      return {
        label: "Pending review",
        ink: "text-tint-warm-foreground",
        dot: "bg-brand-warm",
      }
  }
}

export function nextRequestPayment(row: ServiceRequest) {
  return row.payments?.find(
    (payment) =>
      payment.status !== "paid" &&
      payment.status !== "cancelled" &&
      payment.amount > payment.paid
  )
}

export function repaymentProgress(row: ServiceRequest) {
  const total = row.repaymentTotal ?? row.amount
  return total > 0
    ? Math.min(100, Math.max(0, Math.round((100 * row.paid) / total)))
    : 0
}

export function RequestSteps({
  current,
  inverse = false,
  steps,
  vertical = false,
}: {
  current: number
  inverse?: boolean
  steps: readonly string[]
  vertical?: boolean
}) {
  return (
    <View className={vertical ? "gap-[1px]" : "flex-row"}>
      {steps.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <View
            className={
              vertical
                ? "min-h-[40px] flex-row items-center gap-[12px]"
                : "relative flex-1 items-center gap-[6px]"
            }
            key={step}
          >
            {!vertical && index > 0 ? (
              <View
                className={cn(
                  "absolute top-[10px] right-1/2 -left-1/2 h-[2px]",
                  done || active
                    ? inverse
                      ? "bg-hero-accent"
                      : "bg-primary"
                    : inverse
                      ? "bg-hero-foreground/20"
                      : "bg-border"
                )}
              />
            ) : null}
            <View
              className={cn(
                "size-[22px] items-center justify-center rounded-full border-2",
                inverse
                  ? "border-hero-foreground/30 bg-hero-mid"
                  : "border-border bg-card",
                active && (inverse ? "border-hero-accent" : "border-primary"),
                done &&
                  (inverse
                    ? "border-hero-accent bg-hero-accent"
                    : "border-primary bg-primary")
              )}
            >
              {done ? (
                <Icon
                  className={cn(
                    "size-[13px]",
                    inverse ? "text-hero-end" : "text-primary-foreground"
                  )}
                  name="Check"
                />
              ) : null}
            </View>
            <Text
              accessibilityLabel={
                done
                  ? `${step}, complete`
                  : active
                    ? `${step}, current step`
                    : step
              }
              className={cn(
                !vertical && "text-center",
                inverse
                  ? "text-hero-foreground"
                  : active
                    ? "text-foreground"
                    : "text-muted-foreground"
              )}
              variant={vertical ? "small" : "caption"}
            >
              {step}
            </Text>
          </View>
        )
      })}
    </View>
  )
}

export function RequestValues({
  rows,
}: {
  rows: readonly [string, string | null][]
}) {
  return (
    <View>
      {rows
        .filter(([, value]) => value)
        .map(([label, value], index) => (
          <View
            key={label}
            className={cn(
              "flex-row justify-between gap-[16px] py-[12px]",
              index > 0 && "border-t border-border"
            )}
          >
            <Text className="shrink-0 text-muted-foreground" variant="small">
              {label}
            </Text>
            <Text
              className="min-w-0 shrink text-right font-bold"
              variant="small"
            >
              {value}
            </Text>
          </View>
        ))}
    </View>
  )
}
