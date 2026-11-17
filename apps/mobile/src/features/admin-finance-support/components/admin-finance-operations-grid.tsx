import { Icon } from "@/components/ui/icon"
import { Elevated } from "@/components/ui/list-card"
import { Pressable } from "@/components/ui/pressable"
import { SectionHeader } from "@/components/ui/section-header"
import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import { View } from "react-native"
import type {
  FinanceDeskKey,
  FinanceDeskSummary,
} from "../model/admin-finance-support-types"

const operations = [
  {
    key: "financing",
    href: "/(admin)/financing-operations",
    icon: "Coins",
    label: "Financing",
    tint: "bg-tint-vivid",
    tone: "text-tint-vivid-foreground",
  },
  {
    key: "contributions",
    href: "/(admin)/contributions",
    icon: "Landmark",
    label: "Contributions",
    tint: "bg-accent",
    tone: "text-accent-foreground",
  },
  {
    key: "repayments",
    href: "/(admin)/repayment-operations",
    icon: "CircleDollarSign",
    label: "Repayments",
    tint: "bg-tint-sky",
    tone: "text-tint-sky-foreground",
  },
  {
    key: "charges",
    href: "/(admin)/charges",
    icon: "ReceiptText",
    label: "Charges",
    tint: "bg-tint-warm",
    tone: "text-tint-warm-foreground",
  },
  {
    key: "procurement",
    href: "/(admin)/procurement-operations",
    icon: "ShoppingBag",
    label: "Procurement",
    tint: "bg-tint-warm",
    tone: "text-tint-warm-foreground",
  },
  {
    key: "projectFinancing",
    href: "/(admin)/project-financing-operations",
    icon: "BriefcaseBusiness",
    label: "Projects",
    tint: "bg-tint-lilac",
    tone: "text-tint-lilac-foreground",
  },
  {
    key: "foodPurchase",
    href: "/(admin)/food-purchase-operations",
    icon: "ShoppingBasket",
    label: "Foodstuff",
    tint: "bg-tint-success",
    tone: "text-tint-success-foreground",
  },
  {
    key: "shares",
    href: "/(admin)/share-profit-governance",
    icon: "PieChart",
    label: "Shares & profit",
    tint: "bg-accent",
    tone: "text-accent-foreground",
  },
] as const satisfies readonly {
  key: FinanceDeskKey
  href: `/(admin)/${string}`
  icon: string
  label: string
  tone: string
  tint: string
}[]

export type AdminFinanceOperationPath = (typeof operations)[number]["href"]

export function AdminFinanceOperationsGrid({
  onSelect,
  summary,
}: {
  onSelect: (href: AdminFinanceOperationPath) => void
  summary: FinanceDeskSummary
}) {
  const waiting = Object.values(summary.deskCounts).reduce<number>(
    (total, count) => total + (count ?? 0),
    0
  )

  return (
    <View className="gap-[12px]">
      <SectionHeader
        className="min-h-[26px]"
        title="Operations"
        value={waiting ? `${waiting} waiting` : "Nothing waiting"}
      />
      <View className="-mx-[4px] -mb-[8px] flex-row flex-wrap">
        {operations.map(({ key, href, icon, label, tint, tone }) => {
          const count = summary.deskCounts[key]
          if (count === null) return null
          const overdue = key === "repayments"
          const caption = count
            ? `${count} ${overdue ? "overdue" : "waiting"}`
            : "Nothing waiting"
          return (
            <View className="w-1/2 px-[4px] pb-[8px]" key={key}>
              <Elevated className="rounded-[18px] bg-card" radius={18}>
                <Pressable
                  accessibilityLabel={`Open ${label}, ${caption}`}
                  accessibilityRole="button"
                  className="min-h-[60px] flex-row items-center gap-[10px] rounded-[18px] p-[8px] active:bg-muted"
                  haptic
                  onPress={() => onSelect(href)}
                  testID={`admin-finance-desk-${key}`}
                >
                  <View
                    className={cn(
                      "size-[40px] items-center justify-center rounded-[13px]",
                      tint
                    )}
                  >
                    <Icon className={cn("size-[20px]", tone)} name={icon} />
                  </View>
                  <View className="min-w-0 flex-1 gap-px">
                    <Text
                      className="leading-[18px] font-bold"
                      numberOfLines={1}
                      variant="small"
                    >
                      {label}
                    </Text>
                    <Text
                      className={
                        count
                          ? overdue
                            ? "text-tint-vivid-foreground"
                            : "text-tint-warm-foreground"
                          : "text-muted-foreground"
                      }
                      numberOfLines={1}
                      tabular
                      variant="caption"
                    >
                      {caption}
                    </Text>
                  </View>
                </Pressable>
              </Elevated>
            </View>
          )
        })}
      </View>
    </View>
  )
}
