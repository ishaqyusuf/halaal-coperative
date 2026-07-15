import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { VirtualizedCardList } from "@/components/app/virtualized-card-list"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import { getWebUrl } from "@/lib/base-url"
import {
  getMobileAdminReports,
  type MobileAdminActivityEvent,
  type MobileAdminCollectionFollowUp,
  type MobileAdminReportCard,
  type MobileAdminReports,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { Linking, ScrollView, Share, View } from "react-native"

const fallbackReports: MobileAdminReportCard[] = [
  {
    detail: "Member identity, KYC, status, and linked-login evidence.",
    exportHref: "/reports/members-export",
    key: "members",
    metricFormat: "count",
    metricLabel: "Members",
    metricValue: 0,
    title: "Member register",
  },
  {
    detail: "Contribution collection totals and period coverage.",
    exportHref: "/reports/collections-export",
    key: "collections",
    metricFormat: "currency",
    metricLabel: "Received this period",
    metricValue: 0,
    title: "Collections",
  },
  {
    detail: "Submitted proofs, allocation intent, and review status.",
    exportHref: "/reports/payment-receipts-export",
    key: "paymentReceipts",
    metricFormat: "count",
    metricLabel: "Pending review",
    metricValue: 0,
    title: "Payment receipts",
  },
]

function formatReportMetric(
  report: MobileAdminReportCard,
  currencyCode: string
) {
  return formatMobileMetricValue(
    {
      detail: report.detail,
      format: report.metricFormat,
      key: report.key,
      label: report.metricLabel,
      value: report.metricValue,
    },
    currencyCode
  )
}

function reportIcon(key: string) {
  if (key === "members") return "UsersRound"
  if (key === "collections") return "Wallet"
  if (key === "paymentReceipts") return "ReceiptText"
  if (key === "financing") return "HandCoins"
  if (key === "shares") return "PieChart"
  if (key === "procurement") return "PackageSearch"
  if (key === "foodPurchase") return "ShoppingBasket"
  if (key === "projectFinancing") return "BriefcaseBusiness"
  if (key === "support") return "MessagesSquare"
  return "FileText"
}

function buildReportExportUrl(exportHref: string) {
  return new URL(exportHref, getWebUrl()).toString()
}

function formatActivityDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Time not available"
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function ActivityEventRow({
  event,
  isFirst,
}: {
  event: MobileAdminActivityEvent
  isFirst: boolean
}) {
  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-md bg-secondary">
          <Icon name="History" className="size-sm text-accent" />
        </View>
        <View className="flex-1 gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {event.actionLabel}
            </Text>
            <Text className="text-xs font-medium text-muted-foreground">
              {formatActivityDate(event.occurredAt)}
            </Text>
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            {event.actorLabel} - {event.entityType}
            {event.entityId ? ` - ${event.entityId}` : ""}
          </Text>
          <Text className="text-xs leading-4 text-muted-foreground">
            {event.authorizationRole}: {event.authorizerLabel}
          </Text>
          {event.metadataSummary.length ? (
            <View className="flex-row flex-wrap gap-2">
              {event.metadataSummary.map((item, index) => (
                <StatusBadge
                  key={`${event.id}-${index}`}
                  label={item}
                  tone="muted"
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function CollectionFollowUpRow({
  followUp,
  isFirst,
}: {
  followUp: MobileAdminCollectionFollowUp
  isFirst: boolean
}) {
  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-md bg-secondary">
          <Icon name="CalendarClock" className="size-sm text-accent" />
        </View>
        <View className="flex-1 gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {followUp.memberName}
            </Text>
            <StatusBadge
              label={followUp.priority}
              tone={getStatusBadgeTone(followUp.priority)}
            />
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            {followUp.memberNumber} - {followUp.loanProductName}
          </Text>
          <Text className="text-xs leading-4 text-muted-foreground">
            {followUp.status.replace(/_/g, " ")} -{" "}
            {followUp.resolutionStatus.replace(/_/g, " ")}
          </Text>
          <Text className="text-sm leading-5 text-muted-foreground">
            {followUp.note}
          </Text>
          {followUp.nextActionAt ? (
            <Text className="text-xs font-medium text-muted-foreground">
              Next action: {formatActivityDate(followUp.nextActionAt)}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function ReportCard({
  currencyCode,
  isFirst,
  onOpen,
  onShare,
  report,
}: {
  currencyCode: string
  isFirst: boolean
  onOpen: (report: MobileAdminReportCard) => void
  onShare: (report: MobileAdminReportCard) => void
  report: MobileAdminReportCard
}) {
  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-md bg-secondary">
          <Icon name={reportIcon(report.key)} className="size-sm text-accent" />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {report.title}
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatReportMetric(report, currencyCode)}
            </Text>
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            {report.detail}
          </Text>
          <Text className="text-xs font-medium text-muted-foreground">
            {report.metricLabel} - {report.exportHref}
          </Text>
          <View className="flex-row flex-wrap gap-2 pt-2">
            <Button
              className="h-9"
              onPress={() => onOpen(report)}
              size="sm"
              variant="outline"
            >
              <Icon name="ExternalLink" className="size-sm" />
              <Text>Open export</Text>
            </Button>
            <Button
              className="h-9"
              onPress={() => onShare(report)}
              size="sm"
              variant="outline"
            >
              <Icon name="Share2" className="size-sm" />
              <Text>Share link</Text>
            </Button>
          </View>
        </View>
      </View>
    </View>
  )
}

export function AdminReportsScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [reports, setReports] = useState<MobileAdminReports | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canUseServerReports = Boolean(
    profile?.role === "admin" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const stats = useMemo(
    () =>
      reports?.stats.map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      })) ?? [
        {
          detail: "Mobile-safe report previews",
          label: "Reports",
          value: String(fallbackReports.length),
        },
      ],
    [currencyCode, reports?.stats]
  )
  const reportCards = reports?.reports ?? fallbackReports
  const activityEvents = reports?.activityEvents ?? []
  const collectionFollowUps = reports?.collectionFollowUps ?? []

  useEffect(() => {
    let mounted = true

    if (!canUseServerReports) {
      setReports(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    void getMobileAdminReports()
      .then((response) => {
        if (mounted) {
          setReports(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Reports are unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerReports, profile?.token])

  async function openReportExport(report: MobileAdminReportCard) {
    try {
      await Linking.openURL(buildReportExportUrl(report.exportHref))
    } catch {
      setError("Report export could not be opened.")
    }
  }

  async function shareReportExport(report: MobileAdminReportCard) {
    try {
      const url = buildReportExportUrl(report.exportHref)

      await Share.share({
        message: `${report.title}: ${url}`,
        title: report.title,
        url,
      })
    } catch {
      setError("Report export link could not be shared.")
    }
  }

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">Reports</Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Preview mobile-safe reporting surfaces before opening governed
            dashboard exports.
          </Text>
        </View>

        {!canUseServerReports ? (
          <SectionCard icon="FileText" title="Report previews">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production admin account to review report previews.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerReports ? (
          <>
            <CachedReadBanner cache={reports?.cache} label="report data" />

            <View className="flex-row flex-wrap gap-3">
              {stats.map((item) => (
                <StatCard key={item.label} {...item} />
              ))}
            </View>

            {error ? (
              <Text className="text-sm font-medium text-destructive">
                {error}
              </Text>
            ) : null}

            <SectionCard icon="FileText" title="Report previews">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <VirtualizedCardList
                  data={reportCards}
                  empty={
                    <EmptyState
                      description="Mobile-safe report previews will appear here when this workspace has report cards available."
                      icon="FileText"
                      title="No report previews"
                    />
                  }
                  estimatedItemSize={148}
                  keyExtractor={(report) => report.key}
                  renderItem={({ index, item: report }) => (
                    <ReportCard
                      currencyCode={currencyCode}
                      isFirst={index === 0}
                      onOpen={openReportExport}
                      onShare={shareReportExport}
                      report={report}
                    />
                  )}
                />
              )}
            </SectionCard>

            <SectionCard icon="History" title="Recent activity evidence">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <VirtualizedCardList
                  data={activityEvents}
                  empty={
                    <EmptyState
                      description="Recent governed admin activity will appear here as audit evidence."
                      icon="History"
                      title="No recent audit events"
                    />
                  }
                  estimatedItemSize={120}
                  keyExtractor={(event) => event.id}
                  renderItem={({ index, item: event }) => (
                    <ActivityEventRow event={event} isFirst={index === 0} />
                  )}
                />
              )}
            </SectionCard>

            <SectionCard icon="CalendarClock" title="Collections evidence">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <VirtualizedCardList
                  data={collectionFollowUps}
                  empty={
                    <EmptyState
                      description="Collection follow-up evidence will appear here when field activity is recorded."
                      icon="CalendarClock"
                      title="No collection evidence"
                    />
                  }
                  estimatedItemSize={108}
                  keyExtractor={(followUp) => followUp.id}
                  renderItem={({ index, item: followUp }) => (
                    <CollectionFollowUpRow
                      followUp={followUp}
                      isFirst={index === 0}
                    />
                  )}
                />
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
