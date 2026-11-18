import { EmptyState } from "@/components/app/empty-state"
import { ScreenShell } from "@/components/app/screen-shell"
import { StatusBanner } from "@/components/ui/status-banner"
import { HomeAskBar } from "@/features/assistant/public/home-ask-bar"
import type { MobileProfile } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useMemo } from "react"
import { View } from "react-native"
import {
  AttentionList,
  MemberHomeBodySkeleton,
  MemberHomeHero,
  PositionList,
  ServicesGrid,
} from "../components/member-home-sections"
import type { MobileMemberHome } from "../model/member-core-types"
import {
  buildMemberHomePresentation,
  type MemberHomeBanner,
  resolveMemberHomeView,
} from "../model/member-home-presentation"

function savedAtLabel(cachedAt: string | null) {
  if (!cachedAt) return null
  const date = new Date(cachedAt)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function HomeBanner({
  banner,
  onRetry,
  retrying,
}: {
  banner: MemberHomeBanner
  onRetry: () => void
  retrying: boolean
}) {
  if (banner.kind === "offline") {
    const savedAt = savedAtLabel(banner.cachedAt)
    return (
      <StatusBanner
        description={
          savedAt
            ? `Showing your account as saved at ${savedAt}.`
            : "Your account will update when you reconnect."
        }
        kind="offline"
        title="You're offline"
      />
    )
  }
  if (banner.kind === "stale") {
    const savedAt = savedAtLabel(banner.cachedAt)
    return (
      <StatusBanner
        description={
          savedAt ? `Showing your account as saved at ${savedAt}.` : undefined
        }
        kind="stale"
        onRetry={onRetry}
        retrying={retrying}
        title="Couldn't refresh"
      />
    )
  }
  return (
    <StatusBanner
      description="Pull down or retry to update your account."
      kind="error"
      onRetry={onRetry}
      retrying={retrying}
      title="Couldn't refresh"
    />
  )
}

export type MemberHomeScreenProps = {
  home: MobileMemberHome | null
  isError: boolean
  isOffline: boolean
  isPending: boolean
  onRefresh: () => void
  onRetry: () => void
  profile: MobileProfile
  refreshing: boolean
  retrying: boolean
}

/**
 * Member home (T04, workshop 04-member-home, 02 Balance first): the brand
 * hero under the status bar (savings total + readiness strip), then the ask
 * bar, "Needs attention", "Your position" and the services grid, above the
 * floating dock.
 */
export function MemberHomeScreen({
  home,
  isError,
  isOffline,
  isPending,
  onRefresh,
  onRetry,
  profile,
  refreshing,
  retrying,
}: MemberHomeScreenProps) {
  const router = useRouter()
  const presentation = useMemo(
    () =>
      buildMemberHomePresentation(home, profile.tenant.currencyCode ?? "NGN"),
    [home, profile.tenant.currencyCode]
  )
  const view = resolveMemberHomeView({
    cache: home?.cache,
    hasData: Boolean(home),
    isError,
    isOffline,
    isPending,
  })
  const savings = presentation.stats.find((stat) => stat.key === "savings") ?? null
  // Savings total is the hero number; the other stats are the position list.
  const positionStats = presentation.stats.filter((stat) => stat.key !== "savings")

  return (
    <ScreenShell
      hero={
        <MemberHomeHero
          loading={view.body === "skeleton"}
          memberNumber={home?.member?.memberNumber ?? null}
          profile={profile}
          readiness={presentation.readiness}
          savings={savings}
          unreadBadge={presentation.unreadBadge}
        />
      }
      onRefresh={onRefresh}
      refreshing={refreshing}
      testID="member-home-screen"
    >
      {view.banner ? (
        <HomeBanner banner={view.banner} onRetry={onRetry} retrying={retrying} />
      ) : null}
      {/* HomeAskBar brings its own top margin (shared with admin overview). */}
      <View className="-mt-[16px]">
        <HomeAskBar role="member" />
      </View>

      {view.body === "skeleton" ? <MemberHomeBodySkeleton /> : null}

      {view.body === "error" ? (
        <EmptyState
          action={{ label: "Try again", loading: retrying, onPress: onRetry }}
          description={
            isOffline
              ? "Connect to the internet to load your account for the first time."
              : "Check your connection and try again."
          }
          icon={isOffline ? "WifiOff" : "CircleAlert"}
          title="Couldn't load your account"
          tone="error"
        />
      ) : null}

      {view.body === "content" ? (
        <>
          <AttentionList rows={presentation.attention} />
          <PositionList
            onOpenStatement={() => router.push("/statement")}
            stats={positionStats}
          />
          <ServicesGrid services={presentation.services} />
        </>
      ) : null}
    </ScreenShell>
  )
}
