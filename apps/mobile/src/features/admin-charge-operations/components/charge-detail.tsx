import { AppSheet } from "@/components/app/app-sheet"
import { EmptyState } from "@/components/app/empty-state"
import { ReviewRow } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Elevated, RecordRow } from "@/components/ui/list-card"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import type { ReactNode } from "react"
import { View } from "react-native"
import type {
  ChargeApplicationDetail,
  ChargeCapabilities,
} from "../model/admin-charge-operations-types"
import {
  chargeDate,
  chargeLabel,
  chargeMoney,
  collectionLabel,
} from "../model/charge-display"

import { ChargeStatusChip } from "./charge-status"

export type ChargeAction = "settle" | "waive" | "reverse"
export type ChargeFact = { label: string; value: string; sub?: string }

export function ChargeFacts({ facts }: { facts: ChargeFact[] }) {
  return (
    <Elevated className="overflow-hidden rounded-[20px] bg-card" radius={20}>
      {facts.map(({ label, value, sub }, index) => (
        <View key={`${label}-${index}`}>
          {index ? <View className="mx-[16px] h-px bg-border" /> : null}
          <ReviewRow
            compact
            label={label}
            value={
              <View className="max-w-[64%] min-w-0 shrink items-end">
                <Text className="text-right font-bold" variant="small">
                  {value}
                </Text>
                {sub ? (
                  <Text
                    className="text-right text-muted-foreground"
                    variant="caption"
                  >
                    {sub}
                  </Text>
                ) : null}
              </View>
            }
          />
        </View>
      ))}
    </Elevated>
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <View className="gap-[8px]">
      <Text accessibilityRole="header" className="px-[2px]" variant="section">
        {title}
      </Text>
      {children}
    </View>
  )
}

export function ChargeDetail({
  capabilities,
  currencyCode,
  detail,
  disabled,
  error,
  onAction,
  onClose,
  onRetry,
  visible,
}: {
  capabilities?: ChargeCapabilities
  currencyCode: string
  detail?: ChargeApplicationDetail
  disabled: boolean
  error: boolean
  onAction: (action: ChargeAction) => void
  onClose: () => void
  onRetry: () => void
  visible: boolean
}) {
  const pending = detail?.status === "pending"
  const posted = detail?.status === "posted"
  const canSettle =
    pending &&
    detail.collectionMode === "pay_separately" &&
    capabilities?.manage
  const canCorrect = (pending || posted) && capabilities?.correct
  const money = (amount: number) => chargeMoney(amount, currencyCode)
  return (
    <AppSheet
      footer={
        canSettle || canCorrect ? (
          <View className="gap-[10px]">
            {canSettle ? (
              <Button disabled={disabled} onPress={() => onAction("settle")}>
                <Icon
                  className="size-base text-primary-foreground"
                  name="Banknote"
                />
                <Text>Settle payment</Text>
              </Button>
            ) : null}
            {canCorrect ? (
              <View className="flex-row gap-[10px]">
                <Button
                  className="bg-surface-raised flex-1"
                  disabled={disabled}
                  onPress={() => onAction("waive")}
                  variant="ghost"
                >
                  <Icon className="size-base text-foreground" name="Ban" />
                  <Text>Waive</Text>
                </Button>
                {posted ? (
                  <Button
                    className="bg-tint-danger flex-1"
                    disabled={disabled}
                    onPress={() => onAction("reverse")}
                    variant="ghost"
                  >
                    <Icon
                      className="size-base text-tint-danger-foreground"
                      name="History"
                    />
                    <Text className="text-tint-danger-foreground">Reverse</Text>
                  </Button>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : undefined
      }
      minimumContentHeight={620}
      onBack={onClose}
      onClose={onClose}
      title="Charge detail"
      visible={visible}
    >
      {detail ? (
        <>
          <View className="gap-[4px]">
            <Text
              accessibilityRole="header"
              className="text-muted-foreground"
              variant="label"
            >
              {detail.definitionName} · {detail.definitionCode}
            </Text>
            <Text className="mt-[6px]" tabular variant="hero">
              {money(detail.amount)}
            </Text>
            <Text className="text-foreground-soft" variant="small">
              {detail.memberName} · {detail.memberNumber}
            </Text>
            <View className="mt-[8px] flex-row flex-wrap gap-[6px]">
              <ChargeStatusChip status={detail.status} />
              <StatusPill
                label={collectionLabel(detail.collectionMode)}
                tone="neutral"
              />
              {detail.isMonthlyLevy ? (
                <StatusPill
                  label={`Levy · ${detail.periodLabel}`}
                  tone="info"
                />
              ) : null}
            </View>
          </View>
          <DetailSection title="Details">
            <ChargeFacts
              facts={[
                {
                  label: "Amount rule",
                  value:
                    detail.definition.chargeValueType === "percentage"
                      ? `${detail.definition.effectiveAmount}%${detail.amountBasis === null ? "" : ` of ${money(detail.amountBasis)}`}`
                      : `Fixed · ${money(detail.definition.effectiveAmount)}`,
                  sub: detail.definition.versionEffectiveFrom
                    ? `From ${chargeDate(detail.definition.versionEffectiveFrom)}`
                    : undefined,
                },
                { label: "Assessed", value: chargeDate(detail.assessedAt) },
                { label: "Period", value: detail.periodLabel },
                { label: "Trigger", value: chargeLabel(detail.trigger) },
                { label: "Workflow", value: chargeLabel(detail.workflow) },
              ]}
            />
          </DetailSection>
          {detail.target ? (
            <DetailSection title="Linked request">
              <RecordRow
                avatarIcon="Link"
                meta={chargeLabel(detail.target.state)}
                position="only"
                title={detail.target.label}
              />
            </DetailSection>
          ) : null}
          <DetailSection title="Ledger">
            {detail.ledger ? (
              <ChargeFacts
                facts={[
                  ...detail.ledger.entries.map((entry) => ({
                    label: `${entry.direction === "debit" ? "Dr" : "Cr"} · ${entry.accountName}`,
                    value: money(entry.amount),
                  })),
                  {
                    label: "Reference",
                    value: detail.ledger.reference ?? detail.ledger.id,
                  },
                ]}
              />
            ) : (
              <StatusPill label="No ledger posting" tone="neutral" />
            )}
          </DetailSection>
          <DetailSection title="History">
            <Elevated
              className="gap-[12px] rounded-[20px] bg-card px-[16px] py-[14px]"
              radius={20}
            >
              {detail.audit.length ? (
                detail.audit.map((event) => {
                  const reason = event.metadata?.reason
                  const correctiveId =
                    event.metadata?.correctiveLedgerTransactionId
                  return (
                    <View
                      className="flex-row items-start gap-[10px]"
                      key={event.id}
                    >
                      <View className="size-[26px] items-center justify-center rounded-full bg-accent">
                        <Icon
                          className="size-sm text-accent-foreground"
                          name="History"
                        />
                      </View>
                      <View className="min-w-0 flex-1 gap-[2px]">
                        <Text variant="label">{chargeLabel(event.action)}</Text>
                        <Text
                          className="text-muted-foreground"
                          variant="caption"
                        >
                          {new Date(event.occurredAt).toLocaleString("en-NG")}
                        </Text>
                        {typeof reason === "string" && reason ? (
                          <Text
                            className="bg-surface-raised text-foreground-soft mt-[4px] rounded-[12px] p-[10px]"
                            variant="small"
                          >
                            {reason}
                          </Text>
                        ) : null}
                        {typeof correctiveId === "string" ? (
                          <Text
                            className="text-muted-foreground"
                            variant="caption"
                          >
                            Correction posted to the ledger
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )
                })
              ) : (
                <Text className="text-muted-foreground" variant="small">
                  No audit events yet.
                </Text>
              )}
              {detail.notes ? (
                <Text className="text-foreground-soft" variant="small">
                  {detail.notes}
                </Text>
              ) : null}
            </Elevated>
          </DetailSection>
        </>
      ) : error ? (
        <EmptyState
          action={{ label: "Try again", onPress: onRetry }}
          title="Charge details didn’t load"
          tone="error"
        />
      ) : (
        <ListSkeleton rows={5} />
      )}
    </AppSheet>
  )
}
