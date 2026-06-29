"use client"

import { useState } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyPrefixInput } from "@halaalvest/ui/components/currency-input"
import { Form, useFormContext } from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { z } from "zod"
import { DatePickerInput } from "@/components/date-picker-input"
import { MemberAutocompleteSelect } from "@/components/migration/member-autocomplete-select"
import {
  createLegacyLoanMigrationDraftAction,
  upsertMemberAmountLogAction,
} from "@/lib/dashboard-actions"

type MemberOption = {
  id: string
  label: string
}

type CommitmentHistoryInputRow = {
  amount: string
  effectiveFrom: string
  id: string
  notes: string
}

type LoanHistoryInputRow = {
  closedAt: string
  guarantorOneCreateEmail: string
  guarantorOneCreateFullName: string
  guarantorOneCreateJoinedAt: string
  guarantorOneCreateMemberNumber: string
  guarantorOneCreatePhone: string
  guarantorOneMemberId: string
  guarantorTwoCreateEmail: string
  guarantorTwoCreateFullName: string
  guarantorTwoCreateJoinedAt: string
  guarantorTwoCreateMemberNumber: string
  guarantorTwoCreatePhone: string
  guarantorTwoMemberId: string
  id: string
  notes: string
  openedAt: string
  outstandingPrincipalBalance: string
  principalAmount: string
  savingsDuringLoan: string
  scheduledMonthlyPrincipalRepayment: string
}

const commitmentHistoryRowSchema = z.object({
  amount: z.string(),
  effectiveFrom: z.string(),
  id: z.string(),
  notes: z.string(),
})

const commitmentHistoryFormSchema = z.object({
  rows: z.array(commitmentHistoryRowSchema).min(1),
})

type CommitmentHistoryFormValues = z.infer<typeof commitmentHistoryFormSchema>

const loanHistoryRowSchema = z.object({
  closedAt: z.string(),
  guarantorOneCreateEmail: z.string(),
  guarantorOneCreateFullName: z.string(),
  guarantorOneCreateJoinedAt: z.string(),
  guarantorOneCreateMemberNumber: z.string(),
  guarantorOneCreatePhone: z.string(),
  guarantorOneMemberId: z.string(),
  guarantorTwoCreateEmail: z.string(),
  guarantorTwoCreateFullName: z.string(),
  guarantorTwoCreateJoinedAt: z.string(),
  guarantorTwoCreateMemberNumber: z.string(),
  guarantorTwoCreatePhone: z.string(),
  guarantorTwoMemberId: z.string(),
  id: z.string(),
  notes: z.string(),
  openedAt: z.string(),
  outstandingPrincipalBalance: z.string(),
  principalAmount: z.string(),
  savingsDuringLoan: z.string(),
  scheduledMonthlyPrincipalRepayment: z.string(),
})

const loanHistoryFormSchema = z.object({
  rows: z.array(loanHistoryRowSchema).min(1),
})

type LoanHistoryFormValues = z.infer<typeof loanHistoryFormSchema>

function createRowId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function createCommitmentRow(id?: string): CommitmentHistoryInputRow {
  return {
    amount: "",
    effectiveFrom: "",
    id: id ?? createRowId("commitment-history"),
    notes: "",
  }
}

function createLoanRow(id?: string): LoanHistoryInputRow {
  return {
    closedAt: "",
    guarantorOneCreateEmail: "",
    guarantorOneCreateFullName: "",
    guarantorOneCreateJoinedAt: "",
    guarantorOneCreateMemberNumber: "",
    guarantorOneCreatePhone: "",
    guarantorOneMemberId: "",
    guarantorTwoCreateEmail: "",
    guarantorTwoCreateFullName: "",
    guarantorTwoCreateJoinedAt: "",
    guarantorTwoCreateMemberNumber: "",
    guarantorTwoCreatePhone: "",
    guarantorTwoMemberId: "",
    id: id ?? createRowId("loan-history"),
    notes: "",
    openedAt: "",
    outstandingPrincipalBalance: "",
    principalAmount: "",
    savingsDuringLoan: "",
    scheduledMonthlyPrincipalRepayment: "",
  }
}

function commitmentRowHasValue(row: CommitmentHistoryInputRow) {
  return Boolean(row.amount || row.effectiveFrom || row.notes)
}

function loanRowHasValue(row: LoanHistoryInputRow) {
  return Boolean(
    row.closedAt ||
      row.guarantorOneCreateEmail ||
      row.guarantorOneCreateFullName ||
      row.guarantorOneCreateJoinedAt ||
      row.guarantorOneCreateMemberNumber ||
      row.guarantorOneCreatePhone ||
      row.guarantorOneMemberId ||
      row.guarantorTwoCreateEmail ||
      row.guarantorTwoCreateFullName ||
      row.guarantorTwoCreateJoinedAt ||
      row.guarantorTwoCreateMemberNumber ||
      row.guarantorTwoCreatePhone ||
      row.guarantorTwoMemberId ||
      row.notes ||
      row.openedAt ||
      row.outstandingPrincipalBalance ||
      row.principalAmount ||
      row.savingsDuringLoan ||
      row.scheduledMonthlyPrincipalRepayment
  )
}

function sortCommitmentRowsByDate(
  a: CommitmentHistoryInputRow,
  b: CommitmentHistoryInputRow
) {
  return (a.effectiveFrom || "9999-99-99").localeCompare(
    b.effectiveFrom || "9999-99-99"
  )
}

function sortLoanRowsByDate(a: LoanHistoryInputRow, b: LoanHistoryInputRow) {
  return (a.openedAt || "9999-99-99").localeCompare(
    b.openedAt || "9999-99-99"
  )
}

function randomItem<TValue>(values: readonly TValue[]) {
  return values[Math.floor(Math.random() * values.length)]!
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function parseIsoDate(value?: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(`${value}T00:00:00.000Z`)

  return Number.isNaN(date.getTime()) ? null : date
}

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function monthsBetween(startDate: Date, endDate: Date) {
  return Math.max(
    0,
    (endDate.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      endDate.getUTCMonth() -
      startDate.getUTCMonth()
  )
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date)
  nextDate.setUTCMonth(nextDate.getUTCMonth() + months)

  return nextDate
}

function shuffleValues<TValue>(values: readonly TValue[]) {
  const shuffled = [...values]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index)
    const currentValue = shuffled[index]!
    shuffled[index] = shuffled[swapIndex]!
    shuffled[swapIndex] = currentValue
  }

  return shuffled
}

function buildRandomLoanHistoryRows(memberJoinedAt?: string | null) {
  const joinedDate = parseIsoDate(memberJoinedAt)

  if (!joinedDate) {
    throw new Error("Set the member joined date before quick filling loans.")
  }

  const today = new Date()
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )
  const availableMonths = monthsBetween(joinedDate, todayUtc)
  const loanCount = availableMonths >= 18 ? 2 : 1
  const offsets = new Set<number>()

  while (offsets.size < loanCount) {
    offsets.add(randomInt(0, availableMonths))
  }

  const loanRows = Array.from(offsets)
    .sort((a, b) => a - b)
    .map((offset) => {
      const principalAmount = randomItem([120_000, 180_000, 250_000, 350_000])
      const repaymentMonths = randomItem([6, 9, 12, 18])
      const scheduledMonthlyPrincipalRepayment = Number(
        (principalAmount / repaymentMonths).toFixed(2)
      )

      return {
        ...createLoanRow(),
        openedAt: formatIsoDate(addMonths(joinedDate, offset)),
        principalAmount: String(principalAmount),
        savingsDuringLoan: String(randomItem([5000, 7500, 10_000, 15_000])),
        scheduledMonthlyPrincipalRepayment: String(
          scheduledMonthlyPrincipalRepayment
        ),
      }
    })

  return [...loanRows, createLoanRow()]
}

function buildRandomCommitmentHistoryRows(memberJoinedAt?: string | null) {
  const joinedDate = parseIsoDate(memberJoinedAt)

  if (!joinedDate) {
    throw new Error(
      "Set the member joined date before quick filling commitments."
    )
  }

  const today = new Date()
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )
  const availableMonths = monthsBetween(joinedDate, todayUtc)
  const rowCount = Math.min(
    availableMonths + 1,
    randomItem([3, 4, 5, 6])
  )
  const offsets = new Set<number>()

  while (offsets.size < rowCount) {
    offsets.add(randomInt(0, availableMonths))
  }

  const commitmentAmounts = shuffleValues([
    5000, 7500, 10_000, 12_500, 15_000, 17_500, 20_000, 25_000,
  ])
  const commitmentRows = Array.from(offsets)
    .sort((a, b) => a - b)
    .map((offset, index) => ({
      ...createCommitmentRow(),
      amount: String(commitmentAmounts[index]!),
      effectiveFrom: formatIsoDate(addMonths(joinedDate, offset)),
    }))

  return [...commitmentRows, createCommitmentRow()]
}

function normalizeCommitmentRows(rows: CommitmentHistoryInputRow[]) {
  const compactRows = rows.filter(
    (row, index) => commitmentRowHasValue(row) || index === rows.length - 1
  )
  const lastRow = compactRows.at(-1)

  if (!lastRow) {
    return [createCommitmentRow()]
  }

  if (commitmentRowHasValue(lastRow)) {
    return [...compactRows, createCommitmentRow()]
  }

  return compactRows
}

function normalizeLoanRows(rows: LoanHistoryInputRow[]) {
  const compactRows = rows.filter(
    (row, index) => loanRowHasValue(row) || index === rows.length - 1
  )
  const lastRow = compactRows.at(-1)

  if (!lastRow) {
    return [createLoanRow()]
  }

  if (loanRowHasValue(lastRow)) {
    return [...compactRows, createLoanRow()]
  }

  return compactRows
}

function CommitmentHistoryQuickFillButton({
  disabled,
  memberJoinedAt,
}: {
  disabled: boolean
  memberJoinedAt?: string | null
}) {
  const form = useFormContext<CommitmentHistoryFormValues>()
  const { showError } = useNotifications()

  function quickFillCommitments() {
    try {
      form.reset({
        rows: buildRandomCommitmentHistoryRows(memberJoinedAt),
      })
    } catch (error) {
      showError(
        "Could not quick fill commitments",
        error instanceof Error ? error.message : "Something went wrong."
      )
    }
  }

  return (
    <Button
      disabled={disabled || !memberJoinedAt}
      onClick={quickFillCommitments}
      size="sm"
      type="button"
      variant="ghost"
    >
      Quick fill
    </Button>
  )
}

function LoanHistoryQuickFillButton({
  disabled,
  memberJoinedAt,
}: {
  disabled: boolean
  memberJoinedAt?: string | null
}) {
  const form = useFormContext<LoanHistoryFormValues>()
  const { showError } = useNotifications()

  function quickFillLoans() {
    try {
      form.reset({
        rows: buildRandomLoanHistoryRows(memberJoinedAt),
      })
    } catch (error) {
      showError(
        "Could not quick fill loans",
        error instanceof Error ? error.message : "Something went wrong."
      )
    }
  }

  return (
    <Button
      disabled={disabled || !memberJoinedAt}
      onClick={quickFillLoans}
      size="sm"
      type="button"
      variant="ghost"
    >
      Quick fill
    </Button>
  )
}

function GuarantorMemberInput({
  disabled,
  fieldPrefix,
  joinedAt,
  label,
  memberNumberPrefix,
  options,
  row,
  updateRow,
}: {
  disabled: boolean
  fieldPrefix: "guarantorOne" | "guarantorTwo"
  joinedAt?: string | null
  label: string
  memberNumberPrefix?: string | null
  options: MemberOption[]
  row: LoanHistoryInputRow
  updateRow: (patch: Partial<LoanHistoryInputRow>) => void
}) {
  const [mode, setMode] = useState<"select" | "create">("select")
  const existingField = `${fieldPrefix}MemberId` as const
  const createFullNameField = `${fieldPrefix}CreateFullName` as const
  const createMemberNumberField = `${fieldPrefix}CreateMemberNumber` as const
  const createJoinedAtField = `${fieldPrefix}CreateJoinedAt` as const
  const createEmailField = `${fieldPrefix}CreateEmail` as const
  const createPhoneField = `${fieldPrefix}CreatePhone` as const
  const createValues = {
    [createFullNameField]: row[createFullNameField],
    [createMemberNumberField]: row[createMemberNumberField],
    [createJoinedAtField]: row[createJoinedAtField],
    [createEmailField]: row[createEmailField],
    [createPhoneField]: row[createPhoneField],
  }

  return (
    <div className="min-w-56 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <Button
          disabled={disabled}
          onClick={() => setMode(mode === "select" ? "create" : "select")}
          size="xs"
          type="button"
          variant="ghost"
        >
          {mode === "select" ? "Create" : "Select"}
        </Button>
      </div>

      {mode === "select" ? (
        <>
          <MemberAutocompleteSelect
            disabled={disabled}
            label={label}
            name={existingField}
            onValueChange={(memberId) => updateRow({ [existingField]: memberId })}
            options={options}
            placeholder="Search member"
            value={row[existingField]}
          />
          {Object.entries(createValues).map(([name]) => (
            <input key={name} name={name} type="hidden" value="" />
          ))}
        </>
      ) : (
        <div className="grid gap-2">
          <input name={existingField} type="hidden" value="" />
          <Input
            disabled={disabled}
            name={createFullNameField}
            onChange={(event) =>
              updateRow({ [createFullNameField]: event.target.value })
            }
            placeholder={`${label} full name`}
            value={row[createFullNameField]}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <Input
              disabled={disabled}
              name={createMemberNumberField}
              onChange={(event) =>
                updateRow({ [createMemberNumberField]: event.target.value })
              }
              placeholder={
                memberNumberPrefix
                  ? `${memberNumberPrefix} number`
                  : "Member number"
              }
              value={row[createMemberNumberField]}
            />
            <DatePickerInput
              disabled={disabled}
              min={joinedAt ?? undefined}
              name={createJoinedAtField}
              onChange={(value) =>
                updateRow({ [createJoinedAtField]: value })
              }
              placeholder="Joined"
              value={row[createJoinedAtField]}
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2">
            <Input
              disabled={disabled}
              name={createEmailField}
              onChange={(event) =>
                updateRow({ [createEmailField]: event.target.value })
              }
              placeholder="Email"
              type="email"
              value={row[createEmailField]}
            />
            <Input
              disabled={disabled}
              name={createPhoneField}
              onChange={(event) =>
                updateRow({ [createPhoneField]: event.target.value })
              }
              placeholder="Phone"
              value={row[createPhoneField]}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export function CommitmentHistoryEntryForm({
  disabled,
  memberId,
  memberJoinedAt,
}: {
  disabled: boolean
  memberId: string | null | undefined
  memberJoinedAt?: string | null
}) {
  const form = useZodForm<CommitmentHistoryFormValues>(
    commitmentHistoryFormSchema,
    {
      defaultValues: {
        rows: [createCommitmentRow("commitment-history-initial")],
      },
    }
  )
  const rows = form.watch("rows")

  function resetRows() {
    form.reset({
      rows: [createCommitmentRow("commitment-history-initial")],
    })
  }

  function updateRow(rowId: string, patch: Partial<CommitmentHistoryInputRow>) {
    const updatedRows = form
      .getValues("rows")
      .map((row) => (row.id === rowId ? { ...row, ...patch } : row))

    form.setValue("rows", normalizeCommitmentRows(updatedRows), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function sortRows() {
    form.setValue(
      "rows",
      [
        ...form
          .getValues("rows")
          .filter(commitmentRowHasValue)
          .sort(sortCommitmentRowsByDate),
        createCommitmentRow(),
      ],
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    )
  }

  return (
    <Form {...form}>
      <form action={upsertMemberAmountLogAction} className="space-y-3">
        <input name="memberId" type="hidden" value={memberId ?? ""} />
        <div className="flex items-center gap-3">
          <h3 className="shrink-0 text-sm font-medium">Commitment History</h3>
          <div className="min-w-10 flex-1 border-border/70 border-t" />
          <CommitmentHistoryQuickFillButton
            disabled={disabled || !memberId}
            memberJoinedAt={memberJoinedAt}
          />
          <Button
            aria-label="Sort commitment history by date"
            onClick={sortRows}
            size="sm"
            type="button"
            variant="ghost"
          >
            Sort
          </Button>
          <Button onClick={resetRows} size="sm" type="button" variant="ghost">
            Clear
          </Button>
        </div>
        <div className="grid gap-2">
          {rows.map((row) => (
            <div className="grid grid-cols-2 gap-2 sm:gap-3" key={row.id}>
              <DatePickerInput
                allowClear={false}
                disabled={disabled || !memberId}
                min={memberJoinedAt ?? undefined}
                name="effectiveFrom"
                onChange={(effectiveFrom) =>
                  updateRow(row.id, { effectiveFrom })
                }
                placeholder="Date"
                value={row.effectiveFrom}
              />
              <CurrencyPrefixInput
                disabled={disabled || !memberId}
                min="0"
                name="amount"
                onChange={(event) =>
                  updateRow(row.id, { amount: event.target.value })
                }
                placeholder="Amount"
                step="0.01"
                type="number"
                value={row.amount}
              />
              <input name="notes" type="hidden" value={row.notes} />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button disabled={disabled || !memberId} size="sm" type="submit">
            Save commitments
          </Button>
        </div>
      </form>
    </Form>
  )
}

export function LoanHistoryEntryForm({
  disabled,
  memberId,
  memberJoinedAt,
  memberNumberPrefix,
  memberOptions,
}: {
  disabled: boolean
  memberId: string | null | undefined
  memberJoinedAt?: string | null
  memberNumberPrefix?: string | null
  memberOptions: MemberOption[]
}) {
  const guarantorOptions = memberOptions.filter(
    (member) => member.id !== memberId
  )
  const form = useZodForm<LoanHistoryFormValues>(loanHistoryFormSchema, {
    defaultValues: {
      rows: [createLoanRow("loan-history-initial")],
    },
  })
  const rows = form.watch("rows")

  function resetRows() {
    form.reset({
      rows: [createLoanRow("loan-history-initial")],
    })
  }

  function updateRow(rowId: string, patch: Partial<LoanHistoryInputRow>) {
    const updatedRows = form
      .getValues("rows")
      .map((row) => (row.id === rowId ? { ...row, ...patch } : row))

    form.setValue("rows", normalizeLoanRows(updatedRows), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function sortRows() {
    form.setValue(
      "rows",
      [
        ...form.getValues("rows").filter(loanRowHasValue).sort(sortLoanRowsByDate),
        createLoanRow(),
      ],
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    )
  }

  return (
    <Form {...form}>
      <form action={createLegacyLoanMigrationDraftAction} className="space-y-3">
        <input name="memberId" type="hidden" value={memberId ?? ""} />
        <div className="flex items-center gap-3">
          <h3 className="shrink-0 text-sm font-medium">Loan History</h3>
          <div className="min-w-10 flex-1 border-border/70 border-t" />
          <LoanHistoryQuickFillButton
            disabled={disabled || !memberId}
            memberJoinedAt={memberJoinedAt}
          />
          <Button
            aria-label="Sort loan history by date"
            onClick={sortRows}
            size="sm"
            type="button"
            variant="ghost"
          >
            Sort
          </Button>
          <Button onClick={resetRows} size="sm" type="button" variant="ghost">
            Clear
          </Button>
        </div>
        <div className="grid gap-3">
          {rows.map((row) => (
            <div
              className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(140px,0.8fr)_minmax(130px,0.75fr)_minmax(220px,1.2fr)_minmax(220px,1.2fr)_minmax(130px,0.75fr)_minmax(130px,0.75fr)]"
              key={row.id}
            >
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Date
                </span>
                <DatePickerInput
                  allowClear={false}
                  disabled={disabled || !memberId}
                  min={memberJoinedAt ?? undefined}
                  name="openedAt"
                  onChange={(openedAt) => updateRow(row.id, { openedAt })}
                  placeholder="Date"
                  value={row.openedAt}
                />
                <input name="closedAt" type="hidden" value={row.closedAt} />
                <input name="notes" type="hidden" value={row.notes} />
                <input
                  name="outstandingPrincipalBalance"
                  type="hidden"
                  value={row.outstandingPrincipalBalance}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Amount
                </span>
                <CurrencyPrefixInput
                  disabled={disabled || !memberId}
                  min="0"
                  name="principalAmount"
                  onChange={(event) =>
                    updateRow(row.id, { principalAmount: event.target.value })
                  }
                  placeholder="Amount"
                  step="0.01"
                  type="number"
                  value={row.principalAmount}
                />
              </div>
              <GuarantorMemberInput
                disabled={disabled || !memberId}
                fieldPrefix="guarantorOne"
                joinedAt={memberJoinedAt}
                label="Guarantor 1"
                memberNumberPrefix={memberNumberPrefix}
                options={guarantorOptions}
                row={row}
                updateRow={(patch) => updateRow(row.id, patch)}
              />
              <GuarantorMemberInput
                disabled={disabled || !memberId}
                fieldPrefix="guarantorTwo"
                joinedAt={memberJoinedAt}
                label="Guarantor 2"
                memberNumberPrefix={memberNumberPrefix}
                options={guarantorOptions}
                row={row}
                updateRow={(patch) => updateRow(row.id, patch)}
              />
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Repayment
                </span>
                <CurrencyPrefixInput
                  disabled={disabled || !memberId}
                  min="0"
                  name="scheduledMonthlyPrincipalRepayment"
                  onChange={(event) =>
                    updateRow(row.id, {
                      scheduledMonthlyPrincipalRepayment: event.target.value,
                    })
                  }
                  placeholder="Repayment"
                  step="0.01"
                  type="number"
                  value={row.scheduledMonthlyPrincipalRepayment}
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Commitment
                </span>
                <CurrencyPrefixInput
                  disabled={disabled || !memberId}
                  min="0"
                  name="savingsDuringLoan"
                  onChange={(event) =>
                    updateRow(row.id, { savingsDuringLoan: event.target.value })
                  }
                  placeholder="Commitment"
                  step="0.01"
                  type="number"
                  value={row.savingsDuringLoan}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button disabled={disabled || !memberId} size="sm" type="submit">
            Save loans
          </Button>
        </div>
      </form>
    </Form>
  )
}
