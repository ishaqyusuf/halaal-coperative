import { getDashboardImportTemplateHeaders } from "@/lib/import-csv"

export type MemberImportColumnSettings = {
  order: string[]
  visible: Record<string, boolean>
}

export const MEMBER_IMPORT_COLUMN_SETTINGS_COOKIE =
  "member-import-column-settings"

export const memberImportRequiredColumns = new Set([
  "memberNumber",
  "fullName",
  "memberType",
  "joinedAt",
  "monthlyCommitment",
])

export const memberImportColumns = getDashboardImportTemplateHeaders("members")

export function normalizeMemberImportColumnSettings(
  saved?: Partial<MemberImportColumnSettings> | null
): MemberImportColumnSettings {
  const knownColumns = new Set(memberImportColumns)
  const savedOrder = Array.isArray(saved?.order) ? saved.order : []
  const order = [
    ...savedOrder.filter((column) => knownColumns.has(column)),
    ...memberImportColumns.filter((column) => !savedOrder.includes(column)),
  ]
  const visible: Record<string, boolean> = {}

  memberImportColumns.forEach((column) => {
    visible[column] = memberImportRequiredColumns.has(column)
      ? true
      : saved?.visible?.[column] !== false
  })

  return { order, visible }
}
