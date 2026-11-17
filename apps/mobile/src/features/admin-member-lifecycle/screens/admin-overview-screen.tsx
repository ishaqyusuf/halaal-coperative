import { EmptyState } from "@/components/app/empty-state"
import { ScreenShell } from "@/components/app/screen-shell"
import { StatusBanner } from "@/components/ui/status-banner"
import { HomeAskBar } from "@/features/assistant/public/home-ask-bar"
import type { MobileProfile } from "@/lib/session-store"
import { useMobileRuntime } from "@/runtime/mobile-runtime-provider"
import { useMemo } from "react"
import { View } from "react-native"
import {
  AdminActivitySection,
  AdminAttentionSection,
  AdminComplianceSection,
  AdminOverviewBodySkeleton,
  AdminOverviewHero,
} from "../components/admin-overview-content"
import type { MobileAdminOverview } from "../model/admin-member-lifecycle-types"
import {
  type AdminOverviewBanner,
  buildAdminOverviewPresentation,
  resolveAdminOverviewView,
} from "../model/admin-overview-presentation"

function timeLabel(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

function OverviewBanner({
  banner,
  onRetry,
  retrying,
}: {
  banner: AdminOverviewBanner
  onRetry: () => void
  retrying: boolean
}) {
  if (banner.kind === "offline") {
    const savedAt = timeLabel(banner.cachedAt)
    return (
      <StatusBanner
        description={
          savedAt
            ? `Showing the overview saved at ${savedAt}.`
            : "The overview will update when you reconnect."
        }
        kind="offline"
        title="You're offline"
      />
    )
  }
  if (banner.kind === "stale") {
    const savedAt = timeLabel(banner.cachedAt)
    return (
      <StatusBanner
        description={savedAt ? `Showing the overview saved at ${savedAt}.` : undefined}
        kind="stale"
        onRetry={onRetry}
        retrying={retrying}
        title="Couldn't refresh"
      />
    )
  }
  return (
    <StatusBanner
      description="Pull down or retry to update the overview."
      kind="error"
      onRetry={onRetry}
      retrying={retrying}
      title="Couldn't refresh"
    />
  )
}

export type AdminOverviewScreenProps = {
  canUseOverview: boolean
  isError: boolean
  isOffline: boolean
  isPending: boolean
  onRefresh: () => void
  onRetry: () => void
  overview: MobileAdminOverview | null
  profile: MobileProfile
  refreshing: boolean
  retrying: boolean
}

/**
 * Admin overview (T05, workshop 05-admin-overview, 02 Queue first): the
 * brand hero under the status bar with the open decisions and the money
 * card, the ask bar on the hero's edge, then "Needs attention" (urgent
 * first), Compliance and Recent activity, above the floating dock.
 */
export function AdminOverviewScreen({
  canUseOverview,
  isError,
  isOffline,
  isPending,
  onRefresh,
  onRetry,
  overview,
  profile,
  refreshing,
  retrying,
}: AdminOverviewScreenProps) {
  const runtime = useMobileRuntime()
  const currencyCode = profile.tenant.currencyCode ?? "NGN"
  const presentation = useMemo(
    () => (overview ? buildAdminOverviewPresentation(overview, currencyCode) : null),
    [currencyCode, overview]
  )
  const view = resolveAdminOverviewView({
    cache: overview?.cache,
    canUse: canUseOverview,
    hasData: Boolean(overview),
    isError,
    isOffline,
    isPending,
  })
  // HomeAskBar hides itself when the device is offline; the hero only
  // leaves room for it when it is there.
  const showAsk = view.body !== "denied" && runtime.state.connectivity !== "offline"
  const updatedLabel =
    view.body === "content"
      ? timeLabel(
          overview?.cache?.status === "stale"
            ? overview.cache.cachedAt
            : overview?.generatedAt
        )
      : null

  return (
    <ScreenShell
      hero={
        <AdminOverviewHero
          loading={view.body === "skeleton"}
          overlap={showAsk}
          presentation={view.body === "content" ? presentation : null}
          tenantName={profile.tenant.name}
          updatedLabel={updatedLabel}
          userName={profile.user.name}
        />
      }
      onRefresh={canUseOverview ? onRefresh : undefined}
      refreshing={refreshing}
      testID="admin-overview-screen"
    >
      {showAsk ? (
        // Pulls the bar up onto the hero's bottom edge (half on, half off);
        // HomeAskBar brings its own 14pt top margin.
        <View className="-mt-[56px]">
          <HomeAskBar floating role="staff" />
        </View>
      ) : null}

      {view.banner ? (
        <OverviewBanner banner={view.banner} onRetry={onRetry} retrying={retrying} />
      ) : null}

      {view.body === "skeleton" ? <AdminOverviewBodySkeleton /> : null}

      {view.body === "denied" ? (
        <EmptyState
          description="Switch to an authorized operations workspace."
          icon="ShieldX"
          title="Admin access required"
        />
      ) : null}

      {view.body === "error" ? (
        <EmptyState
          action={{ label: "Try again", loading: retrying, onPress: onRetry }}
          description={
            isOffline
              ? "Connect to the internet to load the overview for the first time."
              : "Check your connection and try again."
          }
          icon={isOffline ? "WifiOff" : "CircleAlert"}
          title="Couldn't load the overview"
          tone="error"
        />
      ) : null}

      {view.body === "content" && presentation ? (
        <>
          <AdminAttentionSection presentation={presentation} />
          <AdminComplianceSection rows={presentation.compliance} />
          <AdminActivitySection rows={presentation.activity} />
        </>
      ) : null}
    </ScreenShell>
  )
}
