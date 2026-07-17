import { Badge } from "@halaalvest/ui/components/badge"
import { buttonVariants } from "@halaalvest/ui/components/button"
import Link from "next/link"

const planRateRange = {
  low: 50,
  high: 75,
} as const

function formatPlanPrice(memberCap: number) {
  const formatValue = (value: number) => {
    if (value >= 1000) {
      const thousands = value / 1000
      const formattedThousands = Number.isInteger(thousands)
        ? `${thousands}`
        : thousands.toFixed(2).replace(/\.?0+$/, "")

      return `${formattedThousands}k`
    }

    return value.toLocaleString("en-NG")
  }

  return `NGN ${formatValue(memberCap * planRateRange.low)}-${formatValue(
    memberCap * planRateRange.high,
  )}`
}

const pricingPlans = [
  {
    name: "Free Beta",
    price: "NGN 0",
    cadence: "while beta is active",
    members: "Up to 100 active members",
    description:
      "For early cooperatives validating guided setup and live operating workflows.",
    features: [
      "Guided cooperative setup",
      "Member import and records",
      "Contributions, charges, and statements",
      "Admin-only beta workspace",
    ],
    cta: "Request access",
    featured: true,
  },
  {
    name: "Starter",
    price: formatPlanPrice(250),
    cadence: "per month",
    members: "Up to 250 active members",
    description:
      "For small societies moving from spreadsheets into accountable records.",
    features: [
      "Core finance workspace",
      "Admin-only by default",
      "Email notifications for admins",
      "Member login as paid add-on",
    ],
    cta: "Request access",
    featured: false,
  },
  {
    name: "Standard",
    price: formatPlanPrice(1000),
    cadence: "per month",
    members: "Up to 1,000 active members",
    description:
      "For established cooperatives running monthly contribution operations.",
    features: [
      "Member login included",
      "Custom domain included",
      "Email notifications for members",
      "Audit history",
    ],
    cta: "Request access",
    featured: false,
  },
  {
    name: "Growth",
    price: formatPlanPrice(3000),
    cadence: "per month",
    members: "Up to 3,000 active members",
    description:
      "For larger employer, civil-service, or multi-group cooperative programs.",
    features: [
      "WhatsApp setup included",
      "Advanced email templates",
      "Bulk operations and exports",
      "White label app as add-on",
    ],
    cta: "Request access",
    featured: false,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "quoted monthly",
    members: "Custom active-member band",
    description:
      "For multi-branch, integration-heavy, or SLA-backed cooperative deployments.",
    features: [
      "White label app options",
      "Custom domains and branding",
      "WhatsApp and email workflows",
      "Dedicated success support",
    ],
    cta: "Talk to us",
    featured: false,
  },
] as const

const feeNotes = [
  "No percentage of member savings, financing, repayments, dividends, or profits.",
  "SMS, KYC, payment gateway, transfer, and direct-debit costs stay transparent pass-throughs.",
  "Setup, migration, integrations, training, and white-label work are quoted separately.",
] as const

const featureMatrix = [
  {
    feature: "Member login",
    values: ["No", "Add-on", "Included", "Included", "Included"],
  },
  {
    feature: "Custom domain",
    values: ["No", "Add-on", "Included", "Included", "Included"],
  },
  {
    feature: "Email notifications",
    values: ["Admin setup", "Admin only", "Admin + member", "Advanced", "Custom"],
  },
  {
    feature: "WhatsApp notifications",
    values: ["Pilot only", "Add-on", "Add-on", "Setup included", "Custom"],
  },
  {
    feature: "White label app",
    values: ["No", "No", "No", "Add-on", "Custom"],
  },
] as const

export function PricingSection({ signupHref }: { signupHref: string }) {
  return (
    <section id="pricing" className="border-b border-border bg-background">
      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-6 lg:px-8 lg:py-18">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <Badge variant="outline" className="h-6 rounded-md px-2.5">
              Pricing
            </Badge>
            <h2 className="mt-5 max-w-xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Predictable plans that stay separate from member funds.
            </h2>
          </div>

          <div className="border border-border bg-card p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold">Free beta access</p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Selected early cooperatives can run guided setup and core live
                  workflows at no subscription cost while the beta is active.
                </p>
              </div>
              <Link
                className={buttonVariants({
                  className: "h-10 rounded-md px-4 text-sm",
                })}
                href={signupHref}
              >
                Request access
                <span aria-hidden="true">-&gt;</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-2 xl:grid-cols-5">
          {pricingPlans.map((plan) => {
            const planClassName = plan.featured
              ? "bg-foreground p-5 text-background"
              : "bg-card p-5 text-foreground"
            const mutedClassName = plan.featured
              ? "text-background/70"
              : "text-muted-foreground"
            const markerClassName = plan.featured
              ? "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center text-background"
              : "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center text-foreground"

            return (
              <article className={planClassName} key={plan.name}>
                <div className="flex min-h-64 flex-col">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold tracking-tight">
                        {plan.name}
                      </h3>
                      {plan.featured ? (
                        <span className="border border-background/30 px-2 py-1 text-[11px] font-medium text-background/80">
                          Beta
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-5 text-3xl font-semibold tracking-tight">
                      {plan.price}
                    </p>
                    <p className={`mt-1 text-xs ${mutedClassName}`}>
                      {plan.cadence}
                    </p>
                    <p className="mt-5 text-sm font-medium">{plan.members}</p>
                    <p className={`mt-3 text-sm leading-6 ${mutedClassName}`}>
                      {plan.description}
                    </p>
                  </div>

                  <ul className="mt-6 space-y-3 text-sm">
                    {plan.features.map((feature) => (
                      <li className="flex gap-2" key={feature}>
                        <span aria-hidden="true" className={markerClassName}>
                          +
                        </span>
                        <span className={mutedClassName}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    className={buttonVariants({
                      className: plan.featured
                        ? "mt-auto h-10 rounded-md bg-background px-4 text-sm text-foreground hover:bg-background/90"
                        : "mt-auto h-10 rounded-md px-4 text-sm",
                      variant: plan.featured ? "default" : "outline",
                    })}
                    href={signupHref}
                  >
                    {plan.cta}
                    <span aria-hidden="true">-&gt;</span>
                  </Link>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-8 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
          {feeNotes.map((note) => (
            <div className="bg-card p-5" key={note}>
              <p className="text-sm leading-6 text-muted-foreground">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 border border-border bg-card">
          <div className="border-b border-border p-5">
            <p className="text-sm font-semibold">Feature availability</p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Starter stays admin-only by default. Standard unlocks direct
              member access, while Growth and Enterprise add richer
              communications and branding.
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[1.25fr_repeat(5,1fr)] border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                <div className="p-4">Feature</div>
                {pricingPlans.map((plan) => (
                  <div className="p-4" key={plan.name}>
                    {plan.name}
                  </div>
                ))}
              </div>

              {featureMatrix.map((row) => (
                <div
                  className="grid grid-cols-[1.25fr_repeat(5,1fr)] border-b border-border text-sm last:border-b-0"
                  key={row.feature}
                >
                  <div className="p-4 font-medium">{row.feature}</div>
                  {row.values.map((value, index) => (
                    <div
                      className="p-4 text-muted-foreground"
                      key={`${row.feature}-${index}`}
                    >
                      {value}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
