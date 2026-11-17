import { AppList } from "@/components/app/app-list"
import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHeaderButton } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import {
  Elevated,
  ListCard,
  RecordRow,
  TintedAvatar,
} from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusPill, statusToneFor } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { formatMobileStatus } from "@/lib/format-mobile-status"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useFocusEffect, useRouter } from "expo-router"
import { useCallback, useState } from "react"
import { ScrollView, View } from "react-native"
import type {
  MobileMemberActivityRow,
  MobileMemberStatement,
  MobileMemberStatementSection,
  MobileStatementActivityCategory,
} from "../model/member-core-types"
import type { MemberActivityRead } from "../public/use-member-activity"
import {
  formatLedgerValue,
  MemberLedgerDetail,
  MemberLedgerFooter,
  MemberLedgerRow,
  MemberReadBanner,
  useMemberLedgerList,
} from "./member-ledger-list"
import {
  StatementExportSheet,
  StatementFileBanner,
  type StatementExportActions,
} from "./member-statement-export-sheet"

const filters: { category?: MobileStatementActivityCategory; label: string }[] =
  [
    { label: "All" },
    { category: "savings", label: "Savings" },
    { category: "financing", label: "Financing" },
    { category: "shares", label: "Shares" },
    { category: "charges", label: "Charges" },
  ]

const metrics = [
  {
    key: "savings",
    title: "Savings",
    icon: "Wallet",
    tint: "bg-tint-success",
    ink: "text-tint-success-foreground",
  },
  {
    key: "active-commitment",
    title: "Commitment",
    icon: "BadgeCheck",
    tint: "bg-accent",
    ink: "text-accent-foreground",
  },
  {
    key: "financing",
    title: "Financing",
    icon: "HandCoins",
    tint: "bg-tint-sky",
    ink: "text-tint-sky-foreground",
  },
  {
    key: "share-capital",
    title: "Share capital",
    icon: "PieChart",
    tint: "bg-tint-lilac",
    ink: "text-tint-lilac-foreground",
  },
]

const sectionOrder = [
  "commitments",
  "financing",
  "shares",
  "charges",
  "profile",
  "documents",
] as const
const sectionName = (section: MobileMemberStatementSection) =>
  section.key === "commitments" ? "Savings" : section.title
const emptyRecordKeys = new Set([
  "commitments-empty",
  "financing-empty",
  "shares-empty",
  "documents-empty",
])

function StatementIdentity({
  member,
}: {
  member: NonNullable<MobileMemberStatement["member"]>
}) {
  const joined = new Date(member.joinedAt)
  const since = Number.isFinite(joined.getTime())
    ? joined.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        timeZone: "UTC",
        year: "numeric",
      })
    : null
  return (
    <Elevated
      className="flex-row flex-wrap items-center gap-[10px] rounded-[20px] bg-card p-[14px]"
      radius={20}
    >
      <TintedAvatar name={member.name} />
      <View className="min-w-[124px] flex-1">
        <Text variant="section">{member.name}</Text>
        <Text className="text-muted-foreground" variant="caption">
          {member.memberNumber}
          {since ? ` · Joined ${since}` : ""}
        </Text>
      </View>
      <View className="gap-[4px]">
        <StatusPill
          label={formatMobileStatus(member.status)}
          tone={statusToneFor(member.status)}
        />
        {member.kycStatus === "verified" ? (
          <StatusPill label="KYC verified" tone="info" />
        ) : null}
      </View>
    </Elevated>
  )
}

function StatementMetrics({
  currencyCode,
  statement,
}: {
  currencyCode: string
  statement: MobileMemberStatement
}) {
  const tiles = metrics.map(({ key, title, icon, tint, ink }) => {
    const metric =
      statement.stats.find((entry) => entry.key === key) ??
      (key === "share-capital"
        ? statement.stats.find((entry) => entry.key === "shares")
        : undefined)
    const dividend =
      statement.stats.find((entry) => entry.key === "dividends")?.value ?? 0
    const value = metric?.value ?? 0
    const inactive =
      key === "active-commitment" &&
      statement.sections
        .find((section) => section.key === "commitments")
        ?.rows.some(
          (row) => row.key.startsWith("plan-") && row.status === "Inactive"
        )
    const detail =
      key === "share-capital" && dividend > 0
        ? `${formatMoney(dividend, { currencyCode })} dividends`
        : key === "active-commitment" && !inactive && value > 0
          ? "Active plan"
          : key === "financing" && value > 0
            ? "Outstanding"
            : inactive
              ? "No active plan"
              : (metric?.detail ?? "None posted")

    return (
      <View className="min-w-0 flex-1" key={key}>
        <Elevated
          className="min-h-[116px] gap-[3px] rounded-[18px] bg-card p-[12px]"
          radius={18}
        >
          <View
            className={cn(
              "mb-[3px] size-[32px] items-center justify-center rounded-[10px]",
              tint
            )}
          >
            <Icon className={cn("size-sm", ink)} name={icon} />
          </View>
          <Text className="text-muted-foreground" variant="caption">
            {title}
          </Text>
          <Text variant="money">
            {formatMoney(inactive ? 0 : value, { currencyCode })}
          </Text>
          <Text className="text-muted-foreground" variant="caption">
            {detail}
          </Text>
        </Elevated>
      </View>
    )
  })
  return (
    <View className="gap-[10px]">
      <View className="flex-row gap-[10px]">{tiles.slice(0, 2)}</View>
      <View className="flex-row gap-[10px]">{tiles.slice(2)}</View>
    </View>
  )
}

export function StatementScreen({
  activity,
  category,
  currencyCode,
  error,
  fileActions,
  isLoading,
  offline,
  onCategoryChange,
  onRefresh,
  refreshing,
  statement,
}: {
  activity: MemberActivityRead
  category?: MobileStatementActivityCategory
  currencyCode: string
  error: boolean
  fileActions: StatementExportActions
  isLoading: boolean
  offline: boolean
  onCategoryChange: (category?: MobileStatementActivityCategory) => void
  onRefresh: () => void
  refreshing: boolean
  statement?: MobileMemberStatement
}) {
  const router = useRouter()
  const [selectedRow, setSelectedRow] =
    useState<MobileMemberActivityRow | null>(null)
  const [selectedSection, setSelectedSection] =
    useState<MobileMemberStatementSection | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  useFocusEffect(
    useCallback(
      () => () => {
        setExportOpen(false)
        setSelectedRow(null)
        setSelectedSection(null)
      },
      []
    )
  )
  const { data, search, setSearch, stickyIndices } = useMemberLedgerList(
    activity.rows,
    false
  )
  const member = statement?.member
  const sections = sectionOrder.flatMap(
    (key) => statement?.sections.find((section) => section.key === key) ?? []
  )
  const sectionRows =
    selectedSection?.rows.filter((row) => !emptyRecordKeys.has(row.key)) ?? []
  const supplementalKeys =
    selectedSection?.key === "commitments"
      ? ["special-savings"]
      : selectedSection?.key === "financing"
        ? ["other-obligations", "approved-not-paid-out"]
        : []
  const hasMatches = Boolean(search.trim())

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace("/(member)/(tabs)/commitments")
  }
  const exportButton = (
    <Button
      accessibilityLabel="Export statement"
      disabled={!member}
      onPress={() => setExportOpen(true)}
      size="icon"
      testID="member-statement-open-export"
      variant="outline"
    >
      <Icon className="size-base text-foreground" name="Download" />
    </Button>
  )

  return (
    <AppList
      back={goBack}
      compactHeader={
        <View className="min-h-[52px] flex-row items-center justify-between gap-[8px] border-b border-border px-[18px]">
          <ScreenHeaderButton
            accessibilityLabel="Go back"
            icon="ChevronLeft"
            onPress={goBack}
          />
          <Text accessibilityRole="header" variant="section">
            Statement
          </Text>
          {exportButton}
        </View>
      }
      data={member ? data : []}
      empty={
        !statement ? (
          <EmptyState
            action={{ label: "Retry", onPress: onRefresh }}
            description="Check your connection and try again."
            icon="CircleAlert"
            title="Couldn’t load your statement"
            tone="error"
          />
        ) : !member ? (
          <EmptyState
            description="Contact your cooperative to link your membership."
            title="Member profile needs linking"
          />
        ) : (
          <EmptyState
            description={
              hasMatches || category
                ? undefined
                : "Posted savings, financing and share activity appear here."
            }
            title={
              hasMatches
                ? "No matching activity"
                : category
                  ? `No ${category === "charges" ? "charge" : category} activity`
                  : "No activity yet"
            }
          />
        )
      }
      error={member ? activity.error : null}
      header={
        <>
          <MemberReadBanner
            cache={
              activity.cache?.status === "stale"
                ? activity.cache
                : (statement?.cache ?? activity.cache)
            }
            error={Boolean(statement && error)}
            offline={offline}
            onRetry={onRefresh}
          />
          {!exportOpen ? (
            <StatementFileBanner
              {...fileActions}
              onOpen={() => setExportOpen(true)}
            />
          ) : null}
          {member && statement ? (
            <>
              <StatementIdentity member={member} />
              <StatementMetrics
                currencyCode={currencyCode}
                statement={statement}
              />
              <View className="gap-[8px]">
                <Text accessibilityRole="header" variant="section">
                  Statement details
                </Text>
                <ListCard inset={false}>
                  {sections.map((section) => {
                    const count = section.rows.filter(
                      (row) =>
                        !emptyRecordKeys.has(row.key) &&
                        !(
                          row.key === "pending-workflow-charges" &&
                          row.value === 0
                        )
                    ).length
                    return (
                      <RecordRow
                        chevron
                        key={section.key}
                        leading={<></>}
                        meta={
                          count
                            ? `${count} ${count === 1 ? "record" : "records"}`
                            : section.emptyState
                        }
                        onPress={() => setSelectedSection(section)}
                        title={sectionName(section)}
                      />
                    )
                  })}
                </ListCard>
              </View>
              <View className="gap-[8px]">
                <Text accessibilityRole="header" variant="section">
                  Activity
                </Text>
                <ScrollView
                  contentContainerStyle={{ gap: 8 }}
                  horizontal
                  keyboardShouldPersistTaps="handled"
                  showsHorizontalScrollIndicator={false}
                >
                  {filters.map(({ category: value, label }) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: category === value }}
                      className={cn(
                        "min-h-[44px] justify-center rounded-full border px-[14px]",
                        category === value
                          ? "border-primary bg-accent"
                          : "border-border bg-card"
                      )}
                      key={label}
                      onPress={() => {
                        if (category === value) return
                        setSearch("")
                        onCategoryChange(value)
                      }}
                    >
                      <Text
                        className={
                          category === value
                            ? "text-accent-foreground"
                            : "text-muted-foreground"
                        }
                        variant="label"
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </>
          ) : isLoading ? (
            <ListSkeleton rows={3} />
          ) : null}
        </>
      }
      headerActions={exportButton}
      isFetchingNextPage={activity.isFetchingNextPage}
      isLoading={isLoading || Boolean(member && activity.isLoading)}
      keyExtractor={(item) => item.key}
      listFooter={
        <MemberLedgerFooter
          activity={activity}
          endLabel="Start of your statement"
          offline={offline}
          searching={hasMatches}
        />
      }
      onEndReached={offline || hasMatches ? undefined : activity.onLoadMore}
      onRefresh={onRefresh}
      onRetry={activity.onRefresh}
      overlay={
        <>
          <MemberLedgerDetail
            currencyCode={currencyCode}
            onClose={() => setSelectedRow(null)}
            row={selectedRow}
            title="Activity"
          />
          <AppSheet
            onClose={() => setSelectedSection(null)}
            title={selectedSection ? sectionName(selectedSection) : undefined}
            visible={Boolean(selectedSection)}
          >
            {selectedSection ? (
              <>
                {sectionRows.map((row) => (
                  <View
                    className="gap-[4px] border-b border-border pb-[10px]"
                    key={row.key}
                  >
                    <Text variant="section">{row.label}</Text>
                    <Text className="text-muted-foreground" variant="small">
                      {row.detail}
                    </Text>
                    {row.value !== null ? (
                      <Text variant="money">
                        {formatLedgerValue(row, currencyCode)}
                      </Text>
                    ) : null}
                    {row.status ? (
                      <StatusPill
                        label={row.status}
                        tone={statusToneFor(row.status)}
                      />
                    ) : null}
                  </View>
                ))}
                {statement?.stats
                  .filter((metric) => supplementalKeys.includes(metric.key))
                  .map((metric) => (
                    <View className="gap-[4px]" key={metric.key}>
                      <Text variant="label">{metric.label}</Text>
                      <Text variant="money">
                        {formatLedgerValue(
                          metricWithStatus(metric),
                          currencyCode
                        )}
                      </Text>
                      <Text className="text-muted-foreground" variant="small">
                        {metric.detail}
                      </Text>
                    </View>
                  ))}
                {sectionRows.length === 0 ? (
                  <Text className="text-muted-foreground" variant="small">
                    {selectedSection.emptyState}
                  </Text>
                ) : null}
              </>
            ) : null}
          </AppSheet>
          <StatementExportSheet
            {...fileActions}
            onClose={() => setExportOpen(false)}
            visible={exportOpen}
          />
        </>
      }
      refreshing={refreshing}
      renderItem={({ item }) => (
        <MemberLedgerRow
          currencyCode={currencyCode}
          item={item}
          onPress={setSelectedRow}
        />
      )}
      search={
        member
          ? {
              localSearch: true,
              onChangeText: setSearch,
              placeholder: "Search loaded activity",
              totalCount: activity.rows.length,
              value: search,
            }
          : undefined
      }
      stickyIndices={member ? stickyIndices : undefined}
      testID="member-statement-screen"
      title="Statement"
    />
  )
}

function metricWithStatus(metric: MobileMemberStatement["stats"][number]) {
  return { ...metric, status: null }
}
