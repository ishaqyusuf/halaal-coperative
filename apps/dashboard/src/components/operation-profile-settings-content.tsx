"use client"

import type { TenantServiceKey } from "@halaalvest/db"
import { Button } from "@halaalvest/ui/components/button"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@halaalvest/ui/components/field"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { LabeledSelectInput } from "@/components/labeled-select-input"
import { updateTenantOperationProfileAction } from "@/lib/dashboard-actions"

const serviceRows = [
  {
    body: "Manual commitment proof, transfer receipts, cash office payments, and other payment evidence.",
    key: "payment_receipts",
    label: "Payment receipts",
  },
  {
    body: "Member procurement requests and staff-recorded procurement workflows.",
    key: "procurement",
    label: "Procurement",
  },
  {
    body: "Foodstuff Purchase applications and cycle participation.",
    key: "food_purchase",
    label: "Foodstuff Purchase",
  },
  {
    body: "Member support cases and official responses.",
    key: "support_cases",
    label: "Member support",
  },
  {
    body: "Ministry, employer, payroll, or other deduction-source records.",
    key: "collection_sources",
    label: "Collection sources",
  },
  {
    body: "Monthly batch posting when a collection source has released deductions.",
    key: "collection_source_batch_posting",
    label: "Source batch posting",
  },
] satisfies Array<{ body: string; key: TenantServiceKey; label: string }>

const accessModeOptions = [
  ["disabled", "Not offered"],
  ["office_only", "Office only"],
  ["member_self_service", "Member self-service"],
  ["read_only", "View only"],
] as const

function serviceAccessInputName(serviceKey: TenantServiceKey) {
  return `${serviceKey}AccessMode`
}

export function OperationProfileSettingsContent({
  policy,
  services,
}: {
  policy: {
    foodPurchaseMaximumActiveObligationsPerMember: number
    foodPurchaseRequiresOpenCycle: boolean
    procurementMaximumActiveObligationsPerMember: number
  }
  services: Record<TenantServiceKey, { accessMode: string }>
}) {
  return (
    <form
      action={updateTenantOperationProfileAction}
      className="grid gap-5 px-6"
    >
      <FieldSet>
        <FieldGroup>
          {serviceRows.map((service) => {
            const currentAccessMode = services[service.key].accessMode

            return (
              <Field key={service.key}>
                <FieldLabel htmlFor={serviceAccessInputName(service.key)}>
                  {service.label}
                </FieldLabel>
                <FieldDescription>{service.body}</FieldDescription>
                <LabeledSelectInput
                  defaultValue={currentAccessMode}
                  id={serviceAccessInputName(service.key)}
                  name={serviceAccessInputName(service.key)}
                  options={accessModeOptions.map(([value, label]) => ({
                    label,
                    value,
                  }))}
                />
              </Field>
            )
          })}
        </FieldGroup>
      </FieldSet>

      <Field>
        <FieldLabel htmlFor="changeReason">Change reason</FieldLabel>
        <Textarea
          id="changeReason"
          name="changeReason"
          placeholder="Required when reducing access. Example: Procurement is paused while the new cycle policy is approved."
        />
        <FieldDescription>
          Reasons are saved to the audit log with the before and after operation
          profile.
        </FieldDescription>
      </Field>

      <input
        name="procurementMaximumActiveObligationsPerMember"
        type="hidden"
        value={policy.procurementMaximumActiveObligationsPerMember}
      />
      <input
        name="foodPurchaseMaximumActiveObligationsPerMember"
        type="hidden"
        value={policy.foodPurchaseMaximumActiveObligationsPerMember}
      />
      <input
        name="foodPurchaseRequiresOpenCycle"
        type="hidden"
        value={policy.foodPurchaseRequiresOpenCycle ? "true" : "false"}
      />

      <Button className="w-fit" type="submit">
        Save operation profile
      </Button>
    </form>
  )
}
