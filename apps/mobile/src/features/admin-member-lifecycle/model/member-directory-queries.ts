import { appQueryKey, useInvalidateAppQueries } from "@/hooks/use-app-query"
import { getMobilePersistenceScope } from "@/runtime/persistence-scope"

export function memberDirectoryKeys() {
  const scope = getMobilePersistenceScope()?.key
  return {
    detail: (id: string) => appQueryKey("admin-member-profile", scope, id),
    directory: appQueryKey("admin-member-directory", scope),
    summary: appQueryKey("admin-member-directory-summary", scope),
  }
}

export function useRefreshMemberDirectory() {
  const invalidate = useInvalidateAppQueries()
  return (memberId?: string) => {
    const keys = memberDirectoryKeys()
    void invalidate(
      keys.directory,
      keys.summary,
      appQueryKey("admin-member-lifecycle", "overview"),
      ...(memberId ? [keys.detail(memberId)] : [])
    )
  }
}
