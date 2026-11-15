import { SummaryCard } from "@/components/summary-card"

const toneMap = {
  default: "default",
  positive: "good",
  warning: "attention",
} as const

/** A member count on /members: the shared summary card (WP11). */
export function MembersSummaryCard({
  detail,
  href,
  label,
  tone = "default",
  value,
}: {
  detail?: string
  href?: string
  label: string
  tone?: keyof typeof toneMap
  value: string
}) {
  return href ? (
    <SummaryCard
      detail={detail}
      href={href}
      label={label}
      tone={toneMap[tone]}
      value={value}
    />
  ) : (
    <SummaryCard
      detail={detail}
      label={label}
      tone={toneMap[tone]}
      value={value}
    />
  )
}
