import { DockedFooter } from "@/components/app/docked-footer"
import { ReviewRow } from "@/components/app/result-screen"
import { ScreenShell } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { ListCard, TintedAvatar } from "@/components/ui/list-card"
import { SectionHeader } from "@/components/ui/section-header"
import { StatusBanner } from "@/components/ui/status-banner"
import { StatusPill } from "@/components/ui/status-pill"
import { Text } from "@/components/ui/text"
import { View } from "react-native"
import { GuarantorDecisionButtons } from "./member-guarantor-approval-row"
import {
  getGuarantorAnswer,
  presentGuarantorApproval,
} from "../model/member-guarantor-presentation"
import type {
  MobileGuarantorDecision,
  MobileGuarantorRequest,
} from "../model/member-guarantor-types"

export function MemberGuarantorDetail({
  approval,
  blocked,
  currencyCode,
  onBack,
  onDecision,
  restriction,
}: {
  approval: MobileGuarantorRequest
  blocked: boolean
  currencyCode: string
  onBack: () => void
  onDecision: (decision: MobileGuarantorDecision) => void
  restriction?: string
}) {
  const row = presentGuarantorApproval(approval, currencyCode)
  const answer = getGuarantorAnswer(approval)
  const waiting = approval.status === "pending"
  return (
    <ScreenShell
      back={onBack}
      title="Guarantor request"
      compactTitle
      footer={
        waiting ? (
          <DockedFooter>
            <GuarantorDecisionButtons
              approval={approval}
              blocked={blocked}
              onDecision={onDecision}
              restriction={restriction}
            />
          </DockedFooter>
        ) : null
      }
    >
      {restriction ? <StatusBanner kind="info" title={restriction} /> : null}
      <ListCard>
        <View className="gap-[12px] p-[16px]">
          <View className="flex-row items-center gap-[12px]">
            <TintedAvatar name={row.borrower} size={52} />
            <View className="min-w-0 flex-1 gap-[2px]">
              <Text variant="title">{row.borrower}</Text>
              <Text className="text-muted-foreground" variant="small">
                {row.borrowerContext}
              </Text>
            </View>
          </View>
          <View className="flex-row flex-wrap items-center justify-between gap-[8px]">
            <StatusPill {...answer} />
            <Text className="text-muted-foreground" variant="caption">
              Requested {row.requestedDate}
            </Text>
          </View>
        </View>
      </ListCard>
      {waiting ? (
        <View>
          <SectionHeader title="What you’d back" />
          <ListCard>
            <View className="gap-[10px] p-[16px]">
              <Text tabular variant="screenTitle">
                {row.requestedAmount}
              </Text>
              <View className="flex-row items-start gap-[8px]">
                <Icon className="size-base text-primary" name="HandCoins" />
                <Text className="text-foreground-soft flex-1" variant="small">
                  If you agree, you back {row.requestedAmount} over {row.term} ·{" "}
                  {row.monthlyServicing} a month
                </Text>
              </View>
            </View>
          </ListCard>
        </View>
      ) : (
        <View>
          <SectionHeader title="Your answer" />
          <ListCard>
            <View className="gap-[10px] p-[16px]">
              <Text className="text-muted-foreground" variant="small">
                {answer.label}
                {approval.respondedAt ? ` · ${row.respondedDate}` : ""}
              </Text>
              <Text variant="body">
                {row.responseNotes ||
                  (answer.tone === "info"
                    ? "Your cooperative recorded this answer."
                    : "No note added.")}
              </Text>
              <Text className="text-foreground-soft" variant="small">
                {approval.loanRequest.status === "approved"
                  ? "Loan request approved by your cooperative"
                  : approval.loanRequest.status === "rejected"
                    ? "Loan request declined by your cooperative"
                    : "Loan request still with your cooperative"}
              </Text>
            </View>
          </ListCard>
        </View>
      )}
      <View>
        <SectionHeader title="Purpose" />
        <ListCard>
          <Text className="p-[16px]" variant="body">
            {row.purpose || "No purpose provided"}
          </Text>
        </ListCard>
      </View>
      {!waiting ? (
        <View>
          <SectionHeader title="Request" />
          <ListCard inset={false}>
            <ReviewRow
              compact
              label="Amount"
              value={row.requestedAmount}
              tabular
            />
            <ReviewRow compact label="Term" value={row.term} />
            <ReviewRow
              compact
              label="Monthly"
              value={row.monthlyServicing}
              tabular
            />
          </ListCard>
        </View>
      ) : null}
    </ScreenShell>
  )
}
