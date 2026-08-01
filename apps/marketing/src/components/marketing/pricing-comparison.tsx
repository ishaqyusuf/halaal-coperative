import { buttonVariants } from "@halaalvest/ui/components/button"
import { ArrowRightIcon, CheckIcon } from "lucide-react"
import Link from "next/link"
import {
  pricingFeatureMatrix,
  pricingFeePrinciples,
  pricingPlans,
} from "./pricing-data"

export function PricingComparison({ signupHref }: { signupHref: string }) {
  return (
    <main className="marketing-site min-h-svh text-[#0B1F36]">
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto w-full max-w-[90rem]">
          <div className="marketing-eyebrow">Full plan comparison</div>
          <h1 className="marketing-serif mt-7 max-w-5xl text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            Choose capacity and access without taxing member money.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#0B1F36]/64">
            All plans use predictable active-member bands. Provider costs and
            one-time implementation work stay visible and separate.
          </p>

          <div className="mt-14 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {pricingPlans.map((plan) => (
              <article
                className={`flex min-h-[36rem] flex-col rounded-[1.4rem] border p-6 ${
                  plan.name === "Standard"
                    ? "border-[#0B1F36] bg-[#0B1F36] text-white"
                    : "border-[#0B1F36]/10 bg-white"
                }`}
                key={plan.name}
              >
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <p className="marketing-serif mt-8 text-[1.65rem] leading-tight tracking-[-0.03em] whitespace-nowrap">
                  {plan.price}
                </p>
                <p
                  className={`mt-2 text-xs ${plan.name === "Standard" ? "text-white/55" : "text-[#0B1F36]/50"}`}
                >
                  {plan.cadence}
                </p>
                <p className="mt-7 text-sm font-semibold">{plan.members}</p>
                <p
                  className={`mt-3 text-sm leading-6 ${plan.name === "Standard" ? "text-white/62" : "text-[#0B1F36]/60"}`}
                >
                  {plan.description}
                </p>
                <ul className="mt-7 space-y-3 border-t border-current/12 pt-6">
                  {plan.features.map((feature) => (
                    <li
                      className="flex items-start gap-2 text-sm"
                      key={feature}
                    >
                      <CheckIcon
                        aria-hidden="true"
                        className={`mt-0.5 size-4 shrink-0 ${plan.name === "Standard" ? "text-[#71D98B]" : "text-[#1F7A3D]"}`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  className={buttonVariants({
                    className:
                      plan.name === "Standard"
                        ? "mt-auto rounded-full !bg-[#71D98B] !text-[#071B2C] hover:!bg-[#8AE6A0]"
                        : "mt-auto rounded-full",
                    variant: plan.name === "Standard" ? "default" : "outline",
                  })}
                  href={signupHref}
                >
                  Request access
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-12 overflow-hidden rounded-[1.5rem] border border-[#0B1F36]/10 bg-white">
            <div className="border-b border-[#0B1F36]/10 p-6 sm:p-8">
              <h2 className="text-xl font-semibold">Feature availability</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#0B1F36]/58">
                Starter stays admin-only by default. Standard unlocks direct
                member access; Growth and Enterprise add richer communications
                and branding.
              </p>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[1.25fr_repeat(5,1fr)] border-b border-[#0B1F36]/10 bg-[#F7FAF7] text-xs font-semibold">
                  <div className="p-4">Feature</div>
                  {pricingPlans.map((plan) => (
                    <div className="p-4" key={plan.name}>
                      {plan.name}
                    </div>
                  ))}
                </div>
                {pricingFeatureMatrix.map((row) => (
                  <div
                    className="grid grid-cols-[1.25fr_repeat(5,1fr)] border-b border-[#0B1F36]/10 text-sm last:border-b-0"
                    key={row.feature}
                  >
                    <div className="p-4 font-medium">{row.feature}</div>
                    {row.values.map((value, index) => (
                      <div
                        className="p-4 text-[#0B1F36]/58"
                        key={`${row.feature}-${pricingPlans[index]?.name}`}
                      >
                        {value}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-px overflow-hidden rounded-2xl border border-[#0B1F36]/10 bg-[#0B1F36]/10 md:grid-cols-3">
            {pricingFeePrinciples.map((note) => (
              <p
                className="bg-[#F7FAF7] p-6 text-sm leading-6 text-[#0B1F36]/62"
                key={note}
              >
                {note}
              </p>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
