import { SectionCard } from "@/components/app/section-card"
import { StatCard } from "@/components/app/stat-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileAdminMemberDetail,
  type MobileAdminMemberDetail,
  type MobileMemberSectionRow,
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
  shares: "PieChart",
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

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
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

function DetailSection({
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
                <Text className="mt-1 text-xs font-medium text-muted-foreground">
                  {row.status}
                </Text>
              ) : null}
            </View>
          )
        })}
      </View>
    </SectionCard>
  )
}

export function AdminMemberDetailScreen({ memberId }: { memberId: string }) {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [detail, setDetail] = useState<MobileAdminMemberDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canUseServerDetail = Boolean(
    profile?.role === "admin" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const stats = useMemo(
    () =>
      (detail?.stats ?? []).map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      })),
    [currencyCode, detail?.stats]
  )

  const loadDetail = useCallback(() => {
    let mounted = true

    if (!canUseServerDetail || !memberId) {
      setDetail(null)
      setError(null)
      setIsLoading(false)

      return () => {
        mounted = false
      }
    }

    setIsLoading(true)
    setError(null)

    void getMobileAdminMemberDetail(memberId)
      .then((response) => {
        if (mounted) {
          setDetail(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Member detail is unavailable.")
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
  }, [canUseServerDetail, memberId])

  useEffect(() => loadDetail(), [loadDetail])

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
          <Text className="text-3xl font-black text-foreground">
            Member detail
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            {detail?.member
              ? `${detail.member.memberNumber} - ${formatStatus(
                  detail.member.status
                )}`
              : "Operations profile, commitments, financing, and ledger view."}
          </Text>
        </View>

        {!canUseServerDetail ? (
          <SectionCard icon="UserRound" title="Member detail">
            <Text className="text-sm leading-5 text-muted-foreground">
              Sign in with a production admin account to review member records.
            </Text>
          </SectionCard>
        ) : null}

        {canUseServerDetail ? (
          <>
            {detail?.member ? (
              <SectionCard icon="BadgeCheck" title={detail.member.fullName}>
                <View className="gap-1">
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {detail.member.memberNumber} -{" "}
                    {formatStatus(detail.member.memberType)}
                  </Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    Joined {formatDate(detail.member.joinedAt)}
                    {detail.member.exitedAt
                      ? ` - Exited ${formatDate(detail.member.exitedAt)}`
                      : ""}
                  </Text>
                  <Text className="text-sm leading-5 text-muted-foreground">
                    {formatStatus(detail.member.kycStatus)} KYC
                    {detail.member.deductionSourceName
                      ? ` - ${detail.member.deductionSourceName}`
                      : ""}
                  </Text>
                  <Text className="text-xs font-medium text-muted-foreground">
                    {detail.member.linkedUserEmail
                      ? `Linked login ${detail.member.linkedUserEmail}`
                      : "No linked login"}
                  </Text>
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
              <SectionCard icon="LoaderCircle" title="Member detail">
                <LoadingSpinner />
              </SectionCard>
            ) : detail?.sections.length ? (
              detail.sections.map((section) => (
                <DetailSection
                  currencyCode={currencyCode}
                  key={section.key}
                  section={section}
                />
              ))
            ) : (
              <SectionCard icon="FileText" title="Member detail">
                <Text className="text-sm leading-5 text-muted-foreground">
                  No detail is available for this member profile.
                </Text>
              </SectionCard>
            )}

            {detail?.generatedAt ? (
              <Text className="text-xs font-medium text-muted-foreground">
                Generated {formatDate(detail.generatedAt)}
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeArea>
  )
}
