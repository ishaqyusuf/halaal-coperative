import type { Column, RowSelectionState, Updater } from "@tanstack/react-table"
import { create } from "zustand"
import type { PaymentReceipt } from "@/components/tables/payment-receipts/columns"

interface PaymentReceiptsState {
  columns: Column<PaymentReceipt, unknown>[]
  rowSelection: RowSelectionState
  setColumns: (columns?: Column<PaymentReceipt, unknown>[]) => void
  setRowSelection: (updater: Updater<RowSelectionState>) => void
}

export const usePaymentReceiptsStore = create<PaymentReceiptsState>()(
  (set) => ({
    columns: [],
    rowSelection: {},
    setColumns: (columns) => set({ columns: columns || [] }),
    setRowSelection: (updater) =>
      set((state) => ({
        rowSelection:
          typeof updater === "function" ? updater(state.rowSelection) : updater,
      })),
  })
)
