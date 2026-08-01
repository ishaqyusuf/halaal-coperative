import { buttonVariants } from "@halaalvest/ui/components/button"
import { ArrowRightIcon, BadgeCheckIcon } from "lucide-react"
import Link from "next/link"
import { WorkspacePreview } from "./workspace-preview"

const trustPrinciples = [
  ["Interest-free by design", "No time-based or compounding interest logic"],
  [
    "Approval-led operations",
    "Eligibility, liquidity, and authority stay distinct",
  ],
  ["Member-visible records", "Statements show how balances were derived"],
  ["Your own workspace", "Each cooperative operates in its tenant-scoped home"],
] as const

export function LandingHero({
  isLaunchReady,
  signupHref,
}: {
  isLaunchReady: boolean
  signupHref: string
}) {
  return (
    <>
      <section className="relative border-b border-[#0B1F36]/10">
        <div className="marketing-grid absolute inset-y-0 right-0 hidden w-[44%] opacity-35 lg:block" />
        <div className="relative mx-auto grid w-full max-w-[90rem] gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-12 lg:py-24 xl:gap-18 xl:py-28">
          <div className="max-w-3xl">
            <div className="marketing-eyebrow">
              {isLaunchReady
                ? "Now onboarding selected cooperatives"
                : "Private launch for cooperative teams"}
            </div>

            <h1 className="marketing-serif mt-7 max-w-[13ch] text-[clamp(3.2rem,5vw,5.65rem)] leading-[0.94] tracking-[-0.05em] text-[#0B1F36]">
              Run your cooperative with records every member can trust.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#0B1F36]/68 sm:text-xl sm:leading-9">
              Contributions, interest-free financing, approvals, repayments,
              member statements, and operational services in one auditable
              workspace.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                className={buttonVariants({
                  className:
                    "h-12 rounded-full !bg-[#1F7A3D] px-6 text-base !text-white shadow-none hover:!bg-[#176331]",
                  size: "lg",
                })}
                href={signupHref}
              >
                Request guided setup
                <ArrowRightIcon aria-hidden="true" className="size-4" />
              </Link>
              <Link
                className={buttonVariants({
                  className:
                    "h-12 rounded-full border-[#0B1F36]/18 bg-white/50 px-6 text-base text-[#0B1F36] shadow-none hover:bg-white",
                  size: "lg",
                  variant: "outline",
                })}
                href="#product"
              >
                See how Halaalvest works
              </Link>
            </div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3 border-t border-[#0B1F36]/12 pt-5 text-sm text-[#0B1F36]/62">
              <span>For cooperative leaders</span>
              <span>Finance teams</span>
              <span>Operations officers</span>
              <span>Members</span>
            </div>
          </div>

          <WorkspacePreview />
        </div>
      </section>

      <section
        aria-label="Halaalvest operating principles"
        className="border-b border-[#0B1F36]/10 bg-white/72"
      >
        <div className="mx-auto grid w-full max-w-[90rem] divide-y divide-[#0B1F36]/10 px-5 sm:grid-cols-2 sm:divide-x sm:divide-y-0 sm:px-8 lg:grid-cols-4 lg:px-12">
          {trustPrinciples.map(([title, body]) => (
            <article
              className="py-6 sm:px-6 first:sm:pl-0 last:sm:pr-0"
              key={title}
            >
              <div className="flex items-center gap-2 text-[#1F7A3D]">
                <BadgeCheckIcon aria-hidden="true" className="size-4" />
                <p className="text-sm font-semibold text-[#0B1F36]">{title}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-[#0B1F36]/58">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
