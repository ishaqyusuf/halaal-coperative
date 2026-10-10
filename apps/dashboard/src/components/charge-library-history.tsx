"use client"

import { formatCurrency } from "@halaalvest/utils"
import { OpenChargeVersionSheet } from "@/components/open-charge-operation-sheet"
import { useChargeLibraryQuery } from "@/components/tables/charge-library/use-charge-library-query"

export function ChargeLibraryHistory({ canManageCharges }: { canManageCharges: boolean }) {
  const { rows } = useChargeLibraryQuery()
  if (!rows.length) return null

  return <div className="hidden divide-y divide-border border-y border-border md:block">{rows.map((charge) => <details className="group py-4" key={charge.id}><summary className="flex cursor-pointer list-none items-center justify-between gap-4"><div className="min-w-0"><p className="truncate font-medium">{charge.name}</p><p className="mt-1 text-sm text-muted-foreground">{charge.versions.length} dated updates · current {charge.chargeValueType === "percentage" ? `${charge.amount}%` : formatCurrency(charge.amount)}</p></div><span className="text-xs text-muted-foreground group-open:hidden">View history</span><span className="hidden text-xs text-muted-foreground group-open:inline">Hide history</span></summary><div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]"><div className="divide-y divide-border border-y border-border">{charge.versions.map((version) => <div className="flex items-start justify-between gap-4 py-3" key={version.id}><div><p className="text-sm font-medium">{version.effectiveFrom}</p><p className="mt-1 text-xs text-muted-foreground">{version.notes ?? "No note"}</p></div><div className="text-right"><p className="text-sm font-medium">{charge.chargeValueType === "percentage" ? `${version.amount}%` : formatCurrency(version.amount)}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{version.status}</p></div></div>)}</div>{canManageCharges ? <OpenChargeVersionSheet chargeDefinitionId={charge.id} chargeKind={charge.kind} chargeValueType={charge.chargeValueType} /> : null}</div></details>)}</div>
}
