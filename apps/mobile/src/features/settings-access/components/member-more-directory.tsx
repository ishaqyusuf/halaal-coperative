import { type Href, useRouter } from "expo-router"
import { ListSkeleton } from "@/components/ui/skeleton"
import { StatusBanner } from "@/components/ui/status-banner"
import type {
  MobileMemberMore,
  MobileMemberMoreSection,
} from "../model/member-more-types"
import {
  GroupedRow,
  SettingsGroup,
  type SettingsTile,
} from "./grouped-settings"

const routes = {
  statement: ["/statement", "sky"],
  receipts: ["/receipts", "mint"],
  procurement: ["/procurement", "lilac"],
  projectFinancing: ["/project-financing", "amber"],
  foodPurchase: ["/food-purchase", "rose"],
  guarantors: ["/guarantor-approvals", "success"],
  support: ["/support", "mint"],
} satisfies Record<
  Exclude<MobileMemberMoreSection["key"], "profile">,
  [Href, SettingsTile]
>

export function MemberMoreDirectory({
  hub,
  loading,
  error,
  onRetry,
}: {
  hub?: MobileMemberMore
  loading: boolean
  error: boolean
  onRetry: () => void
}) {
  const router = useRouter()
  if (loading && !hub) return <ListSkeleton rows={5} />
  if (error && !hub) {
    return (
      <StatusBanner
        onRetry={onRetry}
        description="Your app settings remain available below."
        title="Member details are unavailable"
        kind="error"
      />
    )
  }
  const sections = hub?.sections ?? []
  const row = (key: keyof typeof routes) => {
    const section = sections.find((item) => item.key === key)
    if (!section) return null
    const [href, tone] = routes[key]
    const count =
      section.rows.find((metric) => metric.format === "count")?.value ?? 0
    let value: string | undefined
    if (key === "foodPurchase") value = count ? "Open" : "Closed"
    else if (count && key !== "statement") {
      value =
        key === "guarantors"
          ? String(count)
          : key === "support"
            ? `${count} open`
            : `${count} pending`
    }
    return (
      <GroupedRow
        icon={section.icon}
        key={key}
        onPress={() => router.push(href)}
        title={key === "foodPurchase" ? "Foodstuff purchase" : section.title}
        tone={tone}
        value={value}
        valueTone={
          key === "guarantors"
            ? "badge"
            : key === "foodPurchase"
              ? count
                ? "success"
                : "muted"
              : "warning"
        }
      />
    )
  }
  if (hub && !hub.member) {
    return (
      <StatusBanner
        description="Your app settings remain available below."
        kind="info"
        title="Member profile needs linking"
      />
    )
  }
  if (!hub) return null
  return (
    <>
      <SettingsGroup title="Money">
        {row("statement")}
        {row("receipts")}
      </SettingsGroup>
      <SettingsGroup title="Services">
        {row("procurement")}
        {row("projectFinancing")}
        {row("foodPurchase")}
        {row("guarantors")}
        {row("support")}
      </SettingsGroup>
    </>
  )
}
