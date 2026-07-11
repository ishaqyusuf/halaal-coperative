import { ProfileHeader } from "@/components/app/profile-header"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { adminExceptions, adminStats } from "@/data/mobile-template"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileAdminOverview,
  updateMobileAdminSupportStatus,
  type MobileAdminOverview,
  type MobileSupportCase,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatMessageAuthor(input: {
  authorName: string | null
  authorType: string
}) {
  if (input.authorName) return input.authorName

  return formatStatus(input.authorType)
}

function SupportCaseCard({
  actionState,
  isFirst,
  onUpdateStatus,
  supportCase,
}: {
  actionState: "idle" | "pending"
  isFirst: boolean
  onUpdateStatus: (supportCase: MobileSupportCase) => void
  supportCase: MobileSupportCase
}) {
  const canMarkInProgress = supportCase.status !== "in_progress"

  return (
    <View className={isFirst ? "gap-2" : "gap-2 border-t border-border pt-3"}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-foreground">
            {supportCase.subject}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {supportCase.detail}
          </Text>
        </View>
        <Text className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
          {formatStatus(supportCase.priority)}
        </Text>
      </View>
      <Text className="text-xs font-medium text-muted-foreground">
        {formatStatus(supportCase.status)} -{" "}
        {formatStatus(supportCase.category)} -{" "}
        {formatDate(supportCase.lastActivityAt)}
      </Text>
      {supportCase.recentMessages.length ? (
        <View className="gap-2 border-l-2 border-border pl-3">
          {supportCase.recentMessages.map((message) => (
            <View className="gap-1" key={message.id}>
              <Text className="text-xs font-medium text-muted-foreground">
                {formatMessageAuthor(message)} - {formatDate(message.createdAt)}
              </Text>
              <Text className="text-sm leading-5 text-foreground">
                {message.message}
              </Text>
              {message.attachmentUrl ? (
                <Text className="text-xs text-muted-foreground">
                  Attachment available
                </Text>
              ) : null}
            </View>
          ))}
          {supportCase.messageCount > supportCase.recentMessages.length ? (
            <Text className="text-xs text-muted-foreground">
              Showing latest {supportCase.recentMessages.length} of{" "}
              {supportCase.messageCount} messages
            </Text>
          ) : null}
        </View>
      ) : null}
      {canMarkInProgress ? (
        <Button
          className="self-start"
          disabled={actionState === "pending"}
          onPress={() => onUpdateStatus(supportCase)}
          size="sm"
          variant="outline"
        >
          <Text>
            {actionState === "pending" ? "Updating..." : "Mark in progress"}
          </Text>
        </Button>
      ) : null}
    </View>
  )
}

export function AdminHomeScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [overview, setOverview] = useState<MobileAdminOverview | null>(null)
  const [actionKey, setActionKey] = useState<string | null>(null)
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
  const overviewCache = overview?.cache
  const isStaleOverview = overviewCache?.status === "stale"

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

  async function refreshOverview() {
    const response = await getMobileAdminOverview()
    setOverview(response)
  }

  async function markSupportInProgress(supportCase: MobileSupportCase) {
    setActionKey(supportCase.id)
    setOverviewError(null)

    try {
      await updateMobileAdminSupportStatus({
        status: "in_progress",
        supportCaseId: supportCase.id,
      })
      await refreshOverview()
    } catch (error) {
      setOverviewError(
        error instanceof Error
          ? error.message
          : "Support case could not be updated."
      )
    } finally {
      setActionKey(null)
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        <ProfileHeader profile={profile} />

        {overviewCache ? (
          <SectionCard
            icon={isStaleOverview ? "WifiOff" : "Clock3"}
            title={isStaleOverview ? "Offline snapshot" : "Data refreshed"}
          >
            <Text className="text-sm leading-5 text-muted-foreground">
              {isStaleOverview
                ? "Showing cached admin data from"
                : "Updated"}{" "}
              {new Intl.DateTimeFormat("en", {
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                month: "short",
                timeZone: "UTC",
              }).format(new Date(overviewCache.cachedAt))}
            </Text>
          </SectionCard>
        ) : null}

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

        <SectionCard icon="MessagesSquare" title="Support cases">
          {isLoadingOverview ? (
            <LoadingSpinner />
          ) : overview?.supportCases.length ? (
            <View className="gap-3">
              {overview.supportCases.map((supportCase, index) => (
                <SupportCaseCard
                  actionState={
                    actionKey === supportCase.id ? "pending" : "idle"
                  }
                  isFirst={index === 0}
                  key={supportCase.id}
                  onUpdateStatus={markSupportInProgress}
                  supportCase={supportCase}
                />
              ))}
            </View>
          ) : (
            <Text className="text-sm leading-5 text-muted-foreground">
              No open support cases are visible in the mobile overview.
            </Text>
          )}
        </SectionCard>

        <SectionCard icon="TriangleAlert" title="Setup warnings">
          {isLoadingOverview ? (
            <LoadingSpinner />
          ) : overview?.warnings.length ? (
            <View className="gap-3">
              {overview.warnings.map((warning) => (
                <View
                  className="flex-row gap-3 rounded-md bg-secondary p-3"
                  key={warning.key}
                >
                  <Icon
                    name="TriangleAlert"
                    className="size-base text-accent"
                  />
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-foreground">
                      {warning.label}
                    </Text>
                    <Text className="text-xs leading-5 text-muted-foreground">
                      Complete setup on the dashboard before relying on this
                      workspace for live operations.
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-sm leading-5 text-muted-foreground">
              No setup warnings are visible in the mobile overview.
            </Text>
          )}
        </SectionCard>
      </ScrollView>
    </SafeArea>
  )
}
