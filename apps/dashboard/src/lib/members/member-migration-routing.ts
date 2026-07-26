import type { TenantMigrationSetupMode } from "@halaalvest/db"
import { shouldPromptMemberBackfill } from "./member-backfill-prompt"

export function getMemberMigrationAction({
  setupMode,
  state,
}: {
  setupMode: TenantMigrationSetupMode
  state: "not_started" | "draft" | "applied"
}) {
  if (state === "applied") {
    return {
      kind: "status" as const,
      label:
        setupMode === "brought_forward"
          ? "Brought forward applied"
          : "Backfilled",
    }
  }

  return {
    kind: "action" as const,
    label:
      setupMode === "brought_forward"
        ? "Brought forward"
        : state === "draft"
          ? "Continue backfill"
          : "Backfill",
  }
}

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
