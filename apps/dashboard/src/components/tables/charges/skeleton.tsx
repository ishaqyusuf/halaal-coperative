import { TableSkeleton } from "@/components/dashboard/static-table"

export function Loading() {
  return (
    <TableSkeleton
      columns={[
        { key: "charge", label: "Charge", render: () => null },
        { key: "frequency", label: "Frequency", render: () => null },
        { key: "currentAmount", label: "Current amount", render: () => null },
        { key: "valueType", label: "Value type", render: () => null },
        { key: "history", label: "History", render: () => null },
        { key: "status", label: "Status", render: () => null },
      ]}
      rowCount={8}
    />
  )
}
