import type {
  TenantMigrationSetupMode,
  TenantMigrationSetupSettings,
} from "@halaalvest/db"

/**
 * Step 5 preselects the option the "Recommended for you" badge points at
 * until the admin has saved a choice. After a save, their choice wins, so the
 * radio never disagrees with what is stored.
 */
export function getInitialSetupMode({
  migrationSetup,
  recommended,
}: {
  migrationSetup: Pick<TenantMigrationSetupSettings, "confirmedAt" | "mode">
  recommended: TenantMigrationSetupMode | null
}): TenantMigrationSetupMode {
  if (migrationSetup.confirmedAt || !recommended) {
    return migrationSetup.mode
  }

  return recommended
}
