import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import type { MobileProfile } from "@/lib/session-store"
import type { QueryClient } from "@tanstack/react-query"

import { getCooperativeWorkspaces } from "../api/cooperative-workspaces-api"
import type { CooperativeWorkspace } from "../model/shortcut-policy"

/** Workspaces change only on a membership change: keep them for 5 minutes. */
const WORKSPACES_STALE_MS = 5 * 60 * 1000

export function cooperativeWorkspacesKey(profile: Pick<MobileProfile, "token" | "user"> | null) {
  // The token scopes the list to one signed context (a switch issues a new one).
  return appQueryKey("cooperative-shortcuts", "workspaces", {
    token: profile?.token,
    userId: profile?.user.id,
  })
}

/**
 * T27: the cooperatives list on react-query (cached, refreshed on focus and
 * reconnect) instead of an effect that refetched on every mount.
 */
export function useCooperativeWorkspaces(profile: MobileProfile | null, enabled: boolean) {
  return useAppQuery<CooperativeWorkspace[]>({
    enabled: enabled && Boolean(profile),
    placeholderData: undefined,
    queryFn: () => getCooperativeWorkspaces(profile!),
    queryKey: cooperativeWorkspacesKey(profile),
    staleTime: WORKSPACES_STALE_MS,
  })
}

/** The opener reuses a fresh cached list instead of reading it again. */
export function fetchCooperativeWorkspaces(queryClient: QueryClient, profile: MobileProfile) {
  return queryClient.fetchQuery({
    queryFn: () => getCooperativeWorkspaces(profile),
    queryKey: cooperativeWorkspacesKey(profile),
    staleTime: WORKSPACES_STALE_MS,
  })
}
