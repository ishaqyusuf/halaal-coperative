import { ProfileHeader } from "@/components/app/profile-header"
import { SectionCard } from "@/components/app/section-card"
import { ServiceTile } from "@/components/app/service-tile"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Text } from "@/components/ui/text"
import { memberServices, memberStats } from "@/data/mobile-template"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileMemberHome,
  type MobileMemberHome,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

export function MemberHomeScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [home, setHome] = useState<MobileMemberHome | null>(null)
  const [isLoadingHome, setIsLoadingHome] = useState(false)
  const [homeError, setHomeError] = useState<string | null>(null)
  const canUseServerHome = Boolean(
    profile?.token && !isMockSessionToken(profile.token)
  )
  const stats = useMemo(
    () =>
      home?.stats.map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(
          metric,
          profile?.tenant.currencyCode ?? "NGN"
        ),
      })) ?? memberStats,
    [home?.stats, profile?.tenant.currencyCode]
  )

  useEffect(() => {
    let mounted = true

    if (!canUseServerHome) {
      setHome(null)
      setHomeError(null)
      setIsLoadingHome(false)
      return
    }

    setIsLoadingHome(true)
    setHomeError(null)

    void getMobileMemberHome()
      .then((response) => {
        if (mounted) {
          setHome(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setHomeError("Member home is unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingHome(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerHome, profile?.token])

  if (!profile) return null

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        <ProfileHeader profile={profile} />

        <SectionCard icon="BadgeCheck" title="Member readiness">
          {isLoadingHome ? (
            <LoadingSpinner />
          ) : (
            <View className="gap-2">
              <Text className="text-3xl font-black text-foreground">
                {home ? `${home.readiness.percentage}%` : "72%"}
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                {home?.readiness.detail ??
                  "Commitment profile is healthy. One financing document still needs review before the next request."}
              </Text>
              {homeError ? (
                <Text className="text-sm font-medium text-destructive">
                  {homeError}
                </Text>
              ) : null}
            </View>
          )}
        </SectionCard>

        <View className="flex-row flex-wrap gap-3">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </View>

        {home?.actionItems.length ? (
          <SectionCard icon="CircleAlert" title="Needs attention">
            <View className="gap-3">
              {home.actionItems.map((item) => (
                <View
                  className="gap-1 rounded-md bg-secondary p-3"
                  key={item.key}
                >
                  <Text className="font-semibold text-foreground">
                    {item.label}
                  </Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {item.detail}
                  </Text>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : null}

        <SectionCard icon="LayoutGrid" title="Services">
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {memberServices.map((item) => (
              <ServiceTile key={item.label} {...item} />
            ))}
          </View>
        </SectionCard>
      </ScrollView>
    </SafeArea>
  )
}
