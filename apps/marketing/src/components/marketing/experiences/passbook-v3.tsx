import { HalaalvestLogo } from "@halaalvest/ui/components/brand-logo"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { CheckIcon } from "lucide-react"
import { IBM_Plex_Mono, Schibsted_Grotesk } from "next/font/google"
import Link from "next/link"
import type { CSSProperties } from "react"
import { SignupForm } from "@/components/signup/signup-form"
import { EarlyAccessForm } from "../early-access-form"
import type {
  MarketingExperienceProps,
  MarketingSignupMode,
} from "../marketing-experience-contract"
import {
  pricingFeePrinciples,
  type PublicPrice,
  publicPriceList,
} from "../pricing-data"

const passbookSans = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-passbook-sans",
  fallback: ["system-ui", "Arial"],
})

const passbookMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-passbook-mono",
  fallback: ["ui-monospace", "monospace"],
})

type StatementBook = "charge" | "financing" | "savings"

const statementBooks = {
  charge: { className: "text-[#8A5A12]", label: "Charge" },
  financing: { className: "text-[#2D5B8C]", label: "Financing" },
  savings: { className: "text-[#1F7A3D]", label: "Savings" },
} satisfies Record<StatementBook, { className: string; label: string }>

// Sample statement: every figure reconciles to the totals below.
const statementLines = [
  {
    amount: "412,000.00",
    book: "savings",
    date: "01 Oct",
    entry: "Brought forward",
    source:
      "September statement, closed 30 Sep by A. Danjuma, finance officer.",
  },
  {
    amount: "480,000.00",
    book: "financing",
    date: "01 Oct",
    entry: "Brought forward",
    source:
      "Normal financing FN-0192, ₦540,000 over 18 months. Approved 12 Jul by 2 of 2 committee members.",
  },
  {
    amount: "+25,000.00",
    book: "savings",
    date: "25 Oct",
    entry: "Monthly contribution",
    source:
      "Ministry payroll batch PD-2610. Matched 25 Oct, posted by A. Danjuma.",
  },
  {
    amount: "−30,000.00",
    book: "financing",
    date: "25 Oct",
    entry: "Repayment 3 of 18",
    source:
      "Principal only, deducted with payroll batch PD-2610. Interest charged: 0.00.",
  },
  {
    amount: "500.00",
    book: "charge",
    date: "25 Oct",
    entry: "Monthly levy",
    source:
      "Charge rule “Monthly cooperative levy”, fixed ₦500, effective Jan 2026. Shown separately from savings.",
  },
] satisfies {
  amount: string
  book: StatementBook
  date: string
  entry: string
  source: string
}[]

const statementTotals = [
  { label: "Savings", value: "437,000.00" },
  { label: "Financing due", value: "450,000.00" },
  { label: "Charges", value: "500.00" },
  { highlight: true, label: "Interest", value: "0.00" },
]

const principles = [
  {
    body: "No interest is calculated. Cooperative charges are always shown separately.",
    title: "Interest-free by design",
  },
  {
    body: "Eligibility, pool liquidity and approval authority are checked separately.",
    title: "Approval-led",
  },
  {
    body: "Statements show how every balance was derived.",
    title: "Member-visible",
  },
  {
    body: "Each cooperative runs in its own private, branded workspace.",
    title: "Your own workspace",
  },
]

const pillars = [
  {
    body: "Stage expected payroll deductions and transfers, match what arrived, and keep exceptions visible before anything is posted.",
    evidence: "PD-2610 · 412 of 431 matched · 19 exceptions held for review",
    eyebrow: "Collect and reconcile",
    title: "Move monthly contributions out of spreadsheets.",
  },
  {
    body: "Check eligibility against savings, confirm the pool can fund it, collect guarantor evidence and record who approved the disbursement.",
    evidence: "FN-0192 · eligible · pool confirmed · 2 of 2 approvals",
    eyebrow: "Finance with controls",
    title: "Make financing decisions the cooperative can explain.",
  },
  {
    body: "Members see savings, financing, charges, receipts and requests from one account.",
    evidence: "UNI-0418 · October statement viewed 25 Oct",
    eyebrow: "Give members clarity",
    title: "Give members answers without a trip to the office.",
  },
  {
    body: "Roles, reviews, reversals and exports are attributable and audit-ready.",
    evidence: "R-0031 · reversal requested by finance · approved by chair",
    eyebrow: "Govern every change",
    title: "Keep a reliable trail for every sensitive action.",
  },
]

const trustPoints = [
  {
    body: "Halaalvest helps cooperatives run their own member-owned finance.",
    title: "Software, not a lender",
  },
  {
    body: "Sensitive actions keep clear states, authority and review evidence.",
    title: "Explicit approvals",
  },
  {
    body: "Each cooperative’s members, records and reports stay inside its own workspace.",
    title: "Private workspaces",
  },
  {
    body: "Savings, shares, principal, repayments, charges and profits stay distinct.",
    title: "Explainable balances",
  },
]

// Kept in step with the One Path journey map (steps 1–2, 3–4, 5–9, 10–11).
const signupSteps = [
  {
    body: "Cooperative name, your member code letters and web address. We email you a secure link.",
    title: "Sign up and verify your email",
  },
  {
    body: "Office location, start date and your password. You are signed in straight away.",
    title: "Add cooperative details",
  },
  {
    body: "Where records start, services, shares, charges and profit sharing.",
    title: "Set up how you run",
  },
  {
    body: "Add each member's balances or history, then go live.",
    title: "Bring your members",
  },
]

const signupCopy = {
  direct: {
    cta: "Create your workspace",
    eyebrow: "Sign up",
    headerCta: "Sign up",
    lede: "It takes a few minutes. Nothing is created until the admin verifies their email.",
    sectionId: "signup",
    title: "Create your cooperative workspace.",
  },
  "early-access": {
    cta: "Request access",
    eyebrow: "Request access",
    headerCta: "Request access",
    lede: "Sign-up is by approval while early access is on. Send a request and we’ll email the admin a private sign-up link.",
    sectionId: "early-access",
    title: "Request a cooperative workspace.",
  },
} satisfies Record<
  MarketingSignupMode,
  {
    cta: string
    eyebrow: string
    headerCta: string
    lede: string
    sectionId: string
    title: string
  }
>

const footerLinks = [
  ["/terms", "Terms"],
  ["/privacy", "Privacy"],
  ["/billing-policy", "Billing policy"],
  ["/cooperative-disclosures", "Cooperative disclosures"],
  ["/support", "Support"],
  ["/delete-account", "Delete account"],
] as const

const primaryButtonClass =
  "h-12 rounded-[10px] !bg-[#1F7A3D] px-5 text-base font-semibold !text-white shadow-none hover:!bg-[#165C2D]"
const secondaryButtonClass =
  "h-12 rounded-[10px] !border-[#C9D0C9] !bg-transparent px-5 text-base font-semibold !text-[#0B1F36] shadow-none hover:!bg-white"

export function PassbookV3Landing({
  isLaunchReady,
  quickFill,
  signupMode,
  workspaceUrlSuffix,
}: MarketingExperienceProps) {
  const signup = signupCopy[signupMode]
  const signupHref = `#${signup.sectionId}`

  return (
    <main
      id="top"
      className={`passbook-v3 ${passbookSans.variable} ${passbookMono.variable} min-h-svh overflow-x-clip bg-[#F6F7F4] text-[#0B1F36]`}
    >
      <PassbookHeader cta={signup.headerCta} signupHref={signupHref} />

      <section className="border-b border-[#DCE1DB]">
        <div className="mx-auto grid w-full max-w-[75rem] gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.02fr] lg:items-center lg:gap-16 lg:py-20">
          <div>
            <p className="passbook-eyebrow">
              {signupMode === "direct"
                ? "Open for cooperative sign-up"
                : isLaunchReady
                  ? "Now onboarding selected cooperatives"
                  : "Private launch for cooperative teams"}
            </p>
            <h1 className="mt-5 max-w-[12.5ch] text-[clamp(2.5rem,5.2vw,4.15rem)] leading-[1.02] font-bold tracking-[-0.045em]">
              Run your cooperative with records every member can trust.
            </h1>
            <p className="mt-5 max-w-[34em] text-[17px] leading-relaxed text-[#33475B] sm:text-lg">
              Contributions, interest-free financing, approvals, repayments and
              member statements in one workspace, with every balance traceable
              to its source.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className={buttonVariants({
                  className: primaryButtonClass,
                  size: "lg",
                })}
                href={signupHref}
              >
                {signup.cta}
              </Link>
              <Link
                className={buttonVariants({
                  className: secondaryButtonClass,
                  size: "lg",
                  variant: "outline",
                })}
                href="#product"
              >
                See how it works
              </Link>
            </div>
            <p className="mt-8 border-t border-[#DCE1DB] pt-4 text-sm text-[#5E6E7C]">
              For cooperative leaders, finance officers, operations staff and
              members.
            </p>
          </div>

          <PassbookStatement />
        </div>
      </section>

      <section
        aria-label="Operating principles"
        className="border-b border-[#DCE1DB] bg-white"
      >
        <div className="passbook-principles mx-auto grid w-full max-w-[75rem] px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {principles.map((principle) => (
            <article key={principle.title}>
              <h2 className="flex items-center gap-2 text-[15px] font-bold tracking-[-0.01em]">
                <CheckIcon
                  aria-hidden="true"
                  className="size-4 shrink-0 text-[#1F7A3D]"
                />
                {principle.title}
              </h2>
              <p className="mt-2 text-[14.5px] leading-normal text-[#5E6E7C]">
                {principle.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="scroll-mt-20 py-18 sm:py-26" id="product">
        <div className="mx-auto w-full max-w-[75rem] px-4 sm:px-6">
          <SectionHeading
            eyebrow="Product"
            lede="Collections, financing decisions, member visibility and governance in one operating record."
            title="The work is connected. The software should be too."
          />
          <div className="mt-12 grid gap-4 lg:mt-14 lg:grid-cols-2">
            {pillars.map((pillar) => (
              <article
                className="flex flex-col rounded-2xl border border-[#DCE1DB] bg-white p-6 sm:p-8 lg:min-h-[19rem]"
                key={pillar.title}
              >
                <p className="passbook-mono text-[12.5px] text-[#165C2D]">
                  {pillar.eyebrow}
                </p>
                <h3 className="mt-4 max-w-[20ch] text-[22px] leading-tight font-bold tracking-[-0.03em] sm:text-[26px]">
                  {pillar.title}
                </h3>
                <p className="mt-3 max-w-[34em] text-[#5E6E7C]">
                  {pillar.body}
                </p>
                <div className="mt-auto pt-6">
                  <p className="passbook-mono rounded-lg border border-dashed border-[#C9D0C9] bg-[#F6F7F4] px-3 py-2.5 text-[12.5px] leading-snug text-[#33475B]">
                    {pillar.evidence}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="scroll-mt-20 bg-[#0B1F36] py-18 text-white sm:py-26"
        id="trust"
      >
        <div className="mx-auto grid w-full max-w-[75rem] gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-18">
          <div>
            <p className="passbook-eyebrow passbook-eyebrow-dark">Trust</p>
            <h2 className="mt-5 max-w-[18ch] text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.06] font-bold tracking-[-0.035em]">
              Interest-free by design. Transparent by default.
            </h2>
            <p className="mt-4 max-w-[32em] text-lg text-white/72">
              Halaalvest doesn’t calculate interest on financing. Cooperatives
              can set separate charges, and members see the total payable before
              they accept.
            </p>
          </div>
          <div className="grid self-start border-t border-white/16 sm:grid-cols-2">
            {trustPoints.map((point) => (
              <article
                className="border-b border-white/16 py-5 sm:odd:border-r sm:odd:pr-6 sm:even:pl-6"
                key={point.title}
              >
                <h3 className="text-[17px] font-bold">{point.title}</h3>
                <p className="mt-2 text-[15px] text-white/66">{point.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="scroll-mt-20 border-b border-[#DCE1DB] py-18 sm:py-26"
        id={signup.sectionId}
      >
        <div className="mx-auto grid w-full max-w-[75rem] gap-10 px-4 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="passbook-eyebrow">{signup.eyebrow}</p>
            <h2 className="mt-5 max-w-[16ch] text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.06] font-bold tracking-[-0.035em]">
              {signup.title}
            </h2>
            <p className="mt-4 max-w-[30em] text-lg text-[#33475B]">
              {signup.lede}
            </p>
            {signupMode === "direct" ? (
              <ol className="mt-8 border-t border-[#DCE1DB]">
                {signupSteps.map((step, index) => (
                  <li
                    className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-b border-[#DCE1DB] py-4"
                    key={step.title}
                  >
                    <span className="passbook-mono pt-0.5 text-[13px] text-[#165C2D]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <span className="block font-semibold">{step.title}</span>
                      <span className="mt-1 block text-[15px] text-[#5E6E7C]">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            <p className="mt-6 flex items-center gap-2 text-[15px] text-[#33475B]">
              <CheckIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-[#1F7A3D]"
              />
              No member funds move through sign-up.
            </p>
          </div>

          <div className="marketing-form min-w-0">
            {signupMode === "direct" ? (
              <SignupForm
                quickFill={quickFill}
                workspaceUrlSuffix={workspaceUrlSuffix}
              />
            ) : (
              <EarlyAccessForm quickFill={quickFill} />
            )}
          </div>
        </div>
      </section>

      <section className="scroll-mt-20 py-18 sm:py-26" id="pricing">
        <div className="mx-auto w-full max-w-[75rem] px-4 sm:px-6">
          <SectionHeading
            eyebrow="Pricing"
            lede="Every fee is listed before you sign up."
            title="Simple pricing. No cut of member funds."
          />
          <dl className="mt-10 overflow-hidden rounded-2xl border border-[#DCE1DB] bg-white lg:mt-12">
            {publicPriceList.map((price) => (
              <FeeRow key={price.item} {...price} />
            ))}
          </dl>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-[46em] text-sm text-[#5E6E7C]">
              Ask your cooperative about the mobile access charge.{" "}
              {pricingFeePrinciples.slice(1).join(" ")}{" "}
              <Link
                className="underline underline-offset-4 hover:text-[#0B1F36]"
                href="/billing-policy"
              >
                Read the billing policy
              </Link>
            </p>
            <Link
              className={buttonVariants({
                className: primaryButtonClass,
                size: "lg",
              })}
              href={signupHref}
            >
              {signup.cta}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#DCE1DB] bg-white py-10">
        <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <HalaalvestLogo
              className="gap-2"
              markClassName="size-8"
              wordmarkClassName="text-base"
            />
            <p className="mt-3 max-w-[32em] text-sm text-[#5E6E7C]">
              Operating software for cooperatives. Halaalvest is not a lender,
              bank or custodian of member funds.
            </p>
          </div>
          <nav
            aria-label="Legal and support"
            className="flex flex-wrap gap-x-6 text-sm text-[#33475B]"
          >
            {footerLinks.map(([href, label]) => (
              <Link
                className="inline-flex min-h-11 items-center hover:text-[#0B1F36] hover:underline"
                href={href}
                key={href}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  )
}

function PassbookHeader({
  cta,
  signupHref,
}: {
  cta: string
  signupHref: string
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#DCE1DB] bg-[#F6F7F4]/92 backdrop-blur-md">
      <div className="mx-auto flex h-17 w-full max-w-[75rem] items-center justify-between gap-6 px-4 sm:px-6">
        <Link aria-label="Halaalvest home" href="/">
          <HalaalvestLogo
            className="gap-2"
            markClassName="size-8"
            wordmarkClassName="text-base"
          />
        </Link>
        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 text-[15px] text-[#33475B] md:flex"
        >
          <Link className="hover:text-[#0B1F36]" href="#product">
            Product
          </Link>
          <Link className="hover:text-[#0B1F36]" href="#trust">
            Trust
          </Link>
          <Link className="hover:text-[#0B1F36]" href={signupHref}>
            {cta}
          </Link>
          <Link className="hover:text-[#0B1F36]" href="#pricing">
            Pricing
          </Link>
        </nav>
        <Link
          className={buttonVariants({
            className:
              "h-10 rounded-[10px] !bg-[#1F7A3D] px-4 text-[15px] font-semibold !text-white shadow-none hover:!bg-[#165C2D]",
          })}
          href={signupHref}
        >
          {cta}
        </Link>
      </div>
    </header>
  )
}

function PassbookStatement() {
  return (
    <figure
      aria-label="Sample member statement for October 2026"
      className="m-0 overflow-hidden rounded-2xl border border-[#DCE1DB] bg-white shadow-[0_1px_0_rgb(11_31_54/4%),0_24px_48px_-28px_rgb(11_31_54/28%)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[#DCE1DB] bg-linear-to-b from-[#FBFCFA] to-white px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <p className="text-[15px] font-bold tracking-[-0.01em]">
            Unity Staff Cooperative Society
          </p>
          <p className="mt-0.5 text-sm text-[#5E6E7C]">
            Chidinma Okafor · UNI-0418
          </p>
          <p className="passbook-mono mt-1.5 text-[12.5px] text-[#33475B]">
            October 2026 · payroll deduction
          </p>
        </div>
        <span aria-hidden="true" className="passbook-stamp passbook-mono">
          Posted
        </span>
      </div>

      <div
        aria-hidden="true"
        className="passbook-mono grid grid-cols-[3.25rem_minmax(0,1fr)_auto] gap-3 border-b border-[#DCE1DB] px-4 py-2.5 text-[11px] tracking-[0.06em] text-[#5E6E7C] uppercase sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:px-5"
      >
        <span>Date</span>
        <span>Entry</span>
        <span className="text-right">Amount ₦</span>
      </div>

      <div>
        {statementLines.map((line, index) => {
          const book = statementBooks[line.book]

          return (
            <details
              className="passbook-line border-b border-dashed border-[#DCE1DB]"
              key={`${line.date}-${line.entry}-${line.book}`}
              name="passbook-statement-line"
              style={{ "--line-index": index } as CSSProperties}
            >
              <summary className="grid cursor-pointer grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-[#FAFBF9] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#1F7A3D] sm:grid-cols-[4rem_minmax(0,1fr)_auto] sm:px-5">
                <span className="passbook-mono text-[13px] text-[#5E6E7C]">
                  {line.date}
                </span>
                <span className="flex min-w-0 flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                  <span
                    className={`passbook-mono shrink-0 rounded border border-current px-1.5 py-1 text-[10.5px] leading-none tracking-[0.04em] uppercase ${book.className}`}
                  >
                    {book.label}
                  </span>
                  <span className="text-[15px] font-medium">{line.entry}</span>
                </span>
                <span className="passbook-mono text-right text-[15px]">
                  {line.amount}
                </span>
              </summary>
              <p className="m-0 px-4 pb-3.5 pl-[4.75rem] text-[13.5px] leading-normal text-[#33475B] sm:px-5 sm:pl-[6rem]">
                <strong className="font-semibold text-[#0B1F36]">
                  Source:
                </strong>{" "}
                {line.source}
              </p>
            </details>
          )
        })}
      </div>

      <dl className="grid grid-cols-2 sm:grid-cols-4">
        {statementTotals.map((total) => (
          <div
            className={`border-[#DCE1DB] px-4 py-3.5 max-sm:odd:border-r sm:border-r sm:last:border-r-0 max-sm:[&:nth-child(-n+2)]:border-b ${
              total.highlight ? "bg-[#E4EFE6]" : ""
            }`}
            key={total.label}
          >
            <dt className="passbook-mono text-[11px] tracking-[0.04em] text-[#5E6E7C] uppercase">
              {total.label}
            </dt>
            <dd
              className={`passbook-mono mt-1.5 text-base font-semibold ${
                total.highlight ? "text-[#165C2D]" : ""
              }`}
            >
              {total.value}
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="border-t border-[#DCE1DB] bg-[#FBFCFA] px-4 py-2.5 text-[12.5px] text-[#5E6E7C] sm:px-5">
        Sample statement. Select any line to see where it came from.
      </figcaption>
    </figure>
  )
}

function SectionHeading({
  eyebrow,
  lede,
  title,
}: {
  eyebrow: string
  lede: string
  title: string
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
      <p className="passbook-eyebrow self-start lg:mt-3">{eyebrow}</p>
      <div>
        <h2 className="max-w-[18ch] text-[clamp(2rem,3.6vw,2.9rem)] leading-[1.06] font-bold tracking-[-0.035em]">
          {title}
        </h2>
        <p className="mt-4 max-w-[32em] text-lg text-[#33475B]">{lede}</p>
      </div>
    </div>
  )
}

function FeeRow({ detail, highlight = false, item, note, price }: PublicPrice) {
  return (
    <div className="grid gap-2 border-b border-dashed border-[#DCE1DB] px-5 py-5 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6 sm:px-7 sm:py-6">
      <dt>
        <span className="block text-lg font-bold tracking-[-0.02em]">
          {item}
        </span>
        <span className="mt-1 block text-[15px] text-[#5E6E7C]">{detail}</span>
      </dt>
      <dd
        className={`passbook-mono m-0 text-xl font-semibold sm:text-right sm:text-[22px] ${
          highlight ? "text-[#165C2D]" : ""
        }`}
      >
        {price}
        {note ? (
          <span className="passbook-sans mt-1.5 block text-[13px] font-normal text-[#5E6E7C] normal-nums">
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  )
}
