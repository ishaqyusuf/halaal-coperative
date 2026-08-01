import type { TenantMigrationSetupMode } from "@halaalvest/db"
import {
  buildMembersPath,
  type MemberFilterValues,
} from "@/lib/members/member-filters"
import { MembersSummaryCard } from "./members-summary-card"

export function MembersAll({
  filters,
  migrationFinalizedCount,
  migrationSetupMode,
  totalCount,
}: {
  filters: MemberFilterValues
  migrationFinalizedCount: number
  migrationSetupMode: TenantMigrationSetupMode
  totalCount: number
}) {
  const isBroughtForward = migrationSetupMode === "brought_forward"

  return (
    <MembersSummaryCard
      detail={
        isBroughtForward
          ? "Total members / members with a finalized brought-forward position."
          : "Total members / members with finalized historical backfill."
      }
      href={buildMembersPath({
        ...filters,
        migrationStatus: "",
        status: "",
      })}
      label={`Members / ${isBroughtForward ? "Brought forward" : "Backfilled"}`}
      value={`${totalCount} / ${migrationFinalizedCount}`}
    />
  )
}
