import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { View } from "react-native"

export type ChargeReplayReceipt = {
  amount: string
  definitionName: string
  memberName: string
  memberNumber: string
}

export function ChargeReplaySuccessSheet({
  onClose,
  receipt,
  visible,
}: {
  onClose: () => void
  receipt: ChargeReplayReceipt | null
  visible: boolean
}) {
  if (!receipt) return null

  return (
    <FloatingBottomSheet
      accessibilityLabel="Charge already recorded"
      onClose={onClose}
      presentation="compact"
      scrollable="auto"
      visible={visible}
      footer={
        <View className="px-5 pt-3 pb-5">
          <Button className="h-11 w-full" onPress={onClose}>
            <Text>Done</Text>
          </Button>
        </View>
      }
    >
      <View className="px-5 pt-2 pb-4">
        <View className="flex-row items-start gap-3">
          <View className="bg-success/10 h-11 w-11 shrink-0 items-center justify-center rounded-full">
            <Icon className="size-lg text-success" name="Check" />
          </View>
          <View className="min-w-0 flex-1 pt-0.5">
            <Text className="text-xl leading-7 font-bold text-foreground">
              Charge already recorded
            </Text>
            <Text className="mt-1 text-sm leading-5 text-muted-foreground">
              Your retry matched the original charge. No duplicate was created.
            </Text>
          </View>
        </View>

        <View className="mt-5 border-y border-border py-4">
          <View className="flex-row items-start justify-between gap-4">
            <View className="min-w-0 flex-1">
              <Text className="text-base font-bold text-foreground">
                {receipt.definitionName}
              </Text>
              <Text className="mt-1 text-sm text-muted-foreground">
                {receipt.memberName} · {receipt.memberNumber}
              </Text>
            </View>
            <Text className="shrink-0 text-xl font-bold text-foreground">
              {receipt.amount}
            </Text>
          </View>
          <View className="mt-3 flex-row items-center gap-2">
            <Icon className="size-sm text-success" name="Check" />
            <Text className="text-success text-xs font-bold">
              One charge recorded
            </Text>
          </View>
        </View>
      </View>
    </FloatingBottomSheet>
  )
}
