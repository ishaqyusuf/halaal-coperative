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
  getMobileAdminMemberDetail,
  updateMobileAdminMemberKyc,
  updateMobileAdminMemberStatus,
  type MobileAdminMemberDetail,
  type MobileAdminMemberKycStatus,
  type MobileAdminMemberStatus,
  type MobileMemberSectionRow,
  type MobileMemberStatementSection,
  type MobileMemberStatementSectionKey,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMobileReadCacheStale } from "@/lib/read-cache"
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

export function AdminMemberDetailScreen({ memberId }: { memberId: string }) {
  const { profile } = useAuthContext()
  const colors = useColors()
  const router = useRouter()
  const [detail, setDetail] = useState<MobileAdminMemberDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [reviewAction, setReviewAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const canUseServerDetail = Boolean(
    profile?.role === "admin" &&
    profile?.token &&
    !isMockSessionToken(profile.token)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const hasStaleDetail = isMobileReadCacheStale(detail?.cache)
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

  async function updateStatus(status: MobileAdminMemberStatus) {
    if (hasStaleDetail) {
      setError("Refresh member detail before updating status.")
      return
    }

    if (!detail?.member || reviewAction) return

    setReviewAction(`status-${status}`)
    setError(null)

    try {
      await updateMobileAdminMemberStatus({
        memberId: detail.member.id,
        status,
      })
      loadDetail()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Member status could not be updated."
      )
    } finally {
      setReviewAction(null)
    }
  }

  async function updateKyc(kycStatus: MobileAdminMemberKycStatus) {
    if (hasStaleDetail) {
      setError("Refresh member detail before updating KYC.")
      return
    }

    if (!detail?.member || reviewAction) return

    setReviewAction(`kyc-${kycStatus}`)
    setError(null)

    try {
      await updateMobileAdminMemberKyc({
        kycReviewNotes: `Updated from mobile to ${formatStatus(kycStatus)}.`,
        kycStatus,
        memberId: detail.member.id,
      })
      loadDetail()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Member KYC could not be updated."
      )
    } finally {
      setReviewAction(null)
    }
  }

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
            <CachedReadBanner
              cache={detail?.cache}
              label="member detail data"
            />

            {detail?.member ? (
              <SectionCard icon="BadgeCheck" title={detail.member.fullName}>
                <View className="gap-3">
                  <View className="flex-row flex-wrap gap-2">
                    <StatusBadge
                      label={formatStatus(detail.member.status)}
                      tone={getStatusBadgeTone(detail.member.status)}
                    />
                    <StatusBadge
                      label={`${formatStatus(detail.member.kycStatus)} KYC`}
                      tone={getStatusBadgeTone(detail.member.kycStatus)}
                    />
                    <StatusBadge
                      label={
                        detail.member.linkedUserEmail
                          ? "Login linked"
                          : "Login unlinked"
                      }
                      tone={detail.member.linkedUserEmail ? "success" : "muted"}
                    />
                  </View>
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
                    {detail.member.deductionSourceName ? (
                      <Text className="text-sm leading-5 text-muted-foreground">
                        {detail.member.deductionSourceName}
                      </Text>
                    ) : null}
                    <Text className="text-xs font-medium text-muted-foreground">
                      {detail.member.linkedUserEmail
                        ? `Linked login ${detail.member.linkedUserEmail}`
                        : "No linked login"}
                    </Text>
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    <Button
                      className="h-10 px-3"
                      disabled={hasStaleDetail || Boolean(reviewAction)}
                      onPress={() => updateKyc("verified")}
                      variant={
                        detail.member.kycStatus === "verified"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      <Icon
                        name="BadgeCheck"
                        className="size-base text-foreground"
                      />
                      <Text>
                        {reviewAction === "kyc-verified"
                          ? "Updating"
                          : "Verify KYC"}
                      </Text>
                    </Button>
                    <Button
                      className="h-10 px-3"
                      disabled={hasStaleDetail || Boolean(reviewAction)}
                      onPress={() => updateKyc("rejected")}
                      variant={
                        detail.member.kycStatus === "rejected"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      <Icon
                        name="CircleX"
                        className="size-base text-foreground"
                      />
                      <Text>Reject KYC</Text>
                    </Button>
                    <Button
                      className="h-10 px-3"
                      disabled={hasStaleDetail || Boolean(reviewAction)}
                      onPress={() => updateStatus("active")}
                      variant={
                        detail.member.status === "active"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      <Icon
                        name="UserCheck"
                        className="size-base text-foreground"
                      />
                      <Text>Activate</Text>
                    </Button>
                    <Button
                      className="h-10 px-3"
                      disabled={hasStaleDetail || Boolean(reviewAction)}
                      onPress={() => updateStatus("suspended")}
                      variant={
                        detail.member.status === "suspended"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      <Icon
                        name="UserX"
                        className="size-base text-foreground"
                      />
                      <Text>Suspend</Text>
                    </Button>
                  </View>
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
                <EmptyState
                  description="Grouped member sections will appear here when records are available."
                  icon="FileText"
                  title="No member detail"
                />
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
