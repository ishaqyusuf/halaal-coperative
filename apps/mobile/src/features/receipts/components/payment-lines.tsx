import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { ScrollView, View } from "react-native"
import type { MobileMemberPayable } from "../model/member-receipt-types"
import {
  payableKindLabels,
  type PaymentLine,
  type PaymentLineKind,
} from "../model/payment-plan"
import { receiptMoney } from "../model/receipt-presentation"

/** Badge dot tint and icon per payable kind (workshop 02 palette). */
export const payableKindStyle: Record<
  PaymentLineKind,
  { bar: string; icon: string; tint: string; ink: string }
> = {
  commitment: {
    bar: "bg-brand",
    icon: "BadgeCheck",
    ink: "text-accent-foreground",
    tint: "bg-accent",
  },
  food_purchase: {
    bar: "bg-brand-vivid",
    icon: "ShoppingBasket",
    ink: "text-tint-vivid-foreground",
    tint: "bg-tint-vivid",
  },
  loan: {
    bar: "bg-tint-sky-foreground",
    icon: "HandCoins",
    ink: "text-tint-sky-foreground",
    tint: "bg-tint-sky",
  },
  procurement: {
    bar: "bg-tint-lilac-foreground",
    icon: "Package",
    ink: "text-tint-lilac-foreground",
    tint: "bg-tint-lilac",
  },
  savings: {
    bar: "bg-success",
    icon: "PiggyBank",
    ink: "text-tint-success-foreground",
    tint: "bg-tint-success",
  },
  shares: {
    bar: "bg-brand-warm",
    icon: "ChartPie",
    ink: "text-tint-warm-foreground",
    tint: "bg-tint-warm",
  },
}

function Badge({
  accessibilityLabel,
  amount,
  caption,
  danger = false,
  dashed = false,
  icon,
  ink,
  onPress,
  selected,
  testID,
  tint,
}: {
  accessibilityLabel: string
  amount: string
  caption: string
  danger?: boolean
  dashed?: boolean
  icon: string
  ink: string
  onPress: () => void
  selected: boolean
  testID?: string
  tint: string
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={cn(
        "min-h-[56px] flex-row items-center gap-[10px] rounded-[16px] border-[1.5px] py-[8px] pr-[12px] pl-[10px] active:scale-[0.97]",
        selected
          ? "border-primary bg-primary pr-[8px]"
          : dashed
            ? "border-dashed border-primary bg-transparent"
            : "border-border bg-card"
      )}
      onPress={onPress}
      testID={testID}
    >
      <View
        className={cn(
          "size-[30px] items-center justify-center rounded-[10px]",
          selected ? "bg-primary-foreground/20" : tint
        )}
      >
        <Icon
          className={cn(
            "size-[16px]",
            selected ? "text-primary-foreground" : ink
          )}
          name={icon}
        />
      </View>
      <View className="gap-[1px]">
        <Text
          className={cn(
            selected
              ? "text-primary-foreground opacity-80"
              : danger
                ? "text-destructive"
                : dashed
                  ? "text-primary"
                  : "text-muted-foreground"
          )}
          variant="caption"
        >
          {caption}
        </Text>
        <Text
          className={cn(
            "text-[15px] leading-[19px] font-extrabold",
            selected
              ? "text-primary-foreground"
              : dashed
                ? "text-primary"
                : "text-foreground"
          )}
          tabular
        >
          {amount}
        </Text>
      </View>
      {selected ? (
        <View className="size-[24px] items-center justify-center rounded-full bg-primary-foreground/20">
          <Icon className="size-[14px] text-primary-foreground" name="X" />
        </View>
      ) : null}
    </Pressable>
  )
}

/** One-row payable badges (02): tap to pick, tap again to remove. */
export function PayableBadges({
  currency,
  extraAmount,
  moreOpen,
  onMore,
  onToggle,
  payables,
  selected,
}: {
  currency: string
  extraAmount: number
  moreOpen: boolean
  onMore: () => void
  onToggle: (id: string) => void
  payables: readonly MobileMemberPayable[]
  selected: readonly string[]
}) {
  return (
    <ScrollView
      className="-mx-[18px]"
      contentContainerStyle={{ gap: 8, paddingBottom: 6, paddingHorizontal: 18, paddingTop: 2 }}
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
    >
      {payables.map((payable) => {
        const on = selected.includes(payable.id)
        const style = payableKindStyle[payable.kind]
        const kind = payableKindLabels[payable.kind]
        return (
          <Badge
            accessibilityLabel={`${payable.overdue ? "Overdue " : ""}${kind}, ${payable.title}, ${receiptMoney(payable.amount, currency)}`}
            amount={receiptMoney(payable.amount, currency)}
            caption={payable.overdue && !on ? `Overdue · ${kind}` : kind}
            danger={payable.overdue && !on}
            icon={style.icon}
            ink={style.ink}
            key={payable.id}
            onPress={() => onToggle(payable.id)}
            selected={on}
            testID={`payable-${payable.id}`}
            tint={style.tint}
          />
        )
      })}
      {selected.length ? (
        <Badge
          accessibilityLabel={
            moreOpen ? "Remove extra to savings" : "Add more to savings"
          }
          amount={
            moreOpen && extraAmount > 0
              ? receiptMoney(extraAmount / 100, currency)
              : "Add more"
          }
          caption={moreOpen ? "Extra · to savings" : "Paid more?"}
          dashed
          icon={moreOpen ? "PiggyBank" : "Plus"}
          ink="text-tint-success-foreground"
          onPress={onMore}
          selected={moreOpen}
          testID="payable-add-more"
          tint="bg-tint-success"
        />
      ) : null}
    </ScrollView>
  )
}

/**
 * Where a payment goes: one row per line with a progress bar. `numbered`
 * shows the cooperative's order (auto apply).
 */
export function PaymentLines({
  currency,
  lines,
  numbered = false,
}: {
  currency: string
  lines: readonly PaymentLine[]
  numbered?: boolean
}) {
  return (
    <View className="overflow-hidden rounded-[20px] border border-border bg-card">
      {lines.map((line, index) => {
        const style = payableKindStyle[line.kind]
        const due = line.payable ? Math.round(line.payable.amount * 100) : 0
        const full = !line.payable || line.amount >= due
        const name = line.payable
          ? `${payableKindLabels[line.kind]} · ${line.payable.title}`
          : "Savings · Special savings"
        return (
          <View
            className={cn(
              "flex-row items-center gap-[10px] px-[14px] py-[10px]",
              index > 0 && "border-t border-border"
            )}
            key={line.payable?.id ?? "savings"}
          >
            <View
              className={cn(
                "items-center justify-center rounded-full",
                numbered ? "size-[22px] bg-surface-raised" : `size-[30px] rounded-[10px] ${style.tint}`
              )}
            >
              {numbered ? (
                <Text className="text-muted-foreground text-[12px] font-extrabold">
                  {index + 1}
                </Text>
              ) : (
                <Icon className={cn("size-[16px]", style.ink)} name={style.icon} />
              )}
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-bold" numberOfLines={1} variant="small">
                {name}
              </Text>
              <Text className="text-muted-foreground" variant="caption">
                {!line.payable
                  ? "Anything left over"
                  : full
                    ? "Paid in full"
                    : `${receiptMoney(line.amount / 100, currency)} of ${receiptMoney(line.payable.amount, currency)} · part paid`}
              </Text>
              {line.payable ? (
                <View className="mt-[6px] h-[5px] flex-row overflow-hidden rounded-[3px] bg-surface-raised">
                  <View
                    className="h-[5px] basis-0"
                    style={{ flexGrow: Math.min(line.amount, due) }}
                  >
                    <View
                      className={cn(
                        "h-[5px] w-full rounded-[3px]",
                        full ? "bg-primary" : "bg-brand-warm"
                      )}
                    />
                  </View>
                  <View
                    className="h-[5px] basis-0"
                    style={{ flexGrow: Math.max(0, due - line.amount) }}
                  />
                </View>
              ) : null}
            </View>
            <Text tabular variant="money">
              {receiptMoney(line.amount / 100, currency)}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
