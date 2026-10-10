import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { PaymentReceipt } from "@/components/tables/payment-receipts/columns"

interface PaymentReceiptsState {
  columns: Column<PaymentReceipt, unknown>[]
  setColumns: (columns?: Column<PaymentReceipt, unknown>[]) => void
}

export const usePaymentReceiptsStore = create<PaymentReceiptsState>()(
  (set) => ({
    columns: [],
    setColumns: (columns) => set({ columns: columns || [] }),
  })
)
