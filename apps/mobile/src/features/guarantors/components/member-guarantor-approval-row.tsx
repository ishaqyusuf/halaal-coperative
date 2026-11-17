import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import {
  ListCard,
  RecordRow,
  TintedAvatar,
  type RowPosition,
} from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { useLargeTextLayout } from "@/hooks/use-large-text-layout"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import {
  getGuarantorAnswer,
  presentGuarantorApproval,
} from "../model/member-guarantor-presentation"
import type {
  MobileGuarantorDecision,
  MobileGuarantorRequest,
} from "../model/member-guarantor-types"

export function GuarantorDecisionButtons({
  approval,
  blocked,
  onDecision,
  restriction,
}: {
  approval: MobileGuarantorRequest
  blocked: boolean
  onDecision: (decision: MobileGuarantorDecision) => void
  restriction?: string
}) {
  const largeText = useLargeTextLayout()
  const name = approval.loanRequest.borrowerName
  const finalized = approval.loanRequest.status === "approved"
  return (
    <View className="gap-[8px]">
      <View className={cn("gap-[10px]", !largeText && "flex-row")}>
        <Button
          accessibilityLabel={`I can’t guarantee ${name}`}
          className={cn(
            "min-h-[52px] border-muted-foreground/40",
            !largeText && "flex-1"
          )}
          disabled={blocked || finalized}
          onPress={() => onDecision("rejected")}
          testID={`guarantor-decline-${approval.id}`}
          variant="outline"
        >
          <Icon className="size-sm text-foreground" name="X" />
          <Text>I can’t</Text>
        </Button>
        <Button
          accessibilityLabel={`I agree to guarantee ${name}`}
          className={cn("min-h-[52px]", !largeText && "flex-1")}
          disabled={blocked || finalized}
          onPress={() => onDecision("approved")}
          testID={`guarantor-agree-${approval.id}`}
        >
          <Icon className="size-sm text-primary-foreground" name="Check" />
          <Text>I agree</Text>
        </Button>
      </View>
      {restriction || finalized ? (
        <Text className="text-center text-muted-foreground" variant="caption">
          {finalized
            ? "The cooperative has already approved this financing request."
            : restriction}
        </Text>
      ) : null}
    </View>
  )
}

export function GuarantorDecisionCard({
  approval,
  blocked,
  currencyCode,
  onDecision,
  onOpen,
  restriction,
}: {
  approval: MobileGuarantorRequest
  blocked: boolean
  currencyCode: string
  onDecision: (decision: MobileGuarantorDecision) => void
  onOpen: () => void
  restriction?: string
}) {
  const row = presentGuarantorApproval(approval, currencyCode)
  return (
    <View className="mx-[18px] mb-[8px]">
      <ListCard className="pb-[16px]">
        <View className="gap-[14px]">
          <Pressable
            accessibilityLabel={`View ${row.borrower}’s request, ${row.requestedAmount}`}
            accessibilityRole="button"
            className="gap-[12px] px-[16px] pt-[14px] active:bg-muted"
            haptic
            onPress={onOpen}
          >
            <View className="flex-row items-center gap-[12px]">
              <TintedAvatar name={row.borrower} size={44} />
              <View className="min-w-0 flex-1 gap-[2px]">
                <Text className="font-bold" numberOfLines={1} variant="body">
                  {row.borrower}
                </Text>
                <Text
                  className="text-muted-foreground"
                  numberOfLines={1}
                  variant="small"
                >
                  {row.borrowerContext}
                </Text>
              </View>
              <Icon
                className="size-sm text-muted-foreground"
                name="ChevronRight"
              />
            </View>
            <View className="gap-[2px]">
              <Text tabular variant="title">
                {row.requestedAmount}
              </Text>
              <Text className="text-foreground-soft" tabular variant="small">
                {row.term} · {row.monthlyServicing} a month
              </Text>
            </View>
            <View className="bg-surface-raised flex-row items-start gap-[8px] rounded-[12px] px-[12px] py-[9px]">
              <Icon className="size-sm mt-px text-primary" name="ShieldCheck" />
              <Text
                className="text-foreground-soft min-w-0 flex-1"
                variant="label"
              >
                Agreeing means you will act as guarantor for this financing
                request.
              </Text>
            </View>
          </Pressable>
          <View className="px-[16px]">
            <GuarantorDecisionButtons
              approval={approval}
              blocked={blocked}
              onDecision={onDecision}
              restriction={restriction}
            />
          </View>
        </View>
      </ListCard>
    </View>
  )
}

export function GuarantorHistoryRow({
  approval,
  currencyCode,
  position,
  onOpen,
}: {
  approval: MobileGuarantorRequest
  currencyCode: string
  position: RowPosition
  onOpen: () => void
}) {
  const row = presentGuarantorApproval(approval, currencyCode)
  const answer = getGuarantorAnswer(approval)
  const label = answer.tone === "info" ? "Recorded" : answer.label
  return (
    <RecordRow
      accessibilityLabel={`${row.borrower}, ${row.requestedAmount}, ${answer.label}, ${row.respondedDate}`}
      amount={row.requestedAmount}
      chevron
      onPress={onOpen}
      position={position}
      supporting={
        <View className="flex-row flex-wrap items-center gap-[6px]">
          <StatusPill label={label} tone={answer.tone} />
          {approval.respondedAt ? (
            <Text className="text-muted-foreground" variant="caption">
              {row.respondedDate}
            </Text>
          ) : null}
        </View>
      }
      title={row.borrower}
    />
  )
}
