"use client"

import { Button } from "@halaalvest/ui/components/button"

type OpeningPositionQuickFillValues = {
  activeFinancingGuarantorOneMemberId?: string
  activeFinancingGuarantorTwoMemberId?: string
  openingDate: string
  shareCapitalBalance: string
}

function setFieldValue(field: Element | RadioNodeList | null, value: string) {
  if (!field || field instanceof RadioNodeList) {
    return
  }

  if (
    !(
      field instanceof HTMLInputElement ||
      field instanceof HTMLSelectElement ||
      field instanceof HTMLTextAreaElement
    )
  ) {
    return
  }

  const valueSetter = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(field),
    "value"
  )?.set

  if (valueSetter) {
    valueSetter.call(field, value)
  } else {
    field.value = value
  }

  field.dispatchEvent(new Event("input", { bubbles: true }))
  field.dispatchEvent(new Event("change", { bubbles: true }))
}

export function OpeningBalanceQuickFillButton({
  disabled,
  formId,
  values,
}: {
  disabled?: boolean
  formId: string
  values: OpeningPositionQuickFillValues
}) {
  function quickFillOpeningPosition() {
    const form = document.getElementById(formId)

    if (!(form instanceof HTMLFormElement)) {
      return
    }

    window.dispatchEvent(
      new CustomEvent("member-opening:add-sections", {
        detail: {
          activeFinancingOpenedAt: "2026-01-01",
          foodPurchaseOpenedAt: "2026-05-01",
          procurementOpenedAt: "2026-06-01",
          sections: ["financing", "procurement", "foodPurchase", "evidence"],
        },
      })
    )

    const defaults = {
      activeFinancingGuarantorOneMemberId:
        values.activeFinancingGuarantorOneMemberId ?? "",
      activeFinancingGuarantorTwoMemberId:
        values.activeFinancingGuarantorTwoMemberId ?? "",
      activeFinancingInstallmentAmount: "66666.67",
      activeFinancingInstallmentsPaid: "5",
      activeFinancingOpenedAt: "2026-01-01",
      activeFinancingOriginalAmount: "1600000",
      activeFinancingRepaymentMonths: "24",
      activeFinancingOutstanding: "1266667",
      commitmentSavingsBalance: "830000",
      foodPurchaseInstallmentAmount: "25000",
      foodPurchaseInstallmentsPaid: "1",
      foodPurchaseItemName: "Bag of rice",
      foodPurchaseOpenedAt: "2026-05-01",
      foodPurchaseOriginalAmount: "50000",
      foodPurchaseOutstanding: "25000",
      foodPurchaseRepaymentMonths: "2",
      openingDate: values.openingDate,
      procurementInstallmentAmount: "166666.67",
      procurementInstallmentsPaid: "0",
      procurementItemName: "Phone",
      procurementOpenedAt: "2026-06-01",
      procurementOriginalAmount: "500000",
      procurementOutstanding: "500000",
      procurementRepaymentMonths: "3",
      shareCapitalBalance: values.shareCapitalBalance,
      shareUnits: "1",
      sourceDocumentName: "Opening position schedule",
      sourceDocumentUrl: "",
      specialSavingsBalance: "200000",
    }

    window.setTimeout(() => {
      for (const [name, value] of Object.entries(defaults)) {
        setFieldValue(form.elements.namedItem(name), value)
      }
    }, 50)
  }

  return (
    <Button
      disabled={disabled}
      onClick={quickFillOpeningPosition}
      size="sm"
      type="button"
      variant="outline"
    >
      Quick fill
    </Button>
  )
}
