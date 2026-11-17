import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { DetailSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import { useState, type ReactNode } from "react"
import { Pressable, View, useWindowDimensions } from "react-native"
import type {
  RepaymentCapabilities,
  RepaymentFacility,
} from "../model/admin-repayment-operations-types"
import {
  dayCount,
  formatRepaymentDate,
  outcomeFor,
  paidInstalments,
  scheduleState,
  scheduleWindow,
  type IconTone,
} from "../model/admin-repayment-presentation"

const tileClass: Record<IconTone, [string, string]> = {
  brand: ["bg-accent", "text-accent-foreground"],
  danger: ["bg-tint-danger", "text-tint-danger-foreground"],
  info: ["bg-tint-sky", "text-tint-sky-foreground"],
  success: ["bg-tint-success", "text-tint-success-foreground"],
  warning: ["bg-tint-warm", "text-tint-warm-foreground"],
}

export function IconTile({
  icon,
  size = 36,
  tone,
}: {
  icon: string
  size?: 36 | 40
  tone: IconTone
}) {
  const [surface, text] = tileClass[tone]
  return (
    <View
      className={cn(
        "items-center justify-center rounded-[12px]",
        size === 40 ? "size-[40px]" : "size-[36px]",
        surface
      )}
    >
      <Icon className={cn("size-[18px]", text)} name={icon} />
    </View>
  )
}

function SectionTitle({ action, title }: { action?: ReactNode; title: string }) {
  return (
    <View className="min-h-[28px] flex-row items-center justify-between gap-[10px] pt-[6px]">
      <Text accessibilityRole="header" variant="section">
        {title}
      </Text>
      {action}
    </View>
  )
}

function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-[44px] justify-center"
      hitSlop={6}
      onPress={onPress}
    >
      <Text className="text-primary" variant="label">
        {label}
      </Text>
    </Pressable>
  )
}

function Divided({ children }: { children: ReactNode[] }) {
  return (
    <Elevated className="overflow-hidden rounded-[20px] bg-card" radius={20}>
      {children.map((child, index) => (
        <View key={index}>
          {index ? <View className="ml-[60px] h-px bg-border" /> : null}
          {child}
        </View>
      ))}
    </Elevated>
  )
}

const instClass = {
  due: ["bg-tint-warm", "text-tint-warm-foreground"],
  overdue: ["bg-tint-danger", "text-tint-danger-foreground"],
  paid: ["bg-tint-success", "text-tint-success-foreground"],
  upcoming: ["bg-surface-raised", "text-foreground-soft"],
  waived: ["bg-surface-raised", "text-foreground-soft"],
} as const

function FacilityBody({
  facility,
  money,
}: {
  facility: RepaymentFacility
  money: (value: number) => string
}) {
  const colors = useColors()
  const [allSchedule, setAllSchedule] = useState(false)
  const [allRepayments, setAllRepayments] = useState(false)
  const paid = paidInstalments(facility)
  const term = facility.schedule.length || facility.termMonths
  const progress = facility.principalAmount
    ? Math.max(0, Math.min(1, facility.paidPrincipal / facility.principalAmount))
    : 0
  const next = facility.nextDue
  const latestFollowUp = next
    ? facility.collectionFollowUps.find(
        (followUp) => followUp.installmentNumber === next.installmentNumber
      )
    : undefined
  const repaymentTotal = facility.counts?.repayments ?? facility.repayments.length
  const repayments = allRepayments
    ? facility.repayments
    : facility.repayments.slice(0, 4)
  const schedule = scheduleWindow(facility, allSchedule)

  return (
    <View className="gap-[14px]">
      <View className="gap-[2px]">
        <Text accessibilityRole="header" variant="screenTitle">
          {facility.member.name}
        </Text>
        <Text className="text-muted-foreground" variant="small">
          {facility.member.number} · {facility.productName}
        </Text>
      </View>
      <Elevated className="gap-[10px] rounded-[20px] bg-card p-[16px]" radius={20}>
        <View className="gap-[2px]">
          <Text className="text-muted-foreground" variant="caption">
            Outstanding
          </Text>
          <Text className="text-[30px] leading-[36px]" variant="money">
            {money(facility.outstandingPrincipal)}
          </Text>
        </View>
        <View
          accessibilityLabel={`${Math.round(progress * 100)}% repaid`}
          accessibilityRole="progressbar"
          className="h-[6px] overflow-hidden rounded-full bg-surface-raised"
        >
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: 999,
              height: "100%",
              width: `${progress * 100}%`,
            }}
          />
        </View>
        <Text className="text-muted-foreground" variant="small">
          {money(facility.paidPrincipal)} repaid of{" "}
          {money(facility.principalAmount)} · {paid} of {term} instalments paid
        </Text>
      </Elevated>

      {next ? (
        <Elevated className="gap-[8px] rounded-[20px] bg-card p-[16px]" radius={20}>
          <View className="flex-row items-center justify-between gap-[10px]">
            <Text className="text-muted-foreground" variant="caption">
              Next instalment · {next.installmentNumber} of {term}
            </Text>
            {next.agingDays > 0 ? (
              <StatusPill
                label={`${dayCount(next.agingDays)} overdue`}
                tone="danger"
              />
            ) : scheduleState(next) === "due" ? (
              <StatusPill label="Due today" tone="warning" />
            ) : (
              <StatusPill label="On track" tone="success" />
            )}
          </View>
          <Text className="text-[30px] leading-[36px]" variant="money">
            {money(next.outstandingAmount)}
          </Text>
          <View className="flex-row items-center gap-[8px]">
            <Icon className="size-[18px] text-muted-foreground" name="CalendarDays" />
            <Text className="text-foreground-soft" variant="small">
              Due {formatRepaymentDate(next.dueAt, true)}
            </Text>
          </View>
          {latestFollowUp ? (
            <View className="mt-[4px] flex-row items-start gap-[10px] rounded-[14px] bg-surface-raised px-[12px] py-[10px]">
              <Icon className="mt-[1px] size-[18px] text-foreground-soft" name="FileText" />
              <Text className="min-w-0 flex-1 text-foreground-soft" variant="small">
                Last follow-up:{" "}
                <Text className="font-bold" variant="small">
                  {outcomeFor(latestFollowUp.status).label}
                </Text>{" "}
                on {formatRepaymentDate(latestFollowUp.createdAt)}
                {latestFollowUp.nextActionAt
                  ? ` · next action ${formatRepaymentDate(latestFollowUp.nextActionAt)}`
                  : ""}
              </Text>
            </View>
          ) : next.agingDays > 0 ? (
            <View className="mt-[4px] flex-row items-start gap-[10px] rounded-[14px] bg-tint-warm px-[12px] py-[10px]">
              <Icon className="mt-[1px] size-[18px] text-tint-warm-foreground" name="CircleAlert" />
              <Text className="min-w-0 flex-1 text-tint-warm-foreground" variant="small">
                No follow-up recorded for this instalment yet.
              </Text>
            </View>
          ) : null}
        </Elevated>
      ) : (
        <Elevated className="gap-[8px] rounded-[20px] bg-card p-[16px]" radius={20}>
          <IconTile icon="Check" size={40} tone="success" />
          <Text variant="section">Fully repaid</Text>
          <Text className="text-muted-foreground" variant="small">
            All {term} instalments are paid. Nothing is due on this facility.
          </Text>
        </Elevated>
      )}

      <SectionTitle
        action={
          facility.schedule.length > schedule.length || allSchedule ? (
            <TextLink
              label={allSchedule ? "Show fewer" : `Show all ${facility.schedule.length}`}
              onPress={() => setAllSchedule((value) => !value)}
            />
          ) : undefined
        }
        title="Schedule"
      />
      {schedule.length ? (
        <Divided>
          {schedule.map((row) => {
            const state = scheduleState(row)
            const [surface, text] = instClass[state]
            const label = {
              due: "Due today",
              overdue: `${dayCount(row.agingDays)} overdue`,
              paid: "Paid",
              upcoming: "Upcoming",
              waived: "Waived",
            }[state]
            return (
              <View
                className="min-h-[60px] flex-row items-center gap-[12px] px-[14px] py-[10px]"
                key={row.id}
              >
                <View
                  className={cn(
                    "size-[34px] items-center justify-center rounded-full",
                    surface
                  )}
                >
                  {state === "paid" ? (
                    <Icon className={cn("size-[16px]", text)} name="Check" />
                  ) : (
                    <Text className={text} tabular variant="label">
                      {row.installmentNumber}
                    </Text>
                  )}
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-bold" variant="small">
                    Instalment {row.installmentNumber}
                  </Text>
                  <Text className="text-muted-foreground" variant="caption">
                    {formatRepaymentDate(row.dueAt, true)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text tabular variant="label">
                    {money(row.totalDue)}
                  </Text>
                  <Text
                    className={
                      state === "overdue"
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }
                    variant="caption"
                  >
                    {label}
                  </Text>
                </View>
              </View>
            )
          })}
        </Divided>
      ) : (
        <Text className="text-muted-foreground" variant="small">
          No schedule on this facility.
        </Text>
      )}

      <SectionTitle
        action={
          repaymentTotal > 4 ? (
            facility.repayments.length > 4 ? (
              <TextLink
                label={
                  allRepayments
                    ? "Show fewer"
                    : `Latest 4 of ${repaymentTotal} · Show more`
                }
                onPress={() => setAllRepayments((value) => !value)}
              />
            ) : (
              <Text className="text-muted-foreground" variant="caption">
                Latest {facility.repayments.length} of {repaymentTotal}
              </Text>
            )
          ) : undefined
        }
        title="Repayments"
      />
      {repayments.length ? (
        <Divided>
          {repayments.map((repayment) => (
            <View
              className="min-h-[60px] flex-row items-center gap-[12px] px-[14px] py-[10px]"
              key={repayment.id}
            >
              <IconTile icon="Receipt" tone="success" />
              <View className="min-w-0 flex-1">
                <Text className="font-bold" numberOfLines={1} variant="small">
                  {repayment.reference ?? "No reference"}
                </Text>
                <Text
                  className="text-muted-foreground"
                  numberOfLines={1}
                  variant="caption"
                >
                  {formatRepaymentDate(repayment.paidAt, true)} · by{" "}
                  {repayment.receivedByName}
                </Text>
              </View>
              <Text tabular variant="label">
                {money(repayment.amount)}
              </Text>
            </View>
          ))}
        </Divided>
      ) : (
        <Text className="text-muted-foreground" variant="small">
          No repayments posted to this facility yet.
        </Text>
      )}
      {allRepayments && repaymentTotal > facility.repayments.length ? (
        <Text className="text-muted-foreground" variant="caption">
          Showing the latest {facility.repayments.length} of {repaymentTotal}.
        </Text>
      ) : null}

      <SectionTitle title="Follow-ups" />
      {facility.collectionFollowUps.length ? (
        <Divided>
          {facility.collectionFollowUps.map((followUp) => {
            const outcome = outcomeFor(followUp.status)
            return (
              <View
                className="flex-row items-start gap-[12px] px-[14px] py-[12px]"
                key={followUp.id}
              >
                <IconTile icon={outcome.icon} tone={outcome.tone} />
                <View className="min-w-0 flex-1 gap-[2px]">
                  <Text className="font-bold" variant="small">
                    {outcome.label}
                    {followUp.priority === "high" ? " · High priority" : ""}
                  </Text>
                  <Text className="text-foreground-soft" variant="small">
                    {followUp.note}
                  </Text>
                  <Text className="text-muted-foreground" variant="caption">
                    {[
                      `${followUp.actorName} · ${formatRepaymentDate(followUp.createdAt)}`,
                      followUp.promiseToPayAt
                        ? `promised ${formatRepaymentDate(followUp.promiseToPayAt)}`
                        : null,
                      followUp.nextActionAt
                        ? `next ${formatRepaymentDate(followUp.nextActionAt)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              </View>
            )
          })}
        </Divided>
      ) : (
        <Text className="text-muted-foreground" variant="small">
          No follow-ups recorded.
        </Text>
      )}
    </View>
  )
}

export function RepaymentFacilitySheet({
  capabilities,
  currencyCode,
  error,
  facility,
  loading,
  offline,
  onClose,
  onDismissed,
  onFollowUp,
  onRecord,
  onRetry,
  retrying,
  stale,
  visible,
  writesBlocked,
}: {
  capabilities: RepaymentCapabilities | undefined
  currencyCode: string
  error: boolean
  facility: RepaymentFacility | undefined
  loading: boolean
  offline: boolean
  onClose: () => void
  onDismissed: () => void
  onFollowUp: () => void
  onRecord: () => void
  onRetry: () => void
  retrying: boolean
  stale: boolean
  visible: boolean
  writesBlocked: boolean
}) {
  const { height } = useWindowDimensions()
  const money = (value: number) => formatMoney(value, { currencyCode })
  const settled = facility ? !facility.nextDue : false
  const canFollowUp = Boolean(capabilities?.followUp)
  const canPost = Boolean(capabilities?.post)
  const footer =
    !facility || settled ? undefined : !canFollowUp ? (
      <View className="flex-row items-start gap-[8px] px-[4px]">
        <Icon className="mt-[1px] size-[16px] text-muted-foreground" name="Info" />
        <Text className="flex-1 text-muted-foreground" variant="small">
          View only. Recording repayments and follow-ups needs a finance role.
        </Text>
      </View>
    ) : (
      <View className="gap-[8px]">
        {writesBlocked ? (
          <View className="flex-row items-start gap-[8px] px-[4px]">
            <Icon
              className="mt-[1px] size-[16px] text-muted-foreground"
              name={offline ? "WifiOff" : "RefreshCw"}
            />
            <Text className="flex-1 text-muted-foreground" variant="small">
              {offline
                ? "Reconnect to record. You’re seeing saved data."
                : "Refresh this facility before recording."}
            </Text>
          </View>
        ) : null}
        <View className="flex-row gap-[10px]">
          <Button
            className="flex-1"
            disabled={writesBlocked}
            onPress={onFollowUp}
            testID="repayment-facility-follow-up"
            variant="secondary"
          >
            <Icon className="size-base text-secondary-foreground" name="Bell" />
            <Text>Follow up</Text>
          </Button>
          {canPost ? (
            <Button
              className="flex-1"
              disabled={writesBlocked}
              onPress={onRecord}
              testID="repayment-facility-record"
            >
              <Icon className="size-base text-primary-foreground" name="Plus" />
              <Text>Record repayment</Text>
            </Button>
          ) : null}
        </View>
      </View>
    )
  return (
    <AppSheet
      contentKey={facility?.id}
      footer={footer}
      minimumContentHeight={height}
      onClose={onClose}
      onDismissed={onDismissed}
      title="Facility"
      visible={visible}
    >
      {loading && !facility ? (
        <DetailSkeleton />
      ) : error && !facility ? (
        <EmptyState
          action={
            offline
              ? undefined
              : { label: "Try again", loading: retrying, onPress: onRetry, variant: "secondary" }
          }
          description={
            offline
              ? "Reconnect to load this facility."
              : "Check your connection, then try again."
          }
          icon={offline ? "WifiOff" : "CircleAlert"}
          title="Couldn’t load this facility"
          tone={offline ? "default" : "error"}
        />
      ) : facility ? (
        <View className="gap-[14px]">
          {offline ? (
            <StatusBanner
              description="Showing this facility as last saved."
              kind="offline"
              title="You’re offline"
            />
          ) : stale || error ? (
            <StatusBanner
              kind="stale"
              onRetry={onRetry}
              retryLabel="Refresh"
              retrying={retrying}
              title="This facility may be out of date"
            />
          ) : null}
          <FacilityBody facility={facility} key={facility.id} money={money} />
        </View>
      ) : null}
    </AppSheet>
  )
}
