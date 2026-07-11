import { ProfileHeader } from "@/components/app/profile-header"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { adminExceptions, adminStats } from "@/data/mobile-template"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileAdminOverview,
  type MobileAdminOverview,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

export function AdminHomeScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [overview, setOverview] = useState<MobileAdminOverview | null>(null)
  const [isLoadingOverview, setIsLoadingOverview] = useState(false)
  const [overviewError, setOverviewError] = useState<string | null>(null)
  const canUseServerOverview = Boolean(
    profile?.token && !isMockSessionToken(profile.token)
  )
  const stats = useMemo(
    () =>
      overview?.stats.map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(
          metric,
          profile?.tenant.currencyCode ?? "NGN"
        ),
      })) ?? adminStats,
    [overview?.stats, profile?.tenant.currencyCode]
  )
  const exceptions = useMemo(
    () =>
      overview?.actionQueue.map((item) => ({
        detail: item.detail,
        label: item.label,
        value: `${item.count} waiting`,
      })) ?? adminExceptions,
    [overview?.actionQueue]
  )

  useEffect(() => {
    let mounted = true

    if (!canUseServerOverview) {
      setOverview(null)
      setOverviewError(null)
      setIsLoadingOverview(false)
      return
    }

    setIsLoadingOverview(true)
    setOverviewError(null)

    void getMobileAdminOverview()
      .then((response) => {
        if (mounted) {
          setOverview(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setOverviewError("Admin overview is unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingOverview(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerOverview, profile?.token])

  if (!profile) return null

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        <ProfileHeader profile={profile} />

        <View className="flex-row flex-wrap gap-3">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </View>

        <SectionCard icon="CircleAlert" title="Admin attention">
          {isLoadingOverview ? (
            <LoadingSpinner />
          ) : (
            <View className="gap-3">
              {overviewError ? (
                <Text className="text-sm font-medium text-destructive">
                  {overviewError}
                </Text>
              ) : null}
              {exceptions.map((item) => (
                <View
                  className="flex-row gap-3 rounded-md bg-secondary p-3"
                  key={item.label}
                >
                  <Icon name="ArrowUpRight" className="size-base text-accent" />
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">
                      {item.label}
                    </Text>
                    <Text className="text-sm font-medium text-foreground">
                      {item.value}
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      {item.detail}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </SafeArea>
  )
}
