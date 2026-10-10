import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { EmptyState } from "@/components/app/empty-state"
import { FormStateBanner } from "@/components/app/form-state-banner"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { useRef } from "react"
import { Keyboard, Pressable, TextInput, View } from "react-native"
import type {
  MobileFoodPurchaseCycle,
  MobileWorkflowChargeOption,
} from "../model/member-food-purchase-types"
import {
  formatFoodPurchaseCurrency,
  formatFoodPurchaseMonth,
  formatFoodPurchaseStatus,
  presentFoodPurchaseCharges,
} from "../model/member-food-purchase-presentation"

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
  const largeTextLayout = useLargeTextLayout()

  return (
    <Pressable
      accessibilityLabel={`${formatFoodPurchaseMonth(cycle.periodMonth)} cycle. ${formatFoodPurchaseCurrency(cycle.releasedAmount, currencyCode)} released${cycle.releaseNotes ? `. ${cycle.releaseNotes}` : ""}`}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
      className={cn(
        "min-h-16 flex-row items-center gap-3 border-b border-border py-3 active:opacity-70",
        isSelected && "border-primary"
      )}
      onPress={onPress}
    >
      <View className="min-w-0 flex-1 gap-1">
        <Text
          className={cn(
            "font-semibold text-foreground",
            largeTextLayout ? "text-base leading-10" : "text-sm"
          )}
        >
          {formatFoodPurchaseMonth(cycle.periodMonth)}
        </Text>
        <Text
          className={cn(
            "text-muted-foreground",
            largeTextLayout ? "text-sm leading-8" : "text-xs leading-4"
          )}
        >
          {formatFoodPurchaseCurrency(cycle.releasedAmount, currencyCode)}
          {" released"}
        </Text>
        {cycle.releaseNotes ? (
          <Text
            className={cn(
              "text-muted-foreground",
              largeTextLayout ? "text-sm leading-8" : "text-xs leading-4"
            )}
          >
            {cycle.releaseNotes}
          </Text>
        ) : null}
      </View>
      <View
        className={cn(
          "size-7 shrink-0 items-center justify-center rounded-full border border-border",
          isSelected && "border-primary bg-primary"
        )}
      >
        {isSelected ? (
          <Icon className="size-xs text-primary-foreground" name="Check" />
        ) : null}
      </View>
    </Pressable>
  )
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
  const largeTextLayout = useLargeTextLayout()
  const estimate = presentFoodPurchaseCharges(charges, basisAmount)
  if (estimate.items.length === 0) return null

  return (
    <View className="gap-3 border-y border-border py-4">
      <View
        className={cn(
          "gap-2",
          !largeTextLayout && "flex-row items-center justify-between gap-3"
        )}
      >
        <Text
          className={cn(
            "font-semibold text-foreground",
            largeTextLayout ? "text-base leading-10" : "text-sm"
          )}
        >
          Applicable charges
        </Text>
        <Text
          className={cn(
            "font-semibold text-foreground",
            largeTextLayout ? "text-base leading-10" : "text-sm"
          )}
        >
          {formatFoodPurchaseCurrency(estimate.total, currencyCode)}
        </Text>
      </View>
      {estimate.items.map((charge) => (
        <View
          className={cn(
            "gap-2 border-t border-border pt-3",
            !largeTextLayout && "flex-row items-start justify-between gap-3"
          )}
          key={`${charge.id}-${charge.collectionMode}`}
        >
          <Text
            className={cn(
              "min-w-0 text-muted-foreground",
              largeTextLayout
                ? "w-full text-sm leading-8"
                : "flex-1 text-xs leading-4"
            )}
          >
            {charge.name} · {formatFoodPurchaseStatus(charge.collectionMode)}
          </Text>
          <Text
            className={cn(
              "font-medium text-foreground",
              largeTextLayout ? "text-sm leading-8" : "text-xs"
            )}
          >
            {formatFoodPurchaseCurrency(charge.estimatedAmount, currencyCode)}
          </Text>
        </View>
      ))}
    </View>
  )
}

export function MemberFoodPurchaseApplicationForm({
  amount,
  chargeOptions,
  currencyCode,
  cycleId,
  error,
  isLoading,
  isStale,
  isSubmitting,
  itemDescription,
  maximumPaybackMonths,
  openCycles,
  paybackMonths,
  requestNotes,
  requestedAmount,
  requestedPaybackMonths,
  setCycleId,
  setItemDescription,
  setRequestNotes,
  setRequestedAmount,
  setRequestedPaybackMonths,
}: {
  amount: number
  chargeOptions: MobileWorkflowChargeOption[]
  currencyCode: string
  cycleId: string
  error: string | null
  isLoading: boolean
  isStale: boolean
  isSubmitting: boolean
  itemDescription: string
  maximumPaybackMonths: number
  openCycles: MobileFoodPurchaseCycle[]
  paybackMonths: number
  requestNotes: string
  requestedAmount: string
  requestedPaybackMonths: string
  setCycleId: (value: string) => void
  setItemDescription: (value: string) => void
  setRequestNotes: (value: string) => void
  setRequestedAmount: (value: string) => void
  setRequestedPaybackMonths: (value: string) => void
}) {
  const largeTextLayout = useLargeTextLayout()
  const requestedAmountRef = useRef<TextInput>(null)
  const paybackMonthsRef = useRef<TextInput>(null)
  const itemsRef = useRef<TextInput>(null)
  const notesRef = useRef<TextInput>(null)

  return (
    <>
      {isStale ? <FormStateBanner hasDraft={false} isStale /> : null}
      {error ? (
        <View className="border-l-2 border-destructive pl-3">
          <Text
            accessibilityLiveRegion="polite"
            className={cn(
              "font-semibold text-destructive",
              largeTextLayout ? "text-base leading-10" : "text-sm leading-5"
            )}
          >
            {error}
          </Text>
        </View>
      ) : null}

      {isLoading ? (
        <LoadingSpinner />
      ) : openCycles.length ? (
        <View accessibilityRole="radiogroup" className="gap-1">
          <Text
            className={cn(
              "font-semibold text-foreground",
              largeTextLayout ? "text-base leading-10" : "text-sm"
            )}
          >
            Cooperative cycle
          </Text>
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
          description="The cooperative office has not opened a cycle for applications."
          icon="CalendarClock"
          title="No open cycle"
        />
      )}

      <View className="gap-2">
        <Text
          className={cn(
            "font-semibold text-foreground",
            largeTextLayout ? "text-base leading-10" : "text-sm"
          )}
        >
          Requested amount ({currencyCode})
        </Text>
        <Input
          accessibilityLabel="Foodstuff Purchase requested amount"
          editable={!isSubmitting}
          keyboardType="number-pad"
          onChangeText={setRequestedAmount}
          onSubmitEditing={() => paybackMonthsRef.current?.focus()}
          placeholder="e.g. 150,000"
          ref={requestedAmountRef}
          returnKeyType="next"
          submitBehavior="submit"
          value={requestedAmount}
        />
      </View>

      <View className="gap-2">
        <Text
          className={cn(
            "font-semibold text-foreground",
            largeTextLayout ? "text-base leading-10" : "text-sm"
          )}
        >
          Payback months · up to {maximumPaybackMonths}
        </Text>
        <Input
          accessibilityLabel="Foodstuff Purchase payback months"
          editable={!isSubmitting}
          keyboardType="number-pad"
          onChangeText={setRequestedPaybackMonths}
          onSubmitEditing={() => itemsRef.current?.focus()}
          placeholder="Payback months"
          ref={paybackMonthsRef}
          returnKeyType="next"
          submitBehavior="submit"
          value={requestedPaybackMonths}
        />
        {paybackMonths > maximumPaybackMonths ? (
          <Text
            accessibilityLiveRegion="polite"
            className={cn(
              "text-destructive",
              largeTextLayout ? "text-sm leading-8" : "text-xs leading-5"
            )}
          >
            Maximum {maximumPaybackMonths} months.
          </Text>
        ) : null}
      </View>

      <View className="gap-2">
        <Text
          className={cn(
            "font-semibold text-foreground",
            largeTextLayout ? "text-base leading-10" : "text-sm"
          )}
        >
          Items requested
        </Text>
        <Textarea
          accessibilityLabel="Foodstuff Purchase items requested"
          className={largeTextLayout ? "min-h-32" : undefined}
          editable={!isSubmitting}
          numberOfLines={4}
          onChangeText={setItemDescription}
          onSubmitEditing={() => notesRef.current?.focus()}
          placeholder="e.g. rice, beans, oil"
          ref={itemsRef}
          returnKeyType="next"
          submitBehavior="submit"
          value={itemDescription}
        />
      </View>

      <View className="gap-2">
        <Text
          className={cn(
            "font-semibold text-foreground",
            largeTextLayout ? "text-base leading-10" : "text-sm"
          )}
        >
          Notes (optional)
        </Text>
        <Textarea
          accessibilityLabel="Foodstuff Purchase notes"
          className={largeTextLayout ? "min-h-32" : undefined}
          editable={!isSubmitting}
          numberOfLines={3}
          onChangeText={setRequestNotes}
          onSubmitEditing={Keyboard.dismiss}
          placeholder="Add a note"
          ref={notesRef}
          returnKeyType="done"
          submitBehavior="blurAndSubmit"
          value={requestNotes}
        />
      </View>

      <MobileChargeSummary
        basisAmount={amount}
        charges={chargeOptions}
        currencyCode={currencyCode}
      />
    </>
  )
}

export function MemberFoodPurchaseQuickFill({
  onPress,
  visible,
}: {
  onPress: () => void
  visible: boolean
}) {
  if (!visible) return null

  return (
    <DevQuickFill
      bottomOffset={92}
      label="Quick fill Foodstuff Purchase application"
      onPress={onPress}
      portal={false}
    />
  )
}
