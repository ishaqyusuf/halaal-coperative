import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { APP_QUERY_STALE_TIME, readErrorCode } from "@/lib/app-query-policy"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useQueryClient } from "@tanstack/react-query"
import { useLocalSearchParams } from "expo-router"
import { useRef, useState } from "react"
import {
  cacheUpdatedOperationProfile,
  getMobileOperationProfile,
  updateMobileOperationProfileService,
} from "../api/operation-profile-api"
import { isOperationProfileConflictError } from "../model/operation-profile-conflict"
import { canManageMobileOperationProfile } from "../model/operation-profile-policy"
import type {
  UpdateMobileOperationProfileServiceInput,
  UpdateMobileOperationProfileServiceResult,
} from "../model/operation-profile-types"
import { OperationProfileScreen } from "../screens/operation-profile-screen"

export function OperationProfileRouteController() {
  const { qaState: qaParam } = useLocalSearchParams<{ qaState?: string }>()
  const [qaRecovered, setQaRecovered] = useState(false)
  const qaState =
    __DEV__ && !(qaParam === "error" && qaRecovered) ? qaParam : undefined
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const queryClient = useQueryClient()
  const [pulling, setPulling] = useState(false)
  const saving = useRef(false)
  const simulatedConflict = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const isOnline =
    qaState !== "offline" && runtime.state.connectivity === "online"
  const canManage =
    qaState !== "denied" &&
    canManageMobileOperationProfile(profile?.cooperativeRole)
  const queryKey = appQueryKey(
    "operation-profile",
    profile?.tenant.id,
    profile?.user.id,
    profile?.activeMembershipId
  )
  const overview = useAppQuery({
    enabled: canManage && qaState !== "error" && !isSubmitting,
    networkMode: "always", // The persistence cache can answer offline.
    placeholderData: undefined, // Never carry a snapshot into a different workspace.
    queryFn: ({ signal }) =>
      getMobileOperationProfile({
        offline: runtime.state.connectivity === "offline",
        signal,
      }),
    queryKey,
    refetchOnReconnect: "always",
    staleTime: (query) =>
      query.state.data?.cache?.status === "stale" ? 0 : APP_QUERY_STALE_TIME,
  })
  const forbidden = ["FORBIDDEN", "UNAUTHORIZED"].includes(
    readErrorCode(overview.error) ?? ""
  )
  const snapshot =
    canManage && !forbidden && qaState !== "error" ? overview.data : undefined
  const limited =
    qaState === "limited" || snapshot?.subscription.accessEnabled === false
  const stale =
    qaState === "stale" ||
    snapshot?.cache?.status === "stale" ||
    overview.isRefetchError

  async function refresh() {
    if (!isOnline) return null
    if (qaState === "error") {
      setQaRecovered(true)
      return null
    }
    const result = await overview.refetch({ cancelRefetch: false })
    if (result.isError || result.data?.cache?.status === "stale") return null
    return result.data ?? null
  }

  async function pullToRefresh() {
    setPulling(true)
    try {
      await refresh()
    } finally {
      setPulling(false)
    }
  }

  async function updateService(
    input: UpdateMobileOperationProfileServiceInput
  ): Promise<UpdateMobileOperationProfileServiceResult> {
    if (saving.current) return { status: "failed" }
    if (!snapshot || !isOnline || stale || limited) {
      setSubmitError(
        "Refresh the operation profile when connected before saving."
      )
      return { status: "failed" }
    }

    saving.current = true
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await queryClient.cancelQueries({ exact: true, queryKey })
      const shouldSimulateConflict =
        qaState === "conflict" && !simulatedConflict.current
      simulatedConflict.current = true
      const response = await runtime.runOnlineOperation("command", () =>
        updateMobileOperationProfileService(input, shouldSimulateConflict)
      )
      const updated = await cacheUpdatedOperationProfile(response)
      queryClient.setQueryData(queryKey, updated)
      return { status: "saved" }
    } catch (error) {
      if (isOperationProfileConflictError(error)) {
        return { status: "conflict" }
      }
      setSubmitError(
        "The service access change could not be saved. Try again when connected."
      )
      return { status: "failed" }
    } finally {
      saving.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <OperationProfileScreen
      key={profile?.activeMembershipId}
      actorName={
        snapshot?.tenant.id === "tenant-qa-operation-profile"
          ? "Ibrahim Yusuf"
          : profile?.user.name
      }
      canManage={canManage && !forbidden}
      hasError={qaState === "error" || overview.isError}
      isLimited={limited}
      isLoading={
        canManage &&
        qaState !== "error" &&
        overview.isPending &&
        !overview.isError
      }
      isOnline={isOnline}
      isRefreshing={pulling}
      isRetrying={overview.isFetching}
      isStale={stale}
      isSubmitting={isSubmitting}
      onRefresh={() => void pullToRefresh()}
      onRefreshForConflict={refresh}
      onRetry={() => void refresh()}
      onUpdateService={updateService}
      snapshot={snapshot}
      submitError={submitError}
      tenantName={profile?.tenant.name}
    />
  )
}
