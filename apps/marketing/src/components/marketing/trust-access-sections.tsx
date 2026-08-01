import type { QaQuickFillContext } from "@halaalvest/utils"
import type { LucideIcon } from "lucide-react"
import {
  Building2Icon,
  ClipboardCheckIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "lucide-react"
import Link from "next/link"
import { EarlyAccessForm } from "./early-access-form"

export function TrustSection() {
  return (
    <section
      id="trust"
      className="scroll-mt-24 bg-[#071B2C] px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-12 lg:py-32"
    >
      <div className="mx-auto grid w-full max-w-[90rem] gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
        <div>
          <div className="marketing-eyebrow !text-[#71D98B]">
            Trust is an operating feature
          </div>
          <h2 className="marketing-serif mt-7 max-w-3xl text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
            Interest-free by design. Transparent by default.
          </h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl bg-white/12 sm:grid-cols-2">
          <TrustCard
            icon={ScaleIcon}
            title="Software, not a direct lender"
            body="Halaalvest helps cooperatives operate their own member-owned finance model."
          />
          <TrustCard
            icon={ClipboardCheckIcon}
            title="Explicit approvals"
            body="Sensitive finance actions keep clear states, authority, and review evidence."
          />
          <TrustCard
            icon={Building2Icon}
            title="Tenant-scoped workspaces"
            body="Each cooperative's users, records, roles, and reports stay in its operating boundary."
          />
          <TrustCard
            icon={ShieldCheckIcon}
            title="Explainable balances"
            body="Savings, shares, principal, repayments, charges, and profits remain distinct."
          />
        </div>
      </div>
    </section>
  )
}

export function EarlyAccessSection({
  quickFill,
}: {
  quickFill: QaQuickFillContext
}) {
  return (
    <section
      id="early-access"
      className="scroll-mt-24 border-t border-[#0B1F36]/10 bg-[#F0F6F1] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
    >
      <div className="mx-auto grid w-full max-w-[90rem] gap-12 lg:grid-cols-[0.74fr_1.26fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <div className="marketing-eyebrow">Request guided setup</div>
          <h2 className="marketing-serif mt-7 max-w-xl text-4xl leading-[1.03] tracking-[-0.035em] sm:text-5xl">
            Tell us how the cooperative works today.
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-8 text-[#0B1F36]/62">
            We use the request to understand the migration path, accountable
            contact, and operating areas before private workspace setup opens.
          </p>

          <div className="mt-8 space-y-4 border-t border-[#0B1F36]/12 pt-6">
            {[
              "No member funds move through this request",
              "Approved setup opens by private link",
              "Detailed finance policy stays inside the workspace",
            ].map((item) => (
              <div className="flex items-start gap-3" key={item}>
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-[#1F7A3D]" />
                <p className="text-sm leading-6 text-[#0B1F36]/68">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="marketing-form min-w-0">
          <EarlyAccessForm quickFill={quickFill} />
        </div>
      </div>
    </section>
  )
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-[#0B1F36]/10 bg-white px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-5 text-sm text-[#0B1F36]/58 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-[#0B1F36]">Halaalvest</p>
          <p className="mt-1">
            The trusted operating system for cooperative finance.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Link className="hover:text-[#0B1F36]" href="/#product">
            Product
          </Link>
          <Link className="hover:text-[#0B1F36]" href="/pricing">
            Pricing
          </Link>
          <Link className="hover:text-[#0B1F36]" href="/#early-access">
            Early access
          </Link>
          <a
            className="hover:text-[#0B1F36]"
            href="mailto:hello@halaalvest.com"
          >
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}

function TrustCard({
  body,
  icon: Icon,
  title,
}: {
  body: string
  icon: LucideIcon
  title: string
}) {
  return (
    <article className="min-h-52 bg-[#071B2C] p-6 sm:p-7">
      <Icon aria-hidden="true" className="size-5 text-[#71D98B]" />
      <h3 className="mt-12 text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/58">{body}</p>
    </article>
  )
}
