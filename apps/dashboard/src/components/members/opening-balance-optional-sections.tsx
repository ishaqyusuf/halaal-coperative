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
import { Separator } from "@halaalvest/ui/components/separator"
import { DatePickerInput } from "@/components/date-picker-input"
import { GuarantorMemberCombobox } from "@/components/migration/member-migration-history-forms"
import { MemberCreateSheet } from "@/components/sheets/member-create-sheet"
import { OpeningCurrencyInput } from "./opening-currency-input"
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
      <OpeningCurrencyInput
        disabled={disabled}
        id={id}
        name={name}
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
        allowClear={false}
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
  cooperativeStartDate,
  disabled,
  guarantorOptions,
  memberNumberPrefix,
  quickFillEnabled,
}: {
  cooperativeStartDate?: string | null
  disabled?: boolean
  guarantorOptions: GuarantorOption[]
  memberNumberPrefix?: string | null
  quickFillEnabled: boolean
}) {
  const [sections, setSections] = useState<OptionalSection[]>([])
  const [activeFinancingOpenedAt, setActiveFinancingOpenedAt] = useState("")
  const [procurementOpenedAt, setProcurementOpenedAt] = useState("")
  const [foodPurchaseOpenedAt, setFoodPurchaseOpenedAt] = useState("")
  const [guarantorOneMemberId, setGuarantorOneMemberId] = useState("")
  const [guarantorTwoMemberId, setGuarantorTwoMemberId] = useState("")
  const [createdGuarantorOptions, setCreatedGuarantorOptions] = useState<
    GuarantorOption[]
  >([])
  const [creatingGuarantor, setCreatingGuarantor] = useState<{
    name: string
    target: "one" | "two"
  } | null>(null)
  const availableGuarantorOptions = [
    ...createdGuarantorOptions,
    ...guarantorOptions.filter(
      (option) =>
        !createdGuarantorOptions.some(
          (createdOption) => createdOption.id === option.id
        )
    ),
  ]

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

  function removeSection(section: OptionalSection) {
    setSections((current) => current.filter((item) => item !== section))

    if (section === "financing") {
      setActiveFinancingOpenedAt("")
    }
    if (section === "procurement") {
      setProcurementOpenedAt("")
    }
    if (section === "foodPurchase") {
      setFoodPurchaseOpenedAt("")
    }
  }

  function SectionHeading({
    description,
    section,
    title,
  }: {
    description: string
    section: OptionalSection
    title: string
  }) {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <FieldLegend>{title}</FieldLegend>
          <FieldDescription>{description}</FieldDescription>
        </div>
        <Button
          disabled={disabled}
          onClick={() => removeSection(section)}
          size="sm"
          type="button"
          variant="outline"
        >
          Remove
        </Button>
      </div>
    )
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
              <SectionHeading
                description="Capture the current loan being serviced and the remaining repayment plan."
                section="financing"
                title="Finance"
              />
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
                  <FieldLabel>Guarantor 1</FieldLabel>
                  <GuarantorMemberCombobox
                    disabled={Boolean(disabled)}
                    label="Guarantor 1"
                    onCreate={(name) =>
                      setCreatingGuarantor({ name, target: "one" })
                    }
                    onValueChange={setGuarantorOneMemberId}
                    options={availableGuarantorOptions}
                    value={guarantorOneMemberId}
                  />
                  <input
                    name="activeFinancingGuarantorOneMemberId"
                    onInput={(event) =>
                      setGuarantorOneMemberId(event.currentTarget.value)
                    }
                    type="hidden"
                    value={guarantorOneMemberId}
                  />
                </Field>
                <Field data-disabled={disabled ? true : undefined}>
                  <FieldLabel>Guarantor 2</FieldLabel>
                  <GuarantorMemberCombobox
                    disabled={Boolean(disabled)}
                    disabledOptionIds={[guarantorOneMemberId]}
                    label="Guarantor 2"
                    onCreate={(name) =>
                      setCreatingGuarantor({ name, target: "two" })
                    }
                    onValueChange={setGuarantorTwoMemberId}
                    options={availableGuarantorOptions}
                    value={guarantorTwoMemberId}
                  />
                  <input
                    name="activeFinancingGuarantorTwoMemberId"
                    onInput={(event) =>
                      setGuarantorTwoMemberId(event.currentTarget.value)
                    }
                    type="hidden"
                    value={guarantorTwoMemberId}
                  />
                </Field>
              </FieldGroup>
              <p className="text-xs text-muted-foreground">
                Guarantors must already have a member account. Complete each
                guarantor&apos;s brought-forward position from their own member
                record.
              </p>
            </FieldSet>
          ) : null}

          {sections.includes("procurement") ? (
            <FieldSet>
              <Separator />
              <SectionHeading
                description="Capture the current procurement item and remaining repayment plan."
                section="procurement"
                title="Procurement"
              />
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
              <SectionHeading
                description="Capture the current food purchase and remaining repayment plan."
                section="foodPurchase"
                title="Food budget"
              />
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
              <SectionHeading
                description="Upload or reference the source document used for this opening position."
                section="evidence"
                title="Document / evidence"
              />
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <OpeningSourceDocumentFields disabled={disabled} />
              </FieldGroup>
            </FieldSet>
          ) : null}
        </FieldGroup>
      ) : null}
      <MemberCreateSheet
        cooperativeStartDate={cooperativeStartDate}
        description="Create a member profile and select them as guarantor."
        devMode={quickFillEnabled}
        initialValues={{ fullName: creatingGuarantor?.name ?? "" }}
        memberNumberPrefix={memberNumberPrefix}
        onOpenChange={(open) => {
          if (!open) {
            setCreatingGuarantor(null)
          }
        }}
        onSuccess={(createdMember) => {
          const option = {
            id: createdMember.id,
            label: `${createdMember.fullName} (${createdMember.memberNumber})`,
          }

          setCreatedGuarantorOptions((current) => [
            option,
            ...current.filter((item) => item.id !== option.id),
          ])
          if (creatingGuarantor?.target === "one") {
            setGuarantorOneMemberId(option.id)
          } else if (creatingGuarantor?.target === "two") {
            setGuarantorTwoMemberId(option.id)
          }
          setCreatingGuarantor(null)
        }}
        open={Boolean(creatingGuarantor)}
        presentation="dialog"
        suppressBackfillPrompt
        title="Create guarantor"
      />
    </FieldSet>
  )
}
