import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { ConfirmationRow } from "@/components/app/confirmation-row"
import { ProfileHeader } from "@/components/app/profile-header"
import { SectionCard } from "@/components/app/section-card"
import { ServiceTile } from "@/components/app/service-tile"
import { StatCard } from "@/components/app/stat-card"
import { StatusBadge } from "@/components/app/status-badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Text } from "@/components/ui/text"
import { memberServices, memberStats } from "@/data/mobile-template"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import type { LinkProps } from "expo-router"
import {
  getMobileMemberHome,
  type MobileMemberHome,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

const memberServiceHrefs: Record<string, LinkProps["href"]> = {
  Commitments: "/(member)/(tabs)/commitments",
  Financing: "/(member)/(tabs)/financing",
  "Foodstuff Purchase": "/food-purchase",
  "Guarantor approvals": "/guarantor-approvals",
  Notifications: "/notifications",
  Procurement: "/procurement",
  "Project Financing": "/project-financing",
  Receipts: "/receipts",
  Savings: "/(member)/(tabs)/commitments",
  Shares: "/(member)/(tabs)/shares",
  Statements: "/statement",
  Support: "/support",
  Updates: "/updates",
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function getServiceHref(service: { key?: string; label: string }) {
  const byKey: Record<string, LinkProps["href"]> = {
    commitments: "/(member)/(tabs)/commitments",
    financing: "/(member)/(tabs)/financing",
    foodPurchase: "/food-purchase",
    guarantors: "/guarantor-approvals",
    notifications: "/notifications",
    procurement: "/procurement",
    projectFinancing: "/project-financing",
    receipts: "/receipts",
    savings: "/(member)/(tabs)/commitments",
    shares: "/(member)/(tabs)/shares",
    statements: "/statement",
    support: "/support",
    updates: "/updates",
  }

  return service.key ? byKey[service.key] : memberServiceHrefs[service.label]
}

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
  const services = home?.services ?? memberServices
  const homeCache = home?.cache

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

        <CachedReadBanner cache={homeCache} label="account data" />

        <SectionCard icon="UserRoundCheck" title="Account scope">
          <View className="gap-3">
            <View className="flex-row flex-wrap items-center gap-2">
              <StatusBadge
                label={home?.member?.memberNumber ?? "Member session"}
                tone="muted"
              />
              <StatusBadge
                label={
                  home?.member?.status
                    ? formatStatus(home.member.status)
                    : "Profile pending"
                }
                tone={home?.member?.status === "active" ? "success" : "warning"}
              />
              <StatusBadge
                label={
                  home?.member?.kycStatus
                    ? `${formatStatus(home.member.kycStatus)} KYC`
                    : "KYC pending"
                }
                tone={
                  home?.member?.kycStatus === "verified" ? "success" : "warning"
                }
              />
            </View>
            <Text className="text-sm leading-5 text-muted-foreground">
              {home?.member
                ? `${home.member.name} is scoped to ${profile.tenant.name}.`
                : "Sign in with a production member account to show your cooperative member profile."}
            </Text>
          </View>
        </SectionCard>

        <SectionCard icon="BadgeCheck" title="Member readiness">
          {isLoadingHome ? (
            <LoadingSpinner />
          ) : (
            <View className="gap-2">
              <Text className="text-3xl font-black text-foreground">
                {home ? `${home.readiness.percentage}%` : "72%"}
              </Text>
              <StatusBadge
                label={
                  home && home.readiness.percentage >= 85
                    ? "Ready"
                    : "Needs review"
                }
                tone={
                  home && home.readiness.percentage >= 85
                    ? "success"
                    : "warning"
                }
              />
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

        {home?.actionItems.length ? (
          <SectionCard icon="CircleAlert" title="Needs attention">
            <View className="gap-3">
              {home.actionItems.map((item) => (
                <ConfirmationRow
                  detail={item.detail}
                  icon="CircleAlert"
                  key={item.key}
                  label={item.label}
                />
              ))}
            </View>
          </SectionCard>
        ) : null}

        <View className="flex-row flex-wrap gap-3">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </View>

        <SectionCard icon="LayoutGrid" title="Services">
          <View className="flex-row flex-wrap justify-between gap-y-4">
            {services.map((item) => {
              const href = getServiceHref(item)

              return <ServiceTile href={href} key={item.label} {...item} />
            })}
          </View>
        </SectionCard>
      </ScrollView>
    </SafeArea>
  )
}
