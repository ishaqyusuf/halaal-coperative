import type { TenantMigrationSetupMode } from "@halaalvest/db"
import {
  buildMembersPath,
  type MemberFilterValues,
} from "@/lib/members/member-filters"
import { getOpeningStepLabel } from "@/lib/members/member-status-words"
import { MembersSummaryCard } from "./members-summary-card"

/** Members whose opening balance (or past records) is not added yet. */
export function MembersOpeningPending({
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
  const pending = Math.max(totalCount - migrationFinalizedCount, 0)

  return (
    <MembersSummaryCard
      href={buildMembersPath({ ...filters, migrationStatus: "pending" })}
      label={`Need ${getOpeningStepLabel(migrationSetupMode).toLowerCase()}`}
      tone={pending ? "warning" : "positive"}
      value={pending.toString()}
    />
  )
}
