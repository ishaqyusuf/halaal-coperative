import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { ProfileHeader } from "@/components/app/profile-header"
import { ServiceTile } from "@/components/app/service-tile"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { resolveDisplayTextScale } from "@/lib/mobile-accessibility-layout"
import { cn } from "@/lib/utils"
import type { LinkProps } from "expo-router"
import { resolveMemberHomeLayoutPolicy } from "../model/member-home-layout"
import { buildMemberHomePresentation } from "../model/member-home-presentation"
import type { MobileMemberHome } from "../model/member-core-types"
import type { MobileProfile } from "@/lib/session-store"
import { useMemo } from "react"
import { ScrollView, useWindowDimensions, View } from "react-native"

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

function getServiceDisplayLabel(service: { key?: string; label: string }) {
  const byKey: Record<string, string> = {
    commitments: "Plans",
    foodPurchase: "Foodstuff",
    guarantors: "Guarantors",
    projectFinancing: "Projects",
  }

  return (service.key && byKey[service.key]) || service.label
}

function getActionHref(item: { key: string; label: string }) {
  const normalized = `${item.key} ${item.label}`.toLowerCase()
  if (normalized.includes("commitment")) {
    return "/(member)/(tabs)/commitments" as const
  }
  if (normalized.includes("financ")) {
    return "/(member)/(tabs)/financing" as const
  }
  if (normalized.includes("share")) {
    return "/(member)/(tabs)/shares" as const
  }
  return undefined
}

function getReadinessWidthClass(value: number) {
  if (value >= 88) return "w-full"
  if (value >= 63) return "w-3/4"
  if (value >= 38) return "w-1/2"
  if (value > 0) return "w-1/4"
  return "w-0"
}

export type MemberHomeScreenProps = {
  home: MobileMemberHome | null
  homeError: string | null
  isLoadingHome: boolean
  onRetryHome?: () => void
  profile: MobileProfile
}

export function MemberHomeScreen({
  home,
  homeError,
  isLoadingHome,
  onRetryHome,
  profile,
}: MemberHomeScreenProps) {
  const colors = useColors()
  const largeTextLayout = useLargeTextLayout()
  const { fontScale } = useWindowDimensions()
  const displayTextScale = resolveDisplayTextScale(fontScale)
  const layoutPolicy = resolveMemberHomeLayoutPolicy(largeTextLayout, fontScale)
  const presentation = useMemo(
    () =>
      buildMemberHomePresentation(home, profile.tenant.currencyCode ?? "NGN"),
    [home, profile.tenant.currencyCode]
  )
  const { services, stats } = presentation
  const homeCache = home?.cache
  const memberStatus = home?.member?.status
    ? formatStatus(home.member.status)
    : "Member session"
  const kycStatus = home?.member?.kycStatus
    ? `${formatStatus(home.member.kycStatus)} KYC`
    : "KYC pending"

  return (
    <SafeArea className="bg-background">
      <ScrollView contentContainerClassName="px-5 pb-8 pt-4">
        <ProfileHeader notificationHref="/notifications" profile={profile} />

        {homeCache?.status === "stale" ? (
          <View className="mt-4">
            <CachedReadBanner cache={homeCache} label="account data" />
          </View>
        ) : home ? (
          <View className="mt-4 flex-row items-center gap-2">
            <View className="bg-success h-2 w-2 rounded-full" />
            <Text className="text-success text-xs font-semibold">
              Account data available
            </Text>
          </View>
        ) : null}

        <View className="bg-brand mt-5 overflow-hidden rounded-2xl p-5">
          {isLoadingHome ? (
            <LoadingSpinner />
          ) : home ? (
            <View>
              <View
                className={cn(
                  "gap-3",
                  largeTextLayout
                    ? "items-start"
                    : "flex-row items-start justify-between"
                )}
              >
                <View>
                  <Text className="text-brand-foreground/75 text-xs font-bold">
                    Member readiness
                  </Text>
                  <Text
                    allowFontScaling={false}
                    className="text-brand-foreground mt-2 text-[34px] leading-9 font-black tracking-tight"
                    style={{
                      color: colors.brandForeground,
                      fontSize: 34 * displayTextScale,
                      fontWeight: "900",
                      lineHeight: 36 * displayTextScale,
                    }}
                  >
                    {presentation.readinessPercentage}%
                  </Text>
                </View>
                <View
                  className={cn(
                    "bg-brand-foreground/15 rounded-full px-3 py-2",
                    largeTextLayout && "self-start"
                  )}
                >
                  <Text className="text-brand-foreground text-xs font-bold">
                    {home.readiness.percentage >= 85 ? "Ready" : "Needs review"}
                  </Text>
                </View>
              </View>
              <View
                accessibilityRole="progressbar"
                accessibilityValue={{
                  max: 100,
                  min: 0,
                  now: home.readiness.percentage,
                }}
                className="bg-brand-foreground/20 mt-4 h-1.5 w-full overflow-hidden rounded-full"
              >
                <View
                  className={`bg-brand-foreground h-full rounded-full ${getReadinessWidthClass(
                    home.readiness.percentage
                  )}`}
                />
              </View>
              <View
                className={cn(
                  "mt-2 gap-1",
                  largeTextLayout
                    ? "items-start"
                    : "flex-row items-center justify-between gap-3"
                )}
              >
                <Text
                  className={cn(
                    "text-brand-foreground/80 text-xs",
                    !largeTextLayout && "min-w-0 flex-1"
                  )}
                  numberOfLines={layoutPolicy.readinessMetadataLineLimit}
                >
                  {home.member?.memberNumber ?? memberStatus}
                </Text>
                <Text
                  className={cn(
                    "text-brand-foreground/80 text-xs",
                    !largeTextLayout && "text-right"
                  )}
                  numberOfLines={layoutPolicy.readinessMetadataLineLimit}
                >
                  {kycStatus}
                </Text>
              </View>
              {homeError ? (
                <Text className="text-brand-foreground mt-3 text-sm font-medium">
                  {homeError}
                </Text>
              ) : null}
            </View>
          ) : (
            <View className="gap-3">
              <Text className="text-brand-foreground text-base font-bold">
                Member readiness unavailable
              </Text>
              <Text className="text-brand-foreground/80 text-sm leading-5">
                {homeError ?? "Account data is unavailable in this session."}
              </Text>
              {onRetryHome ? (
                <Pressable
                  className="border-brand-foreground/40 min-h-11 justify-center self-start rounded-lg border px-4"
                  onPress={onRetryHome}
                >
                  <Text className="text-brand-foreground text-sm font-bold">
                    Try again
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>

        <View className="mt-6">
          <View className="flex-row items-center justify-between gap-4">
            <Text className="text-lg font-extrabold text-foreground">
              Your position
            </Text>
            <Pressable
              accessibilityLabel="Open statement"
              className="min-h-11 justify-center px-2"
              href="/statement"
              haptic
            >
              <Text className="text-brand text-sm font-bold">Statement</Text>
            </Pressable>
          </View>
          {stats.length ? (
            <View className="flex-row flex-wrap border-t border-border">
              {stats.map((item, index) => {
                const isUnpairedLastItem =
                  stats.length % 2 === 1 && index === stats.length - 1

                return (
                  <View
                    className={cn(
                      "border-b border-border py-4",
                      layoutPolicy.metricColumns === 1 || isUnpairedLastItem
                        ? "w-full"
                        : index % 2 === 0
                          ? "w-1/2 pr-4"
                          : "w-1/2 border-l border-border pl-4"
                    )}
                    key={item.label}
                  >
                    <Text className="text-xs text-muted-foreground">
                      {item.label}
                    </Text>
                    <Text
                      adjustsFontSizeToFit={!largeTextLayout}
                      className="mt-1 text-xl font-extrabold tracking-tight text-foreground"
                      minimumFontScale={largeTextLayout ? undefined : 0.76}
                      numberOfLines={largeTextLayout ? undefined : 1}
                    >
                      {item.value}
                    </Text>
                    <Text
                      className="mt-1 text-[11px] leading-4 text-muted-foreground"
                      numberOfLines={largeTextLayout ? undefined : 2}
                    >
                      {item.detail}
                    </Text>
                  </View>
                )
              })}
            </View>
          ) : (
            <EmptyState
              description={
                isLoadingHome
                  ? "Loading account data."
                  : "No verified account position is available right now."
              }
              title={
                isLoadingHome ? "Loading your position" : "Position unavailable"
              }
            />
          )}
        </View>

        {home?.actionItems.length ? (
          <View className="mt-6">
            <View className="mb-1 flex-row items-center justify-between gap-4">
              <Text className="text-lg font-extrabold text-foreground">
                Needs attention
              </Text>
              <Text className="text-brand text-xs font-bold">
                {home.actionItems.length} items
              </Text>
            </View>
            {home.actionItems.map((item) => {
              const href = getActionHref(item)
              return (
                <Pressable
                  accessibilityLabel={`${item.label}. ${item.detail}`}
                  accessibilityRole={href ? "button" : undefined}
                  className="min-h-[68px] flex-row items-center gap-3 border-b border-border py-3 active:bg-accent/60"
                  disabled={!href}
                  href={href}
                  haptic={Boolean(href)}
                  key={item.key}
                >
                  <View className="bg-warn/10 h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Icon className="size-sm text-warn" name="CircleAlert" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-foreground">
                      {item.label}
                    </Text>
                    <Text
                      className="mt-1 text-xs leading-4 text-muted-foreground"
                      numberOfLines={layoutPolicy.actionDetailLineLimit}
                    >
                      {item.detail}
                    </Text>
                  </View>
                  {href ? (
                    <Icon
                      className="size-sm text-muted-foreground"
                      name="ChevronRight"
                    />
                  ) : null}
                </Pressable>
              )
            })}
          </View>
        ) : null}

        <View className="mt-6">
          <Text className="text-lg font-extrabold text-foreground">
            Services
          </Text>
          {services.length ? (
            <View className="mt-3 flex-row flex-wrap justify-between gap-y-4">
              {services.map((item) => {
                const href = getServiceHref(item)
                const { key: serviceKey, ...service } = item
                const label = getServiceDisplayLabel(item)

                return (
                  <ServiceTile
                    accessibilityLabel={`Open ${item.label}`}
                    href={href}
                    key={serviceKey ?? item.label}
                    layout={layoutPolicy.serviceLayout}
                    {...service}
                    label={label}
                  />
                )
              })}
            </View>
          ) : (
            <Text className="mt-3 text-sm text-muted-foreground">
              {home
                ? "No services are currently available."
                : "Service shortcuts will appear when account data loads."}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeArea>
  )
}
