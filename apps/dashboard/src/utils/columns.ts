import { cookies } from "next/headers"
import {
  type AllTableSettings,
  mergeWithDefaults,
  TABLE_SETTINGS_COOKIE,
  type TableId,
  type TableSettings,
} from "./table-settings"

export async function getInitialTableSettings(
  tableId: TableId
): Promise<TableSettings> {
  const saved = (await cookies()).get(TABLE_SETTINGS_COOKIE)?.value

  if (!saved) {
    return mergeWithDefaults(undefined, tableId)
  }

  try {
    const allSettings = JSON.parse(saved) as AllTableSettings
    return mergeWithDefaults(allSettings[tableId], tableId)
  } catch {
    return mergeWithDefaults(undefined, tableId)
  }
}
