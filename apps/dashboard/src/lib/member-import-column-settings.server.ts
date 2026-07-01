import { cookies } from "next/headers"
import {
  MEMBER_IMPORT_COLUMN_SETTINGS_COOKIE,
  normalizeMemberImportColumnSettings,
} from "@/lib/member-import-column-settings"

export async function getInitialMemberImportColumnSettings() {
  const saved = (await cookies()).get(MEMBER_IMPORT_COLUMN_SETTINGS_COOKIE)?.value

  if (!saved) {
    return normalizeMemberImportColumnSettings()
  }

  try {
    return normalizeMemberImportColumnSettings(JSON.parse(saved))
  } catch {
    return normalizeMemberImportColumnSettings()
  }
}
