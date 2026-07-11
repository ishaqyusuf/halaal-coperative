import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileAdminReports,
  type MobileAdminReportCard,
  type MobileAdminReports,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

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

function ReportCard({
  currencyCode,
  isFirst,
  report,
}: {
  currencyCode: string
  isFirst: boolean
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
              ) : reportCards.length ? (
                <View className="gap-3">
                  {reportCards.map((report, index) => (
                    <ReportCard
                      currencyCode={currencyCode}
                      isFirst={index === 0}
                      key={report.key}
                      report={report}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No report previews are available for this workspace.
                </Text>
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
