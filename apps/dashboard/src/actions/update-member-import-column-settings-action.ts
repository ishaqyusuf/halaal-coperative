"use server"

import { addYears } from "date-fns"
import { cookies } from "next/headers"
import {
  MEMBER_IMPORT_COLUMN_SETTINGS_COOKIE,
  normalizeMemberImportColumnSettings,
  type MemberImportColumnSettings,
} from "@/lib/member-import-column-settings"

export async function updateMemberImportColumnSettingsAction(
  settings: Partial<MemberImportColumnSettings>
) {
  const normalized = normalizeMemberImportColumnSettings(settings)
  const cookieStore = await cookies()

  cookieStore.set(
    MEMBER_IMPORT_COLUMN_SETTINGS_COOKIE,
    JSON.stringify(normalized),
    {
      expires: addYears(new Date(), 10),
    }
  )

  return normalized
}
