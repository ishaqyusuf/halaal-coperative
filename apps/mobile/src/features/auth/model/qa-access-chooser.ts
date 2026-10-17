export type QaChooserProfile = {
  cooperativeName: string
  eligible: boolean
  identityLabel: string
  memberCode: string | null
  role: string
  selectionRef: string
}

/** Up to this many profiles fit the compact sheet; more open the full list. */
export const QA_SHEET_MAX_PROFILES = 5

export function qaChooserLayout(count: number) {
  return count > QA_SHEET_MAX_PROFILES ? "full" : "sheet"
}

export function filterQaProfiles<Profile extends QaChooserProfile>(
  profiles: Profile[],
  search: string
) {
  const query = search.trim().toLowerCase()
  if (!query) return profiles
  return profiles.filter((profile) =>
    [
      profile.identityLabel,
      profile.cooperativeName,
      profile.role,
      profile.role.replaceAll("_", " "),
      profile.memberCode,
    ].some((value) => value?.toLowerCase().includes(query))
  )
}

export function qaProfileInitials(identityLabel: string) {
  return identityLabel
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join("")
}

export function qaRoleLabel(role: string) {
  return role.replaceAll("_", " ")
}

export function normalizeQaDomainInput(value: string) {
  const domain = value.trim().toLowerCase().replace(/\.$/, "")
  return /^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(
    domain
  )
    ? domain
    : null
}
