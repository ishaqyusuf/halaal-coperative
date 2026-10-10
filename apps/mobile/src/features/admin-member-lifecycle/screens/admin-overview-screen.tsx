import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeader } from "@/components/app/screen-header"
import { ScreenStatusBar } from "@/components/app/screen-status-bar"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAuthContext } from "@/hooks/use-auth"
import { useEffect, useState } from "react"
import { ScrollView, View } from "react-native"
import { getAdminLifecycleOverview } from "../api/admin-member-lifecycle-api"
import {
  AdminOverviewHero,
  AdminOverviewLoadedContent,
} from "../components/admin-overview-content"
import { presentAdminOverviewForQa } from "../model/admin-member-lifecycle-qa"
import type {
  MobileAdminLifecycleQaState,
  MobileAdminOverview,
} from "../model/admin-member-lifecycle-types"
import { buildAdminOverviewPresentation } from "../model/admin-overview-presentation"

function getInitials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AD"
  )
}

export function AdminOverviewScreen({
  qaState = null,
}: {
  qaState?: MobileAdminLifecycleQaState | null
}) {
  const { profile } = useAuthContext()
  const [overview, setOverview] = useState<MobileAdminOverview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const canUseOverview =
    qaState !== "denied" && canUseMobileFeatureData(profile, "admin")
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"

  useEffect(() => {
    let mounted = true

    if (!canUseOverview) {
      setOverview(null)
      setError(null)
      setIsLoading(false)
      return
    }

    if (qaState === "error") {
      setOverview(null)
      setError("Admin overview is unavailable.")
      setIsLoading(false)
      return
    }

    if (qaState === "loading") {
      setOverview(null)
      setError(null)
      setIsLoading(true)
      return
    }

    setIsLoading(true)
    setError(null)

    void getAdminLifecycleOverview()
      .then((response) => {
        if (mounted) setOverview(presentAdminOverviewForQa(response, qaState))
      })
      .catch(() => {
        if (mounted) setError("Admin overview is unavailable.")
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [canUseOverview, profile?.token, qaState, refreshKey])

  if (!profile) return null

  const initials = getInitials(profile.user.name)
  const presentation = overview
    ? buildAdminOverviewPresentation(overview)
    : null

  return (
    <SafeArea className="bg-brand-surface">
      <ScreenStatusBar tone="brand" />
      <ScrollView
        className="bg-background"
        contentContainerClassName="grow"
        testID="admin-overview-screen"
      >
        {overview && presentation ? (
          <AdminOverviewHero
            currencyCode={currencyCode}
            generatedAt={overview.generatedAt}
            initials={initials}
            presentation={presentation}
            tenantName={profile.tenant.name}
          />
        ) : (
          <View className="bg-brand-surface px-5 pt-5 pb-6">
            <ScreenHeader
              action={
                <View className="bg-brand-warm size-11 items-center justify-center rounded-full">
                  <Text className="text-brand-surface text-xs font-black">
                    {initials}
                  </Text>
                </View>
              }
              title="Overview"
              tone="inverse"
            />
          </View>
        )}

        {!canUseOverview ? (
          <View className="px-5 py-6">
            <EmptyState
              description="Switch to an authorized operations workspace."
              icon="ShieldX"
              title="Admin access required"
            />
          </View>
        ) : null}

        {canUseOverview && error ? (
          <View className="gap-3 px-5 py-6">
            <Text className="text-sm font-bold text-destructive">{error}</Text>
            <Button
              accessibilityLabel="Retry admin overview"
              className="self-start"
              disabled={isLoading}
              onPress={() => setRefreshKey((value) => value + 1)}
              size="sm"
              variant="outline"
            >
              <Icon className="size-sm" name="RefreshCw" />
              <Text>Retry</Text>
            </Button>
          </View>
        ) : null}

        {canUseOverview && isLoading && !overview ? (
          <View className="min-h-56 items-center justify-center px-5 py-10">
            <LoadingSpinner />
          </View>
        ) : null}

        {canUseOverview && overview && presentation ? (
          <AdminOverviewLoadedContent
            overview={overview}
            presentation={presentation}
          />
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
