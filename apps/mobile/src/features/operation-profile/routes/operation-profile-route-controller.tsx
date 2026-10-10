import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  getMobileOperationProfile,
  updateMobileOperationProfileService,
} from "../api/operation-profile-api"
import { canManageMobileOperationProfile } from "../model/operation-profile-policy"
import { isOperationProfileConflictError } from "../model/operation-profile-conflict"
import type {
  MobileOperationProfileSnapshot,
  UpdateMobileOperationProfileServiceInput,
  UpdateMobileOperationProfileServiceResult,
} from "../model/operation-profile-types"
import { OperationProfileScreen } from "../screens/operation-profile-screen"

type OperationProfileQaState =
  | "denied"
  | "error"
  | "offline"
  | "stale"
  | "subscription"

function getQaState(value: string | string[] | undefined) {
  if (!__DEV__ || typeof value !== "string") return null
  return ["denied", "error", "offline", "stale", "subscription"].includes(value)
    ? (value as OperationProfileQaState)
    : null
}

export function OperationProfileRouteController() {
  const router = useRouter()
  const { qaState: qaStateParam } = useLocalSearchParams<{
    qaState?: string | string[]
  }>()
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const requestIdRef = useRef(0)
  const qaState = getQaState(qaStateParam)
  const [snapshot, setSnapshot] =
    useState<MobileOperationProfileSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canManage =
    qaState !== "denied" &&
    canManageMobileOperationProfile(profile?.cooperativeRole)
  const isOnline =
    qaState !== "offline" && runtime.state.connectivity === "online"
  const presentedSnapshot = useMemo(
    () =>
      snapshot
        ? {
            ...snapshot,
            ...(qaState === "stale" && snapshot.cache
              ? {
                  cache: {
                    ...snapshot.cache,
                    status: "stale" as const,
                  },
                }
              : {}),
            ...(qaState === "subscription"
              ? {
                  services: snapshot.services.map((service) => ({
                    ...service,
                    effectiveAccessMode:
                      service.accessMode === "disabled"
                        ? ("disabled" as const)
                        : ("read_only" as const),
                    effectiveCanMemberCreate: false,
                    effectiveCanStaffCreate: false,
                  })),
                  subscription: {
                    ...snapshot.subscription,
                    accessEnabled: false,
                    reason: "qa_subscription_restriction",
                    status: "suspended",
                  },
                }
              : {}),
          }
        : null,
    [qaState, snapshot]
  )
  const visibleSnapshot =
    qaState === "denied" || qaState === "error" ? null : presentedSnapshot

  const load = useCallback(
    async (
      refreshing = false
    ): Promise<MobileOperationProfileSnapshot | null> => {
      const requestId = ++requestIdRef.current
      if (refreshing) setIsRefreshing(true)
      else setIsLoading(true)
      setError(null)
      setSubmitError(null)

      try {
        const response = await getMobileOperationProfile()
        if (requestId === requestIdRef.current) setSnapshot(response)
        return response
      } catch (loadError) {
        if (requestId === requestIdRef.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Operation Profile is unavailable."
          )
        }
        return null
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    if (!canManage) {
      requestIdRef.current += 1
      setError(null)
      setSubmitError(null)
      setIsLoading(false)
      return
    }
    if (qaState === "error") {
      requestIdRef.current += 1
      setError("Operation Profile could not be loaded. No settings changed.")
      setIsLoading(false)
      return
    }
    void load()
    return () => {
      requestIdRef.current += 1
    }
  }, [canManage, load, profile?.activeMembershipId, qaState])

  const updateService = useCallback(
    async (
      input: UpdateMobileOperationProfileServiceInput
    ): Promise<UpdateMobileOperationProfileServiceResult> => {
      if (!snapshot || isSubmitting || !isOnline) return { status: "failed" }
      if (presentedSnapshot?.cache?.status === "stale") {
        setSubmitError("Refresh Operation Profile before saving this change.")
        return { status: "failed" }
      }
      if (!presentedSnapshot?.subscription.accessEnabled) {
        setSubmitError(
          "Operation Profile changes are unavailable while subscription access is restricted."
        )
        return { status: "failed" }
      }

      setIsSubmitting(true)
      setSubmitError(null)
      try {
        const response = await runtime.runOnlineOperation("command", () =>
          updateMobileOperationProfileService(input)
        )
        const cachedAt = new Date().toISOString()
        setSnapshot({
          ...response,
          cache: {
            ageMs: 0,
            cachedAt,
            scope: snapshot.cache?.scope ?? response.tenant.id,
            status: "live",
          },
        })
        return { status: "saved" }
      } catch (submitFailure) {
        if (isOperationProfileConflictError(submitFailure)) {
          setSubmitError(null)
          return { status: "conflict" }
        }
        setSubmitError(
          submitFailure instanceof Error
            ? submitFailure.message
            : "The service access change could not be saved."
        )
        return { status: "failed" }
      } finally {
        setIsSubmitting(false)
      }
    },
    [isOnline, isSubmitting, presentedSnapshot, runtime, snapshot]
  )

  return (
    <OperationProfileScreen
      canManage={canManage}
      error={error}
      isLoading={isLoading}
      isOnline={isOnline}
      isRefreshing={isRefreshing}
      isSubmitting={isSubmitting}
      onBack={() => router.back()}
      onRefresh={() => void load(true)}
      onRefreshForConflict={() => load(true)}
      onRetry={() => void load()}
      onUpdateService={updateService}
      snapshot={visibleSnapshot}
      submitError={submitError}
    />
  )
}
