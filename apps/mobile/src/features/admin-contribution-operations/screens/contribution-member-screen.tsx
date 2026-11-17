import { EmptyState } from "@/components/app/empty-state"
import { ScreenShell } from "@/components/app/screen-shell"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import {
  Elevated,
  ListCard,
  RecordRow,
  TintedAvatar,
} from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SectionHeader } from "@/components/ui/section-header"
import { DetailSkeleton, ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { canUseMobileFeatureData } from "@/dev/mobile-dev-session"
import { useAppQuery } from "@/hooks/use-app-query"
import { useAuthContext } from "@/hooks/use-auth"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { createClientSubmissionKey } from "@/lib/client-submission-key"
import { todayDateOnly } from "@/lib/date-only"
import { useIsOnline } from "@/lib/online-status"
import { isMobileReadCacheStale } from "@/lib/read-cache"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { View } from "react-native"
import {
  closeContributionPlan,
  getContributionMember,
  getContributionSummary,
} from "../api/admin-contribution-operations-api"
import { ContributionPlanSheet } from "../components/contribution-plan-sheet"
import {
  ContributionResultSheet,
  ContributionReviewSheet,
  useContributionReview,
} from "../components/contribution-review-sheet"
import { PostContributionPaymentSheet } from "../components/post-contribution-payment-sheet"
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
} from "../lib/admin-contribution-presentation"
import {
  allocationLabel,
  contributionStatus,
  periodOf,
} from "../model/contribution-forms"
import {
  contributionKeys,
  usePullRefresh,
  useRefreshContributions,
} from "../model/contribution-queries"

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View className="w-1/2 gap-[2px] py-[8px] pr-[8px]">
      <Text className="text-muted-foreground" variant="caption">
        {label}
      </Text>
      <Text numberOfLines={1} variant="money">
        {value}
      </Text>
    </View>
  )
}

/**
 * T18 screen 3 (01 Large title): one member's commitment, last 12
 * contributions and plan history, with Record payment and Set plan.
 * Reads: the member (one request) and the cached summary.
 */
export function ContributionMemberScreen({ memberId }: { memberId: string }) {
  const { profile } = useAuthContext()
  const online = useIsOnline()
  const largeText = useLargeTextLayout()
  const refresh = useRefreshContributions()
  const enabled = canUseMobileFeatureData(profile, "admin")
  const keys = contributionKeys()
  const [form, setForm] = useState<"plan" | "payment" | null>(null)

  const summary = useAppQuery({
    enabled,
    networkMode: "always",
    queryFn: getContributionSummary,
    queryKey: keys.summary,
  })
  const query = useAppQuery({
    enabled,
    networkMode: "always",
    queryFn: () => getContributionMember(memberId),
    queryKey: keys.member(memberId),
  })
  const member = query.data
  const currencyCode = summary.data?.currencyCode ?? "NGN"
  const canManage = Boolean(summary.data?.capabilities.manageMemberContributions)
  const offline = !online
  const blocked = offline || isMobileReadCacheStale(member?.cache)

  const pull = usePullRefresh(() => query.refetch())

  const flow = useContributionReview({
    onSucceeded: () => {
      setForm(null)
      void refresh({ lanes: ["commitments", "ledger"], memberId })
    },
  })

  if (!member) {
    return (
      <ScreenShell
        onRefresh={enabled ? pull.onRefresh : undefined}
        refreshing={pull.refreshing}
        title="Member"
      >
        {query.isError ? (
          <EmptyState
            action={{ label: "Try again", onPress: () => void query.refetch() }}
            description="Their contributions are unchanged. Try again."
            icon="CircleAlert"
            title="Couldn’t load this member"
            tone="error"
          />
        ) : (
          <View className="gap-[16px] px-[18px]">
            <DetailSkeleton rows={4} />
            <ListSkeleton rows={5} />
          </View>
        )}
      </ScreenShell>
    )
  }

  const active = member.planHistory.find((plan) => plan.isActive)
  const loan = member.activeLoan

  function closePlan() {
    if (!member || !active) return
    const input = {
      commandId: createClientSubmissionKey(),
      endsAt: `${todayDateOnly()}T00:00:00.000Z`,
      expectedState: "active",
      planId: active.id,
    }
    flow.open({
      amount: formatCurrency(active.amount, currencyCode),
      busyLabel: "Closing",
      cancelLabel: "Cancel",
      cta: "Close commitment",
      danger: true,
      failure: "The commitment is still active. Try again.",
      rows: [
        ["Started", formatDate(active.startsAt)],
        ["Closes", formatDate(input.endsAt)],
        ["History", "Kept"],
      ],
      run: () => closeContributionPlan(input),
      sub: `monthly · ${member.name}`,
      success: [
        "Commitment closed",
        "The plan’s history is kept. Set a new plan any time.",
      ],
      title: "Close commitment?",
    })
  }

  return (
    <>
      <ScreenShell
        header={
          <View className="gap-[16px]">
            <View className="flex-row items-center gap-[12px]">
              <TintedAvatar name={member.name} size={52} />
              <View className="min-w-0 flex-1">
                <Text accessibilityRole="header" numberOfLines={2} variant="screenTitle">
                  {member.name}
                </Text>
                <Text className="text-muted-foreground" numberOfLines={1} variant="small">
                  {member.number}
                  {member.deductionSourceName
                    ? ` · ${member.deductionSourceName}`
                    : ""}
                </Text>
              </View>
            </View>
            <Elevated className="rounded-[20px] bg-card px-[16px] py-[8px]" radius={20}>
              <View className="flex-row flex-wrap">
                <Fact
                  label="Monthly commitment"
                  value={
                    member.commitmentTarget
                      ? formatCurrency(member.commitmentTarget, currencyCode)
                      : "—"
                  }
                />
                <Fact
                  label="Saved"
                  value={formatCurrency(member.totalSavings, currencyCode)}
                />
                <Fact
                  label="Allocation"
                  value={allocationLabel(member.paymentAllocationPreference)}
                />
                <Fact
                  label="Financing"
                  value={
                    loan
                      ? formatCompactCurrency(loan.outstandingPrincipal, currencyCode)
                      : "None"
                  }
                />
              </View>
            </Elevated>
            {offline ? (
              <StatusBanner
                description="Saved details only. Payments and plan changes need a connection."
                kind="offline"
                title="Offline"
              />
            ) : null}
            {canManage ? (
              <View className={largeText ? "gap-[10px]" : "flex-row gap-[10px]"}>
                <Button
                  className={largeText ? undefined : "flex-1"}
                  disabled={blocked}
                  onPress={() => setForm("payment")}
                  testID="contribution-member-record-payment"
                >
                  <Icon className="size-[18px] text-primary-foreground" name="Wallet" />
                  <Text>Record payment</Text>
                </Button>
                <Button
                  className={largeText ? undefined : "flex-1"}
                  disabled={blocked}
                  onPress={() => setForm("plan")}
                  testID="contribution-member-set-plan"
                  variant="secondary"
                >
                  <Icon className="size-[18px] text-secondary-foreground" name="CalendarClock" />
                  <Text>{member.commitmentTarget ? "Set plan" : "Set a plan"}</Text>
                </Button>
              </View>
            ) : null}
          </View>
        }
        onRefresh={online ? pull.onRefresh : undefined}
        refreshing={pull.refreshing}
        testID="contribution-member-screen"
      >
        <View className="gap-[10px]">
          <SectionHeader
            title="Contributions"
            value={
              member.contributionHistory.length
                ? `${member.contributionHistory.length} record${member.contributionHistory.length > 1 ? "s" : ""}`
                : undefined
            }
          />
          {member.contributionHistory.length ? (
            <>
              <ListCard inset={false}>
                {member.contributionHistory.map((item) => {
                  const status = contributionStatus(item.status)
                  return (
                    <View
                      className={cn(item.status === "reversed" && "opacity-60")}
                      key={item.id}
                    >
                      <View className="min-h-[64px] flex-row items-center gap-[12px] px-[14px] py-[10px]">
                        <View className="min-w-0 flex-1 gap-[2px]">
                          <Text className="font-bold" variant="body">
                            {periodOf(item.postedAt)}
                          </Text>
                          <Text className="text-muted-foreground" numberOfLines={1} variant="small">
                            {formatDate(item.postedAt)}
                            {item.reference ? ` · ${item.reference}` : ""}
                          </Text>
                        </View>
                        <View className="items-end gap-[4px]">
                          <Text variant="money">
                            {formatCurrency(item.amount, currencyCode)}
                          </Text>
                          <StatusPill label={status.label} tone={status.tone} />
                        </View>
                      </View>
                    </View>
                  )
                })}
              </ListCard>
              {member.contributionHistory.length >= 12 ? (
                <Text className="text-center text-muted-foreground" variant="caption">
                  Last 12 contributions
                </Text>
              ) : null}
            </>
          ) : (
            <EmptyState icon="History" title="No contributions recorded yet." />
          )}
          <SectionHeader
            className="mt-[8px]"
            title="Commitment history"
            value={
              member.planHistory.length
                ? `${member.planHistory.length} plan${member.planHistory.length > 1 ? "s" : ""}`
                : undefined
            }
          />
          {member.planHistory.length ? (
            <ListCard>
              {member.planHistory.map((plan) => (
                <RecordRow
                  avatarIcon="CalendarClock"
                  key={plan.id}
                  meta={`${formatDate(plan.startsAt)}${plan.endsAt ? ` – ${formatDate(plan.endsAt)}` : " · ongoing"}`}
                  status={plan.isActive ? "Active" : "Closed"}
                  statusTone={plan.isActive ? "success" : "neutral"}
                  title={`${formatCurrency(plan.amount, currencyCode)} monthly`}
                />
              ))}
            </ListCard>
          ) : (
            <EmptyState icon="CalendarClock" title="No commitment plan yet." />
          )}
          {canManage && active ? (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: blocked }}
              className="min-h-[44px] items-center justify-center"
              disabled={blocked}
              onPress={closePlan}
              testID="contribution-member-close-plan"
            >
              <Text
                className={blocked ? "text-muted-foreground" : "text-destructive"}
                variant="label"
              >
                Close active commitment
              </Text>
            </Pressable>
          ) : null}
        </View>
      </ScreenShell>
      {form === "plan" ? (
        <ContributionPlanSheet
          blocked={blocked}
          currencyCode={currencyCode}
          member={member}
          onClose={() => setForm(null)}
          onReview={flow.open}
          reviewActive={flow.active}
        />
      ) : null}
      {form === "payment" ? (
        <PostContributionPaymentSheet
          blocked={blocked}
          currencyCode={currencyCode}
          member={member}
          onClose={() => setForm(null)}
          onReview={flow.open}
          reviewActive={flow.active}
        />
      ) : null}
      <ContributionReviewSheet flow={flow} />
      <ContributionResultSheet onDone={flow.dismissResult} result={flow.result} />
    </>
  )
}
