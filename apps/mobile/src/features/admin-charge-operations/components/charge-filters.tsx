import { AppSheet } from "@/components/app/app-sheet"
import { Button } from "@/components/ui/button"
import { DateField } from "@/components/ui/date-field"
import { FormField } from "@/components/ui/form-field"
import { Text } from "@/components/ui/text"
import { todayDateOnly } from "@/lib/date-only"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { Pressable, ScrollView, View } from "react-native"
import type {
  ChargeFilters as Filters,
  ChargeLane,
} from "../model/admin-charge-operations-types"
import { chargeLabel } from "../model/charge-display"

const statuses = ["pending", "posted", "waived", "reversed"] as const
const purposes = [
  "general",
  "loan_fee",
  "membership_fee",
  "penalty",
  "member_share",
] as const
const workflows = [
  "loan_request",
  "loan",
  "procurement_request",
  "project_financing_request",
  "food_purchase_application",
  "commitment_collection",
] as const
const dayMs = 86_400_000
type Period = "any" | "month" | "last" | "custom"

function periodDates(period: "month" | "last") {
  const today = new Date()
  const year = today.getUTCFullYear()
  const month = today.getUTCMonth() - (period === "last" ? 1 : 0)
  return {
    fromDate: new Date(Date.UTC(year, month, 1)).toISOString(),
    toDate: new Date(Date.UTC(year, month + 1, 1)).toISOString(),
  }
}

function dateLabelRangeValue(value: string | null | undefined, offsetDays = 0) {
  return value
    ? new Date(new Date(value).getTime() + offsetDays * dayMs)
        .toISOString()
        .slice(0, 10)
    : null
}

function periodFor(filters: Filters): Period {
  if (!filters.fromDate && !filters.toDate) return "any"
  for (const period of ["month", "last"] as const) {
    const dates = periodDates(period)
    if (filters.fromDate === dates.fromDate && filters.toDate === dates.toDate)
      return period
  }
  return "custom"
}

function FilterChoices<T extends string>({
  label,
  onChange,
  options,
  selected,
}: {
  label: string
  onChange: (value: T) => void
  options: readonly { label: string; value: T }[]
  selected: T
}) {
  return (
    <View className="gap-[5px]">
      <Text variant="label">{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-[6px]">
          {options.map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: option.value === selected }}
              className={cn("min-h-[44px] justify-center", "rounded-full")}
              key={option.value}
              onPress={() => onChange(option.value)}
            >
              <View
                className={cn(
                  "min-h-[34px] justify-center rounded-full border px-[12px]",
                  option.value === selected
                    ? "border-primary bg-accent"
                    : "bg-surface-raised border-border"
                )}
              >
                <Text
                  className={
                    option.value === selected
                      ? "text-accent-foreground"
                      : "text-foreground-soft"
                  }
                  variant="label"
                >
                  {option.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  )
}

export function ChargeFilters({
  initial,
  lane,
  onApply,
  onClose,
}: {
  initial: Filters
  lane: ChargeLane
  onApply: (value: Filters) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(initial)
  const [period, setPeriod] = useState<Period>(() => periodFor(initial))
  const rules = lane === "rules"
  const update = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }
  const changePeriod = (value: Period) => {
    if (period === value) return
    setPeriod(value)
    setDraft((current) => ({
      ...current,
      ...(value === "month" || value === "last"
        ? periodDates(value)
        : { fromDate: null, toDate: null }),
    }))
  }
  const invalid = Boolean(
    draft.fromDate && draft.toDate && draft.fromDate >= draft.toDate
  )
  const today = todayDateOnly()
  return (
    <AppSheet
      footer={
        <View className="flex-row gap-[10px]">
          <Button
            className="bg-surface-raised flex-1"
            onPress={() => {
              setDraft({})
              setPeriod("any")
            }}
            variant="ghost"
          >
            <Text>Clear</Text>
          </Button>
          <Button
            className="flex-[2]"
            disabled={invalid}
            onPress={() => onApply(draft)}
          >
            <Text>Show results</Text>
          </Button>
        </View>
      }
      insetFloatingFooter
      onClose={onClose}
      title={rules ? "Filter rules" : "Filter charges"}
      variant={period === "custom" ? "form" : "auto"}
      visible
    >
      <View className="gap-[6px]">
        {!rules ? (
          <>
            <FilterChoices
              label="Status"
              onChange={(value) => update("status", value || null)}
              options={[
                { label: "Any", value: "" },
                ...statuses.map((value) => ({
                  label: chargeLabel(value),
                  value,
                })),
              ]}
              selected={draft.status ?? ""}
            />
            <FilterChoices
              label="Collected"
              onChange={(value) => update("collectionMode", value || null)}
              options={[
                { label: "Any", value: "" },
                { label: "From savings", value: "deduct_from_savings" },
                { label: "Pay separately", value: "pay_separately" },
              ]}
              selected={draft.collectionMode ?? ""}
            />
            <FilterChoices
              label="Assessed"
              onChange={changePeriod}
              options={[
                { label: "Any time", value: "any" },
                { label: "This month", value: "month" },
                { label: "Last month", value: "last" },
                { label: "Custom", value: "custom" },
              ]}
              selected={period}
            />
            {period === "custom" ? (
              <View className="flex-row gap-[10px]">
                <View className="flex-1">
                  <FormField label="From">
                    <DateField
                      maximumDate={
                        dateLabelRangeValue(draft.toDate, -1) ?? today
                      }
                      onChange={(date) =>
                        update(
                          "fromDate",
                          new Date(`${date}T00:00:00.000Z`).toISOString()
                        )
                      }
                      value={dateLabelRangeValue(draft.fromDate)}
                    />
                  </FormField>
                </View>
                <View className="flex-1">
                  <FormField
                    error={invalid ? "Choose a later date." : null}
                    label="Through"
                  >
                    <DateField
                      maximumDate={today}
                      minimumDate={
                        dateLabelRangeValue(draft.fromDate) ?? undefined
                      }
                      onChange={(date) =>
                        update(
                          "toDate",
                          new Date(
                            new Date(`${date}T00:00:00.000Z`).getTime() + dayMs
                          ).toISOString()
                        )
                      }
                      value={dateLabelRangeValue(draft.toDate, -1)}
                    />
                  </FormField>
                </View>
              </View>
            ) : null}
          </>
        ) : null}
        <FilterChoices
          label="Purpose"
          onChange={(value) => update("purpose", value || null)}
          options={[
            { label: "Any", value: "" },
            ...purposes.map((value) => ({ label: chargeLabel(value), value })),
          ]}
          selected={draft.purpose ?? ""}
        />
        {rules ? (
          <FilterChoices
            label="Workflow"
            onChange={(value) => update("workflow", value || null)}
            options={[
              { label: "Any", value: "" },
              ...workflows.map((value) => ({
                label: chargeLabel(value),
                value,
              })),
            ]}
            selected={draft.workflow ?? ""}
          />
        ) : null}
      </View>
    </AppSheet>
  )
}
