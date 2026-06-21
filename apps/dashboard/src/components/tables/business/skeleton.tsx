import { TableSkeleton } from "@/components/tables/core"

export function BusinessSkeleton() {
  return (
    <TableSkeleton
      columns={[
        { key: "business", label: "Business", render: () => null },
        { key: "period", label: "Period", render: () => null },
        { key: "capital", label: "Capital", render: () => null },
        { key: "profit", label: "Allocatable profit", render: () => null },
        {
          key: "latestProfit",
          label: "Latest profit entry",
          render: () => null,
        },
        { key: "status", label: "Status", render: () => null },
      ]}
      rowCount={8}
    />
  )
}
