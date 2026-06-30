import { TableSkeleton } from "@/components/dashboard/static-table"

export function ShareSkeleton() {
  return (
    <TableSkeleton
      columns={[
        { key: "effectiveFrom", label: "Effective date", render: () => null },
        { key: "rule", label: "Rule", render: () => null },
        { key: "value", label: "Value", render: () => null },
        { key: "notes", label: "Notes", render: () => null },
        { key: "status", label: "Status", render: () => null },
      ]}
      rowCount={6}
    />
  )
}
