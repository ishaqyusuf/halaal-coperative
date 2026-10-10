"use client"

import { useScrollHeader } from "@/hooks/use-scroll-header"
import { ChargeLibraryEmptyState } from "./empty-states"
import { ChargeLibraryMobileItem } from "./mobile-item"
import { useChargeLibraryQuery } from "./use-charge-library-query"

export function ChargeLibraryMobileList({
  canManageCharges,
}: {
  canManageCharges: boolean
}) {
  const { hasActiveControls, rows } = useChargeLibraryQuery()
  useScrollHeader(undefined, {
    extraOffset: 24,
    lockBodyScroll: false,
    revealOnScrollUp: true,
  })
  if (!rows.length) {
    return <ChargeLibraryEmptyState filtered={hasActiveControls} />
  }

  return (
    <div className="divide-y divide-border border-y border-border">
      {rows.map((row) => (
        <ChargeLibraryMobileItem
          canManageCharges={canManageCharges}
          key={row.id}
          row={row}
        />
      ))}
    </div>
  )
}
