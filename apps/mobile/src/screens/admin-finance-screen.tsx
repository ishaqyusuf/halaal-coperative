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
  getMobileAdminFinance,
  type MobileAdminFinance,
  type MobileAdminFinanceRecentItem,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

function formatCurrency(value: number, currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value)
}

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

function queueIcon(queueKey: MobileAdminFinanceRecentItem["queueKey"]) {
  if (queueKey === "financing") return "HandCoins"
  if (queueKey === "procurement") return "PackageSearch"
  if (queueKey === "projectFinancing") return "BriefcaseBusiness"
  if (queueKey === "receipts") return "ReceiptText"
  return "ShoppingBasket"
}

function FinanceRecentItemCard({
  currencyCode,
  isFirst,
  item,
}: {
  currencyCode: string
  isFirst: boolean
  item: MobileAdminFinanceRecentItem
}) {
  return (
    <View className={isFirst ? "gap-3" : "gap-3 border-t border-border pt-3"}>
      <View className="flex-row items-start gap-3">
        <View className="h-9 w-9 items-center justify-center rounded-md bg-secondary">
          <Icon
            name={queueIcon(item.queueKey)}
            className="size-sm text-accent"
          />
        </View>
        <View className="flex-1 gap-1">
          <View className="flex-row items-start justify-between gap-3">
            <Text className="flex-1 text-sm font-semibold text-foreground">
              {item.title}
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              {formatCurrency(item.amount, currencyCode)}
            </Text>
          </View>
          <Text className="text-sm leading-5 text-muted-foreground">
            {item.subtitle}
          </Text>
          <Text className="text-xs font-medium text-muted-foreground">
            {formatStatus(item.status)} - {formatDate(item.requestedAt)}
          </Text>
        </View>
      </View>
    </View>
  )
}

export function AdminFinanceScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const [finance, setFinance] = useState<MobileAdminFinance | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canUseServerFinance = Boolean(
    profile?.role === "admin" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const stats = useMemo(
    () =>
      finance?.stats.map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      })) ?? adminStats,
    [currencyCode, finance?.stats]
  )
  const queues = useMemo(
    () =>
      finance?.queues.map((queue) => ({
        detail: queue.detail,
        label: queue.label,
        value: `${queue.count} waiting`,
      })) ?? adminExceptions,
    [finance?.queues]
  )

  useEffect(() => {
    let mounted = true

    if (!canUseServerFinance) {
      setFinance(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    void getMobileAdminFinance()
      .then((response) => {
        if (mounted) {
          setFinance(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Finance queues are unavailable.")
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
  }, [canUseServerFinance, profile?.token])

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">Finance</Text>
          <Text className="text-base leading-6 text-muted-foreground">
            Review cooperative finance queues without weakening server-side
            approvals or posting rules.
          </Text>
        </View>

        {!canUseServerFinance ? (
          <SectionCard icon="Wallet" title="Finance queues">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production admin account to review finance queue
              summaries.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerFinance ? (
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

            <SectionCard icon="CircleAlert" title="Review queues">
              {isLoading ? (
                <LoadingSpinner />
              ) : (
                <View className="gap-3">
                  {queues.length ? (
                    queues.map((queue) => (
                      <View
                        className="flex-row gap-3 rounded-md bg-secondary p-3"
                        key={queue.label}
                      >
                        <Icon
                          name="ArrowUpRight"
                          className="size-base text-accent"
                        />
                        <View className="flex-1 gap-1">
                          <Text className="font-semibold text-foreground">
                            {queue.label}
                          </Text>
                          <Text className="text-sm font-medium text-foreground">
                            {queue.value}
                          </Text>
                          <Text className="text-xs leading-5 text-muted-foreground">
                            {queue.detail}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text className="text-sm leading-5 text-muted-foreground">
                      No finance queues need review right now.
                    </Text>
                  )}
                </View>
              )}
            </SectionCard>

            <SectionCard icon="ClipboardList" title="Recent requests">
              {isLoading ? (
                <LoadingSpinner />
              ) : finance?.recentItems.length ? (
                <View className="gap-3">
                  {finance.recentItems.map((item, index) => (
                    <FinanceRecentItemCard
                      currencyCode={currencyCode}
                      isFirst={index === 0}
                      item={item}
                      key={`${item.queueKey}-${item.id}`}
                    />
                  ))}
                </View>
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No pending finance requests are visible in the mobile queue.
                </Text>
              )}
            </SectionCard>
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
