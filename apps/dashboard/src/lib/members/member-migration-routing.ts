import type { TenantMigrationSetupMode } from "@halaalvest/db"
import { shouldPromptMemberBackfill } from "./member-backfill-prompt"

export function getMemberMigrationStartStep(
  setupMode: TenantMigrationSetupMode
) {
  return setupMode === "brought_forward" ? "brought-forward" : "baseline"
}

export function getMemberMigrationStartHref(
  memberId: string,
  setupMode: TenantMigrationSetupMode
) {
  return `/members/${memberId}/backfill?step=${getMemberMigrationStartStep(setupMode)}`
}

export function shouldOpenMemberMigrationAfterCreate({
  joinedAt,
  now = new Date(),
  setupMode,
}: {
  joinedAt: string
  now?: Date
  setupMode: TenantMigrationSetupMode
}) {
  if (setupMode === "brought_forward") {
    return true
  }

  return shouldPromptMemberBackfill(joinedAt, now)
}
