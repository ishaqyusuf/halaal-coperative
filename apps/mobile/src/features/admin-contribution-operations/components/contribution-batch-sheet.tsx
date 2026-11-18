import { AppSheet } from "@/components/app/app-sheet"
import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Pressable } from "@/components/ui/pressable"
import { FieldTrigger, SelectField } from "@/components/ui/select-field"
import { StatusBanner } from "@/components/ui/status-banner"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import {
  mobileDevQuickFill,
  mobileDevQuickFillReference,
} from "@/dev/mobile-dev-quick-fill"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { View } from "react-native"
import { stageContributionBatch } from "../api/admin-contribution-operations-api"
import type {
  CollectionBatchSummary,
  CollectionSource,
} from "../model/admin-contribution-operations-types"
import {
  duplicatePeriodError,
  monthLabel,
  stagedPeriods,
} from "../model/contribution-forms"
import type { ContributionReview } from "./contribution-review-sheet"

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

function sourceKind(type: string) {
  return /bank|card|transfer/i.test(type)
    ? "Bank debit"
    : /cash|manual/i.test(type)
      ? "Cash collection"
      : "Payroll"
}

function MonthPicker({
  onChange,
  onClose,
  used,
  value,
  visible,
}: {
  onChange: (year: number, month: number) => void
  onClose: () => void
  used: Set<string>
  value: { month: number; year: number }
  visible: boolean
}) {
  const [year, setYear] = useState(value.year)
  return (
    <AppSheet
      onClose={onClose}
      title="Period month"
      variant="picker"
      visible={visible}
    >
      <View className="gap-[12px]">
        <View className="flex-row items-center justify-between">
          <ScreenHeaderButton
            accessibilityLabel="Previous year"
            icon="ChevronLeft"
            onPress={() => setYear((current) => current - 1)}
          />
          <Text variant="section">{year}</Text>
          <ScreenHeaderButton
            accessibilityLabel="Next year"
            icon="ChevronRight"
            onPress={() => setYear((current) => current + 1)}
          />
        </View>
        <View className="flex-row flex-wrap gap-[8px]">
          {SHORT_MONTHS.map((label, index) => {
            const month = index + 1
            const selected = value.year === year && value.month === month
            const staged = used.has(`${year}-${month}`)
            return (
              <Pressable
                accessibilityLabel={`${monthLabel(year, month)}${staged ? ", already staged" : ""}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                className={cn(
                  "h-[48px] w-[31%] grow items-center justify-center rounded-[14px] border",
                  selected
                    ? "border-primary bg-primary"
                    : "border-border bg-card"
                )}
                key={label}
                onPress={() => {
                  onChange(year, month)
                  onClose()
                }}
              >
                <Text
                  className={cn(
                    selected ? "text-primary-foreground" : "text-foreground"
                  )}
                  variant="label"
                >
                  {label}
                  {staged ? " ·" : ""}
                </Text>
              </Pressable>
            )
          })}
        </View>
        <Text className="text-muted-foreground" variant="caption">
          · already has a batch
        </Text>
      </View>
    </AppSheet>
  )
}

/** T18 screen 6 (01 Large title): stage a collection batch. */
export function ContributionBatchSheet({
  batches,
  blocked,
  onClose,
  onReview,
  reviewActive,
  sources,
  visible,
}: {
  batches: readonly CollectionBatchSummary[]
  blocked: boolean
  onClose: () => void
  onReview: (review: ContributionReview) => void
  reviewActive: boolean
  sources: readonly CollectionSource[]
  visible: boolean
}) {
  const now = new Date()
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "")
  const [period, setPeriod] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  })
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [picker, setPicker] = useState(false)
  const [periodError, setPeriodError] = useState<string | null>(null)
  const source = sources.find((item) => item.id === sourceId) ?? sources[0]

  function review() {
    if (!source) return
    const duplicate = duplicatePeriodError({
      batches,
      month: period.month,
      sourceId: source.id,
      sourceName: source.name,
      year: period.year,
    })
    setPeriodError(duplicate)
    if (duplicate) return
    const label = monthLabel(period.year, period.month)
    const input = {
      commandId: createClientSubmissionKey(),
      deductionSourceId: source.id,
      expectedState: "absent",
      month: period.month,
      notes: notes.trim() || null,
      reference: reference.trim() || null,
      year: period.year,
    }
    onReview({
      amount: label,
      busyLabel: "Staging",
      cta: "Stage batch",
      failure: "The batch wasn’t staged. Try again.",
      rows: [
        ["Source", source.name],
        ["Period", label],
        ["Reference", input.reference ?? "Not provided"],
        ...(input.notes ? ([["Notes", input.notes]] as const) : []),
      ],
      run: () => stageContributionBatch(input),
      sub: source.name,
      success: [
        "Batch staged",
        "Check the member rows, then post the collected ones.",
      ],
      title: "Review batch",
    })
  }

  return (
    <AppSheet
      dirty={Boolean(reference.trim() || notes.trim())}
      footer={
        <View className="flex-row items-center gap-[10px]">
          <DevQuickFill
            onPress={() => {
              setSourceId(sources[0]?.id ?? "")
              setReference(mobileDevQuickFillReference("QA-BATCH"))
              setNotes(mobileDevQuickFill.adminContributions.batchNotes)
            }}
            placement="footer"
            portal={false}
          />
          <Button
            className="flex-1"
            disabled={blocked || !source}
            onPress={review}
            testID="contribution-batch-review"
          >
            <Text>Review batch</Text>
          </Button>
        </View>
      }
      onClose={onClose}
      overlayActive={reviewActive || picker}
      title="Stage batch"
      variant="form"
      visible={visible}
    >
      <View className="gap-[16px]">
        {blocked ? (
          <StatusBanner
            description="Your entries are kept on this phone. Review needs a connection."
            kind="offline"
            title="Offline"
          />
        ) : null}
        {source ? (
          <>
            <FormField label="Collection source">
              <SelectField
                onChange={(next) => {
                  setSourceId(next)
                  setPeriodError(null)
                }}
                options={sources.map((item) => ({
                  description: sourceKind(item.type),
                  label: item.name,
                  value: item.id,
                }))}
                sheetTitle="Collection source"
                value={source.id}
              />
            </FormField>
            <FormField error={periodError} label="Period month">
              <FieldTrigger
                icon="Calendar"
                onPress={() => setPicker(true)}
                placeholder="Choose month"
                testID="contribution-batch-month"
                trailingIcon={null}
                value={monthLabel(period.year, period.month)}
              />
            </FormField>
            <FormField label="Reference" optional>
              <Input
                accessibilityLabel="Batch reference"
                onChangeText={setReference}
                placeholder="Payroll reference"
                testID="contribution-batch-reference-input"
                value={reference}
              />
            </FormField>
            <FormField label="Notes" optional>
              <Textarea
                accessibilityLabel="Batch notes"
                onChangeText={setNotes}
                placeholder="Anything reviewers should know"
                testID="contribution-batch-notes-input"
                value={notes}
              />
            </FormField>
            <MonthPicker
              onChange={(year, month) => {
                setPeriod({ month, year })
                setPeriodError(null)
              }}
              onClose={() => setPicker(false)}
              used={stagedPeriods(batches, source.id)}
              value={period}
              visible={picker}
            />
          </>
        ) : (
          <>
            <StatusBanner
              description="Add one in Operation Profile on the web to stage a batch."
              kind="info"
              title="No collection source yet"
            />
            <FormField label="Collection source">
              <FieldTrigger
                disabled
                onPress={() => undefined}
                placeholder="No sources available"
              />
            </FormField>
          </>
        )}
      </View>
    </AppSheet>
  )
}
