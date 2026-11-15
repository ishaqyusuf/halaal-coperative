import { buttonVariants } from "@halaalvest/ui/components/button"
import { ArrowRightIcon } from "lucide-react"
import Link from "next/link"
import {
  pricingFeePrinciples,
  publicPriceList,
  publicPricingSummary,
} from "./pricing-data"

export function PricingSection({ signupHref }: { signupHref: string }) {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 bg-white px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-32"
    >
      <div className="mx-auto w-full max-w-[90rem]">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div className="marketing-eyebrow">Simple pricing</div>
          <div>
            <h2 className="marketing-serif max-w-4xl text-4xl leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Software fees stay separate from member money.
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[#0B1F36]/62">
              {publicPricingSummary} It all comes on one monthly bill, and
              Halaalvest never takes a percentage of cooperative funds or
              financing activity.
            </p>
          </div>
        </div>

        <dl className="mt-14 overflow-hidden rounded-[1.5rem] border border-[#0B1F36]/10 bg-[#F7FAF7]">
          {publicPriceList.map((price) => (
            <div
              className="grid gap-2 border-b border-[#0B1F36]/10 p-6 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8 sm:p-8"
              key={price.item}
            >
              <dt>
                <span className="block text-lg font-semibold">
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

        <div className="mt-4 grid overflow-hidden rounded-2xl border border-[#0B1F36]/10 bg-[#F7FAF7] lg:grid-cols-[0.7fr_1.3fr]">
          <div className="border-b border-[#0B1F36]/10 p-6 lg:border-r lg:border-b-0 lg:p-7">
            <p className="text-sm font-semibold">One bill a month</p>
            <p className="mt-2 text-sm leading-6 text-[#0B1F36]/58">
              Seats, assistant messages and mobile access arrive on one bill
              your cooperative pays from the dashboard.
            </p>
            <Link
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#1F7A3D] hover:text-[#176331]"
              href="/pricing"
            >
              See full pricing
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

        <Link
          className={buttonVariants({
            className:
              "mt-8 h-11 rounded-full !bg-[#0B1F36] px-5 !text-white hover:!bg-[#071B2C]",
          })}
          href={signupHref}
        >
          Request access
          <ArrowRightIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  )
}
