import { useCallback, useEffect, useRef, useState } from "react"
import { ScrollView, View, RefreshControl } from "react-native"
import { useRouter } from "expo-router"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import {
  canRoleManageSubscription,
  canStartNativeStorePurchase,
} from "@/lib/mobile-subscription-policy"
import {
  getMobileSubscriptionSnapshot,
  type MobileSubscriptionSnapshot,
} from "@/lib/mobile-subscription-api"
import { SafeArea } from "@/components/safe-area"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { ScreenHeader } from "@/components/app/screen-header"
import { LegalLinks } from "@/components/app/legal-links"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useStoreSubscriptions } from "../hooks/use-store-subscriptions"
import {
  formatSubscriptionDate,
  getSubscriptionPlanHighlights,
} from "../presentation/subscription-presentation"

export function StoreSubscriptionRouteController() {
  const { profile } = useAuthContext()
  const scope = profile?.activeMembershipId ?? "anonymous"
  const canManage = canRoleManageSubscription(profile?.cooperativeRole)
  return (
    <StoreSubscriptionContent
      key={`${scope}:${canManage}`}
      scope={scope}
      canManage={canManage}
    />
  )
}
function StoreSubscriptionContent({
  scope,
  canManage,
}: {
  scope: string
  canManage: boolean
}) {
  const router = useRouter()
  const runtime = useMobileRuntime()
  const online = runtime.state.connectivity === "online"
  const active = useRef(true)
  const [snapshot, setSnapshot] = useState<MobileSubscriptionSnapshot | null>(
    null
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)
  const refresh = useCallback(async () => {
    if (!canManage) return false
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    try {
      const data = await getMobileSubscriptionSnapshot()
      if (active.current && id === requestId.current) {
        setSnapshot(data)
        return true
      }
      return false
    } catch {
      if (active.current && id === requestId.current)
        setError("Plan details are unavailable. Refresh to try again.")
      return false
    } finally {
      if (active.current && id === requestId.current) setLoading(false)
    }
  }, [canManage])
  useEffect(() => {
    active.current = true
    void refresh()
    return () => {
      active.current = false
      requestId.current++
    }
  }, [refresh])
  const store = useStoreSubscriptions({
    enabled: canManage && online,
    scope,
    onVerified: refresh,
  })
  const stale = snapshot?.cache?.status === "stale"
  return (
    <SafeArea className="bg-background">
      <ScreenStatusBar />
      <ScrollView
        contentContainerClassName="gap-6 px-5 py-5"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              void refresh()
              store.reconnect()
            }}
          />
        }
      >
        <Button
          accessibilityLabel="Back"
          onPress={() => router.back()}
          variant="ghost"
          className="self-start"
        >
          <Text>Back</Text>
        </Button>
        <ScreenHeader
          title="Plan & billing"
          description="Software subscriptions for your cooperative workspace."
        />
        {!canManage ? (
          <Text className="text-muted-foreground">
            Only a cooperative administrator can manage software subscriptions.
          </Text>
        ) : (
          <>
            {loading && !snapshot ? <LoadingSpinner /> : null}
            {error ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-destructive"
              >
                {error}
              </Text>
            ) : null}
            {snapshot ? (
              <View className="gap-2 border-b border-border pb-5">
                <Text className="text-lg font-semibold text-foreground">
                  {snapshot.plan.displayName}
                </Text>
                <Text className="text-muted-foreground">
                  Status: {snapshot.status.replaceAll("_", " ")}
                </Text>
                <Text className="text-muted-foreground">
                  {snapshot.usage.activeMemberCount} active members ·{" "}
                  {snapshot.usage.activeMemberLimit ?? "Custom"} capacity
                </Text>
                <Text className="text-muted-foreground">
                  Current period ends:{" "}
                  {formatSubscriptionDate(
                    snapshot.billingPeriod.currentPeriodEndsAt
                  )}
                </Text>
                {snapshot.billingPeriod.cancelAtPeriodEnd ? (
                  <Text className="text-muted-foreground">
                    Renewal is turned off. Check the store for the effective
                    cancellation date.
                  </Text>
                ) : null}
                {getSubscriptionPlanHighlights(snapshot.plan).map((item) => (
                  <Text key={item.label} className="text-muted-foreground">
                    {item.label}: {item.value}
                  </Text>
                ))}
              </View>
            ) : null}
            {!online || stale ? (
              <Text className="text-muted-foreground">
                Reconnect and refresh current plan details before purchasing.
              </Text>
            ) : null}
            {store.message ? (
              <Text
                accessibilityLiveRegion="polite"
                className="text-muted-foreground"
              >
                {store.message}
              </Text>
            ) : null}
            <View className="gap-3">
              <Text
                accessibilityRole="header"
                className="text-lg font-semibold text-foreground"
              >
                Store subscriptions
              </Text>
              <Text className="text-sm leading-6 text-muted-foreground">
                Monthly software plans renew automatically until cancelled in
                your store account. The store confirms the price, any
                introductory offer, renewal terms and timing of a plan change
                before you pay. Contributions, shares, financing repayments and
                cooperative levies are separate.
              </Text>
              {store.offers.map((offer) => {
                const plan = snapshot?.availablePlans.find(
                  (p) => p.code === offer.mapping.planCode
                )
                const current =
                  snapshot?.plan.code === offer.mapping.planCode &&
                  ["active", "grace"].includes(snapshot.status)
                const canPurchase = canStartNativeStorePurchase({
                  hasSnapshot: !!snapshot,
                  hasSubscription: !!snapshot?.subscriptionId,
                  billingInfrastructureAvailable:
                    snapshot?.sourceState.billingInfrastructureAvailable ===
                    true,
                  planAvailable: !!plan,
                  isLoading: loading,
                  error,
                  isOnline: online,
                  isStale: stale,
                  storeReady: store.ready,
                  storeBusy: store.busy,
                  purchaseNeedsReview: store.purchaseNeedsReview,
                  isCurrentPlan: !!current,
                })
                return (
                  <View
                    key={offer.product.id}
                    className="gap-3 border-b border-border py-4"
                  >
                    <Text className="text-lg font-semibold text-foreground">
                      {plan?.displayName ?? offer.product.title}
                    </Text>
                    <Text className="text-foreground">
                      {offer.displayPrice}
                    </Text>
                    <Text className="text-sm leading-6 text-muted-foreground">
                      {plan?.description ?? offer.product.description}
                    </Text>
                    {plan ? (
                      <Text className="text-sm text-muted-foreground">
                        Up to {plan.activeMemberLimit ?? "custom"} active
                        members
                      </Text>
                    ) : null}
                    <Button
                      disabled={!canPurchase}
                      accessibilityLabel={`Subscribe to ${plan?.displayName ?? offer.product.title}, ${offer.displayPrice}`}
                      onPress={() =>
                        void store.purchase(
                          offer,
                          snapshot?.subscriptionId ?? null
                        )
                      }
                    >
                      <Text>
                        {current
                          ? "Current plan"
                          : store.busy
                            ? "Waiting for store"
                            : store.purchaseNeedsReview
                              ? "Resolve store purchase"
                              : "Continue in store"}
                      </Text>
                    </Button>
                  </View>
                )
              })}
              <Button
                disabled={!online || store.busy || !store.ready}
                onPress={() => void store.restore()}
                variant="outline"
              >
                <Text>Restore purchases</Text>
              </Button>
              <Button
                disabled={!online || store.busy || !store.ready}
                onPress={() => void store.manage()}
                variant="outline"
              >
                <Text>Manage or cancel subscription</Text>
              </Button>
              <Button
                disabled={loading || store.busy}
                onPress={() => {
                  void refresh()
                  store.reconnect()
                }}
                variant="ghost"
              >
                <Text>Refresh plan and store</Text>
              </Button>
            </View>
            <Text className="text-sm leading-6 text-muted-foreground">
              Account deletion does not cancel a store subscription. Cancel
              through the store before closing the account. Store refunds follow
              the applicable store process and your statutory rights.
            </Text>
          </>
        )}
        <LegalLinks />
      </ScrollView>
    </SafeArea>
  )
}
