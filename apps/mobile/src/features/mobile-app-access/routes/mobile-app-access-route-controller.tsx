import { QaAccessPanel } from "@/features/auth/public/qa-access"
import { useState } from "react"
import { useAuthContext } from "@/hooks/use-auth"
import { useMobileAppAccess } from "@/runtime/mobile-app-access-provider"
import { useMobileAppStore } from "../hooks/use-mobile-app-store"
import { SafeArea } from "@/components/safe-area"
import { ScreenHeader } from "@/components/app/screen-header"
import { LegalLinks } from "@/components/app/legal-links"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import { Linking, Platform, ScrollView, View } from "react-native"
import { Redirect } from "expo-router"

const durationName = {
  six_months: "Six months",
  annual: "One year",
} as const

const cancellationHelpUrl = Platform.select({
  ios: "https://support.apple.com/en-us/118428",
  android: "https://support.google.com/googleplay/answer/7018481",
})

export function MobileAppAccessRouteController() {
  const [cancellationHelpError, setCancellationHelpError] = useState(false)
  const { profile, role, signOut } = useAuthContext()
  const access = useMobileAppAccess()
  const store = useMobileAppStore({
    enabled: Boolean(profile),
    scope: profile
      ? `${profile.user.id}:${profile.tenant.id}:${profile.activeMembershipId}`
      : "anonymous",
    userId: profile?.user.id ?? "",
    accessAllowed: access.accessAllowed,
    refreshAccess: access.refresh,
  })
  if (!profile || !role) return <Redirect href="/(auth)/sign-in" />

  return (
    <SafeArea className="bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 py-6"
      >
        <ScreenHeader
          title="Mobile app access"
          description="Your web dashboard stays free. Each person subscribes to use the mobile app."
        />
        <View className="gap-2 rounded-xl border border-border bg-card p-4">
          <Text className="text-base font-semibold text-foreground">
            {access.accessAllowed
              ? "Your app access is active"
              : access.checking
                ? "Checking your app access"
                : "Subscribe or restore to enter"}
          </Text>
          {access.snapshot?.duration ? (
            <Text className="text-sm text-muted-foreground">
              {durationName[access.snapshot.duration]} ·{" "}
              {access.snapshot.status.replaceAll("_", " ")}
              {access.snapshot.periodEndsAt
                ? ` · Current period ends ${new Date(access.snapshot.periodEndsAt).toLocaleDateString("en-NG")}`
                : ""}
            </Text>
          ) : null}
          {access.error ? (
            <Text className="text-sm text-destructive">
              Access could not be checked. Retry when you are online, or restore
              a purchase.
            </Text>
          ) : null}
          {store.message ? (
            <Text
              accessibilityLiveRegion="polite"
              className="text-sm text-muted-foreground"
            >
              {store.message}
            </Text>
          ) : null}
        </View>

        {!access.accessAllowed && store.offers.length > 0 ? (
          <View className="gap-3">
            <Text className="text-base font-semibold text-foreground">
              Choose your period
            </Text>
            {store.offers.map((offer) => (
              <Button
                key={`${offer.mapping.productId}:${offer.mapping.basePlanId ?? "apple"}`}
                disabled={
                  store.busy ||
                  !store.ready ||
                  store.needsReview ||
                  access.checking ||
                  access.error
                }
                onPress={() => void store.purchase(offer)}
              >
                <Text>
                  {durationName[offer.mapping.duration]} · {offer.displayPrice}
                </Text>
              </Button>
            ))}
            <Text className="text-sm text-muted-foreground">
              Subscriptions renew automatically unless you cancel in your store
              account. The store confirms the final price before you pay.
            </Text>
          </View>
        ) : null}

        <View className="gap-2">
          <Button
            disabled={store.busy || !store.ready}
            onPress={() => void store.restore()}
            variant="outline"
          >
            <Text>Restore purchases</Text>
          </Button>
          <Button
            disabled={store.busy || !store.ready}
            onPress={() => void store.manage()}
            variant="outline"
          >
            <Text>Manage or cancel in your store</Text>
          </Button>
          {cancellationHelpUrl ? (
            <Button
              accessibilityLabel="Store cancellation instructions, opens browser"
              onPress={() => {
                setCancellationHelpError(false)
                void Linking.openURL(cancellationHelpUrl).catch(() =>
                  setCancellationHelpError(true)
                )
              }}
              variant="ghost"
            >
              <Text>How to cancel in your store</Text>
            </Button>
          ) : null}
          {cancellationHelpError ? (
            <Text accessibilityLiveRegion="polite" className="text-destructive">
              Store instructions could not open. Try again later.
            </Text>
          ) : null}
          <Button
            disabled={store.busy || access.checking}
            onPress={() => {
              void access.refresh()
              store.reconnect()
            }}
            variant="ghost"
          >
            <Text>Refresh access and store</Text>
          </Button>
          <Button onPress={() => void signOut()} variant="ghost">
            <Text>Sign out</Text>
          </Button>
        </View>
        <Text className="text-sm text-muted-foreground">
          Account deletion does not cancel your store subscription. Use Manage
          to cancel it separately. If a charge is missing, Restore or contact
          support before buying again.
        </Text>
        <QaAccessPanel inline />
        <LegalLinks />
      </ScrollView>
    </SafeArea>
  )
}
