import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { EmptyState } from "@/components/app/empty-state"
import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { getStatusBadgeTone, StatusBadge } from "@/components/app/status-badge"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileMemberStatement,
  type MobileMemberSectionRow,
  type MobileMemberStatement,
  type MobileMemberStatementSection,
  type MobileMemberStatementSectionKey,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useRouter } from "expo-router"
import { useCallback, useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

const sectionIcons: Record<MobileMemberStatementSectionKey, string> = {
  commitments: "Landmark",
  documents: "FolderCheck",
  financing: "HandCoins",
  ledger: "ListChecks",
  profile: "UserRound",
  receipts: "ReceiptText",
  shares: "PieChart",
  support: "MessagesSquare",
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded"

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value))
}

function formatRowValue(row: MobileMemberSectionRow, currencyCode: string) {
  if (row.value === null || !row.format) return null

  return formatMobileMetricValue(
    {
      detail: row.detail,
      format: row.format,
      key: row.key,
      label: row.label,
      value: row.value,
    },
    currencyCode
  )
}

function StatementSection({
  currencyCode,
  section,
}: {
  currencyCode: string
  section: MobileMemberStatementSection
}) {
  return (
    <SectionCard icon={sectionIcons[section.key]} title={section.title}>
      <View className="gap-3">
        <Text className="text-sm leading-5 text-muted-foreground">
          {section.subtitle}
        </Text>

        {section.rows.map((row, index) => {
          const formattedValue = formatRowValue(row, currencyCode)

          return (
            <View
              className={index === 0 ? "" : "border-t border-border pt-3"}
              key={row.key}
            >
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-1">
                  <Text className="text-sm font-semibold text-foreground">
                    {row.label}
                  </Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {row.detail}
                  </Text>
                </View>
                {formattedValue ? (
                  <Text className="text-sm font-semibold text-foreground">
                    {formattedValue}
                  </Text>
                ) : null}
              </View>
              {row.status ? (
                <View className="mt-2 items-start">
                  <StatusBadge
                    label={row.status}
                    tone={getStatusBadgeTone(row.status)}
                  />
                </View>
              ) : null}
            </View>
          )
        })}
      </View>
    </SectionCard>
  )
}

export function StatementScreen() {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [statement, setStatement] = useState<MobileMemberStatement | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canUseServerStatement = Boolean(
    profile?.role === "member" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const stats = useMemo(
    () =>
      (statement?.stats ?? []).map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      })),
    [currencyCode, statement?.stats]
  )

  const loadStatement = useCallback(() => {
    let mounted = true

    if (!canUseServerStatement) {
      setStatement(null)
      setError(null)
      setIsLoading(false)

      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileMemberStatement()
      .then((response) => {
        if (mounted) {
          setStatement(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Statement is unavailable.")
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
  }, [canUseServerStatement])

  useEffect(() => loadStatement(), [loadStatement])

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <Button
          className="h-10 self-start px-3"
          onPress={() => router.back()}
          variant="outline"
        >
          <Icon name="ArrowLeft" className="size-base text-foreground" />
          <Text>Back</Text>
        </Button>

        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">Statement</Text>
          <Text className="text-base leading-6 text-muted-foreground">
            {statement?.member
              ? `${statement.member.memberNumber} - ${formatStatus(
                  statement.member.status
                )}`
              : "Member statement"}
          </Text>
        </View>

        {!canUseServerStatement ? (
          <SectionCard icon="FileText" title="Statement">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production member account to view your statement.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerStatement ? (
          <>
            <CachedReadBanner cache={statement?.cache} label="statement data" />

            {statement?.member ? (
              <SectionCard icon="BadgeCheck" title={statement.member.name}>
                <View className="gap-3">
                  <Text className="text-sm leading-5 text-muted-foreground">
                    Joined {formatDate(statement.member.joinedAt)}
                  </Text>
                  <View className="flex-row flex-wrap items-center gap-2">
                    <StatusBadge
                      label={`${formatStatus(statement.member.status)} member`}
                      tone={getStatusBadgeTone(statement.member.status)}
                    />
                    <StatusBadge
                      label={`${formatStatus(statement.member.kycStatus)} KYC`}
                      tone={getStatusBadgeTone(statement.member.kycStatus)}
                    />
                  </View>
                  {statement.member.deductionSourceName ? (
                    <Text className="text-sm leading-5 text-muted-foreground">
                      {statement.member.deductionSourceName}
                    </Text>
                  ) : null}
                </View>
              </SectionCard>
            ) : null}

            {stats.length > 0 ? (
              <View className="flex-row flex-wrap gap-3">
                {stats.map((item) => (
                  <StatCard key={item.label} {...item} />
                ))}
              </View>
            ) : null}

            {error ? (
              <Text className="text-sm font-medium text-destructive">
                {error}
              </Text>
            ) : null}

            {isLoading ? (
              <SectionCard icon="LoaderCircle" title="Statement">
                <LoadingSpinner />
              </SectionCard>
            ) : statement?.sections.length ? (
              statement.sections.map((section) => (
                <StatementSection
                  currencyCode={currencyCode}
                  key={section.key}
                  section={section}
                />
              ))
            ) : (
              <SectionCard icon="FileText" title="Statement">
                <EmptyState
                  description="Statement sections will appear here when member records are available."
                  icon="FileText"
                  title="No statement detail"
                />
              </SectionCard>
            )}

            {statement?.generatedAt ? (
              <Text className="text-xs font-medium text-muted-foreground">
                Generated {formatDate(statement.generatedAt)}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
