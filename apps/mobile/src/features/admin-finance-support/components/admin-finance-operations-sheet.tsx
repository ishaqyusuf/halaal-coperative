import { FloatingBottomSheet } from "@/components/floating-bottom-sheet"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { Pressable, View } from "react-native"
import type {
  AdminFinanceSupportOverview,
  AdminFinanceSupportQueueKey,
} from "../model/admin-finance-support-types"
import { getAdminFinanceQueueCount } from "../model/admin-finance-support-presentation"

export type AdminFinanceOperationPath =
  | "/(admin)/financing-operations"
  | "/(admin)/contributions"
  | "/(admin)/repayment-operations"
  | "/(admin)/procurement-operations"
  | "/(admin)/food-purchase-operations"
  | "/(admin)/project-financing-operations"
  | "/(admin)/share-profit-governance"
  | "/(admin)/charges"

const operations: readonly {
  href: AdminFinanceOperationPath
  icon: string
  label: string
  queueKey?: AdminFinanceSupportQueueKey
  tone: { background: string; icon: string }
}[] = [
  {
    href: "/(admin)/financing-operations",
    icon: "HandCoins",
    label: "Financing",
    queueKey: "financing",
    tone: { background: "bg-brand-vivid/15", icon: "text-brand-vivid" },
  },
  {
    href: "/(admin)/contributions",
    icon: "Landmark",
    label: "Contributions",
    tone: { background: "bg-brand/10", icon: "text-brand" },
  },
  {
    href: "/(admin)/repayment-operations",
    icon: "CircleDollarSign",
    label: "Repayments",
    queueKey: "collections",
    tone: { background: "bg-brand-contrast/10", icon: "text-brand-contrast" },
  },
  {
    href: "/(admin)/procurement-operations",
    icon: "ShoppingBag",
    label: "Procurement",
    queueKey: "procurement",
    tone: { background: "bg-brand-warm/20", icon: "text-warn" },
  },
  {
    href: "/(admin)/food-purchase-operations",
    icon: "ShoppingBasket",
    label: "Foodstuff Purchase",
    queueKey: "foodPurchase",
    tone: { background: "bg-brand/10", icon: "text-brand" },
  },
  {
    href: "/(admin)/project-financing-operations",
    icon: "BriefcaseBusiness",
    label: "Project financing",
    queueKey: "projectFinancing",
    tone: { background: "bg-brand-contrast/10", icon: "text-brand-contrast" },
  },
  {
    href: "/(admin)/share-profit-governance",
    icon: "ChartNoAxesCombined",
    label: "Shares & profit",
    queueKey: "shares",
    tone: { background: "bg-brand/10", icon: "text-brand" },
  },
  {
    href: "/(admin)/charges",
    icon: "ReceiptText",
    label: "Charges",
    tone: { background: "bg-brand-warm/20", icon: "text-warn" },
  },
]

export function AdminFinanceOperationsSheet({
  onClose,
  onDismissed,
  onSelect,
  overview,
  visible,
}: {
  onClose: () => void
  onDismissed: () => void
  onSelect: (path: AdminFinanceOperationPath) => void
  overview: AdminFinanceSupportOverview | null
  visible: boolean
}) {
  return (
    <FloatingBottomSheet
      accessibilityLabel="Finance operations"
      maxDynamicContentSize={520}
      onClose={onClose}
      onDismissed={onDismissed}
      presentation="compact"
      scrollable="auto"
      title="Finance operations"
      visible={visible}
    >
      <View className="px-5 pb-4">
        {operations.map((operation) => {
          const count = operation.queueKey
            ? getAdminFinanceQueueCount(overview, operation.queueKey)
            : 0
          return (
            <Pressable
              accessibilityHint="Opens this finance workspace"
              accessibilityLabel={`Open ${operation.label}${count ? `, ${count} waiting` : ""}`}
              accessibilityRole="button"
              className="min-h-14 flex-row items-center gap-3 border-b border-border py-2.5 active:bg-accent/40"
              key={operation.href}
              onPress={() => onSelect(operation.href)}
            >
              <View
                className={cn(
                  "size-9 shrink-0 items-center justify-center rounded-xl",
                  operation.tone.background
                )}
              >
                <Icon
                  className={cn("size-sm", operation.tone.icon)}
                  name={operation.icon}
                />
              </View>
              <Text className="min-w-0 flex-1 text-sm font-bold text-foreground">
                {operation.label}
              </Text>
              {count ? (
                <Text className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {count} waiting
                </Text>
              ) : null}
              <Icon
                className="size-sm shrink-0 text-muted-foreground"
                name="ChevronRight"
              />
            </Pressable>
          )
        })}
      </View>
    </FloatingBottomSheet>
  )
}
