import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Pressable, View } from "react-native"
import type {
  AdminFinanceSupportAction,
  AdminFinanceSupportItem,
} from "../model/admin-finance-support-types"
import {
  formatAdminFinanceAge,
  formatAdminFinanceCurrency,
  formatAdminFinanceStatus,
} from "../model/admin-finance-support-presentation"

export function AdminFinanceItemDetailSheet({
  currencyCode,
  item,
  onAction,
  onClose,
  onDismissed,
  visible,
}: {
  currencyCode: string
  item: AdminFinanceSupportItem | null
  onAction: (action: AdminFinanceSupportAction) => void
  onClose: () => void
  onDismissed: () => void
  visible: boolean
}) {
  return (
    <FloatingBottomSheet
      accessibilityLabel={item ? `Review ${item.title}` : "Review work item"}
      hideHandle
      onClose={onClose}
      onDismissed={onDismissed}
      presentation="compact"
      scrollable="auto"
      visible={visible}
    >
      <View className="gap-5 px-5 pt-5 pb-6">
        <View className="flex-row items-start gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text
              accessibilityRole="header"
              className="text-xl font-black tracking-tight text-foreground"
            >
              {item?.title ?? "Review work"}
            </Text>
            {item ? (
              <Text className="text-sm leading-5 text-muted-foreground">
                {item.member?.number ?? formatAdminFinanceStatus(item.queueKey)}{" "}
                · {item.subtitle}
              </Text>
            ) : null}
          </View>
          <Button
            accessibilityLabel="Close work item"
            onPress={onClose}
            size="icon"
            variant="ghost"
          >
            <Icon className="size-base text-foreground" name="X" />
          </Button>
        </View>

        {item ? (
          <>
            <View className="flex-row items-end justify-between gap-3 border-b border-border pb-4">
              <Text className="min-w-0 flex-1 text-sm font-semibold text-muted-foreground">
                {formatAdminFinanceStatus(item.state)} ·{" "}
                {formatAdminFinanceAge(item.ageMinutes)}
              </Text>
              {item.amount !== null ? (
                <Text className="shrink-0 text-xl font-black text-foreground">
                  {formatAdminFinanceCurrency(item.amount, currencyCode)}
                </Text>
              ) : null}
            </View>

            {item.details.length ? (
              <View className="gap-3">
                <Text className="text-sm font-bold text-foreground">
                  Details
                </Text>
                {item.details.map((detail) => (
                  <View
                    className="flex-row items-start justify-between gap-4"
                    key={`${detail.label}-${detail.value}`}
                  >
                    <Text className="text-sm text-muted-foreground">
                      {detail.label}
                    </Text>
                    <Text className="max-w-[60%] text-right text-sm font-semibold text-foreground">
                      {detail.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {item.policyEvidence.length ? (
              <View className="border-brand/40 gap-2 border-l-2 pl-3">
                <Text className="text-sm font-bold text-foreground">
                  Evidence
                </Text>
                {item.policyEvidence.map((evidence) => (
                  <Text
                    className="text-xs leading-5 text-muted-foreground"
                    key={evidence}
                  >
                    {evidence}
                  </Text>
                ))}
              </View>
            ) : null}

            {item.blockers.length ? (
              <View className="bg-brand-vivid/10 gap-1 px-3 py-2">
                <Text className="text-brand-vivid text-sm font-bold">
                  Blocked
                </Text>
                {item.blockers.map((blocker) => (
                  <Text
                    className="text-brand-vivid text-xs leading-5"
                    key={blocker}
                  >
                    {blocker}
                  </Text>
                ))}
              </View>
            ) : null}

            <View>
              <Text className="pb-2 text-sm font-bold text-foreground">
                Actions
              </Text>
              {item.allowedActions.length ? (
                item.allowedActions.map((action) => (
                  <Pressable
                    accessibilityLabel={`${action.label} for ${item.title}`}
                    accessibilityRole="button"
                    className="min-h-12 flex-row items-center justify-between gap-3 border-t border-border py-3 active:bg-accent/40"
                    key={action.key}
                    onPress={() => onAction(action)}
                  >
                    <View className="min-w-0 flex-1 gap-0.5">
                      <Text
                        className={
                          action.destructive
                            ? "text-sm font-semibold text-destructive"
                            : "text-sm font-semibold text-foreground"
                        }
                      >
                        {action.label}
                      </Text>
                      {action.requiresEvidence || action.governanceOnly ? (
                        <Text className="text-xs leading-5 text-muted-foreground">
                          {action.governanceOnly
                            ? "Governance record"
                            : "Evidence required"}
                        </Text>
                      ) : null}
                    </View>
                    <Icon
                      className={
                        action.destructive
                          ? "size-sm text-destructive"
                          : "size-sm text-muted-foreground"
                      }
                      name="ChevronRight"
                    />
                  </Pressable>
                ))
              ) : (
                <Text className="text-sm leading-5 text-muted-foreground">
                  No permitted action.
                </Text>
              )}
            </View>
          </>
        ) : null}
      </View>
    </FloatingBottomSheet>
  )
}
