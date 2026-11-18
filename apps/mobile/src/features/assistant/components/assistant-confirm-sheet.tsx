import { AppSheet } from "@/components/app/app-sheet"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import type { AssistantProposal } from "@halaalvest/assistant/contracts"
import { View } from "react-native"
import {
  proposalConfirmLabel,
  proposalLines,
  proposalTitle,
} from "../model/proposal-model"

/**
 * 03 draft review and confirm (T25): a floating confirm sheet with the amount,
 * the exact fields of this revision and what confirming does. It confirms
 * only on its own button; "Not now" closes without saving.
 */
export function AssistantConfirmSheet({
  proposal,
  working,
  onConfirm,
  onClose,
}: {
  proposal: AssistantProposal | null
  working: boolean
  onConfirm: (proposal: AssistantProposal) => void
  onClose: () => void
}) {
  const kind = proposal?.fields.kind
  const lines = proposal ? proposalLines(proposal.fields) : []
  const amount = lines.find((line) => line.label === "Amount")
  return (
    <AppSheet
      dismissible={!working}
      onClose={onClose}
      title={kind ? `${proposalConfirmLabel[kind]}?` : undefined}
      variant="confirm"
      visible={Boolean(proposal)}
    >
      {proposal && kind ? (
        <View className="gap-[14px]">
          {amount ? (
            <View className="gap-[2px]">
              <Text className="text-muted-foreground" variant="label">
                {proposalTitle[kind]}
              </Text>
              <Text variant="hero">{amount.value}</Text>
            </View>
          ) : null}
          <View className="overflow-hidden rounded-[16px] bg-surface-raised px-[14px] py-[6px]">
            {lines
              .filter((line) => line !== amount)
              .map((line, index) => (
                <View
                  className="min-h-[36px] flex-row items-center justify-between gap-[12px]"
                  // biome-ignore lint/suspicious/noArrayIndexKey: review lines have no ids
                  key={index}
                >
                  <Text className="min-w-0 flex-1 text-muted-foreground" variant="small">
                    {line.label}
                  </Text>
                  <Text className="max-w-[60%] text-right font-bold" variant="small">
                    {line.value}
                  </Text>
                </View>
              ))}
          </View>
          <Text className="text-muted-foreground" variant="small">
            {proposal.effect}
          </Text>
          <View className="gap-[6px]">
            <Button
              loading={working}
              onPress={() => onConfirm(proposal)}
              testID="assistant-confirm-draft"
            >
              <Text>{working ? "Submitting…" : proposalConfirmLabel[kind]}</Text>
            </Button>
            <Button disabled={working} onPress={onClose} variant="ghost">
              <Text>Not now</Text>
            </Button>
          </View>
        </View>
      ) : null}
    </AppSheet>
  )
}
