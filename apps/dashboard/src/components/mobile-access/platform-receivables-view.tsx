"use client"

import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { useTRPC } from "@/trpc/client"
import { MobileAccessLoadError, MobileAccessLoading } from "./access-page-state"
import {
  MobileInvoiceList,
  type MobileAccessInvoice,
} from "./mobile-invoice-list"
import { RemittanceDialog } from "./remittance-dialog"

export function PlatformReceivablesView() {
  const trpc = useTRPC()
  const receivables = useQuery(
    trpc.cooperativeMobileBilling.listReceivables.queryOptions()
  )
  const [selectedInvoice, setSelectedInvoice] = useState<MobileAccessInvoice>()

  if (receivables.isPending) {
    return <MobileAccessLoading label="Loading cooperative invoices…" />
  }

  if (!receivables.data) {
    return (
      <MobileAccessLoadError
        message="Cooperative invoices could not be loaded."
        retry={() => void receivables.refetch()}
      />
    )
  }

  return (
    <>
      {receivables.isError ? (
        <MobileAccessLoadError
          message="Cooperative invoices could not be refreshed."
          retry={() => void receivables.refetch()}
        />
      ) : null}
      <MobileInvoiceList
        action={{
          label: "Record remittance",
          run: setSelectedInvoice,
          when: (invoice) => invoice.status === "issued",
        }}
        disabled={receivables.isError}
        invoices={receivables.data}
      />
      {selectedInvoice ? (
        <RemittanceDialog
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(undefined)}
        />
      ) : null}
    </>
  )
}
