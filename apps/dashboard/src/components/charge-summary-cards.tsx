"use client"

import { SummaryCard } from "@/components/summary-card"
import { useChargesPageParams } from "@/hooks/use-charges-page-params"
import { useChargeTypesQuery } from "@/hooks/use-charge-types-query"

export function ChargeSummaryCards({
  recentPostedCount,
}: {
  recentPostedCount: number
}) {
  const chargeTypes = useChargeTypesQuery()
  const { setParams, view } = useChargesPageParams()
  const activeCount = chargeTypes.filter((charge) => charge.isActive).length
  const offCount = chargeTypes.length - activeCount

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <SummaryCard
        compact
        detail={offCount ? `${offCount} turned off` : "All turned on"}
        label="Charges in use"
        onClick={() =>
          void setParams(
            { chargedQ: null, view: "definitions" },
            { shallow: false }
          )
        }
        selected={view === "definitions"}
        value={String(activeCount)}
      />
      <SummaryCard
        compact
        detail="In the last 30 days"
        label="Charged"
        onClick={() =>
          void setParams({ view: "applications" }, { shallow: false })
        }
        selected={view === "applications"}
        value={recentPostedCount.toLocaleString("en-NG")}
      />
    </div>
  )
}
