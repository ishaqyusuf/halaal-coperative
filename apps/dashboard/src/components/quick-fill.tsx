"use client"

import { useState } from "react"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { CurrencyInput } from "@halaalvest/ui/components/currency-input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@halaalvest/ui/components/dialog"
import { Field, FieldLabel } from "@halaalvest/ui/components/field"
import { Input } from "@halaalvest/ui/components/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@halaalvest/ui/components/input-group"
import { DatePickerInput } from "@/components/date-picker-input"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import {
  buildQuickFillDates,
  parseQuickFillArgs,
  quickFillers,
  type BusinessProfitHistoryQuickFillTemplate,
  type ChargeHistoryQuickFillTemplate,
  type CommitmentHistoryQuickFillTemplate,
  type LoanHistoryQuickFillTemplate,
  type QuickFillArgs,
  type QuickFillArgsFor,
  type QuickFillInterval,
  type QuickFillName,
  type QuickFillTemplateFor,
  type ShareHistoryQuickFillTemplate,
} from "@/lib/quick-fill"

function CurrencyTemplateInput({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <CurrencyInput
      allowNegative={false}
      decimalScale={2}
      inputMode="decimal"
      placeholder={placeholder}
      value={value ?? ""}
      valueIsNumericString
      onValueChange={(values) => onChange(values.value)}
    />
  )
}

function PercentageTemplateInput({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <InputGroup>
      <InputGroupInput
        className="text-right"
        inputMode="decimal"
        min="0"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        step="0.01"
        type="number"
        value={value ?? ""}
      />
      <InputGroupAddon align="inline-end">%</InputGroupAddon>
    </InputGroup>
  )
}

function updateTemplateValue<Name extends QuickFillName>(
  setTemplate: (
    updater: (
      template: QuickFillTemplateFor<Name>
    ) => QuickFillTemplateFor<Name>
  ) => void,
  patch: Partial<QuickFillTemplateFor<Name>>
) {
  setTemplate((currentTemplate) => ({ ...currentTemplate, ...patch }))
}

function renderChargeHistoryTemplateFields<Name extends QuickFillName>({
  setTemplate,
  template,
}: {
  setTemplate: (
    updater: (
      template: QuickFillTemplateFor<Name>
    ) => QuickFillTemplateFor<Name>
  ) => void
  template: ChargeHistoryQuickFillTemplate
}) {
  return (
    <Field>
      <FieldLabel>Amount *</FieldLabel>
      <CurrencyTemplateInput
        onChange={(amount) =>
          updateTemplateValue(setTemplate, {
            amount,
          } as unknown as Partial<QuickFillTemplateFor<Name>>)
        }
        placeholder="2000"
        value={template.amount}
      />
    </Field>
  )
}

function renderShareHistoryTemplateFields<Name extends QuickFillName>({
  setTemplate,
  template,
}: {
  setTemplate: (
    updater: (
      template: QuickFillTemplateFor<Name>
    ) => QuickFillTemplateFor<Name>
  ) => void
  template: ShareHistoryQuickFillTemplate
}) {
  return (
    <>
      <Field>
        <FieldLabel>Rule</FieldLabel>
        <LabeledSelectInput
          onValueChange={(value) =>
            updateTemplateValue(setTemplate, {
              valueType: value as ShareHistoryQuickFillTemplate["valueType"],
            } as unknown as Partial<QuickFillTemplateFor<Name>>)
          }
          options={[
            { label: "Fixed amount", value: "fixed_amount" },
            {
              label: "Percentage after charges",
              value: "percentage",
            },
          ]}
          value={template.valueType}
        />
      </Field>
      <Field>
        <FieldLabel>Value *</FieldLabel>
        {template.valueType === "percentage" ? (
          <PercentageTemplateInput
            onChange={(amount) =>
              updateTemplateValue(setTemplate, {
                amount,
              } as unknown as Partial<QuickFillTemplateFor<Name>>)
            }
            placeholder="10"
            value={template.amount}
          />
        ) : (
          <CurrencyTemplateInput
            onChange={(amount) =>
              updateTemplateValue(setTemplate, {
                amount,
              } as unknown as Partial<QuickFillTemplateFor<Name>>)
            }
            placeholder="15000"
            value={template.amount}
          />
        )}
      </Field>
    </>
  )
}

function renderBusinessProfitHistoryTemplateFields<Name extends QuickFillName>({
  setTemplate,
  template,
}: {
  setTemplate: (
    updater: (
      template: QuickFillTemplateFor<Name>
    ) => QuickFillTemplateFor<Name>
  ) => void
  template: BusinessProfitHistoryQuickFillTemplate
}) {
  return (
    <>
      <Field>
        <FieldLabel>Amount *</FieldLabel>
        <CurrencyTemplateInput
          onChange={(amount) =>
            updateTemplateValue(setTemplate, {
              amount,
            } as unknown as Partial<QuickFillTemplateFor<Name>>)
          }
          placeholder="Amount"
          value={template.amount}
        />
      </Field>
      <Field>
        <FieldLabel>Deduction</FieldLabel>
        <CurrencyTemplateInput
          onChange={(deductionAmount) =>
            updateTemplateValue(setTemplate, {
              deductionAmount,
            } as unknown as Partial<QuickFillTemplateFor<Name>>)
          }
          placeholder="Deduction"
          value={template.deductionAmount}
        />
      </Field>
      <Field className="sm:col-span-2">
        <FieldLabel>Reason</FieldLabel>
        <Input
          onChange={(event) =>
            updateTemplateValue(setTemplate, {
              reason: event.target.value,
            } as unknown as Partial<QuickFillTemplateFor<Name>>)
          }
          placeholder="Reason"
          type="text"
          value={template.reason}
        />
      </Field>
    </>
  )
}

function renderCommitmentHistoryTemplateFields<Name extends QuickFillName>({
  setTemplate,
  template,
}: {
  setTemplate: (
    updater: (
      template: QuickFillTemplateFor<Name>
    ) => QuickFillTemplateFor<Name>
  ) => void
  template: CommitmentHistoryQuickFillTemplate
}) {
  return (
    <Field>
      <FieldLabel>Amount *</FieldLabel>
      <CurrencyTemplateInput
        onChange={(amount) =>
          updateTemplateValue(setTemplate, {
            amount,
          } as unknown as Partial<QuickFillTemplateFor<Name>>)
        }
        placeholder="5000"
        value={template.amount}
      />
    </Field>
  )
}

function renderLoanHistoryTemplateFields<Name extends QuickFillName>({
  setTemplate,
  template,
}: {
  setTemplate: (
    updater: (
      template: QuickFillTemplateFor<Name>
    ) => QuickFillTemplateFor<Name>
  ) => void
  template: LoanHistoryQuickFillTemplate
}) {
  return (
    <>
      <Field>
        <FieldLabel>Principal *</FieldLabel>
        <CurrencyTemplateInput
          onChange={(principalAmount) =>
            updateTemplateValue(setTemplate, {
              principalAmount,
            } as unknown as Partial<QuickFillTemplateFor<Name>>)
          }
          placeholder="120000"
          value={template.principalAmount}
        />
      </Field>
      <Field>
        <FieldLabel>Repayment *</FieldLabel>
        <CurrencyTemplateInput
          onChange={(scheduledMonthlyPrincipalRepayment) =>
            updateTemplateValue(setTemplate, {
              scheduledMonthlyPrincipalRepayment,
            } as unknown as Partial<QuickFillTemplateFor<Name>>)
          }
          placeholder="10000"
          value={template.scheduledMonthlyPrincipalRepayment}
        />
      </Field>
      <Field>
        <FieldLabel>Commitment *</FieldLabel>
        <CurrencyTemplateInput
          onChange={(savingsDuringLoan) =>
            updateTemplateValue(setTemplate, {
              savingsDuringLoan,
            } as unknown as Partial<QuickFillTemplateFor<Name>>)
          }
          placeholder="5000"
          value={template.savingsDuringLoan}
        />
      </Field>
    </>
  )
}

function renderTemplateFields<Name extends QuickFillName>({
  name,
  setTemplate,
  template,
}: {
  name: Name
  setTemplate: (
    updater: (
      template: QuickFillTemplateFor<Name>
    ) => QuickFillTemplateFor<Name>
  ) => void
  template: QuickFillTemplateFor<Name>
}) {
  if (name === "chargeHistory") {
    return renderChargeHistoryTemplateFields({
      setTemplate,
      template: template as ChargeHistoryQuickFillTemplate,
    })
  }

  if (name === "shareHistory") {
    return renderShareHistoryTemplateFields({
      setTemplate,
      template: template as ShareHistoryQuickFillTemplate,
    })
  }

  if (name === "commitmentHistory") {
    return renderCommitmentHistoryTemplateFields({
      setTemplate,
      template: template as CommitmentHistoryQuickFillTemplate,
    })
  }

  if (name === "loanHistory") {
    return renderLoanHistoryTemplateFields({
      setTemplate,
      template: template as LoanHistoryQuickFillTemplate,
    })
  }

  return renderBusinessProfitHistoryTemplateFields({
    setTemplate,
    template: template as BusinessProfitHistoryQuickFillTemplate,
  })
}

export function QuickFill<Name extends QuickFillName>({
  args,
  label = "Quick fill",
  name,
}: {
  args: QuickFillArgs[Name]
  label?: string
  name: Name
}) {
  const parsedArgs = parseQuickFillArgs({
    name,
    ...args,
  } as unknown as QuickFillArgsFor<Name>)
  const quickFill = quickFillers[name] as unknown as {
    fill: (input: {
      args: QuickFillArgs[Name]
      dates: string[]
      template: QuickFillTemplateFor<Name>
    }) => void
    initialTemplate: QuickFillTemplateFor<Name>
    title: string
  }
  const { showError } = useNotifications()
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState(parsedArgs.minDate ?? "")
  const [endDate, setEndDate] = useState(parsedArgs.maxDate ?? "")
  const [interval, setInterval] = useState<QuickFillInterval>("monthly")
  const [template, setTemplate] = useState<QuickFillTemplateFor<Name>>(() => ({
    ...quickFill.initialTemplate,
  }))

  function fillRows() {
    try {
      const dates = buildQuickFillDates({
        endDate,
        interval,
        maxDate: parsedArgs.maxDate,
        minDate: parsedArgs.minDate,
        startDate,
      })

      quickFill.fill({
        args: parsedArgs as unknown as QuickFillArgs[Name],
        dates,
        template,
      })
      setOpen(false)
    } catch (error) {
      showError(
        "Could not quick fill",
        error instanceof Error ? error.message : "Something went wrong."
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            disabled={parsedArgs.disabled}
            size="sm"
            type="button"
            variant="ghost"
          />
        }
      >
        {label}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{quickFill.title}</DialogTitle>
          <DialogDescription>
            Generate dated history rows inside the current form, then review
            before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel>Start date *</FieldLabel>
            <DatePickerInput
              allowClear={false}
              min={parsedArgs.minDate ?? undefined}
              onChange={setStartDate}
              placeholder="Start date"
              value={startDate}
            />
          </Field>
          <Field>
            <FieldLabel>End date *</FieldLabel>
            <DatePickerInput
              allowClear={false}
              min={startDate || parsedArgs.minDate || undefined}
              onChange={setEndDate}
              placeholder="End date"
              value={endDate}
            />
          </Field>
          <Field>
            <FieldLabel>Interval</FieldLabel>
            <LabeledSelectInput
              onValueChange={(value) => setInterval(value as QuickFillInterval)}
              options={[
                { label: "Monthly", value: "monthly" },
                { label: "Yearly", value: "yearly" },
              ]}
              value={interval}
            />
          </Field>
          {renderTemplateFields({
            name,
            setTemplate,
            template,
          })}
        </div>
        <DialogFooter>
          <Button
            disabled={parsedArgs.disabled}
            onClick={fillRows}
            type="button"
          >
            Fill rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
