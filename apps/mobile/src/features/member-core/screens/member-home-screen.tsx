import { EmptyState } from "@/components/app/empty-state"
import { ScreenShell } from "@/components/app/screen-shell"
import { StatusBanner } from "@/components/ui/status-banner"
import { HomeAskLine } from "@/features/assistant/public/home-ask-line"
import type { MobileProfile } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useCallback, useMemo, useRef, useState } from "react"
import { View } from "react-native"
import {
  AttentionList,
  MemberHomeBodySkeleton,
  MemberHomeHero,
  PositionList,
  ServicesGrid,
} from "../components/member-home-sections"
import {
  MemberHomePayPill,
  PAY_PILL_CONTENT_CLEARANCE,
} from "../components/member-home-pay-pill"
import { resolvePayPillExpanded } from "../model/member-home-pay-pill"
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
 * Member home (T04 02 Balance first; T31 31-home-ask 04 Quiet line): the
 * member's only top-level screen, no tabs. The brand hero (avatar → account
 * menu, search, bell, savings total, readiness strip), the quiet Ask line,
 * "Needs attention", "Your position" (rows push Plans, Finance and Shares)
 * and the services grid, with a floating Add payment pill when Record
 * payment is open to the member.
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
  const showPayPill = view.body === "content" && presentation.canRecordPayment
  const [payExpanded, setPayExpanded] = useState(true)
  const lastScrollY = useRef(0)
  const onScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const y = event.nativeEvent.contentOffset.y
      const previousY = lastScrollY.current
      lastScrollY.current = y
      setPayExpanded((expanded) => resolvePayPillExpanded({ expanded, previousY, y }))
    },
    []
  )

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
      onScroll={showPayPill ? onScroll : undefined}
      overlay={showPayPill ? <MemberHomePayPill expanded={payExpanded} /> : null}
      refreshing={refreshing}
      testID="member-home-screen"
    >
      {view.banner ? (
        <HomeBanner banner={view.banner} onRetry={onRetry} retrying={retrying} />
      ) : null}
      <HomeAskLine financingOutstanding={presentation.askFinancingOutstanding} />

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
          {/* The last row scrolls clear of the floating pill. */}
          {showPayPill ? (
            <View accessible={false} style={{ height: PAY_PILL_CONTENT_CLEARANCE }} />
          ) : null}
        </>
      ) : null}
    </ScreenShell>
  )
}
