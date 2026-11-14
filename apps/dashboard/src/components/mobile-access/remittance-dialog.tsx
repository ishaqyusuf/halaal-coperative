"use client"

import { Button } from "@halaalvest/ui/components/button"
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@halaalvest/ui/components/dialog"
import { Input } from "@halaalvest/ui/components/input"
import { Label } from "@halaalvest/ui/components/label"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState, type FormEvent } from "react"
import { createQaReference, qaToday } from "@halaalvest/utils"
import { DashboardStateQuickFill } from "@/components/dashboard-quick-fill"
import {
  useMarkWorkflowSaved,
  WorkflowPresentation,
} from "@/components/workflow-presentation"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"
import { formatAccessAmount, formatBillingMonth } from "./format"
import type { MobileAccessInvoice } from "./mobile-invoice-list"

/** Record a confirmed bank transfer (`?remitInvoiceId=`). Platform owners only. */
export function RemittanceDialog({
  invoice,
  onClose,
}: {
  invoice?: MobileAccessInvoice
  onClose: () => void
}) {
  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("mobileAccess", "remittance")}
      onOpenChange={(open) => !open && onClose()}
      open={Boolean(invoice)}
    >
      {invoice ? (
        <RemittanceForm invoice={invoice} key={invoice.id} onClose={onClose} />
      ) : null}
    </WorkflowPresentation>
  )
}

function RemittanceForm({
  invoice,
  onClose,
}: {
  invoice: MobileAccessInvoice
  onClose: () => void
}) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const markSaved = useMarkWorkflowSaved()
  const [reference, setReference] = useState("")
  const [paidAt, setPaidAt] = useState("")
  const remittance = useMutation(
    trpc.cooperativeMobileBilling.recordRemittance.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries(
            trpc.cooperativeMobileBilling.listReceivables.queryFilter()
          ),
          queryClient.invalidateQueries(
            trpc.cooperativeMobileBilling.listInvoices.queryFilter()
          ),
          queryClient.invalidateQueries(
            trpc.cooperativeMobileBilling.invoiceDetail.queryFilter()
          ),
        ])
        markSaved()
        onClose()
      },
    })
  )

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (remittance.isPending || !paidAt || !reference.trim()) return
    remittance.mutate({
      invoiceId: invoice.id,
      reference: reference.trim(),
      paidAt,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold">
          Mark bill paid
        </DialogTitle>
        <DialogDescription className="text-base">
          {invoice.tenantName} paid{" "}
          {formatAccessAmount(invoice.totalAmount, invoice.currencyCode)} for{" "}
          {formatBillingMonth(invoice.period)}.
        </DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={submit}>
        <DashboardStateQuickFill
          draft={{ paidAt, reference }}
          enabled={!remittance.isPending}
          isDirty={Boolean(reference || paidAt)}
          onFill={() => {
            setReference(createQaReference("REMIT"))
            setPaidAt(qaToday())
          }}
          restore={(draft) => {
            setReference(draft.reference)
            setPaidAt(draft.paidAt)
          }}
        />
        <div className="space-y-2">
          <Label className="text-base" htmlFor="mobile-remittance-reference">
            Bank reference
          </Label>
          <Input
            className="h-11 text-base"
            disabled={remittance.isPending}
            id="mobile-remittance-reference"
            maxLength={120}
            onChange={(event) => setReference(event.target.value)}
            required
            value={reference}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-base" htmlFor="mobile-remittance-date">
            Date received
          </Label>
          <Input
            className="h-11 text-base"
            disabled={remittance.isPending}
            id="mobile-remittance-date"
            onChange={(event) => setPaidAt(event.target.value)}
            required
            type="date"
            value={paidAt}
          />
        </div>
        {remittance.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {remittance.error.message}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            className="h-11 text-base"
            disabled={remittance.isPending}
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="h-11 text-base"
            disabled={remittance.isPending || !reference.trim() || !paidAt}
            type="submit"
          >
            {remittance.isPending ? "Saving…" : "Mark paid"}
          </Button>
        </DialogFooter>
      </form>
    </>
  )
}
