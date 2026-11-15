import { buttonVariants } from "@halaalvest/ui/components/button"
import { ArrowRightIcon, CheckIcon } from "lucide-react"
import Link from "next/link"
import {
  monthlyBillTerms,
  pricingFeePrinciples,
  publicPriceList,
} from "./pricing-data"

export function PricingComparison({
  ctaLabel,
  signupHref,
}: {
  ctaLabel: string
  signupHref: string
}) {
  return (
    <main className="marketing-site min-h-svh text-[#0B1F36]">
      <section className="px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
        <div className="mx-auto w-full max-w-[90rem]">
          <div className="marketing-eyebrow">Pricing</div>
          <h1 className="marketing-serif mt-7 max-w-5xl text-5xl leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
            One monthly bill. No cut of member money.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#0B1F36]/64">
            Pay per active member, with website assistant messages included and
            optional mobile access. Halaalvest bills your cooperative once a
            month. Provider costs and one-time implementation work are disclosed
            separately.
          </p>

          <dl className="mt-14 overflow-hidden rounded-[1.5rem] border border-[#0B1F36]/10 bg-white">
            {publicPriceList.map((price) => (
              <div
                className="grid gap-2 border-b border-[#0B1F36]/10 p-6 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-8"
                key={price.item}
              >
                <dt>
                  <span className="block text-xl font-semibold">
                    {price.item}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-[#0B1F36]/60">
                    {price.detail}
                  </span>
                </dt>
                <dd
                  className={`marketing-serif m-0 text-3xl tracking-[-0.03em] sm:text-right sm:text-4xl ${
                    price.highlight ? "text-[#1F7A3D]" : ""
                  }`}
                >
                  {price.price}
                  {price.note ? (
                    <span className="mt-1 block font-sans text-sm tracking-normal text-[#0B1F36]/52">
                      {price.note}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-[1.5rem] border border-[#0B1F36] bg-[#0B1F36] p-6 text-white sm:p-8">
              <h2 className="text-xl font-semibold">How billing works</h2>
              <ul className="mt-6 space-y-3">
                {monthlyBillTerms.map((term) => (
                  <li className="flex items-start gap-2 text-sm" key={term}>
                    <CheckIcon
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-[#71D98B]"
                    />
                    <span className="text-white/72">{term}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col rounded-[1.5rem] border border-[#0B1F36]/10 bg-white p-6 sm:p-8">
              <h2 className="text-xl font-semibold">
                Other costs, stated up front
              </h2>
              <ul className="mt-6 space-y-3">
                {pricingFeePrinciples.map((note) => (
                  <li className="flex items-start gap-2 text-sm" key={note}>
                    <CheckIcon
                      aria-hidden="true"
                      className="mt-0.5 size-4 shrink-0 text-[#1F7A3D]"
                    />
                    <span className="leading-6 text-[#0B1F36]/68">{note}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
                <Link
                  className="text-sm font-semibold text-[#1F7A3D] underline-offset-4 hover:underline"
                  href="/billing-policy"
                >
                  Read the billing policy
                </Link>
                <Link
                  className={buttonVariants({
                    className:
                      "h-11 rounded-full !bg-[#0B1F36] px-5 !text-white hover:!bg-[#071B2C]",
                  })}
                  href={signupHref}
                >
                  {ctaLabel}
                  <ArrowRightIcon aria-hidden="true" className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
