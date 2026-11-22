import { appQueryKey, useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { readErrorCode } from "@/lib/app-query-policy"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useQueryClient } from "@tanstack/react-query"
import { useLocalSearchParams } from "expo-router"
import { useRef, useState } from "react"
import { canManageMobileOperationProfile } from "@/features/operation-profile/public/operation-profile-policy"
import {
  getPaymentOrderSettings,
  updatePaymentOrderSettings,
} from "../api/payment-order-api"
import { paymentOrderDependentKeys } from "../model/payment-order-keys"
import type { PaymentOrderSettings } from "../model/payment-order-model"
import {
  PaymentOrderScreen,
  type PaymentOrderSaveResult,
} from "../screens/payment-order-screen"

export function PaymentOrderRouteController() {
  // Dev QA states: ?qaState=error | offline | denied | save-error
  const { qaState: qaParam } = useLocalSearchParams<{ qaState?: string }>()
  const [qaRecovered, setQaRecovered] = useState(false)
  const qaState =
    __DEV__ && !(qaParam === "error" && qaRecovered) ? qaParam : undefined
  const { profile } = useAuthContext()
  const runtime = useMobileRuntime()
  const queryClient = useQueryClient()
  const [pulling, setPulling] = useState(false)
  const failedOnce = useRef(false)
  const isOnline =
    qaState !== "offline" && runtime.state.connectivity === "online"
  const canManage =
    qaState !== "denied" &&
    canManageMobileOperationProfile(profile?.cooperativeRole)
  const queryKey = appQueryKey(
    "payment-order",
    profile?.tenant.id,
    profile?.user.id
  )
  const settings = useAppQuery({
    enabled: canManage && qaState !== "error",
    placeholderData: undefined, // Never carry one workspace's order into another.
    queryFn: ({ signal }) => getPaymentOrderSettings({ signal }),
    queryKey,
  })
  const forbidden = ["FORBIDDEN", "UNAUTHORIZED"].includes(
    readErrorCode(settings.error) ?? ""
  )

  async function refresh() {
    if (qaState === "error") {
      setQaRecovered(true)
      return
    }
    await settings.refetch({ cancelRefetch: false })
  }

  async function save(next: PaymentOrderSettings): Promise<PaymentOrderSaveResult> {
    if (!isOnline) return "failed"
    try {
      const simulateFailure = qaState === "save-error" && !failedOnce.current
      failedOnce.current = true
      const updated = await runtime.runOnlineOperation("command", () =>
        updatePaymentOrderSettings(next, simulateFailure)
      )
      queryClient.setQueryData(queryKey, updated)
      // The member payables read carries the tenant's mode and order.
      await Promise.all(
        paymentOrderDependentKeys.map((key) =>
          queryClient.invalidateQueries({ queryKey: key })
        )
      )
      return "saved"
    } catch {
      return "failed"
    }
  }

  return (
    <PaymentOrderScreen
      key={profile?.activeMembershipId}
      canManage={canManage && !forbidden}
      hasError={qaState === "error" || settings.isError}
      isLoading={canManage && qaState !== "error" && settings.isPending}
      isOnline={isOnline}
      isRefreshing={pulling}
      isRetrying={settings.isFetching}
      onRefresh={() => {
        setPulling(true)
        void refresh().finally(() => setPulling(false))
      }}
      onRetry={() => void refresh()}
      onSave={save}
      saved={qaState === "error" || forbidden ? undefined : settings.data}
    />
  )
}
