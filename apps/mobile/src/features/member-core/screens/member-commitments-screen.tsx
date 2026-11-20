import { AppList } from "@/components/app/app-list"
import { EmptyState } from "@/components/app/empty-state"
import { ScreenHero } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { ListCard, RecordRow, TintedAvatar } from "@/components/ui/list-card"
import { StatusPill } from "@/components/ui/status-pill"
import { Pressable } from "@/components/ui/pressable"
import { ListSkeleton } from "@/components/ui/skeleton"
import { Text } from "@/components/ui/text"
import { useRouter } from "expo-router"
import { useState } from "react"
import { View } from "react-native"
import { buildMemberCommitmentsPresentation } from "../model/member-commitments-presentation"
import type {
  MobileMemberActivityRow,
  MobileMemberSection,
} from "../model/member-core-types"
import type { MemberActivityRead } from "../public/use-member-activity"
import {
  MemberLedgerDetail,
  MemberLedgerFooter,
  MemberLedgerRow,
  MemberReadBanner,
  useMemberLedgerList,
} from "./member-ledger-list"

export function MemberCommitmentsScreen({
  activity,
  currencyCode,
  error,
  isLoading,
  offline,
  onRefresh,
  refreshing,
  section,
}: {
  activity: MemberActivityRead
  currencyCode: string
  error: boolean
  isLoading: boolean
  offline: boolean
  onRefresh: () => void
  refreshing: boolean
  section?: MobileMemberSection
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<MobileMemberActivityRow | null>(null)
  const { data, search, setSearch, stickyIndices } = useMemberLedgerList(
    activity.rows,
    true,
    !activity.hasNextPage && activity.cache?.status === "live"
  )
  const plan = section?.rows.find(
    (row) => row.key.startsWith("plan-") && row.status === "Active"
  )
  const position = section
    ? buildMemberCommitmentsPresentation(section, currencyCode)
    : null
  const count =
    section?.stats.find((metric) => metric.key === "contributions")?.value ?? 0

  return (
    <AppList
      data={section ? data : []}
      empty={
        section ? (
          <EmptyState
            description={
              search
                ? undefined
                : "Your contributions appear here once the cooperative posts them."
            }
            title={
              search
                ? "No matching contributions"
                : "No posted contributions yet"
            }
          />
        ) : (
          <EmptyState
            action={{ label: "Retry", onPress: onRefresh }}
            description="Check your connection and try again."
            icon="CircleAlert"
            title="Couldn’t load your plans"
            tone="error"
          />
        )
      }
      error={section ? activity.error : null}
      header={
        <>
          <MemberReadBanner
            cache={
              activity.cache?.status === "stale"
                ? activity.cache
                : (section?.cache ?? activity.cache)
            }
            error={Boolean(section && error)}
            offline={offline}
            onRetry={onRefresh}
          />
          {position ? (
            <>
              <View className="gap-[8px]">
                <Text accessibilityRole="header" variant="section">
                  Active plan
                </Text>
                <ListCard>
                  {plan ? (
                    <Pressable
                      accessibilityRole="button"
                      className="min-h-[76px] flex-row items-center gap-[12px] px-[14px] py-[12px]"
                      onPress={() => setSelected(plan)}
                    >
                      <TintedAvatar icon="BadgeCheck" name={plan.label} />
                      <View className="min-w-0 flex-1 gap-[2px]">
                        <Text variant="section">{plan.label}</Text>
                        <Text className="text-muted-foreground" variant="small">
                          {position.activePlan.value}
                          {plan.interval === "Monthly"
                            ? " every month"
                            : plan.interval
                              ? ` · ${plan.interval}`
                              : ""}{" "}
                          · {plan.detail}
                        </Text>
                      </View>
                      <StatusPill label="Active" tone="success" />
                    </Pressable>
                  ) : (
                    <RecordRow
                      avatarIcon="BadgeCheck"
                      meta="Your cooperative sets up your savings plan."
                      title="No active plan"
                    />
                  )}
                </ListCard>
              </View>
              <Text accessibilityRole="header" variant="section">
                Contributions
              </Text>
            </>
          ) : isLoading ? (
            <ListSkeleton rows={2} />
          ) : null}
        </>
      }
      hero={
        <ScreenHero className="gap-[16px]">
          <View className="flex-row items-center justify-between gap-[12px]">
            <Text
              accessibilityRole="header"
              className="text-hero-foreground flex-1"
              variant="screenTitle"
            >
              Plans
            </Text>
            <Pressable
              accessibilityRole="button"
              className="bg-hero-foreground/15 min-h-[44px] flex-row items-center gap-[8px] rounded-full px-[14px]"
              onPress={() => router.push("/(member)/statement")}
            >
              <Icon className="size-sm text-hero-foreground" name="FileText" />
              <Text className="text-hero-foreground" variant="label">
                Statement
              </Text>
            </Pressable>
          </View>
          {position ? (
            <>
              <View className="gap-[4px]">
                <Text className="text-hero-foreground/80" variant="label">
                  {position.postedSavings.label}
                </Text>
                <Text
                  className="text-hero-foreground tabular-nums"
                  variant="hero"
                >
                  {position.postedSavings.value}
                </Text>
                <View className="bg-hero-foreground/15 flex-row items-center gap-[6px] self-start rounded-full px-[10px] py-[4px]">
                  <Icon
                    className="size-sm text-hero-foreground"
                    name={count ? "Check" : "Clock"}
                  />
                  <Text className="text-hero-foreground" variant="caption">
                    {position.contributionSummary ??
                      "No posted contributions yet"}
                  </Text>
                </View>
              </View>
              <View className="bg-hero-end/40 flex-row rounded-[18px]">
                <View className="border-hero-foreground/20 flex-1 gap-[2px] border-r p-[12px]">
                  <Text className="text-hero-foreground/80" variant="caption">
                    {plan?.interval === "Monthly" || !plan
                      ? "Monthly commitment"
                      : "Active commitment"}
                  </Text>
                  <Text className="text-hero-foreground" variant="money">
                    {position.activePlan.value ?? "Not set"}
                  </Text>
                  <Text className="text-hero-foreground/80" variant="caption">
                    {plan?.detail ?? "Set by your cooperative"}
                  </Text>
                </View>
                <View className="flex-1 gap-[2px] p-[12px]">
                  <Text className="text-hero-foreground/80" variant="caption">
                    {position.specialSavings.label}
                  </Text>
                  <Text className="text-hero-foreground" variant="money">
                    {position.specialSavings.value}
                  </Text>
                  <Text className="text-hero-foreground/80" variant="caption">
                    Voluntary
                  </Text>
                </View>
              </View>
            </>
          ) : null}
        </ScreenHero>
      }
      isFetchingNextPage={activity.isFetchingNextPage}
      isLoading={isLoading || Boolean(section && activity.isLoading)}
      keyExtractor={(item) => item.key}
      listFooter={
        <MemberLedgerFooter
          activity={activity}
          endLabel={position?.contributionSummary ?? "All contributions"}
          offline={offline}
          searching={Boolean(search.trim())}
        />
      }
      onEndReached={offline || search.trim() ? undefined : activity.onLoadMore}
      onRefresh={onRefresh}
      onRetry={activity.onRefresh}
      overlay={
        <MemberLedgerDetail
          currencyCode={currencyCode}
          onClose={() => setSelected(null)}
          row={selected}
          title={
            selected?.key.startsWith("plan-") ? "Active plan" : "Contribution"
          }
        />
      }
      refreshing={refreshing}
      renderItem={({ item }) => (
        <MemberLedgerRow
          currencyCode={currencyCode}
          item={item}
          onPress={setSelected}
          plans
        />
      )}
      search={
        section
          ? {
              localSearch: true,
              onChangeText: setSearch,
              placeholder: "Search loaded contributions",
              totalCount: Math.max(count, activity.rows.length),
              value: search,
            }
          : undefined
      }
      stickyIndices={section ? stickyIndices : undefined}
      testID="member-plans-screen"
    />
  )
}
