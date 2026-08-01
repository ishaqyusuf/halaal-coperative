import { buttonVariants } from "@halaalvest/ui/components/button"
import { ArrowRightIcon, CheckIcon } from "lucide-react"
import Link from "next/link"
import { homepagePricingPlans, pricingFeePrinciples } from "./pricing-data"

export function PricingSection({ signupHref }: { signupHref: string }) {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
    >
      <div className="mx-auto w-full max-w-[90rem]">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div className="marketing-eyebrow">Predictable SaaS pricing</div>
          <div>
            <h2 className="marketing-serif max-w-4xl text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Software fees stay separate from member money.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#0B1F36]/62">
              Plans use active-member capacity bands. Halaalvest does not take a
              percentage of cooperative funds or financing activity.
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          {homepagePricingPlans.map((plan) => (
            <PricingCard key={plan.name} plan={plan} signupHref={signupHref} />
          ))}
        </div>

        <div className="mt-4 grid overflow-hidden rounded-2xl border border-[#0B1F36]/10 bg-[#F7FAF7] lg:grid-cols-[0.7fr_1.3fr]">
          <div className="border-b border-[#0B1F36]/10 p-6 lg:border-r lg:border-b-0 lg:p-7">
            <p className="text-sm font-semibold">
              Need a different member band?
            </p>
            <p className="mt-2 text-sm leading-6 text-[#0B1F36]/58">
              Starter covers up to 250 active members. Growth covers up to
              3,000. We confirm the right rollout during setup.
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1F7A3D] hover:text-[#176331]"
              href="/pricing"
            >
              Compare all five plans
              <ArrowRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="grid gap-px bg-[#0B1F36]/10 md:grid-cols-3">
            {pricingFeePrinciples.map((principle) => (
              <div
                className="bg-[#F7FAF7] p-6 text-sm leading-6 text-[#0B1F36]/62"
                key={principle}
              >
                {principle}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PricingCard({
  plan,
  signupHref,
}: {
  plan: (typeof homepagePricingPlans)[number]
  signupHref: string
}) {
  const featured = plan.name === "Standard"

  return (
    <article
      className={`flex min-h-[35rem] flex-col overflow-hidden rounded-[1.5rem] border p-7 sm:p-8 ${
        featured
          ? "border-[#0B1F36] bg-[#0B1F36] text-white"
          : "border-[#0B1F36]/10 bg-[#F7FAF7] text-[#0B1F36]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">{plan.name}</h3>
        {featured ? (
          <span className="rounded-full bg-[#71D98B] px-2.5 py-1 text-[10px] font-semibold text-[#071B2C] uppercase">
            Established teams
          </span>
        ) : null}
      </div>

      <div className="mt-10">
        <p className="marketing-serif text-4xl tracking-[-0.035em] sm:text-5xl">
          {plan.price}
        </p>
        <p
          className={`mt-2 text-sm ${featured ? "text-white/55" : "text-[#0B1F36]/52"}`}
        >
          {plan.cadence}
        </p>
      </div>

      <p className="mt-7 text-sm font-semibold">{plan.members}</p>
      <p
        className={`mt-3 text-sm leading-7 ${featured ? "text-white/62" : "text-[#0B1F36]/60"}`}
      >
        {plan.description}
      </p>

      <ul
        className={`mt-8 space-y-3 border-t pt-6 text-sm ${featured ? "border-white/12" : "border-[#0B1F36]/10"}`}
      >
        {plan.features.map((feature) => (
          <li className="flex items-start gap-2.5" key={feature}>
            <CheckIcon
              aria-hidden="true"
              className={`mt-0.5 size-4 shrink-0 ${featured ? "text-[#71D98B]" : "text-[#1F7A3D]"}`}
            />
            <span className={featured ? "text-white/72" : "text-[#0B1F36]/68"}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Link
        className={buttonVariants({
          className: featured
            ? "mt-auto h-11 rounded-full !bg-[#71D98B] px-5 !text-[#071B2C] hover:!bg-[#8AE6A0]"
            : "mt-auto h-11 rounded-full border-[#0B1F36]/16 bg-white px-5 text-[#0B1F36] hover:bg-white",
          variant: featured ? "default" : "outline",
        })}
        href={signupHref}
      >
        Request access
        <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </article>
  )
}
