"use client"

import { useEffect, useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@halaalvest/ui/components/dropdown-menu"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@halaalvest/ui/components/field"
import { Input } from "@halaalvest/ui/components/input"
import {
  NativeSelect,
  NativeSelectOption,
} from "@halaalvest/ui/components/native-select"
import { Separator } from "@halaalvest/ui/components/separator"
import { DatePickerInput } from "@/components/date-picker-input"
import { OpeningSourceDocumentFields } from "./opening-source-document-fields"

type GuarantorOption = {
  id: string
  label: string
}

type OptionalSection = "evidence" | "financing" | "foodPurchase" | "procurement"

type AddSectionsDetail =
  | OptionalSection[]
  | {
      activeFinancingOpenedAt?: string
      foodPurchaseOpenedAt?: string
      procurementOpenedAt?: string
      sections: OptionalSection[]
    }

const sectionOptions: Array<{
  description: string
  label: string
  value: OptionalSection
}> = [
  {
    description: "Outstanding loan or financing balance.",
    label: "Finance",
    value: "financing",
  },
  {
    description: "Outstanding procurement balance.",
    label: "Procurement",
    value: "procurement",
  },
  {
    description: "Outstanding food purchase balance.",
    label: "Food budget",
    value: "foodPurchase",
  },
  {
    description: "Source document or upload evidence.",
    label: "Document / evidence",
    value: "evidence",
  },
]

function addUniqueSections(
  current: OptionalSection[],
  incoming: OptionalSection[]
) {
  const next = [...current]

  for (const section of incoming) {
    if (!next.includes(section)) {
      next.push(section)
    }
  }

  return next
}

function OpeningAmountField({
  disabled,
  label,
  name,
}: {
  disabled?: boolean
  label: string
  name: string
}) {
  const id = `member-opening-${name}`

  return (
    <Field data-disabled={disabled ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        disabled={disabled}
        id={id}
        min="0"
        name={name}
        placeholder="0"
        step="0.01"
        type="number"
      />
    </Field>
  )
}

function OpeningNumberField({
  disabled,
  label,
  name,
  placeholder = "0",
}: {
  disabled?: boolean
  label: string
  name: string
  placeholder?: string
}) {
  const id = `member-opening-${name}`

  return (
    <Field data-disabled={disabled ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        disabled={disabled}
        id={id}
        min="0"
        name={name}
        placeholder={placeholder}
        step="1"
        type="number"
      />
    </Field>
  )
}

function OpeningTextField({
  disabled,
  label,
  name,
  placeholder,
}: {
  disabled?: boolean
  label: string
  name: string
  placeholder?: string
}) {
  const id = `member-opening-${name}`

  return (
    <Field data-disabled={disabled ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        disabled={disabled}
        id={id}
        name={name}
        placeholder={placeholder}
      />
    </Field>
  )
}

function OpeningDateField({
  disabled,
  label,
  name,
  onChange,
  value,
}: {
  disabled?: boolean
  label: string
  name: string
  onChange: (value: string) => void
  value: string
}) {
  const id = `member-opening-${name}`

  return (
    <Field data-disabled={disabled ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DatePickerInput
        disabled={disabled}
        id={id}
        name={name}
        onChange={onChange}
        placeholder="Select date"
        value={value}
      />
    </Field>
  )
}

export function OpeningBalanceOptionalSections({
  disabled,
  guarantorOptions,
}: {
  disabled?: boolean
  guarantorOptions: GuarantorOption[]
}) {
  const [sections, setSections] = useState<OptionalSection[]>([])
  const [activeFinancingOpenedAt, setActiveFinancingOpenedAt] = useState("")
  const [procurementOpenedAt, setProcurementOpenedAt] = useState("")
  const [foodPurchaseOpenedAt, setFoodPurchaseOpenedAt] = useState("")

  useEffect(() => {
    function addSections(event: Event) {
      const detail = (event as CustomEvent<AddSectionsDetail>).detail
      const nextSections = Array.isArray(detail) ? detail : detail?.sections

      if (!Array.isArray(nextSections)) {
        return
      }

      setSections((current) => addUniqueSections(current, nextSections))

      if (!Array.isArray(detail)) {
        if (detail.activeFinancingOpenedAt) {
          setActiveFinancingOpenedAt(detail.activeFinancingOpenedAt)
        }
        if (detail.procurementOpenedAt) {
          setProcurementOpenedAt(detail.procurementOpenedAt)
        }
        if (detail.foodPurchaseOpenedAt) {
          setFoodPurchaseOpenedAt(detail.foodPurchaseOpenedAt)
        }
      }
    }

    window.addEventListener("member-opening:add-sections", addSections)

    return () => {
      window.removeEventListener("member-opening:add-sections", addSections)
    }
  }, [])

  function addSection(section: OptionalSection) {
    setSections((current) => addUniqueSections(current, [section]))
  }

  return (
    <FieldSet>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <FieldLegend>Add more details</FieldLegend>
          <FieldDescription>
            Add only the opening details that apply to this member.
          </FieldDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={disabled}
            render={
              <Button disabled={disabled} size="sm" type="button">
                Add
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              {sectionOptions.map((option) => (
                <DropdownMenuItem
                  data-disabled={sections.includes(option.value)}
                  disabled={sections.includes(option.value)}
                  key={option.value}
                  onClick={() => addSection(option.value)}
                >
                  <span className="flex flex-col gap-0.5">
                    <span>{option.label}</span>
                    <span className="text-muted-foreground">
                      {option.description}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {sections.length > 0 ? (
        <FieldGroup className="gap-6">
          {sections.includes("financing") ? (
            <FieldSet>
              <Separator />
              <FieldLegend>Finance</FieldLegend>
              <FieldDescription>
                Capture the current loan being serviced and the remaining
                repayment plan.
              </FieldDescription>
              <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <OpeningDateField
                  disabled={disabled}
                  label="Loan start date"
                  name="activeFinancingOpenedAt"
                  onChange={setActiveFinancingOpenedAt}
                  value={activeFinancingOpenedAt}
                />
                <OpeningAmountField
                  disabled={disabled}
                  label="Original loan amount"
                  name="activeFinancingOriginalAmount"
                />
                <OpeningAmountField
                  disabled={disabled}
                  label="Outstanding principal"
                  name="activeFinancingOutstanding"
                />
                <OpeningNumberField
                  disabled={disabled}
                  label="Repayment months"
                  name="activeFinancingRepaymentMonths"
                  placeholder="24"
                />
                <OpeningAmountField
                  disabled={disabled}
                  label="Monthly repayment"
                  name="activeFinancingInstallmentAmount"
                />
                <OpeningNumberField
                  disabled={disabled}
                  label="Installments paid"
                  name="activeFinancingInstallmentsPaid"
                />
                <Field data-disabled={disabled ? true : undefined}>
                  <FieldLabel htmlFor="member-opening-activeFinancingGuarantorOneMemberId">
                    Guarantor 1
                  </FieldLabel>
                  <NativeSelect
                    className="w-full"
                    disabled={disabled}
                    id="member-opening-activeFinancingGuarantorOneMemberId"
                    name="activeFinancingGuarantorOneMemberId"
                  >
                    <NativeSelectOption value="">
                      No guarantor
                    </NativeSelectOption>
                    {guarantorOptions.map((option) => (
                      <NativeSelectOption key={option.id} value={option.id}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field data-disabled={disabled ? true : undefined}>
                  <FieldLabel htmlFor="member-opening-activeFinancingGuarantorTwoMemberId">
                    Guarantor 2
                  </FieldLabel>
                  <NativeSelect
                    className="w-full"
                    disabled={disabled}
                    id="member-opening-activeFinancingGuarantorTwoMemberId"
                    name="activeFinancingGuarantorTwoMemberId"
                  >
                    <NativeSelectOption value="">
                      No guarantor
                    </NativeSelectOption>
                    {guarantorOptions.map((option) => (
                      <NativeSelectOption key={option.id} value={option.id}>
                        {option.label}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </FieldGroup>
            </FieldSet>
          ) : null}

          {sections.includes("procurement") ? (
            <FieldSet>
              <Separator />
              <FieldLegend>Procurement</FieldLegend>
              <FieldDescription>
                Capture the current procurement item and remaining repayment
                plan.
              </FieldDescription>
              <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <OpeningTextField
                  disabled={disabled}
                  label="Item"
                  name="procurementItemName"
                  placeholder="Phone, laptop, appliance..."
                />
                <OpeningDateField
                  disabled={disabled}
                  label="Purchase date"
                  name="procurementOpenedAt"
                  onChange={setProcurementOpenedAt}
                  value={procurementOpenedAt}
                />
                <OpeningAmountField
                  disabled={disabled}
                  label="Original amount"
                  name="procurementOriginalAmount"
                />
                <OpeningAmountField
                  disabled={disabled}
                  label="Outstanding procurement"
                  name="procurementOutstanding"
                />
                <OpeningNumberField
                  disabled={disabled}
                  label="Repayment months"
                  name="procurementRepaymentMonths"
                  placeholder="3"
                />
                <OpeningAmountField
                  disabled={disabled}
                  label="Monthly repayment"
                  name="procurementInstallmentAmount"
                />
                <OpeningNumberField
                  disabled={disabled}
                  label="Installments paid"
                  name="procurementInstallmentsPaid"
                />
              </FieldGroup>
            </FieldSet>
          ) : null}

          {sections.includes("foodPurchase") ? (
            <FieldSet>
              <Separator />
              <FieldLegend>Food budget</FieldLegend>
              <FieldDescription>
                Capture the current food purchase and remaining repayment plan.
              </FieldDescription>
              <FieldGroup className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <OpeningTextField
                  disabled={disabled}
                  label="Item"
                  name="foodPurchaseItemName"
                  placeholder="Bag of rice, beans..."
                />
                <OpeningDateField
                  disabled={disabled}
                  label="Purchase date"
                  name="foodPurchaseOpenedAt"
                  onChange={setFoodPurchaseOpenedAt}
                  value={foodPurchaseOpenedAt}
                />
                <OpeningAmountField
                  disabled={disabled}
                  label="Original amount"
                  name="foodPurchaseOriginalAmount"
                />
                <OpeningAmountField
                  disabled={disabled}
                  label="Outstanding food purchase"
                  name="foodPurchaseOutstanding"
                />
                <OpeningNumberField
                  disabled={disabled}
                  label="Repayment months"
                  name="foodPurchaseRepaymentMonths"
                  placeholder="2"
                />
                <OpeningAmountField
                  disabled={disabled}
                  label="Monthly repayment"
                  name="foodPurchaseInstallmentAmount"
                />
                <OpeningNumberField
                  disabled={disabled}
                  label="Installments paid"
                  name="foodPurchaseInstallmentsPaid"
                />
              </FieldGroup>
            </FieldSet>
          ) : null}

          {sections.includes("evidence") ? (
            <FieldSet>
              <Separator />
              <FieldLegend>Document / evidence</FieldLegend>
              <FieldDescription>
                Upload or reference the source document used for this opening
                position.
              </FieldDescription>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <OpeningSourceDocumentFields disabled={disabled} />
              </FieldGroup>
            </FieldSet>
          ) : null}
        </FieldGroup>
      ) : null}
    </FieldSet>
  )
}
