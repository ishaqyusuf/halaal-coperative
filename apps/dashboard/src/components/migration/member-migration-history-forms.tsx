"use client"

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@halaalvest/ui/components/command"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import { Form, useFormContext } from "@halaalvest/ui/components/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@halaalvest/ui/components/popover"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import { ChevronsUpDownIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import type { FieldErrors, FieldPath } from "react-hook-form"
import { z } from "zod"
import { DatePickerInput } from "@/components/date-picker-input"
import { MemberBackfillFooterPortal } from "@/components/members/member-backfill-footer-slot"
import { MemberCreateModal } from "@/components/modals/member-create-modal"
import { useCreateMemberParams } from "@/hooks/use-create-member-params"
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
  rowId: string
}

type LoanHistoryInputRow = {
  closedAt: string
  draftId: string
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
  loanLabel: string
  notes: string
  openedAt: string
  outstandingPrincipalBalance: string
  principalAmount: string
  savingsDuringLoan: string
  scheduledMonthlyPrincipalRepayment: string
}

type GuarantorFieldPrefix = "guarantorOne" | "guarantorTwo"

type PendingGuarantorTarget = {
  fieldPrefix: GuarantorFieldPrefix
  rowId: string
}

type CommitmentHistoryInitialRow = {
  amount: number
  effectiveFrom: string
  id: string
  notes: string | null
}

type LoanHistoryInitialRow = {
  closedAt: string | null
  guarantorOneMemberId: string | null
  guarantorTwoMemberId: string | null
  id: string
  loanLabel: string
  notes?: string | null
  openedAt: string
  outstandingPrincipalBalance: number
  principalAmount: number
  savingsDuringLoan: number
  scheduledMonthlyPrincipalRepayment: number
}

const commitmentHistoryRowSchema = z
  .object({
    amount: z.string(),
    effectiveFrom: z.string(),
    id: z.string(),
    notes: z.string(),
    rowId: z.string(),
  })
  .superRefine((row, ctx) => {
    const rowStarted = commitmentRowHasValue(row)

    if (!rowStarted) {
      return
    }

    if (!row.effectiveFrom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Date is required.",
        path: ["effectiveFrom"],
      })
    }

    if (!row.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount is required.",
        path: ["amount"],
      })
      return
    }

    const amount = Number(row.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Amount must be greater than 0.",
        path: ["amount"],
      })
    }
  })

const commitmentHistoryFormSchema = z.object({
  rows: z.array(commitmentHistoryRowSchema).min(1),
})

type CommitmentHistoryFormValues = z.infer<typeof commitmentHistoryFormSchema>

const loanHistoryRowSchema = z
  .object({
    closedAt: z.string(),
    draftId: z.string(),
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
    loanLabel: z.string(),
    notes: z.string(),
    openedAt: z.string(),
    outstandingPrincipalBalance: z.string(),
    principalAmount: z.string(),
    savingsDuringLoan: z.string(),
    scheduledMonthlyPrincipalRepayment: z.string(),
  })
  .superRefine((row, ctx) => {
    const rowStarted = loanRowHasValue(row)

    if (rowStarted) {
      if (!row.openedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Date is required.",
          path: ["openedAt"],
        })
      }

      if (!row.principalAmount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount is required.",
          path: ["principalAmount"],
        })
      }

      if (!row.scheduledMonthlyPrincipalRepayment) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Repayment is required.",
          path: ["scheduledMonthlyPrincipalRepayment"],
        })
      }

      if (!row.savingsDuringLoan) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Commitment is required.",
          path: ["savingsDuringLoan"],
        })
      }

      const principalAmount = Number(row.principalAmount)
      const repaymentAmount = Number(row.scheduledMonthlyPrincipalRepayment)

      if (
        row.principalAmount &&
        (!Number.isFinite(principalAmount) || principalAmount <= 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount must be greater than 0.",
          path: ["principalAmount"],
        })
      }

      if (
        row.scheduledMonthlyPrincipalRepayment &&
        (!Number.isFinite(repaymentAmount) || repaymentAmount <= 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Repayment must be greater than 0.",
          path: ["scheduledMonthlyPrincipalRepayment"],
        })
      }

      if (
        row.principalAmount &&
        row.scheduledMonthlyPrincipalRepayment &&
        Number.isFinite(principalAmount) &&
        Number.isFinite(repaymentAmount) &&
        principalAmount > 0 &&
        repaymentAmount > 0 &&
        principalAmount <= repaymentAmount
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Repayment must be less than loan amount.",
          path: ["scheduledMonthlyPrincipalRepayment"],
        })
      }
    }

    if (
      row.guarantorOneMemberId &&
      row.guarantorTwoMemberId &&
      row.guarantorOneMemberId === row.guarantorTwoMemberId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "G1 and G2 cannot be the same member.",
        path: ["guarantorTwoMemberId"],
      })
    }
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
    rowId: "",
  }
}

function createLoanRow(id?: string): LoanHistoryInputRow {
  return {
    closedAt: "",
    draftId: "",
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
    loanLabel: "",
    notes: "",
    openedAt: "",
    outstandingPrincipalBalance: "",
    principalAmount: "",
    savingsDuringLoan: "",
    scheduledMonthlyPrincipalRepayment: "",
  }
}

function buildCommitmentHistoryRows(
  initialRows: CommitmentHistoryInitialRow[] | undefined
) {
  if (!initialRows?.length) {
    return [createCommitmentRow("commitment-history-initial")]
  }

  return [
    ...initialRows.map((row) => ({
      ...createCommitmentRow(`commitment-history-${row.id}`),
      amount: String(row.amount),
      effectiveFrom: row.effectiveFrom,
      notes: row.notes ?? "",
      rowId: row.id,
    })),
    createCommitmentRow(),
  ]
}

function buildLoanHistoryRows(initialRows: LoanHistoryInitialRow[] | undefined) {
  if (!initialRows?.length) {
    return [createLoanRow("loan-history-initial")]
  }

  return [
    ...initialRows.map((row) => ({
      ...createLoanRow(`loan-history-${row.id}`),
      closedAt: row.closedAt ?? "",
      draftId: row.id,
      guarantorOneMemberId: row.guarantorOneMemberId ?? "",
      guarantorTwoMemberId: row.guarantorTwoMemberId ?? "",
      loanLabel: row.loanLabel,
      notes: row.notes ?? "",
      openedAt: row.openedAt,
      outstandingPrincipalBalance: String(row.outstandingPrincipalBalance),
      principalAmount: String(row.principalAmount),
      savingsDuringLoan: String(row.savingsDuringLoan),
      scheduledMonthlyPrincipalRepayment: String(
        row.scheduledMonthlyPrincipalRepayment
      ),
    })),
    createLoanRow(),
  ]
}

function commitmentRowHasValue(row: CommitmentHistoryInputRow) {
  return Boolean(row.amount || row.effectiveFrom || row.notes)
}

function loanRowHasValue(row: LoanHistoryInputRow) {
  return Boolean(
    row.closedAt ||
      row.draftId ||
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
      row.loanLabel ||
      row.notes ||
      row.openedAt ||
      row.outstandingPrincipalBalance ||
      row.principalAmount ||
      row.savingsDuringLoan ||
      row.scheduledMonthlyPrincipalRepayment
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

function chooseRandomGuarantors(options: MemberOption[]) {
  if (options.length < 2) {
    return {
      guarantorOneMemberId: options[0]?.id ?? "",
      guarantorTwoMemberId: "",
    }
  }

  const [guarantorOne, guarantorTwo] = shuffleValues(options)

  return {
    guarantorOneMemberId: guarantorOne?.id ?? "",
    guarantorTwoMemberId: guarantorTwo?.id ?? "",
  }
}

function buildRandomLoanHistoryRows(
  memberJoinedAt?: string | null,
  guarantorOptions: MemberOption[] = []
) {
  const joinedDate = parseIsoDate(memberJoinedAt)

  if (!joinedDate) {
    throw new Error("Set the member joined date before quick filling loans.")
  }

  const today = new Date()
  const todayUtc = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  )
  const availableMonths = monthsBetween(joinedDate, todayUtc)
  const targetLoanCount =
    availableMonths >= 36
      ? randomItem([2, 3])
      : availableMonths >= 18
        ? randomItem([1, 2])
        : 1
  const repaymentMonthOptions = [6, 8, 12, 16]
  const loanRows: Array<{
    openedOffset: number
    repaymentMonths: number
    row: LoanHistoryInputRow
  }> = []
  let nextOffset = randomInt(0, Math.min(4, availableMonths))

  while (loanRows.length < targetLoanCount && nextOffset <= availableMonths) {
    const remainingMonths = availableMonths - nextOffset
    const needsNextLoan = loanRows.length < targetLoanCount - 1
    const maximumRepaymentMonths = needsNextLoan
      ? Math.max(1, remainingMonths - 1)
      : Math.max(6, remainingMonths)
    const availableRepaymentMonthOptions = repaymentMonthOptions.filter(
      (months) => months <= maximumRepaymentMonths
    )

    if (availableRepaymentMonthOptions.length === 0) {
      break
    }

    const repaymentMonths = randomItem(availableRepaymentMonthOptions)
    const principalAmount = randomItem([120_000, 180_000, 250_000, 350_000])
    const scheduledMonthlyPrincipalRepayment = Number(
      (principalAmount / repaymentMonths).toFixed(2)
    )

    loanRows.push({
      openedOffset: nextOffset,
      repaymentMonths,
      row: {
        ...createLoanRow(),
        ...chooseRandomGuarantors(guarantorOptions),
        openedAt: formatIsoDate(addMonths(joinedDate, nextOffset)),
        principalAmount: String(principalAmount),
        savingsDuringLoan: String(randomItem([5000, 7500, 10_000, 15_000])),
        scheduledMonthlyPrincipalRepayment: String(
          scheduledMonthlyPrincipalRepayment
        ),
      },
    })

    if (!needsNextLoan) {
      break
    }

    const maximumGapMonths = Math.max(1, remainingMonths - repaymentMonths)
    nextOffset += repaymentMonths + randomInt(1, Math.min(4, maximumGapMonths))
  }

  return [
    ...loanRows.map((loan, index) => {
      const hasNextLoan = index < loanRows.length - 1

      return {
        ...loan.row,
        closedAt: hasNextLoan
          ? formatIsoDate(
              addMonths(joinedDate, loan.openedOffset + loan.repaymentMonths)
            )
          : "",
        outstandingPrincipalBalance: "",
      }
    }),
    createLoanRow(),
  ]
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

function sortLoanRowsWithBlankTail(rows: LoanHistoryInputRow[]) {
  const normalizedRows = normalizeLoanRows(rows)
  const filledRows = normalizedRows
    .filter(loanRowHasValue)
    .sort(sortLoanRowsByDate)
  const blankRows = normalizedRows.filter((row) => !loanRowHasValue(row))

  return [
    ...filledRows,
    ...(blankRows.length > 0 ? blankRows : [createLoanRow()]),
  ]
}

function getCommitmentRowFieldError(
  errors: FieldErrors<CommitmentHistoryFormValues>,
  rowIndex: number,
  fieldName: keyof CommitmentHistoryInputRow
) {
  const rowErrors = errors.rows?.[rowIndex] as
    | Partial<Record<keyof CommitmentHistoryInputRow, unknown>>
    | undefined

  return Boolean(rowErrors?.[fieldName])
}

function getLoanRowFieldError(
  errors: FieldErrors<LoanHistoryFormValues>,
  rowIndex: number,
  fieldName: keyof LoanHistoryInputRow
) {
  const rowErrors = errors.rows?.[rowIndex] as
    | Partial<Record<keyof LoanHistoryInputRow, unknown>>
    | undefined

  return Boolean(rowErrors?.[fieldName])
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
  guarantorOptions,
  memberJoinedAt,
}: {
  disabled: boolean
  guarantorOptions: MemberOption[]
  memberJoinedAt?: string | null
}) {
  const form = useFormContext<LoanHistoryFormValues>()
  const { showError } = useNotifications()

  function quickFillLoans() {
    try {
      form.reset({
        rows: buildRandomLoanHistoryRows(memberJoinedAt, guarantorOptions),
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

function GuarantorMemberCombobox({
  disabled,
  disabledOptionIds = [],
  invalid,
  label,
  onCreate,
  onValueChange,
  options,
  value,
}: {
  disabled: boolean
  disabledOptionIds?: readonly string[]
  invalid?: boolean
  label: string
  onCreate: (name: string) => void
  onValueChange: (memberId: string) => void
  options: MemberOption[]
  value: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const createName = query.trim()
  const selectedOption = options.find((option) => option.id === value)
  const disabledOptionIdSet = useMemo(
    () => new Set(disabledOptionIds),
    [disabledOptionIds]
  )
  const filteredOptions = useMemo(() => {
    const normalizedQuery = createName.toLowerCase()

    if (!normalizedQuery) {
      return options.slice(0, 50)
    }

    return options
      .filter((option) => option.label.toLowerCase().includes(normalizedQuery))
      .slice(0, 50)
  }, [createName, options])

  function selectMember(nextValue: string) {
    onValueChange(nextValue)
    setQuery("")
    setOpen(false)
  }

  function createMember() {
    if (!createName) {
      return
    }

    onCreate(createName)
    setQuery("")
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            aria-expanded={open}
            aria-invalid={invalid}
            aria-label={label}
            className={cn(
              "w-full justify-between text-left font-normal",
              !selectedOption && "text-muted-foreground"
            )}
            disabled={disabled}
            type="button"
            variant="outline"
          />
        }
      >
        <span className="truncate">
          {selectedOption?.label ?? "Search member"}
        </span>
        <ChevronsUpDownIcon className="size-3.5 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-1" sideOffset={6}>
        <Command shouldFilter={false}>
          <CommandInput
            onValueChange={setQuery}
            placeholder="Search member"
            value={query}
          />
          <CommandList>
            {createName ? (
              <CommandItem
                onSelect={createMember}
                value={`create:${createName}`}
              >
                <PlusIcon className="size-3.5" />
                <span className="truncate">{`Create "${createName}"`}</span>
              </CommandItem>
            ) : value ? (
              <CommandItem onSelect={() => selectMember("")} value="clear">
                No guarantor
              </CommandItem>
            ) : null}

            {filteredOptions.length > 0 ? (
              <CommandGroup>
                {filteredOptions.map((option) => {
                  const isOptionDisabled = disabledOptionIdSet.has(option.id)

                  return (
                    <CommandItem
                      data-checked={option.id === value}
                      disabled={isOptionDisabled}
                      key={option.id}
                      onSelect={() => {
                        if (!isOptionDisabled) {
                          selectMember(option.id)
                        }
                      }}
                      value={option.id}
                    >
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ) : (
              <CommandEmpty>No members found.</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

function GuarantorMemberInput({
  className,
  disabled,
  disabledOptionIds,
  fieldPrefix,
  invalid,
  label,
  onCreateMember,
  options,
  row,
  updateRow,
}: {
  className?: string
  disabled: boolean
  disabledOptionIds?: readonly string[]
  fieldPrefix: GuarantorFieldPrefix
  invalid?: boolean
  label: string
  onCreateMember: (target: {
    fieldPrefix: GuarantorFieldPrefix
    name: string
    rowId: string
  }) => void
  options: MemberOption[]
  row: LoanHistoryInputRow
  updateRow: (patch: Partial<LoanHistoryInputRow>) => void
}) {
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
    <div className={cn("space-y-1", className)}>
      <GuarantorMemberCombobox
        disabled={disabled}
        disabledOptionIds={disabledOptionIds}
        invalid={invalid}
        label={label}
        onCreate={(name) =>
          onCreateMember({
            fieldPrefix,
            name,
            rowId: row.id,
          })
        }
        onValueChange={(memberId) => updateRow({ [existingField]: memberId })}
        options={options}
        value={row[existingField]}
      />
      <input name={existingField} type="hidden" value={row[existingField]} />
      {Object.entries(createValues).map(([name]) => (
        <input key={name} name={name} type="hidden" value="" />
      ))}
    </div>
  )
}

function DeleteLoanHistoryRowButton({
  className,
  disabled,
  onDelete,
}: {
  className?: string
  disabled: boolean
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className={cn("space-y-1", className)}>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger
          render={
            <Button
              aria-label="Delete loan row"
              className="size-8"
              disabled={disabled}
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <Trash2Icon className="size-3.5" />
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete loan row?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the row from the form before it is saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete()
                setOpen(false)
              }}
              type="button"
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DeleteCommitmentHistoryRowButton({
  disabled,
  onDelete,
}: {
  disabled: boolean
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            aria-label="Delete commitment row"
            className="size-8"
            disabled={disabled}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <Trash2Icon className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete commitment row?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the row from the form before it is saved.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete()
              setOpen(false)
            }}
            type="button"
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function CommitmentHistoryEntryForm({
  disabled,
  formId,
  initialRows,
  memberId,
  memberJoinedAt,
  redirectTo,
  showSubmitButton = true,
}: {
  disabled: boolean
  formId?: string
  initialRows?: CommitmentHistoryInitialRow[]
  memberId: string | null | undefined
  memberJoinedAt?: string | null
  redirectTo?: string
  showSubmitButton?: boolean
}) {
  const router = useRouter()
  const form = useZodForm<CommitmentHistoryFormValues>(
    commitmentHistoryFormSchema,
    {
      defaultValues: {
        rows: buildCommitmentHistoryRows(initialRows),
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

  function deleteRow(rowId: string) {
    const updatedRows = form
      .getValues("rows")
      .filter((row) => row.id !== rowId)

    form.setValue("rows", normalizeCommitmentRows(updatedRows), {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  function validateBeforeSubmit(event: FormEvent<HTMLFormElement>) {
    const result = commitmentHistoryFormSchema.safeParse(form.getValues())

    if (result.success) {
      return
    }

    event.preventDefault()
    form.clearErrors()

    for (const issue of result.error.issues) {
      if (issue.path.length === 0) {
        continue
      }

      form.setError(
        issue.path.join(".") as FieldPath<CommitmentHistoryFormValues>,
        {
          message: issue.message,
          type: "manual",
        }
      )
    }
  }

  async function saveCommitmentRows(formData: FormData) {
    await upsertMemberAmountLogAction(formData)

    const redirectTarget = formData.get("redirectTo")

    if (typeof redirectTarget === "string" && redirectTarget.startsWith("/")) {
      router.push(redirectTarget)
      return
    }

    router.refresh()
  }

  return (
    <Form {...form}>
      <form
        action={saveCommitmentRows}
        className="space-y-3"
        id={formId}
        onSubmit={validateBeforeSubmit}
      >
        <input name="memberId" type="hidden" value={memberId ?? ""} />
        {redirectTo ? (
          <>
            <input name="redirectTo" type="hidden" value={redirectTo} />
            <input name="allowEmptyRows" type="hidden" value="true" />
          </>
        ) : null}
        <div className="flex items-center gap-3">
          <h3 className="shrink-0 text-sm font-medium">Commitment History</h3>
          <div className="min-w-10 flex-1 border-border/70 border-t" />
          <CommitmentHistoryQuickFillButton
            disabled={disabled || !memberId}
            memberJoinedAt={memberJoinedAt}
          />
          <Button onClick={resetRows} size="sm" type="button" variant="ghost">
            Clear
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] table-fixed border-separate border-spacing-x-2 border-spacing-y-2 border-0 [&_td]:border-0 [&_td]:p-0 [&_th]:border-0 [&_th]:p-0 [&_tr]:border-0">
            <colgroup>
              <col className="w-[150px]" />
              <col />
              <col className="w-8" />
            </colgroup>
            <thead>
              <tr>
                <th
                  className="text-left text-xs font-medium text-muted-foreground"
                  scope="col"
                >
                  Date
                </th>
                <th
                  className="text-left text-xs font-medium text-muted-foreground"
                  scope="col"
                >
                  Amount
                </th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const effectiveFromError = getCommitmentRowFieldError(
                  form.formState.errors,
                  rowIndex,
                  "effectiveFrom"
                )
                const amountError = getCommitmentRowFieldError(
                  form.formState.errors,
                  rowIndex,
                  "amount"
                )

                return (
                  <tr className="align-top" key={row.id}>
                    <td>
                      <input name="rowId" type="hidden" value={row.rowId} />
                      <DatePickerInput
                        allowClear={false}
                        aria-invalid={Boolean(effectiveFromError)}
                        aria-label="Commitment date"
                        disabled={disabled || !memberId}
                        min={memberJoinedAt ?? undefined}
                        name="effectiveFrom"
                        onChange={(effectiveFrom) =>
                          updateRow(row.id, { effectiveFrom })
                        }
                        placeholder="Select commitment date"
                        value={row.effectiveFrom}
                      />
                      <input name="notes" type="hidden" value={row.notes} />
                    </td>
                    <td>
                      <CurrencyInput
                        allowNegative={false}
                        aria-invalid={Boolean(amountError)}
                        aria-label="Commitment amount"
                        decimalScale={2}
                        disabled={disabled || !memberId}
                        inputMode="decimal"
                        onValueChange={(values) =>
                          updateRow(row.id, { amount: values.value })
                        }
                        placeholder="Enter commitment amount"
                        value={row.amount}
                        valueIsNumericString
                      />
                      <input name="amount" type="hidden" value={row.amount} />
                    </td>
                    <td>
                      <DeleteCommitmentHistoryRowButton
                        disabled={disabled || !memberId}
                        onDelete={() => deleteRow(row.id)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {showSubmitButton ? (
          <div className="flex justify-end">
            <Button disabled={disabled || !memberId} size="sm" type="submit">
              Save commitments
            </Button>
          </div>
        ) : null}
        {redirectTo && formId ? (
          <MemberBackfillFooterPortal>
            <Button disabled={disabled || !memberId} form={formId} type="submit">
              Next
            </Button>
          </MemberBackfillFooterPortal>
        ) : null}
      </form>
    </Form>
  )
}

export function LoanHistoryEntryForm({
  disabled,
  formId,
  initialRows,
  memberId,
  memberJoinedAt,
  memberNumberPrefix,
  memberOptions,
  redirectTo,
  showSubmitButton = true,
}: {
  disabled: boolean
  formId?: string
  initialRows?: LoanHistoryInitialRow[]
  memberId: string | null | undefined
  memberJoinedAt?: string | null
  memberNumberPrefix?: string | null
  memberOptions: MemberOption[]
  redirectTo?: string
  showSubmitButton?: boolean
}) {
  const router = useRouter()
  const {
    gm,
    gmId,
    memberId: createMemberId,
    name: createMemberName,
    setParams: setCreateMemberParams,
  } = useCreateMemberParams()
  const [pendingGuarantorTarget, setPendingGuarantorTarget] =
    useState<PendingGuarantorTarget | null>(null)
  const [flashRowId, setFlashRowId] = useState<string | null>(null)
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [quickCreatedGuarantorOptions, setQuickCreatedGuarantorOptions] =
    useState<MemberOption[]>([])
  const guarantorOptions = useMemo(() => {
    const optionsById = new Map<string, MemberOption>()

    for (const option of quickCreatedGuarantorOptions) {
      if (option.id !== memberId) {
        optionsById.set(option.id, option)
      }
    }

    for (const option of memberOptions) {
      if (option.id !== memberId) {
        optionsById.set(option.id, option)
      }
    }

    return Array.from(optionsById.values())
  }, [memberId, memberOptions, quickCreatedGuarantorOptions])
  const form = useZodForm<LoanHistoryFormValues>(loanHistoryFormSchema, {
    defaultValues: {
      rows: buildLoanHistoryRows(initialRows),
    },
  })
  const rows = form.watch("rows")

  function resetRows() {
    form.reset({
      rows: [createLoanRow("loan-history-initial")],
    })
  }

  const updateRow = useCallback(
    (rowId: string, patch: Partial<LoanHistoryInputRow>) => {
      const updatedRows = form
        .getValues("rows")
        .map((row) => (row.id === rowId ? { ...row, ...patch } : row))

      form.setValue("rows", normalizeLoanRows(updatedRows), {
        shouldDirty: true,
        shouldValidate: true,
      })
    },
    [form]
  )

  const flashMovedRow = useCallback((rowId: string) => {
    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current)
    }

    setFlashRowId(rowId)
    flashTimeoutRef.current = setTimeout(() => {
      setFlashRowId(null)
      flashTimeoutRef.current = null
    }, 900)
  }, [])

  const updateLoanDate = useCallback(
    (rowId: string, openedAt: string) => {
      const currentRows = form.getValues("rows")
      const beforeIndex = currentRows.findIndex((row) => row.id === rowId)
      const editedRows = currentRows.map((row) =>
        row.id === rowId ? { ...row, openedAt } : row
      )
      const sortedRows = sortLoanRowsWithBlankTail(editedRows)
      const afterIndex = sortedRows.findIndex((row) => row.id === rowId)

      form.setValue("rows", sortedRows, {
        shouldDirty: true,
        shouldValidate: true,
      })

      if (beforeIndex !== afterIndex) {
        flashMovedRow(rowId)
      }
    },
    [flashMovedRow, form]
  )

  const deleteRow = useCallback(
    (rowId: string) => {
      const updatedRows = form
        .getValues("rows")
        .filter((row) => row.id !== rowId)

      form.setValue("rows", normalizeLoanRows(updatedRows), {
        shouldDirty: true,
        shouldValidate: true,
      })
    },
    [form]
  )

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!gmId || !pendingGuarantorTarget) {
      return
    }

    const existingField =
      `${pendingGuarantorTarget.fieldPrefix}MemberId` as const

    updateRow(pendingGuarantorTarget.rowId, {
      [existingField]: gmId,
    } as Partial<LoanHistoryInputRow>)
    router.refresh()
    void setCreateMemberParams({ gmId: null })
  }, [
    gmId,
    pendingGuarantorTarget,
    router,
    setCreateMemberParams,
    updateRow,
  ])

  function handleCreateGuarantor({
    fieldPrefix,
    name,
    rowId,
  }: {
    fieldPrefix: GuarantorFieldPrefix
    name: string
    rowId: string
  }) {
    setPendingGuarantorTarget({ fieldPrefix, rowId })
    void setCreateMemberParams({
      gm: true,
      gmId: null,
      memberId: "-1",
      name,
    })
  }

  const validateBeforeSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      const result = loanHistoryFormSchema.safeParse(form.getValues())

      if (result.success) {
        return
      }

      event.preventDefault()
      form.clearErrors()

      for (const issue of result.error.issues) {
        if (issue.path.length === 0) {
          continue
        }

        form.setError(issue.path.join(".") as FieldPath<LoanHistoryFormValues>, {
          message: issue.message,
          type: "manual",
        })
      }
    },
    [form]
  )

  const saveLoanRows = useCallback(
    async (formData: FormData) => {
      await createLegacyLoanMigrationDraftAction(formData)

      const redirectTarget = formData.get("redirectTo")

      if (
        typeof redirectTarget === "string" &&
        redirectTarget.startsWith("/")
      ) {
        router.push(redirectTarget)
        return
      }

      router.refresh()
    },
    [router]
  )

  return (
    <>
      <Form {...form}>
        <form
          action={saveLoanRows}
          className="space-y-3"
          id={formId}
          onSubmit={validateBeforeSubmit}
        >
          <input name="memberId" type="hidden" value={memberId ?? ""} />
          {redirectTo ? (
            <>
              <input name="redirectTo" type="hidden" value={redirectTo} />
              <input name="allowEmptyRows" type="hidden" value="true" />
            </>
          ) : null}
          <div className="flex items-center gap-3">
            <h3 className="shrink-0 text-sm font-medium">Loan History</h3>
            <div className="min-w-10 flex-1 border-border/70 border-t" />
            <LoanHistoryQuickFillButton
              disabled={disabled || !memberId}
              guarantorOptions={guarantorOptions}
              memberJoinedAt={memberJoinedAt}
            />
            <Button onClick={resetRows} size="sm" type="button" variant="ghost">
              Clear
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] table-fixed border-separate border-spacing-x-2 border-spacing-y-2 border-0 [&_td]:border-0 [&_td]:p-0 [&_th]:border-0 [&_th]:p-0 [&_tr]:border-0">
              <colgroup>
                <col className="w-[112px]" />
                <col className="w-[116px]" />
                <col />
                <col />
                <col className="w-[116px]" />
                <col className="w-[116px]" />
                <col className="w-8" />
              </colgroup>
              <thead>
                <tr>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground"
                    scope="col"
                  >
                    Date
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground"
                    scope="col"
                  >
                    Amount
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground"
                    scope="col"
                  >
                    G1
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground"
                    scope="col"
                  >
                    G2
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground"
                    scope="col"
                  >
                    Repayment
                  </th>
                  <th
                    className="text-left text-xs font-medium text-muted-foreground"
                    scope="col"
                  >
                    Commitment
                  </th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => {
                  const openedAtError = getLoanRowFieldError(
                    form.formState.errors,
                    rowIndex,
                    "openedAt"
                  )
                  const principalAmountError = getLoanRowFieldError(
                    form.formState.errors,
                    rowIndex,
                    "principalAmount"
                  )
                  const guarantorTwoError = getLoanRowFieldError(
                    form.formState.errors,
                    rowIndex,
                    "guarantorTwoMemberId"
                  )
                  const repaymentError = getLoanRowFieldError(
                    form.formState.errors,
                    rowIndex,
                    "scheduledMonthlyPrincipalRepayment"
                  )
                  const savingsDuringLoanError = getLoanRowFieldError(
                    form.formState.errors,
                    rowIndex,
                    "savingsDuringLoan"
                  )

                  return (
                    <tr
                      className={cn(
                        "align-top [&_td]:transition-colors [&_td]:duration-700",
                        flashRowId === row.id && "[&_td]:bg-muted/70"
                      )}
                      key={row.id}
                    >
                      <td>
                        <DatePickerInput
                          allowClear={false}
                          aria-invalid={Boolean(openedAtError)}
                          aria-label="Loan date"
                          disabled={disabled || !memberId}
                          min={memberJoinedAt ?? undefined}
                          name="openedAt"
                          onChange={(openedAt) =>
                            updateLoanDate(row.id, openedAt)
                          }
                          placeholder="Select loan date"
                          value={row.openedAt}
                        />
                        <input
                          name="draftId"
                          type="hidden"
                          value={row.draftId}
                        />
                        <input
                          name="closedAt"
                          type="hidden"
                          value={row.closedAt}
                        />
                        <input
                          name="loanLabel"
                          type="hidden"
                          value={row.loanLabel}
                        />
                        <input name="notes" type="hidden" value={row.notes} />
                        <input
                          name="outstandingPrincipalBalance"
                          type="hidden"
                          value={row.outstandingPrincipalBalance}
                        />
                      </td>
                      <td>
                        <CurrencyInput
                          allowNegative={false}
                          aria-invalid={Boolean(principalAmountError)}
                          aria-label="Loan amount"
                          decimalScale={2}
                          disabled={disabled || !memberId}
                          inputMode="decimal"
                          onValueChange={(values) =>
                            updateRow(row.id, {
                              principalAmount: values.value,
                            })
                          }
                          placeholder="Enter loan amount"
                          value={row.principalAmount}
                          valueIsNumericString
                        />
                        <input
                          name="principalAmount"
                          type="hidden"
                          value={row.principalAmount}
                        />
                      </td>
                      <td>
                        <GuarantorMemberInput
                          disabled={disabled || !memberId}
                          fieldPrefix="guarantorOne"
                          label="G1"
                          onCreateMember={handleCreateGuarantor}
                          options={guarantorOptions}
                          row={row}
                          updateRow={(patch) =>
                            updateRow(row.id, {
                              ...patch,
                              ...(patch.guarantorOneMemberId &&
                              patch.guarantorOneMemberId ===
                                row.guarantorTwoMemberId
                                ? { guarantorTwoMemberId: "" }
                                : {}),
                            })
                          }
                        />
                      </td>
                      <td>
                        <GuarantorMemberInput
                          disabled={disabled || !memberId}
                          disabledOptionIds={
                            row.guarantorOneMemberId
                              ? [row.guarantorOneMemberId]
                              : []
                          }
                          fieldPrefix="guarantorTwo"
                          invalid={Boolean(guarantorTwoError)}
                          label="G2"
                          onCreateMember={handleCreateGuarantor}
                          options={guarantorOptions}
                          row={row}
                          updateRow={(patch) => updateRow(row.id, patch)}
                        />
                      </td>
                      <td>
                        <CurrencyInput
                          allowNegative={false}
                          aria-invalid={Boolean(repaymentError)}
                          aria-label="Monthly repayment"
                          decimalScale={2}
                          disabled={disabled || !memberId}
                          inputMode="decimal"
                          onValueChange={(values) =>
                            updateRow(row.id, {
                              scheduledMonthlyPrincipalRepayment:
                                values.value,
                            })
                          }
                          placeholder="Enter monthly repayment"
                          value={row.scheduledMonthlyPrincipalRepayment}
                          valueIsNumericString
                        />
                        <input
                          name="scheduledMonthlyPrincipalRepayment"
                          type="hidden"
                          value={row.scheduledMonthlyPrincipalRepayment}
                        />
                      </td>
                      <td>
                        <CurrencyInput
                          allowNegative={false}
                          aria-invalid={Boolean(savingsDuringLoanError)}
                          aria-label="Savings commitment during loan"
                          decimalScale={2}
                          disabled={disabled || !memberId}
                          inputMode="decimal"
                          onValueChange={(values) =>
                            updateRow(row.id, {
                              savingsDuringLoan: values.value,
                            })
                          }
                          placeholder="Enter savings commitment"
                          value={row.savingsDuringLoan}
                          valueIsNumericString
                        />
                        <input
                          name="savingsDuringLoan"
                          type="hidden"
                          value={row.savingsDuringLoan}
                        />
                      </td>
                      <td>
                        <DeleteLoanHistoryRowButton
                          disabled={disabled || !memberId}
                          onDelete={() => deleteRow(row.id)}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {showSubmitButton ? (
            <div className="flex justify-end">
              <Button disabled={disabled || !memberId} size="sm" type="submit">
                Save loans
              </Button>
            </div>
          ) : null}
          {redirectTo && formId ? (
            <MemberBackfillFooterPortal>
              <Button
                disabled={disabled || !memberId}
                form={formId}
                type="submit"
              >
                Next
              </Button>
            </MemberBackfillFooterPortal>
          ) : null}
        </form>
      </Form>

      <MemberCreateModal
        description="Create a member profile and select them as guarantor."
        devMode={process.env.NODE_ENV !== "production"}
        initialValues={{ fullName: createMemberName ?? "" }}
        memberNumberPrefix={memberNumberPrefix}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            void setCreateMemberParams({
              gm: false,
              memberId: "-1",
              name: null,
            })
          }
        }}
        onSuccess={(createdMember) => {
          const option = {
            id: createdMember.id,
            label: `${createdMember.fullName} (${createdMember.memberNumber})`,
          }

          setQuickCreatedGuarantorOptions((currentOptions) => [
            option,
            ...currentOptions.filter((current) => current.id !== option.id),
          ])
          void setCreateMemberParams({
            gm: false,
            gmId: createdMember.id,
            memberId: "-1",
            name: null,
          })
        }}
        open={Boolean(gm && createMemberId === "-1")}
        suppressBackfillPrompt
        title="Create guarantor"
      />
    </>
  )
}
