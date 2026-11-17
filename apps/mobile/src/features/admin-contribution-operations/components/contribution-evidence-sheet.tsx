import { AppSheet } from "@/components/app/app-sheet"
import { ReviewRow } from "@/components/app/result-screen"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useRef } from "react"
import { View } from "react-native"
import {
  formatCurrency,
  formatDate,
} from "../lib/admin-contribution-presentation"
import type { ContributionLedgerRow } from "../model/admin-contribution-operations-types"
import {
  channelLabel,
  contributionStatus,
  periodOf,
} from "../model/contribution-forms"

/** T18 screen 2 (02 Brand hero): one ledger entry's evidence, read-only. */
export function ContributionEvidenceSheet({
  currencyCode,
  entry: current,
  onClose,
  onOpenMember,
}: {
  currencyCode: string
  entry: ContributionLedgerRow | null
  onClose: () => void
  onOpenMember: (memberId: string) => void
}) {
  // Keep the last entry on screen while the sheet animates closed.
  const last = useRef(current)
  if (current) last.current = current
  const entry = last.current
  const status = entry ? contributionStatus(entry.status) : null
  return (
    <AppSheet
      footer={
        entry ? (
          <View className="px-[20px] pt-[8px] pb-[20px]">
            <Button
              onPress={() => onOpenMember(entry.memberId)}
              variant="secondary"
            >
              <Icon className="size-[18px] text-secondary-foreground" name="Users" />
              <Text>View member contributions</Text>
            </Button>
          </View>
        ) : undefined
      }
      insetFloatingFooter
      onClose={onClose}
      title="Contribution"
      visible={Boolean(current)}
    >
      {entry && status ? (
        <View className="gap-[14px]">
          <View className="items-center gap-[2px]">
            <Text className="text-muted-foreground" variant="label">
              {entry.memberName} · {entry.memberNumber}
            </Text>
            <Text variant="hero">{formatCurrency(entry.amount, currencyCode)}</Text>
          </View>
          <View>
            <ReviewRow
              compact
              label="Status"
              value={<StatusPill label={status.label} tone={status.tone} />}
            />
            <ReviewRow
              compact
              label="Commitment savings"
              value={formatCurrency(entry.committedAmount, currencyCode)}
            />
            <ReviewRow
              compact
              label="Special savings"
              value={formatCurrency(entry.extraSavingsAmount, currencyCode)}
            />
            <ReviewRow compact label="Channel" value={channelLabel(entry.channel)} />
            <ReviewRow
              compact
              label="Period"
              value={entry.periodLabel ?? periodOf(entry.postedAt)}
            />
            <ReviewRow
              compact
              label="Reference"
              value={entry.reference ?? "Not provided"}
            />
            <ReviewRow compact label="Posted" value={formatDate(entry.postedAt)} />
          </View>
        </View>
      ) : null}
    </AppSheet>
  )
}
