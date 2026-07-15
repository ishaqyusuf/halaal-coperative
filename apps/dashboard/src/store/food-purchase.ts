import type { Column, RowSelectionState, Updater } from "@tanstack/react-table"
import { create } from "zustand"
import type { FoodPurchaseApplication } from "@/components/tables/food-purchase/columns"

interface FoodPurchaseState {
  columns: Column<FoodPurchaseApplication, unknown>[]
  rowSelection: RowSelectionState
  setColumns: (columns?: Column<FoodPurchaseApplication, unknown>[]) => void
  setRowSelection: (updater: Updater<RowSelectionState>) => void
}

export const useFoodPurchaseStore = create<FoodPurchaseState>()((set) => ({
  columns: [],
  rowSelection: {},
  setColumns: (columns) => set({ columns: columns || [] }),
  setRowSelection: (updater) =>
    set((state) => ({
      rowSelection:
        typeof updater === "function" ? updater(state.rowSelection) : updater,
    })),
}))
