import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { MembershipApprovalRow } from "@/components/tables/membership-approvals/columns"

interface MembershipApprovalTableState {
  columns: Column<MembershipApprovalRow, unknown>[]
  setColumns: (columns?: Column<MembershipApprovalRow, unknown>[]) => void
}

export const useMembershipApprovalTableStore =
  create<MembershipApprovalTableState>()((set) => ({
    columns: [],
    setColumns: (columns) => set({ columns: columns || [] }),
  }))
