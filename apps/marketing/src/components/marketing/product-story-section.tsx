import type { LucideIcon } from "lucide-react"
import {
  HandCoinsIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  UsersRoundIcon,
  WaypointsIcon,
} from "lucide-react"

const productStories: {
  body: string
  eyebrow: string
  icon: LucideIcon
  points: readonly string[]
  title: string
  tone: "canvas" | "green" | "ink" | "white"
}[] = [
  {
    eyebrow: "Collect and reconcile",
    title: "Move monthly contributions out of fragile spreadsheets.",
    body: "Stage expected records, review what arrived, allocate receipts, apply transparent charges, and keep exceptions visible before posting.",
    icon: ReceiptTextIcon,
    points: [
      "Staged monthly records",
      "Collection-source batches",
      "Receipt allocation and review",
    ],
    tone: "white",
  },
  {
    eyebrow: "Finance with controls",
    title:
      "Make interest-free financing decisions the cooperative can explain.",
    body: "Keep member eligibility separate from available pool liquidity, guarantor evidence, approval authority, disbursement, and principal repayment.",
    icon: HandCoinsIcon,
    points: [
      "Eligibility and liquidity checks",
      "Guarantor and approval evidence",
      "Repayment progress without interest",
    ],
    tone: "ink",
  },
  {
    eyebrow: "Give members clarity",
    title: "Turn records into trust, not another office bottleneck.",
    body: "Members can understand savings, charges, financing exposure, receipts, support requests, statements, and recent activity from one account.",
    icon: UsersRoundIcon,
    points: [
      "Member statements",
      "Self-service requests",
      "Clear status and history",
    ],
    tone: "green",
  },
  {
    eyebrow: "Govern every change",
    title: "Give the team a reliable operating trail.",
    body: "Roles, KYC reviews, exports, approvals, reversals, and audit history keep sensitive actions attributable and reviewable.",
    icon: ShieldCheckIcon,
    points: [
      "Role-aware operations",
      "KYC and document review",
      "Audit-ready reports and exports",
    ],
    tone: "canvas",
  },
]

const operatingAreas = [
  "Contributions and special savings",
  "Charges, receipts, and repayments",
  "Shares and cooperative business",
  "Procurement and Foodstuff Purchase",
  "Project financing discussions",
  "Member support and notifications",
] as const

export function ProductStorySection() {
  return (
    <section
      id="product"
      className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
    >
      <div className="mx-auto w-full max-w-[90rem]">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div className="marketing-eyebrow">One operating picture</div>
          <div>
            <h2 className="marketing-serif max-w-4xl text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              The work is connected. The software should be too.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#0B1F36]/62">
              Halaalvest keeps routine collection work, financing decisions,
              member visibility, and governance in one coherent operating model.
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          {productStories.map((story) => (
            <ProductStory key={story.title} {...story} />
          ))}
        </div>

        <div className="mt-4 grid overflow-hidden rounded-[1.5rem] border border-[#0B1F36]/10 bg-white lg:grid-cols-[0.72fr_1.28fr]">
          <div className="border-b border-[#0B1F36]/10 bg-[#0B1F36] p-7 text-white lg:border-r lg:border-b-0 lg:p-9">
            <WaypointsIcon
              aria-hidden="true"
              className="size-6 text-[#71D98B]"
            />
            <h3 className="marketing-serif mt-8 text-3xl leading-tight tracking-[-0.025em]">
              More than savings and financing.
            </h3>
            <p className="mt-4 text-sm leading-7 text-white/62">
              Enable only the services that match how each cooperative operates.
              Existing records stay visible when access modes change.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3">
            {operatingAreas.map((area, index) => (
              <div
                className="flex min-h-28 items-end border-b border-[#0B1F36]/10 p-5 odd:sm:border-r lg:border-r lg:[&:nth-child(3n)]:border-r-0 lg:[&:nth-last-child(-n+3)]:border-b-0"
                key={area}
              >
                <div>
                  <p className="text-[10px] font-semibold text-[#1F7A3D]">
                    0{index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-5 font-medium">{area}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function ProductStory({
  body,
  eyebrow,
  icon: Icon,
  points,
  title,
  tone,
}: (typeof productStories)[number]) {
  const toneClass = {
    canvas: "border-[#0B1F36]/10 bg-[#EDF4EE] text-[#0B1F36]",
    green: "border-[#1F7A3D] bg-[#1F7A3D] text-white",
    ink: "border-[#0B1F36] bg-[#0B1F36] text-white",
    white: "border-[#0B1F36]/10 bg-white text-[#0B1F36]",
  }[tone]
  const mutedClass =
    tone === "ink" || tone === "green" ? "text-white/65" : "text-[#0B1F36]/60"
  const accentClass =
    tone === "ink" || tone === "green" ? "text-[#A3E5B5]" : "text-[#1F7A3D]"

  return (
    <article
      className={`relative min-h-[30rem] overflow-hidden rounded-[1.5rem] border p-7 sm:p-9 ${toneClass}`}
    >
      <div className="marketing-dots absolute inset-0 opacity-[0.16]" />
      <div className="relative flex h-full min-h-[26rem] flex-col">
        <div
          className={`flex items-center gap-2 text-xs font-semibold uppercase ${accentClass}`}
        >
          <Icon aria-hidden="true" className="size-4" />
          {eyebrow}
        </div>
        <h3 className="marketing-serif mt-14 max-w-xl text-3xl leading-[1.08] tracking-[-0.03em] sm:text-4xl">
          {title}
        </h3>
        <p className={`mt-5 max-w-xl leading-7 ${mutedClass}`}>{body}</p>
        <div className="mt-auto grid gap-3 border-t border-current/12 pt-6 sm:grid-cols-3">
          {points.map((point) => (
            <p className={`text-xs leading-5 ${mutedClass}`} key={point}>
              {point}
            </p>
          ))}
        </div>
      </div>
    </article>
  )
}
