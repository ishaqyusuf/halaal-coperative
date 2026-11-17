import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { getMemberFinancing } from "./member-financing-api"

export function useFinancingScope() {
  const { profile } = useAuthContext()
  const scope = [profile?.tenant.id, profile?.user.id] as const
  return {
    enabled: canUseMobileFeatureData(profile, "member"),
    currency: profile?.tenant.currencyCode ?? "NGN",
    scope,
    snapshotKey: appQueryKey("member.financing.snapshot", ...scope),
    requestsKey: appQueryKey("member.financing.requests", ...scope),
  }
}

export function useFinancingSnapshot({
  enabled,
  snapshotKey,
}: Pick<ReturnType<typeof useFinancingScope>, "enabled" | "snapshotKey">) {
  return useAppQuery({
    queryKey: snapshotKey,
    queryFn: getMemberFinancing,
    enabled,
    networkMode: "always",
    placeholderData: undefined,
    // A read from disk should be stale immediately so reconnect refetches it.
    staleTime: (query) =>
      query.state.data?.cache?.status === "stale" ? 0 : 30_000,
  })
}
