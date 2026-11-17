import { DevQuickFill } from "@/components/app/dev-quick-fill"
import { AppSheet } from "@/components/app/app-sheet"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Elevated } from "@/components/ui/list-card"
import { MoneyField } from "@/components/ui/money-field"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { View } from "react-native"
import {
  formatServiceMoney,
  structureLabels,
  type RequestDraft,
  type ServiceCharge,
  type ServiceDesign,
  type ServiceKind,
  type ServiceWorkspace,
} from "./service-request-model"
import { RequestNotice } from "./service-request-overview"
import {
  RequestSteps,
  RequestValues,
  ServiceTile,
} from "./service-request-presentation"

type Errors = Partial<Record<keyof RequestDraft, string>>

function ChargeRows({
  charges,
  currency,
  quoting,
  quoted,
  quoteError,
  onRequote,
  showTotal = false,
}: {
  charges: ServiceCharge[]
  currency: string
  quoting?: boolean
  quoted?: boolean
  quoteError?: boolean
  onRequote?: () => void
  showTotal?: boolean
}) {
  if (quoting)
    return (
      <Text className="text-accent-foreground" variant="caption">
        Checking charges…
      </Text>
    )
  if (quoteError) {
    return (
      <View className="flex-row flex-wrap items-center justify-between gap-[8px]">
        <Text className="text-tint-danger-foreground" variant="small">
          Couldn’t check charges.
        </Text>
        <Button onPress={onRequote} size="sm" variant="link">
          <Text>Try again</Text>
        </Button>
      </View>
    )
  }
  return (
    <View className="gap-[8px]">
      {charges.map(({ amount, collectionMode, id, name }) => (
        <View
          className="flex-row items-start justify-between gap-[12px]"
          key={id}
        >
          <View className="min-w-0 flex-1">
            <Text className="font-semibold" variant="small">
              {name}
            </Text>
            <Text className="text-muted-foreground" variant="caption">
              {collectionMode.replaceAll("_", " ")}
            </Text>
          </View>
          <Text variant="money">{formatServiceMoney(amount, currency)}</Text>
        </View>
      ))}
      {showTotal && charges.length > 1 ? (
        <View className="flex-row items-center justify-between border-t border-dashed border-border pt-[8px]">
          <Text variant="small">Charges total</Text>
          <Text variant="money">
            {formatServiceMoney(
              charges.reduce((total, charge) => total + charge.amount, 0),
              currency
            )}
          </Text>
        </View>
      ) : null}
      {quoted ? (
        <View className="flex-row items-center gap-[6px]">
          <Icon className="text-success size-[15px]" name="Check" />
          <Text
            className="text-tint-success-foreground shrink"
            variant="caption"
          >
            {charges.length
              ? "Server quote · checked again when you submit"
              : "No charges in the current quote"}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function TermOptions({
  design,
  error,
  max,
  onChange,
  value,
}: {
  design: ServiceDesign
  error?: string
  max?: number
  onChange: (value: string) => void
  value: string
}) {
  const options = [
    ...new Set([
      ...design.monthOptions.filter(
        (option) => max === undefined || option <= max
      ),
      ...(max === undefined ? [] : [max]),
    ]),
  ]
  const custom = Boolean(
    value && !options.some((option) => String(option) === value)
  )
  const [addingCustom, setAddingCustom] = useState(custom)
  if (options.length === 1 && options[0] === 1) {
    return (
      <FormField error={error} label={design.termLabel}>
        <Button
          className="self-start"
          onPress={() => onChange("1")}
          size="sm"
          variant={value === "1" ? "default" : "outline"}
        >
          <Text>1 month</Text>
        </Button>
      </FormField>
    )
  }
  return (
    <FormField
      error={error}
      label={design.termLabel}
      trailingLabel={max ? `Up to ${max} months` : undefined}
    >
      <View className="flex-row flex-wrap gap-[8px]">
        {options.map((months) => (
          <Pressable
            accessibilityLabel={`${months} months`}
            accessibilityRole="radio"
            accessibilityState={{ checked: value === String(months) }}
            className={cn(
              "min-h-[52px] min-w-[47px] flex-1 flex-row items-center justify-center rounded-[14px] border border-border px-[4px]",
              value === String(months)
                ? "border-primary bg-primary"
                : "dark:bg-surface-raised bg-background"
            )}
            key={months}
            onPress={() => {
              setAddingCustom(false)
              onChange(String(months))
            }}
          >
            <Text
              className={
                value === String(months) ? "text-primary-foreground" : ""
              }
              variant="section"
            >
              {months}
            </Text>
            <Text
              className={
                value === String(months)
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
              }
              variant="caption"
            >
              {" "}
              mo
            </Text>
          </Pressable>
        ))}
      </View>
      {addingCustom ? (
        <Input
          accessibilityLabel="Other number of months"
          className="dark:bg-surface-raised bg-background"
          inputMode="numeric"
          maxLength={9}
          onChangeText={(text) => onChange(text.replace(/\D/g, ""))}
          placeholder="Other number of months"
          value={value}
        />
      ) : (
        <Pressable
          accessibilityRole="button"
          className="min-h-[44px] justify-center self-start"
          onPress={() => {
            onChange("")
            setAddingCustom(true)
          }}
        >
          <Text className="text-primary" variant="label">
            Other term
          </Text>
        </Pressable>
      )}
    </FormField>
  )
}

function DraftText({
  draft,
  error,
  field,
  label,
  maxLength,
  multiline,
  onChange,
  placeholder,
}: {
  draft: RequestDraft
  error?: string
  field: "name" | "secondary" | "notes"
  label: string
  maxLength: number
  multiline?: boolean
  onChange: (key: "name" | "secondary" | "notes", value: string) => void
  placeholder: string
}) {
  const common = {
    accessibilityLabel: label,
    maxLength,
    onChangeText: (value: string) => onChange(field, value),
    placeholder,
    value: draft[field],
  }
  return (
    <FormField error={error} label={label} optional={field !== "name"}>
      {multiline ? (
        <Textarea
          className="dark:bg-surface-raised min-h-[84px] rounded-[14px] bg-card text-[16px] leading-[22px]"
          numberOfLines={3}
          {...common}
        />
      ) : (
        <Input className="dark:bg-surface-raised" {...common} />
      )}
    </FormField>
  )
}

export function ServiceRequestEditor({
  charges,
  currency,
  design,
  draft,
  draftRestored,
  errors,
  isOffline,
  isStale,
  kind,
  onBack,
  onChange,
  onClose,
  onQuickFill,
  onRequote,
  onReview,
  onStartOver,
  onSubmit,
  onRefresh,
  phase,
  quoteError,
  quoted,
  quoting,
  submissionError,
  submitting,
  workspace,
}: {
  charges: ServiceCharge[]
  currency: string
  design: ServiceDesign
  draft: RequestDraft
  draftRestored: boolean
  errors: Errors
  isOffline: boolean
  isStale: boolean
  kind: ServiceKind
  onBack: () => void
  onChange: <T extends keyof RequestDraft>(
    key: T,
    value: RequestDraft[T]
  ) => void
  onClose: () => void
  onQuickFill?: () => void
  onRequote: () => void
  onReview: () => void
  onStartOver: () => void
  onSubmit: () => void
  onRefresh: () => void
  phase: "form" | "review" | null
  quoteError: boolean
  quoted: boolean
  quoting: boolean
  submissionError: string | null
  submitting: boolean
  workspace?: ServiceWorkspace
}) {
  const amount = Number(draft.amount)
  const hasTerm =
    kind !== "project-financing" || draft.structure === "repayable_facility"
  const months = hasTerm ? Number(draft.months) : 0
  const amountLabel = formatServiceMoney(amount, currency)
  const monthly =
    months > 0 ? formatServiceMoney(amount / months, currency) : null
  const moneyLine =
    months > 0
      ? `${monthly} a month for ${months} months`
      : "Payback set during review"
  const term =
    months > 0 ? `${months} months · ${monthly}/mo` : "Set during review"
  const project = kind === "project-financing"
  const food = kind === "food-purchase"
  const titleLabel = project ? "Business" : "Item"
  const secondLabel = project ? "Purpose" : food ? "Items" : "Vendor"
  const notesLabel = project
    ? "Business description"
    : food
      ? "Notes"
      : "Description"
  const cycle = workspace?.cycles?.find((entry) => entry.id === draft.cycleId)
  const canSubmit = Boolean(
    workspace?.canCreate &&
    !isOffline &&
    !isStale &&
    (!project || (quoted && !quoting && !quoteError))
  )
  const review = phase === "review"
  const fields: [string, string | null][] = [
    [food ? "Cycle" : titleLabel, food ? (cycle?.label ?? null) : draft.name],
    [secondLabel, draft.secondary.trim() || "Not given"],
    [design.amountLabel, amountLabel],
    ...(project
      ? [
          ["Structure", structureLabels[draft.structure].title] as [
            string,
            string,
          ],
        ]
      : []),
    [design.termLabel, term],
    [notesLabel, draft.notes.trim() || "Not given"],
  ]

  return (
    <AppSheet
      contentClassName="gap-[18px] px-[18px] pt-[12px]"
      contentKey={review ? "review" : "form"}
      footer={
        review ? (
          <Button
            disabled={!canSubmit}
            loading={submitting}
            onPress={onSubmit}
            testID="service-submit"
          >
            <Text>
              {isOffline
                ? "Reconnect to submit"
                : submitting
                  ? "Submitting"
                  : submissionError && !quoteError
                    ? "Try again"
                    : `Submit ${design.noun}`}
            </Text>
          </Button>
        ) : (
          <View className="flex-row items-center gap-[10px]">
            {onQuickFill ? (
              <DevQuickFill onPress={onQuickFill} placement="footer" />
            ) : null}
            <Button
              className="flex-1"
              disabled={food && !workspace?.cycles?.length}
              onPress={onReview}
              testID="service-review"
            >
              <Text>Review {design.noun}</Text>
            </Button>
          </View>
        )
      }
      headerOnCard
      isSubmitting={submitting}
      onBack={review ? onBack : undefined}
      onClose={onClose}
      title={review ? `Review ${design.noun}` : design.formTitle}
      variant="form"
      visible={phase !== null}
    >
      {isOffline || isStale ? (
        <RequestNotice
          notice={{
            action: {
              label: isOffline ? "Check connection" : "Refresh",
              onPress: onRefresh,
            },
            description: "Your draft is saved on this phone.",
            icon: isOffline ? "WifiOff" : "Clock",
            title: isOffline ? "You’re offline" : "Refresh before submitting",
            tone: "warning",
          }}
        />
      ) : null}
      {review ? (
        <>
          {submissionError ? (
            <RequestNotice
              notice={{
                description: submissionError,
                icon: "CircleAlert",
                title: "Check your submission",
                tone: "danger",
              }}
            />
          ) : null}
          {!workspace?.canCreate ? (
            <RequestNotice
              notice={{
                description: workspace?.reasons.join("\n"),
                icon: "Ban",
                title: `New ${design.noun}s are unavailable`,
                tone: "warning",
              }}
            />
          ) : null}
          <Elevated
            className="rounded-[20px] border border-transparent bg-card px-[16px] pt-[18px] pb-[16px] dark:border-border"
            radius={20}
          >
            <View className="items-center gap-[4px] pb-[6px]">
              <View className="mb-[6px]">
                <ServiceTile design={design} />
              </View>
              <Text className="text-muted-foreground" variant="label">
                {design.title}
              </Text>
              <Text className="text-center" variant="hero">
                {amountLabel}
              </Text>
              <Text
                className="text-foreground-soft text-center"
                variant="small"
              >
                {moneyLine}
              </Text>
            </View>
            <ReceiptCut />
            <RequestValues rows={fields} />
            {charges.length || project ? (
              <>
                <ReceiptCut />
                <ChargeRows
                  charges={charges}
                  currency={currency}
                  onRequote={onRequote}
                  quoted={quoted}
                  quoteError={quoteError}
                  quoting={quoting}
                  showTotal
                />
              </>
            ) : null}
          </Elevated>
          <View className="gap-[12px] rounded-[20px] border border-border p-[16px]">
            <RequestSteps current={0} steps={design.steps.slice(0, 3)} />
            <Text className="text-foreground-soft" variant="small">
              The office reviews your {design.noun} and you’ll get a
              notification when it’s decided.
            </Text>
          </View>
        </>
      ) : (
        <>
          {draftRestored ? (
            <RequestNotice
              notice={{
                action: { label: "Start over", onPress: onStartOver },
                icon: "FileText",
                title: "Draft restored from this phone",
                tone: "neutral",
              }}
            />
          ) : null}
          {food && !workspace?.cycles?.length ? (
            <RequestNotice
              notice={{
                description:
                  "The office opens a cycle before accepting applications.",
                icon: "CalendarDays",
                title: "No cycle is open right now",
                tone: "warning",
              }}
            />
          ) : null}
          <Elevated
            className="gap-[10px] rounded-[20px] border border-transparent bg-card p-[16px] dark:border-border"
            radius={20}
          >
            <FormField error={errors.amount} label={design.amountLabel}>
              <MoneyField
                allowDecimals
                currencyCode={currency}
                display="large"
                onChangeValue={(value) => onChange("amount", value)}
                value={draft.amount}
              />
            </FormField>
            {!project ? (
              <TermOptions
                design={design}
                error={errors.months}
                max={workspace?.maxMonths}
                onChange={(value) => onChange("months", value)}
                value={draft.months}
              />
            ) : null}
            {amount > 0 ? (
              <View className="gap-[10px] rounded-[20px] bg-accent p-[16px]">
                <View>
                  <Text className="text-accent-foreground" variant="label">
                    {monthly ? "Estimated monthly payment" : "Requested amount"}
                  </Text>
                  <Text className="text-[28px] leading-[34px]" variant="hero">
                    {monthly ?? amountLabel}
                  </Text>
                  {monthly ? (
                    <Text className="text-foreground-soft" variant="small">
                      {months} months · before charges
                    </Text>
                  ) : null}
                </View>
                {charges.length || project ? (
                  <View className="border-t border-accent-foreground/15 pt-[10px]">
                    <ChargeRows
                      charges={charges}
                      currency={currency}
                      onRequote={onRequote}
                      quoted={quoted}
                      quoteError={quoteError}
                      quoting={quoting}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </Elevated>
          {project ? (
            <FormField error={errors.structure} label="Financing structure">
              {workspace?.structures?.map(({ value }) => (
                <Choice
                  checked={draft.structure === value}
                  description={structureLabels[value].description}
                  key={value}
                  label={structureLabels[value].title}
                  onPress={() => onChange("structure", value)}
                />
              ))}
            </FormField>
          ) : null}
          {project && hasTerm ? (
            <TermOptions
              design={design}
              error={errors.months}
              onChange={(value) => onChange("months", value)}
              value={draft.months}
            />
          ) : null}
          <Text variant="section">Details</Text>
          {food ? (
            <FormField error={errors.cycleId} label="Application cycle">
              {workspace?.cycles?.map((entry) => (
                <Choice
                  checked={entry.id === draft.cycleId}
                  key={entry.id}
                  label={entry.label}
                  onPress={() => onChange("cycleId", entry.id)}
                />
              ))}
            </FormField>
          ) : (
            <DraftText
              draft={draft}
              error={errors.name}
              field="name"
              label={project ? "Business name" : "Item name"}
              maxLength={160}
              onChange={onChange}
              placeholder={
                project ? "e.g. Bello Farms" : "e.g. Chest freezer (300L)"
              }
            />
          )}
          <DraftText
            draft={draft}
            field="secondary"
            label={secondLabel}
            maxLength={kind === "procurement" ? 160 : 1000}
            multiline={kind !== "procurement"}
            onChange={onChange}
            placeholder={
              project
                ? "What the funds will be used for"
                : food
                  ? "e.g. Rice 50kg, beans 25kg"
                  : "e.g. Haier Thermocool, Ikeja"
            }
          />
          <DraftText
            draft={draft}
            field="notes"
            label={notesLabel}
            maxLength={project ? 2000 : 1000}
            multiline
            onChange={onChange}
            placeholder={
              food
                ? "Anything the office should know"
                : project
                  ? "Tell us about your business"
                  : "Describe the item and what you need it for"
            }
          />
        </>
      )}
    </AppSheet>
  )
}

function Choice({
  checked,
  description,
  label,
  onPress,
}: {
  checked: boolean
  description?: string
  label: string
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      className={cn(
        "min-h-[60px] flex-row items-center gap-[12px] rounded-[14px] border px-[14px] py-[10px]",
        checked
          ? "border-primary bg-accent"
          : "dark:bg-surface-raised border-border bg-card"
      )}
      onPress={onPress}
    >
      <View
        className={cn(
          "size-[22px] items-center justify-center rounded-full border-2",
          checked ? "border-primary bg-primary" : "border-border"
        )}
      >
        {checked ? (
          <Icon className="size-[13px] text-primary-foreground" name="Check" />
        ) : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-bold" variant="small">
          {label}
        </Text>
        {description ? (
          <Text className="text-muted-foreground" variant="caption">
            {description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

function ReceiptCut() {
  return (
    <View className="relative -mx-[16px] my-[6px] h-[22px] justify-center">
      <View className="mx-[18px] border-t-2 border-dashed border-border" />
      <View className="absolute -left-[11px] size-[22px] rounded-full bg-background" />
      <View className="absolute -right-[11px] size-[22px] rounded-full bg-background" />
    </View>
  )
}
