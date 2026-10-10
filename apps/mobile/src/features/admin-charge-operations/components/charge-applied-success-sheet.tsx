import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type { ReactNode } from "react"
import { View } from "react-native"
import type { ChargeCollectionMode } from "../model/admin-charge-operations-types"

export type ChargeAppliedReceipt = {
  amount: string
  collectionMode: ChargeCollectionMode
  definitionName: string
  memberName: string
  status: string
}

function collectionSummary(receipt: ChargeAppliedReceipt) {
  return receipt.collectionMode === "deduct_from_savings"
    ? `${receipt.amount} was deducted from savings.`
    : `${receipt.amount} was posted for separate payment.`
}

function ReceiptRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-4 border-b border-border py-3">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      {value}
    </View>
  )
}

export function ChargeAppliedSuccessSheet({
  onClose,
  receipt,
  visible,
}: {
  onClose: () => void
  receipt: ChargeAppliedReceipt | null
  visible: boolean
}) {
  if (!receipt) return null

  return (
    <FloatingBottomSheet
      accessibilityLabel="Charge posted"
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
      <View className="overflow-hidden">
        <View className="bg-brand-surface px-5 py-5">
          <View className="flex-row items-center gap-3">
            <View className="bg-brand-surface-foreground/15 h-11 w-11 shrink-0 items-center justify-center rounded-full">
              <Icon
                className="size-lg text-brand-surface-foreground"
                name="Check"
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-brand-surface-foreground text-xl leading-7 font-bold">
                Charge posted
              </Text>
              <Text className="text-brand-surface-foreground/80 mt-0.5 text-sm leading-5">
                {collectionSummary(receipt)}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-5">
          <ReceiptRow
            label="Member"
            value={
              <Text className="max-w-[68%] text-right text-sm font-bold text-foreground">
                {receipt.memberName}
              </Text>
            }
          />
          <ReceiptRow
            label="Charge"
            value={
              <Text className="max-w-[68%] text-right text-sm font-bold text-foreground">
                {receipt.definitionName}
              </Text>
            }
          />
          <ReceiptRow
            label="Status"
            value={
              <View className="flex-row items-center gap-2 rounded-full bg-accent px-3 py-1.5">
                <View className="bg-success size-1.5 rounded-full" />
                <Text className="text-xs font-bold text-accent-foreground">
                  {receipt.status}
                </Text>
              </View>
            }
          />
        </View>
      </View>
    </FloatingBottomSheet>
  )
}
