import type { Column } from "@tanstack/react-table"
import { create } from "zustand"
import type { NotificationDeliveryRow } from "@/components/tables/notifications/data-table"

interface NotificationTableState {
  columns: Column<NotificationDeliveryRow, unknown>[]
  setColumns: (columns?: Column<NotificationDeliveryRow, unknown>[]) => void
}

export const useNotificationTableStore = create<NotificationTableState>()(
  (set) => ({
    columns: [],
    setColumns: (columns) => set({ columns: columns || [] }),
  })
)
