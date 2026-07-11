import { CachedReadBanner } from "@/components/app/cached-read-banner"
import { StatCard } from "@/components/app/stat-card"
import { SectionCard } from "@/components/app/section-card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { SafeArea } from "@/components/safe-area"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { detailSections } from "@/data/mobile-template"
import { useAuthContext } from "@/hooks/use-auth"
import { useColors } from "@/hooks/use-color"
import {
  getMobileMemberSection,
  type MobileMemberSection,
  type MobileMemberSectionKey,
  type MobileMemberSectionRow,
} from "@/lib/mobile-home-api"
import { formatMobileMetricValue } from "@/lib/mobile-metrics"
import { isMockSessionToken } from "@/lib/session-store"
import { useEffect, useMemo, useState } from "react"
import { ScrollView, View } from "react-native"

type DetailKey = keyof typeof detailSections
const serverBackedDetailKeys = new Set<DetailKey>([
  "commitments",
  "financing",
  "shares",
])

function isServerBackedDetailKey(
  detailKey: DetailKey
): detailKey is MobileMemberSectionKey {
  return serverBackedDetailKeys.has(detailKey)
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

export function DetailListScreen({ detailKey }: { detailKey: DetailKey }) {
  const colors = useColors()
  const { profile } = useAuthContext()
  const section = detailSections[detailKey]
  const [serverSection, setServerSection] =
    useState<MobileMemberSection | null>(null)
  const [isLoadingSection, setIsLoadingSection] = useState(false)
  const [sectionError, setSectionError] = useState<string | null>(null)
  const canUseServerSection = Boolean(
    profile?.role === "member" &&
    profile.token &&
    !isMockSessionToken(profile.token) &&
    isServerBackedDetailKey(detailKey)
  )
  const currencyCode = profile?.tenant.currencyCode ?? "NGN"
  const stats = useMemo(
    () =>
      serverSection?.stats.map((metric) => ({
        detail: metric.detail,
        label: metric.label,
        value: formatMobileMetricValue(metric, currencyCode),
      })) ?? [],
    [currencyCode, serverSection?.stats]
  )
  const fallbackRows = useMemo<MobileMemberSectionRow[]>(
    () =>
      section.rows.map((row, index) => ({
        detail: "Starter workflow item",
        format: null,
        key: `template-${detailKey}-${index}`,
        label: row,
        status: null,
        value: null,
      })),
    [detailKey, section.rows]
  )
  const rows = serverSection?.rows ?? (canUseServerSection ? [] : fallbackRows)

  useEffect(() => {
    let mounted = true

    if (!canUseServerSection || !isServerBackedDetailKey(detailKey)) {
      setServerSection(null)
      setSectionError(null)
      setIsLoadingSection(false)
      return
    }

    setIsLoadingSection(true)
    setSectionError(null)

    void getMobileMemberSection(detailKey)
      .then((response) => {
        if (mounted) {
          setServerSection(response)
        }
      })
      .catch(() => {
        if (mounted) {
          setSectionError("This section is unavailable.")
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingSection(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [canUseServerSection, detailKey, profile?.token])

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <ScrollView contentContainerClassName="gap-5 px-5 pb-8 pt-5">
        <View className="gap-2">
          <Text className="text-3xl font-black text-foreground">
            {serverSection?.title ?? section.title}
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            {serverSection?.subtitle ?? section.subtitle}
          </Text>
        </View>

        <CachedReadBanner cache={serverSection?.cache} label="section data" />

        {stats.length > 0 ? (
          <View className="flex-row flex-wrap gap-3">
            {stats.map((item) => (
              <StatCard key={item.label} {...item} />
            ))}
          </View>
        ) : null}

        <SectionCard
          icon={canUseServerSection ? "ListChecks" : "ClipboardList"}
          title={canUseServerSection ? "Current records" : "Starter workflow"}
        >
          {isLoadingSection ? (
            <LoadingSpinner />
          ) : (
            <View className="gap-3">
              {rows.map((row) => {
                const formattedValue = formatRowValue(row, currencyCode)

                return (
                  <View className="flex-row items-start gap-3" key={row.key}>
                    <View className="h-8 w-8 items-center justify-center rounded-md bg-secondary">
                      <Icon
                        name={formattedValue ? "CircleDollarSign" : "Check"}
                        className="size-sm text-success"
                      />
                    </View>
                    <View className="flex-1 gap-1">
                      <View className="flex-row items-start justify-between gap-3">
                        <Text className="flex-1 text-sm font-semibold text-foreground">
                          {row.label}
                        </Text>
                        {formattedValue ? (
                          <Text className="text-sm font-semibold text-foreground">
                            {formattedValue}
                          </Text>
                        ) : null}
                      </View>
                      <Text className="text-sm leading-5 text-muted-foreground">
                        {row.detail}
                      </Text>
                      {row.status ? (
                        <Text className="text-xs font-medium text-muted-foreground">
                          {row.status}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )
              })}

              {sectionError ? (
                <View className="flex-row items-start gap-3">
                  <View className="h-8 w-8 items-center justify-center rounded-md bg-secondary">
                    <Icon
                      name="CircleAlert"
                      className="size-sm text-destructive"
                    />
                  </View>
                  <Text className="flex-1 text-sm font-medium text-destructive">
                    {sectionError}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
        </SectionCard>
      </ScrollView>
    </SafeArea>
  )
}
