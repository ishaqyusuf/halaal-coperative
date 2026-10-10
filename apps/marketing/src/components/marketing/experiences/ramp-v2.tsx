import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { buttonVariants } from "@halaalvest/ui/components/button"
import type { LucideIcon } from "lucide-react"
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BadgeCheckIcon,
  BarChart3Icon,
  CheckIcon,
  ClipboardCheckIcon,
  FileCheck2Icon,
  FileTextIcon,
  LandmarkIcon,
  LockKeyholeIcon,
  ReceiptTextIcon,
  ScaleIcon,
  ShieldCheckIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react"
import Link from "next/link"
import { EarlyAccessForm } from "../early-access-form"
import type { MarketingExperienceProps } from "../marketing-experience-contract"
import {
  freeBetaMonthlyPriceLabel,
  standardMonthlyPriceLabel,
} from "../pricing-data"

const operatingAreas = [
  "Contributions",
  "Interest-free financing",
  "Repayments",
  "Member statements",
  "Approvals",
  "Migration",
] as const

const principles = [
  {
    body: "Eligibility, liquidity, guarantors, and authority stay distinct.",
    icon: ScaleIcon,
    title: "Financing with controls",
  },
  {
    body: "Every balance keeps its source, status, and approval trail.",
    icon: FileCheck2Icon,
    title: "Records that explain themselves",
  },
  {
    body: "Each cooperative operates inside its own protected workspace.",
    icon: LockKeyholeIcon,
    title: "Tenant-scoped by design",
  },
] satisfies Array<{ body: string; icon: LucideIcon; title: string }>

export function RampV2Landing({
  isLaunchReady,
  quickFill,
  signupHref,
}: MarketingExperienceProps) {
  return (
    <main
      id="top"
      className="ramp-v2 min-h-svh overflow-hidden bg-[#f5f5ef] text-[#151515]"
    >
      <RampHeader isLaunchReady={isLaunchReady} signupHref={signupHref} />
      <RampHero isLaunchReady={isLaunchReady} signupHref={signupHref} />
      <OperatingAreas />
      <ProductSection />
      <WorkflowSection signupHref={signupHref} />
      <MigrationSection />
      <TrustSection />
      <PricingSection signupHref={signupHref} />
      <EarlyAccessSection quickFill={quickFill} />
      <RampFooter />
    </main>
  )
}

function RampHeader({
  isLaunchReady,
  signupHref,
}: {
  isLaunchReady: boolean
  signupHref: string
}) {
  return (
    <>
      <div className="border-b border-black bg-[#171717] px-4 py-2.5 text-center text-xs text-white sm:text-sm">
        <Link
          className="inline-flex items-center gap-2 hover:text-[#dfff32]"
          href={signupHref}
        >
          <span>
            {isLaunchReady
              ? "Guided cooperative onboarding is now open"
              : "Private onboarding for selected cooperative teams"}
          </span>
          <ArrowRightIcon aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
      <header className="sticky top-0 z-50 border-b border-black/15 bg-[#f5f5ef]/94 backdrop-blur-xl">
        <div className="mx-auto flex h-17 w-full max-w-[92rem] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link aria-label="Halaalvest home" href="/">
            <HalaalvestLogo
              className="gap-2"
              markClassName="size-8"
              wordmarkClassName="text-base"
            />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-7 text-sm lg:flex"
          >
            <Link className="hover:opacity-55" href="#product">
              Product
            </Link>
            <Link className="hover:opacity-55" href="#workflow">
              How it works
            </Link>
            <Link className="hover:opacity-55" href="#migration">
              Migration
            </Link>
            <Link className="hover:opacity-55" href="/pricing">
              Pricing
            </Link>
            <Link className="hover:opacity-55" href="#trust">
              Trust
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              className="hidden text-sm hover:opacity-55 sm:inline-flex"
              href="mailto:hello@halaalvest.com"
            >
              Talk to us
            </Link>
            <Link
              className={buttonVariants({
                className:
                  "h-10 rounded-md !bg-[#171717] px-4 text-sm !text-white shadow-none hover:!bg-black sm:px-5",
              })}
              href={signupHref}
            >
              <span className="hidden sm:inline">Request access</span>
              <span className="sm:hidden">Get started</span>
              <ArrowUpRightIcon aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </div>
      </header>
    </>
  )
}

function RampHero({
  isLaunchReady,
  signupHref,
}: {
  isLaunchReady: boolean
  signupHref: string
}) {
  return (
    <section className="ramp-dot-grid border-b border-black/15">
      <div className="mx-auto w-full max-w-[92rem] px-5 py-14 sm:px-8 sm:py-18 lg:px-10 lg:py-22">
        <div className="max-w-6xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-black/18 bg-white/70 px-3 py-1.5 text-xs font-medium sm:text-sm">
            <span className="size-2 rounded-full bg-[#60a928]" />
            {isLaunchReady
              ? "Now onboarding cooperative teams"
              : "Built for the next generation of cooperatives"}
          </div>
          <h1 className="max-w-[12ch] text-[clamp(3.8rem,8vw,8.8rem)] leading-[0.86] font-medium tracking-[-0.072em]">
            Cooperative finance. <span className="text-[#498c22]">Clear</span>{" "}
            at last.
          </h1>
          <div className="mt-8 grid max-w-5xl gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
            <p className="max-w-3xl text-lg leading-8 text-black/63 sm:text-xl sm:leading-9">
              Run contributions, interest-free cooperative financing with
              separately shown charges, approvals, repayments, and member
              records from one operating system built for trust.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                className={buttonVariants({
                  className:
                    "h-13 rounded-md !bg-[#171717] px-6 text-base !text-white shadow-none hover:!bg-black",
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
                    "h-13 rounded-md border-black/22 bg-white/60 px-6 text-base text-[#171717] shadow-none hover:bg-white",
                  size: "lg",
                  variant: "outline",
                })}
                href="#product"
              >
                Explore the platform
              </Link>
            </div>
          </div>
        </div>

        <WorkspaceHeroPreview />
      </div>
    </section>
  )
}

function WorkspaceHeroPreview() {
  return (
    <div className="mt-14 border border-black/18 bg-[#dfff32] p-2.5 shadow-[0_32px_80px_rgba(0,0,0,0.12)] sm:p-4 lg:mt-18 lg:p-6">
      <div className="overflow-hidden border border-black/18 bg-[#f9faf5]">
        <div className="flex items-center justify-between border-b border-black/12 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-full bg-[#171717] text-xs font-semibold text-white">
              AC
            </div>
            <div>
              <p className="text-sm font-semibold">Amanah Cooperative</p>
              <p className="text-xs text-black/50">Sample operations view</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-black/12 bg-white px-3 py-1.5 text-xs sm:flex">
            <span className="size-1.5 rounded-full bg-[#62ad29]" />
            August cycle open
          </div>
        </div>

        <div className="grid min-h-[34rem] lg:grid-cols-[13rem_1fr]">
          <aside className="hidden border-r border-black/12 bg-white/65 p-4 lg:block">
            <p className="px-2 text-[10px] font-semibold tracking-[0.16em] text-black/35 uppercase">
              Workspace
            </p>
            <div className="mt-4 space-y-1 text-sm">
              <PreviewNav active icon={BarChart3Icon} label="Overview" />
              <PreviewNav icon={UsersIcon} label="Members" />
              <PreviewNav icon={WalletCardsIcon} label="Contributions" />
              <PreviewNav icon={ScaleIcon} label="Financing" />
              <PreviewNav icon={ReceiptTextIcon} label="Repayments" />
              <PreviewNav icon={FileTextIcon} label="Reports" />
            </div>
            <div className="mt-24 border border-black/10 bg-[#f5f5ef] p-3">
              <ShieldCheckIcon aria-hidden="true" className="size-4" />
              <p className="mt-3 text-xs font-semibold">Workspace protected</p>
              <p className="mt-1 text-[11px] leading-4 text-black/48">
                Roles and tenant boundaries are active.
              </p>
            </div>
          </aside>

          <div className="min-w-0 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-medium text-black/45">
                  Operations overview
                </p>
                <h2 className="mt-1 text-2xl font-medium tracking-[-0.035em] sm:text-3xl">
                  Good morning, finance team.
                </h2>
              </div>
              <div className="h-9 self-start rounded-md bg-[#171717] px-4 text-xs font-medium text-white">
                <span className="flex h-full items-center">
                  Review action queue
                </span>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <PreviewMetric label="Collection cycle" value="On track" />
              <PreviewMetric label="Records to review" value="12 items" />
              <PreviewMetric label="Member statements" value="Ready" />
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
              <div className="border border-black/12 bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      Monthly contribution health
                    </p>
                    <p className="mt-1 text-xs text-black/45">
                      Posted records across the current cycle
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e8f7dc] px-2.5 py-1 text-[11px] font-medium text-[#397218]">
                    Healthy
                  </span>
                </div>
                <div className="mt-8 flex h-32 items-end gap-2 sm:gap-3">
                  {[42, 58, 49, 74, 66, 88, 82, 94, 78, 91, 96, 86].map(
                    (height, index) => (
                      <div
                        className="flex-1 bg-[#dfff32] first:bg-[#b7c4ff] last:bg-[#171717]"
                        key={`${height}-${index}`}
                        style={{ height: `${height}%` }}
                      />
                    )
                  )}
                </div>
                <div className="mt-3 flex justify-between text-[10px] tracking-wide text-black/35 uppercase">
                  <span>Cycle start</span>
                  <span>Today</span>
                </div>
              </div>

              <div className="border border-black/12 bg-[#171717] p-4 text-white sm:p-5">
                <p className="text-sm font-semibold">Action queue</p>
                <p className="mt-1 text-xs text-white/45">
                  What needs attention next
                </p>
                <div className="mt-5 divide-y divide-white/10">
                  <QueueRow
                    label="Contribution exceptions"
                    status="5 records"
                  />
                  <QueueRow label="Financing approvals" status="3 requests" />
                  <QueueRow label="Member documents" status="4 reviews" />
                </div>
                <div className="mt-5 flex items-center gap-2 bg-[#dfff32] px-3 py-2.5 text-xs font-medium text-black">
                  <BadgeCheckIcon aria-hidden="true" className="size-4" />
                  Approval policy checks are active
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function OperatingAreas() {
  return (
    <section
      aria-label="Halaalvest operating areas"
      className="border-b border-black/15 bg-[#171717] py-5 text-white"
    >
      <div className="mx-auto flex w-full max-w-[92rem] gap-8 overflow-hidden px-5 sm:px-8 lg:px-10">
        {operatingAreas.map((area) => (
          <div
            className="flex shrink-0 items-center gap-8 text-xs font-medium tracking-[0.12em] uppercase sm:text-sm"
            key={area}
          >
            <span>{area}</span>
            <span className="size-1.5 rounded-full bg-[#dfff32]" />
          </div>
        ))}
      </div>
    </section>
  )
}

function ProductSection() {
  return (
    <section
      id="product"
      className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36"
    >
      <div className="mx-auto w-full max-w-[92rem]">
        <div className="grid gap-7 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
          <p className="text-xs font-semibold tracking-[0.15em] text-black/42 uppercase">
            One operating picture
          </p>
          <div>
            <h2 className="max-w-[15ch] text-5xl leading-[0.94] font-medium tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              The work is connected. The software should be too.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-black/58">
              Replace disconnected spreadsheets, chat approvals, and manual
              statements with one coherent operating model.
            </p>
          </div>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <FeatureCard
            body="Stage expected records, review what arrived, allocate receipts, and keep exceptions visible before posting."
            className="bg-[#dfff32]"
            icon={WalletCardsIcon}
            title="Collect and reconcile without the spreadsheet chase."
          >
            <LedgerPreview />
          </FeatureCard>
          <FeatureCard
            body="Separate member eligibility from pool liquidity, guarantor evidence, approval authority, and disbursement."
            className="bg-[#b9c6ff]"
            icon={ScaleIcon}
            title="Make financing decisions the cooperative can explain."
          >
            <ApprovalPreview />
          </FeatureCard>
          <FeatureCard
            body="Give members a clear view of savings, charges, financing exposure, repayments, and recent activity."
            className="bg-[#171717] text-white"
            icon={UsersIcon}
            title="Turn records into trust, not another office bottleneck."
          >
            <StatementPreview />
          </FeatureCard>
          <FeatureCard
            body="Keep roles, KYC reviews, exports, reversals, and audit history attributable and reviewable."
            className="bg-white"
            icon={ShieldCheckIcon}
            title="Give the team a reliable operating trail."
          >
            <AuditPreview />
          </FeatureCard>
        </div>
      </div>
    </section>
  )
}

function WorkflowSection({ signupHref }: { signupHref: string }) {
  const steps = [
    ["01", "Understand", "Map current records, roles, and operating needs."],
    ["02", "Prepare", "Create the protected cooperative workspace."],
    ["03", "Migrate", "Bring forward trusted history or opening positions."],
    ["04", "Operate", "Configure the first live month and onboard the team."],
  ] as const

  return (
    <section
      id="workflow"
      className="scroll-mt-24 border-y border-black/15 bg-[#e7e5dc] px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36"
    >
      <div className="mx-auto w-full max-w-[92rem]">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-black/42 uppercase">
              From records to a live workspace
            </p>
            <h2 className="mt-5 max-w-[14ch] text-5xl leading-[0.94] font-medium tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              A guided path, not a blank dashboard.
            </h2>
          </div>
          <Link
            className={buttonVariants({
              className:
                "h-12 self-start rounded-md !bg-[#171717] px-5 text-sm !text-white hover:!bg-black lg:self-auto",
              size: "lg",
            })}
            href={signupHref}
          >
            Start guided setup
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="mt-14 grid border border-black/18 bg-black/18 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([number, title, body]) => (
            <article
              className="min-h-72 border border-[#e7e5dc] bg-[#f5f5ef] p-6 sm:p-7"
              key={number}
            >
              <p className="font-mono text-xs text-black/42">{number}</p>
              <h3 className="mt-20 text-2xl font-medium tracking-[-0.035em]">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-black/55">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function MigrationSection() {
  return (
    <section
      id="migration"
      className="scroll-mt-24 bg-[#dfff32] px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36"
    >
      <div className="mx-auto grid w-full max-w-[92rem] gap-14 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-black/52 uppercase">
            Migration without guesswork
          </p>
          <h2 className="mt-5 max-w-[11ch] text-5xl leading-[0.92] font-medium tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Respect the books you already have.
          </h2>
          <p className="mt-7 max-w-xl text-lg leading-8 text-black/62">
            Preserve detailed history when it is trustworthy. Use reviewed
            opening positions when it is not. Both paths keep source evidence
            and approval clear.
          </p>
        </div>

        <div className="border border-black/20 bg-[#f5f5ef] p-3 sm:p-5">
          <div className="border border-black/14 bg-white">
            <div className="flex items-center justify-between border-b border-black/12 px-5 py-4">
              <div>
                <p className="text-sm font-semibold">Migration workspace</p>
                <p className="mt-0.5 text-xs text-black/45">
                  Source files and review evidence
                </p>
              </div>
              <span className="rounded-full bg-[#edf6e8] px-2.5 py-1 text-[11px] font-medium text-[#3b751a]">
                Review ready
              </span>
            </div>
            <div className="divide-y divide-black/10 px-5">
              <MigrationRow
                icon={UsersIcon}
                meta="Structured profile import"
                title="Member registry"
              />
              <MigrationRow
                icon={FileTextIcon}
                meta="Dated records with source evidence"
                title="Historical backfill"
              />
              <MigrationRow
                icon={LandmarkIcon}
                meta="Reviewed balances and obligations"
                title="Opening positions"
              />
            </div>
            <div className="m-5 flex items-start gap-3 bg-[#171717] p-4 text-white">
              <ShieldCheckIcon
                aria-hidden="true"
                className="mt-0.5 size-5 text-[#dfff32]"
              />
              <div>
                <p className="text-sm font-semibold">
                  Posted history stays put
                </p>
                <p className="mt-1 text-xs leading-5 text-white/55">
                  Corrections follow explicit review and reversal paths instead
                  of silently rewriting prior records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function TrustSection() {
  return (
    <section
      id="trust"
      className="scroll-mt-24 bg-[#171717] px-5 py-20 text-white sm:px-8 sm:py-28 lg:px-10 lg:py-36"
    >
      <div className="mx-auto w-full max-w-[92rem]">
        <div className="grid gap-9 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
          <h2 className="max-w-[14ch] text-5xl leading-[0.94] font-medium tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Interest-free by design. Transparent by default.
          </h2>
          <p className="max-w-xl text-lg leading-8 text-white/55">
            Halaalvest is operating software for member-owned cooperatives—not a
            direct lender, bank, or custodian of member funds. Its financing
            workflows do not calculate interest; cooperatives may assess
            separate charges that members should review with the total payable
            and repayment terms.
          </p>
        </div>
        <div className="mt-14 grid divide-y divide-white/12 border-y border-white/12 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {principles.map(({ body, icon: Icon, title }) => (
            <article
              className="py-8 lg:px-8 first:lg:pl-0 last:lg:pr-0"
              key={title}
            >
              <Icon aria-hidden="true" className="size-6 text-[#dfff32]" />
              <h3 className="mt-12 text-xl font-medium">{title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-white/50">
                {body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection({ signupHref }: { signupHref: string }) {
  return (
    <section
      id="pricing"
      className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36"
    >
      <div className="mx-auto w-full max-w-[92rem]">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] text-black/42 uppercase">
              Predictable SaaS pricing
            </p>
            <h2 className="mt-5 max-w-[13ch] text-5xl leading-[0.94] font-medium tracking-[-0.055em] sm:text-6xl">
              Software fees stay separate from member money.
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-8 text-black/58 lg:justify-self-end">
            Plans use active-member capacity bands. Halaalvest does not take a
            percentage of cooperative funds or financing activity.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          <PriceCard
            body="For selected cooperatives validating guided setup and live workflows."
            features={["Up to 100 active members", "Guided cooperative setup"]}
            name="Free Beta"
            price={freeBetaMonthlyPriceLabel.replace(/^NGN /, "₦")}
            signupHref={signupHref}
          />
          <PriceCard
            body="For established cooperatives running monthly contribution operations."
            featured
            features={[
              "Up to 1,000 active members",
              "Member login and audit history",
            ]}
            name="Standard"
            price={standardMonthlyPriceLabel.replace(/^NGN /, "₦")}
            signupHref={signupHref}
          />
          <PriceCard
            body="For multi-branch, integration-heavy, or SLA-backed deployments."
            features={[
              "Custom active-member band",
              "Dedicated success support",
            ]}
            name="Enterprise"
            price="Custom"
            signupHref={signupHref}
          />
        </div>
        <div className="mt-6 flex flex-col justify-between gap-4 border-t border-black/14 pt-6 text-sm text-black/52 sm:flex-row sm:items-center">
          <p>No percentage of savings, financing, repayments, or profits.</p>
          <Link
            className="inline-flex items-center gap-2 font-medium text-black"
            href="/pricing"
          >
            Compare all five plans
            <ArrowRightIcon aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}

function EarlyAccessSection({
  quickFill,
}: Pick<MarketingExperienceProps, "quickFill">) {
  return (
    <section
      id="early-access"
      className="scroll-mt-24 border-t border-black/15 bg-[#b9c6ff] px-5 py-20 sm:px-8 sm:py-28 lg:px-10 lg:py-36"
    >
      <div className="mx-auto grid w-full max-w-[92rem] gap-12 lg:grid-cols-[.72fr_1.28fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-xs font-semibold tracking-[0.15em] text-black/48 uppercase">
            Request guided setup
          </p>
          <h2 className="mt-5 max-w-[11ch] text-5xl leading-[0.94] font-medium tracking-[-0.055em] sm:text-6xl">
            Tell us how the cooperative works today.
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-black/60">
            We use the request to understand your migration path, accountable
            contact, and operating areas before opening a private workspace.
          </p>
          <div className="mt-8 space-y-3 border-t border-black/14 pt-6">
            {[
              "No member funds move through this request",
              "Approved setup opens through a private link",
              "Detailed finance policy stays inside the workspace",
            ].map((item) => (
              <div className="flex items-start gap-3" key={item}>
                <CheckIcon
                  aria-hidden="true"
                  className="mt-1 size-4 shrink-0"
                />
                <p className="text-sm leading-6 text-black/60">{item}</p>
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

function RampFooter() {
  return (
    <footer className="border-t border-black/15 bg-[#f5f5ef] px-5 py-9 sm:px-8 lg:px-10">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <HalaalvestLogo
            markClassName="size-8"
            wordmarkClassName="text-base"
          />
          <p className="mt-3 max-w-md text-sm text-black/50">
            The trusted operating system for cooperative finance.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link className="hover:opacity-55" href="#product">
            Product
          </Link>
          <Link className="hover:opacity-55" href="/pricing">
            Pricing
          </Link>
          <Link className="hover:opacity-55" href="#early-access">
            Early access
          </Link>
          <a className="hover:opacity-55" href="mailto:hello@halaalvest.com">
            Contact
          </a>
        </div>
      </div>
    </footer>
  )
}

function PreviewNav({
  active = false,
  icon: Icon,
  label,
}: {
  active?: boolean
  icon: LucideIcon
  label: string
}) {
  return (
    <div
      className={`flex items-center gap-2.5 px-2 py-2 ${active ? "bg-[#eaf5e4] font-medium" : "text-black/48"}`}
    >
      <Icon aria-hidden="true" className="size-4" />
      {label}
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-black/12 bg-white p-4">
      <p className="text-xs text-black/42">{label}</p>
      <p className="mt-2 text-xl font-medium tracking-[-0.03em]">{value}</p>
    </div>
  )
}

function QueueRow({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 text-xs">
      <span className="text-white/72">{label}</span>
      <span className="text-white/42">{status}</span>
    </div>
  )
}

function FeatureCard({
  body,
  children,
  className,
  icon: Icon,
  title,
}: {
  body: string
  children: React.ReactNode
  className: string
  icon: LucideIcon
  title: string
}) {
  return (
    <article
      className={`min-w-0 overflow-hidden border border-black/16 p-6 sm:p-8 ${className}`}
    >
      <Icon aria-hidden="true" className="size-6" />
      <h3 className="mt-10 max-w-[17ch] text-3xl leading-[1.02] font-medium tracking-[-0.045em] sm:text-4xl">
        {title}
      </h3>
      <p className="mt-4 max-w-xl text-sm leading-6 opacity-60">{body}</p>
      <div className="mt-10">{children}</div>
    </article>
  )
}

function LedgerPreview() {
  return (
    <div className="border border-black/16 bg-[#f9faf5] text-black">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 text-xs font-medium">
        <span>Monthly collection records</span>
        <span className="text-black/40">August</span>
      </div>
      {["A. Ibrahim", "M. Bello", "K. Ajayi"].map((name, index) => (
        <div
          className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-black/8 px-4 py-3 text-xs last:border-b-0"
          key={name}
        >
          <span>{name}</span>
          <span className="text-black/42">
            {index === 1 ? "Review" : "Matched"}
          </span>
          <span
            className={`size-2 rounded-full ${index === 1 ? "bg-[#eea62f]" : "bg-[#62ad29]"}`}
          />
        </div>
      ))}
    </div>
  )
}

function ApprovalPreview() {
  return (
    <div className="grid grid-cols-3 border border-black/16 bg-[#f9faf5] p-4 text-center text-black sm:p-6">
      {[
        ["Eligibility", "Passed"],
        ["Liquidity", "Available"],
        ["Approval", "In review"],
      ].map(([label, value], index) => (
        <div className="relative px-2" key={label}>
          {index < 2 ? (
            <span className="absolute top-3 left-[62%] h-px w-[76%] bg-black/18" />
          ) : null}
          <span className="relative z-10 mx-auto flex size-6 items-center justify-center rounded-full bg-[#171717] text-white">
            {index < 2 ? (
              <CheckIcon aria-hidden="true" className="size-3" />
            ) : (
              <span className="size-1.5 rounded-full bg-[#dfff32]" />
            )}
          </span>
          <p className="mt-4 text-xs font-medium">{label}</p>
          <p className="mt-1 text-[10px] text-black/42">{value}</p>
        </div>
      ))}
    </div>
  )
}

function StatementPreview() {
  return (
    <div className="border border-white/15 bg-white/6 p-4 text-white sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/42">Member statement</p>
          <p className="mt-1 text-sm font-medium">Everything in its place</p>
        </div>
        <ReceiptTextIcon aria-hidden="true" className="size-5 text-[#dfff32]" />
      </div>
      <div className="mt-5 grid grid-cols-3 divide-x divide-white/12 border-t border-white/12 pt-4 text-xs">
        <span>Savings</span>
        <span className="pl-3">Charges</span>
        <span className="pl-3">Principal</span>
      </div>
    </div>
  )
}

function AuditPreview() {
  return (
    <div className="border border-black/12 bg-[#f5f5ef] p-4 text-black sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#dfff32]">
          <ClipboardCheckIcon aria-hidden="true" className="size-4" />
        </div>
        <div>
          <p className="text-sm font-medium">Financing request approved</p>
          <p className="mt-1 text-xs text-black/42">
            Authority, timestamp, and evidence recorded
          </p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-3 text-[11px] text-black/42">
        <span>Finance officer</span>
        <span>Just now</span>
      </div>
    </div>
  )
}

function MigrationRow({
  icon: Icon,
  meta,
  title,
}: {
  icon: LucideIcon
  meta: string
  title: string
}) {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="flex size-9 shrink-0 items-center justify-center bg-[#eef0e8]">
        <Icon aria-hidden="true" className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-black/42">{meta}</p>
      </div>
      <BadgeCheckIcon aria-hidden="true" className="size-4 text-[#4a8c25]" />
    </div>
  )
}

function PriceCard({
  body,
  featured = false,
  features,
  name,
  price,
  signupHref,
}: {
  body: string
  featured?: boolean
  features: readonly string[]
  name: string
  price: string
  signupHref: string
}) {
  return (
    <article
      className={`flex min-h-[28rem] flex-col border border-black/16 p-6 sm:p-7 ${featured ? "bg-[#dfff32]" : "bg-white"}`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{name}</h3>
        {featured ? (
          <span className="rounded-full bg-black px-2.5 py-1 text-[10px] font-medium text-white">
            Established teams
          </span>
        ) : null}
      </div>
      <p className="mt-10 text-4xl font-medium tracking-[-0.045em]">{price}</p>
      <p className="mt-4 text-sm leading-6 text-black/52">{body}</p>
      <div className="mt-8 space-y-3 border-t border-black/12 pt-6">
        {features.map((feature) => (
          <div className="flex items-start gap-2.5 text-sm" key={feature}>
            <CheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {feature}
          </div>
        ))}
      </div>
      <Link
        className={buttonVariants({
          className:
            "mt-auto h-11 rounded-md !bg-[#171717] px-4 text-sm !text-white hover:!bg-black",
        })}
        href={signupHref}
      >
        Request access <ArrowRightIcon aria-hidden="true" className="size-4" />
      </Link>
    </article>
  )
}
