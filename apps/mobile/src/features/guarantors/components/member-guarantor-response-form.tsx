import { Text } from "@/components/ui/text"
import { Textarea } from "@/components/ui/textarea"
import { View } from "react-native"
import type { MobileGuarantorRequest } from "../model/member-guarantor-types"
import { presentGuarantorApproval } from "../model/member-guarantor-presentation"

export function MemberGuarantorResponseForm({
  approval,
  currencyCode,
  disabled,
  error,
  note,
  onChangeNote,
}: {
  approval: MobileGuarantorRequest | null
  currencyCode: string
  disabled: boolean
  error: string | null
  note: string
  onChangeNote: (value: string) => void
}) {
  const row = approval ? presentGuarantorApproval(approval, currencyCode) : null

  return (
    <View className="gap-4">
      {row ? (
        <Text className="text-sm leading-5 text-muted-foreground">
          {row.borrower} · {row.requestedAmount}
        </Text>
      ) : null}
      <View className="gap-2">
        <View className="flex-row items-baseline justify-between gap-3">
          <Text className="text-sm font-semibold text-foreground">
            Response note
          </Text>
          <Text className="text-xs text-muted-foreground">
            Required to reject
          </Text>
        </View>
        <Textarea
          accessibilityLabel="Guarantor response note"
          editable={!disabled}
          onChangeText={onChangeNote}
          placeholder="Add context for your decision"
          value={note}
        />
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm leading-5 font-medium text-destructive"
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}
