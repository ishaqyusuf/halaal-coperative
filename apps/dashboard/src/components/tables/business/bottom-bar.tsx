"use client"

import { Button } from "@halaalvest/ui/components/button"
import { BottomBar } from "@/components/tables/core"
import type { Business } from "./columns"

function escapeCsv(value: unknown) {
  const text = String(value ?? "")
  return `"${text.replaceAll('"', '""')}"`
}

export function BusinessBottomBar({
  businesses,
  onDeselect,
}: {
  businesses: Business[]
  onDeselect: () => void
}) {
  const exportSelected = () => {
    const rows = businesses.map((business) => ({
      business: business.name,
      capital: business.capitalAmount,
      latest_profit_date: business.profitEntries[0]?.profitDate ?? "",
      notes: business.notes ?? "",
      profit: business.profitAmount,
      start_date: business.startDate,
      status: business.status,
    }))
    const headers = Object.keys(rows[0] ?? {})
    const csv = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) =>
        headers
          .map((header) => escapeCsv(row[header as keyof typeof row]))
          .join(",")
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "business-records.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <BottomBar selectedCount={businesses.length} onDeselect={onDeselect}>
      <Button onClick={exportSelected} type="button" variant="outline">
        Export selected
      </Button>
    </BottomBar>
  )
}
