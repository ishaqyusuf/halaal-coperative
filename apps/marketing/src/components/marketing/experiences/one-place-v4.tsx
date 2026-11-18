import { Inter, Inter_Tight } from "next/font/google"
import type { QaQuickFillContext } from "@halaalvest/utils"
import Link from "next/link"
import type { ReactNode } from "react"
import { EarlyAccessForm } from "../early-access-form"
import {
  monthlyBillTerms,
  pricingFeePrinciples,
  publicPriceList,
  publicPricingSummary,
} from "../pricing-data"
import {
  OnePlaceBrand,
  OnePlaceHeader,
  type OnePlaceNavLink,
} from "./one-place-v4-header"
import { OnePlaceStatement } from "./one-place-v4-statement"
import {
  sampleBatchOfficer,
  sampleGuarantors,
  sampleMemberName,
} from "./one-place-v4-statement-data"

const onePlaceSans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-op4-sans",
  fallback: ["system-ui", "Arial"],
})

const onePlaceDisplay = Inter_Tight({
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  variable: "--font-op4-display",
  fallback: ["system-ui", "Arial"],
})

export type OnePlaceSignupMode = "direct" | "early-access"

export type OnePlaceLandingProps = {
  isLaunchReady: boolean
  quickFill: QaQuickFillContext
  signupHref: string
  signupMode: OnePlaceSignupMode
}

const signupCopy = {
  direct: {
    cta: "Create your workspace",
    headerCta: "Sign up",
  },
  "early-access": {
    cta: "Request access",
    headerCta: "Request access",
  },
} satisfies Record<OnePlaceSignupMode, { cta: string; headerCta: string }>

const navLinks: readonly OnePlaceNavLink[] = [
  ["#product", "Product"],
  ["#how-it-works", "How it works"],
  ["#pricing", "Pricing"],
]

const heroPoints = [
  "One monthly bill, priced per active member",
  "Financing with no interest, and charges on their own line",
  "We never take a percentage of member funds",
]

const memberAbilities = [
  "Download a statement at any time",
  "Request financing from their own account",
  "Approve or decline guarantor requests",
  "Keep every receipt in one place",
]

const compareRows = [
  {
    job: "Payroll day",
    now: "Upload the file. Matched lines post together, and the rest wait for review.",
    was: "Someone retypes the deduction list into a spreadsheet and checks the totals by hand.",
  },
  {
    job: "A member asks for their balance",
    now: "The member opens their own statement and sees where each line came from.",
    was: "The treasurer searches the spreadsheet and replies by message.",
  },
  {
    job: "A financing request",
    now: "Guarantors answer in their own accounts, and the committee approves with the checks in view.",
    was: "A paper form goes round the office for signatures.",
  },
  {
    job: "A wrong entry",
    now: "A reversal posts with a note, and the original stays on the record.",
    was: "Someone overwrites the cell, and yesterday's figure is gone.",
  },
]

// Kept in step with the One Path sign-up journey (steps 1–2, 3–4, 5–9, 10–11).
const setupSteps = [
  {
    body: "Enter your cooperative's name, member code letters and web address. We email you a secure link.",
    title: "Sign up and verify your email",
  },
  {
    body: "Add your office location, start date and password. You're signed in straight away.",
    title: "Add your cooperative's details",
  },
  {
    body: "Choose where your records start, then add your services, shares, charges and profit sharing.",
    title: "Set up how you run",
  },
  {
    body: "Add each member's balances or history, then go live. Members sign in on the web.",
    title: "Bring your members across",
  },
]

const controlIcons = {
  approvals: (
    <>
      <path d="M9 11.5 11 13.5 15.5 9" />
      <path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" />
    </>
  ),
  activity: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M9 12h7M9 16h7M9 8h3" />
    </>
  ),
  corrections: (
    <>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  interestFree: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 16 16 8" />
    </>
  ),
  noShare: (
    <>
      <path d="M4 7h16v12H4z" />
      <path d="M4 11h16M8 15h3" />
    </>
  ),
  privateWorkspace: (
    <>
      <rect height="10" rx="2" width="14" x="5" y="10.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </>
  ),
} satisfies Record<string, ReactNode>

const trustControls: {
  body: string
  icon: keyof typeof controlIcons
  title: string
}[] = [
  {
    body: "Financing, guarantor answers and other sensitive actions wait for the roles your cooperative sets.",
    icon: "approvals",
    title: "Approvals by the right people",
  },
  {
    body: "See who acted, who authorised it, when it happened and what changed.",
    icon: "activity",
    title: "A full activity report",
  },
  {
    body: "A reversal posts with a note, and the original entry stays on the record.",
    icon: "corrections",
    title: "Corrections keep the original",
  },
  {
    body: "No interest is calculated. Cooperative charges are set as their own rules and shown on separate lines.",
    icon: "interestFree",
    title: "Interest-free financing",
  },
  {
    body: "Halaalvest takes no percentage of savings, financing, repayments, dividends or profits.",
    icon: "noShare",
    title: "No share of member funds",
  },
  {
    body: "Each cooperative's members, records and reports stay inside its own workspace.",
    icon: "privateWorkspace",
    title: "A private workspace",
  },
]

const faqs: { answer: string[]; question: string }[] = [
  {
    answer: [
      publicPricingSummary,
      "Halaalvest sends your cooperative one bill a month, and your cooperative chooses whether it pays the seat fee or charges members. Provider costs such as SMS, KYC and payment gateways are passed through. Setup and migration help are quoted separately.",
    ],
    question: "What does Halaalvest cost?",
  },
  {
    answer: [
      "No. Halaalvest is operating software. It is not a lender, bank or custodian. Your cooperative keeps its own accounts and approves its own financing, and Halaalvest records what your officers do.",
    ],
    question: "Does Halaalvest hold our cooperative's money?",
  },
  {
    answer: [
      "Halaalvest does not calculate interest on financing. Any cooperative charge is set up as its own rule and shown on a separate line, and members see the total payable before they accept.",
    ],
    question: "How is financing kept interest-free?",
  },
  {
    answer: [
      "Yes. Add each member's balances or full history. Where full history is hard to rebuild, you can use reviewed opening balances with their source documents.",
    ],
    question: "Can we bring our existing records?",
  },
  {
    answer: [
      "Members request access from their cooperative. The cooperative reviews each request and shares the charge first. Halaalvest bills the cooperative directly.",
    ],
    question: "How do members get the mobile app?",
  },
]

const footerColumns: {
  links: readonly (readonly [href: string, label: string])[]
  title: string
}[] = [
  {
    links: [
      ["#product", "Features"],
      ["#how-it-works", "How it works"],
      ["/pricing", "Pricing"],
    ],
    title: "Product",
  },
  {
    links: [
      ["/support", "Help centre"],
      ["/contact", "Contact support"],
      ["/delete-account", "Close my account"],
    ],
    title: "Support",
  },
  {
    links: [
      ["/terms", "Terms"],
      ["/privacy", "Privacy"],
      ["/billing-policy", "Billing policy"],
      ["/cooperative-disclosures", "Cooperative disclosures"],
    ],
    title: "Legal",
  },
]

export function OnePlaceV4Landing({
  isLaunchReady,
  quickFill,
  signupHref,
  signupMode,
}: OnePlaceLandingProps) {
  const signup = signupCopy[signupMode]

  return (
    <div className={`op4 ${onePlaceSans.variable} ${onePlaceDisplay.variable}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>

      <OnePlaceHeader
        ctaLabel={signup.headerCta}
        navLinks={navLinks}
        signupHref={signupHref}
      />

      <main id="main">
        <section aria-labelledby="op4-hero-title" className="hero">
          <div className="wrap hero-grid">
            <div>
              <h1 id="op4-hero-title">Run your cooperative in one place</h1>
              <p className="lead">
                Collect contributions, approve interest-free financing, track
                repayments and give every member their own statement.
              </p>
              <div className="actions">
                <CtaLink href={signupHref}>{signup.cta}</CtaLink>
              </div>
              <ul className="points">
                {heroPoints.map((point) => (
                  <li key={point}>
                    <span aria-hidden="true" className="dot">
                      <CheckIcon strokeWidth="2.4" />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel-wrap" id="product">
              <OnePlaceStatement />
            </div>
          </div>
        </section>

        <section aria-labelledby="op4-work-title" className="section">
          <div className="wrap">
            <div className="head">
              <h2 id="op4-work-title">
                Post payroll, approve financing and fix mistakes in one
                workspace
              </h2>
              <p>
                Your admins and finance officers do the month&apos;s work in
                Halaalvest. Each step records who did it and when.
              </p>
            </div>
          </div>
          <div className="wrap tiles">
            <PayrollTile />
            <FinancingTile />
            <CorrectionsTile />
          </div>
        </section>

        <section aria-labelledby="op4-members-title" className="section soft">
          <div className="wrap members">
            <div>
              <div className="head">
                <h2 id="op4-members-title">
                  Give every member a statement they can check
                </h2>
                <p>
                  Members sign in to see their own savings, financing and
                  charges. Every line names the payroll batch or approval behind
                  it.
                </p>
              </div>
              <ul className="tick-list">
                {memberAbilities.map((ability) => (
                  <Tick key={ability}>{ability}</Tick>
                ))}
              </ul>
              <p className="note">
                <b>Mobile access is optional.</b> Members who want the app
                request it from their cooperative, which reviews the request and
                shares the charge first.
              </p>
            </div>
            <MemberPhone />
          </div>
        </section>

        <section aria-labelledby="op4-compare-title" className="section">
          <div className="wrap">
            <div className="head">
              <h2 id="op4-compare-title">
                What changes when your books move here
              </h2>
              <p>
                The work your officers do stays the same. Halaalvest records it
                once, with a name and a date.
              </p>
            </div>
            <div
              aria-label="Before and with Halaalvest"
              className="compare"
              role="table"
            >
              <div className="compare-row head-row" role="row">
                <span role="columnheader">The job</span>
                <span role="columnheader">Before</span>
                <span role="columnheader">With Halaalvest</span>
              </div>
              {compareRows.map((row) => (
                <div className="compare-row" key={row.job} role="row">
                  <h3 role="rowheader">{row.job}</h3>
                  <p className="was" role="cell">
                    <span className="lbl">Before</span>
                    {row.was}
                  </p>
                  <p className="now" role="cell">
                    <TickIcon />
                    <span>
                      <span className="lbl">With Halaalvest</span>
                      {row.now}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="op4-how-title"
          className="section soft"
          id="how-it-works"
        >
          <div className="wrap">
            <div className="head">
              <h2 id="op4-how-title">Up and running in four steps</h2>
              <p>
                An admin can set up the workspace in one sitting. Bring long
                histories across in full, or as reviewed opening balances with
                their source documents.
              </p>
            </div>
            <ol className="steps">
              {setupSteps.map((step) => (
                <li key={step.title}>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
            <div className="after-steps">
              <p>
                Are you a member? Your cooperative&apos;s admin sets up the
                workspace and adds you.
              </p>
              <CtaLink href={signupHref}>{signup.cta}</CtaLink>
            </div>
          </div>
        </section>

        <section aria-labelledby="op4-trust-title" className="section trust">
          <div className="wrap">
            <div className="head">
              <h2 id="op4-trust-title">
                Halaalvest runs the software. Your cooperative keeps the money.
              </h2>
              <p>
                Halaalvest is not a lender, bank or custodian of member funds.
                Your officers make every decision, and each one is recorded.
              </p>
            </div>
            <ul className="controls">
              {trustControls.map((control) => (
                <li key={control.title}>
                  <span aria-hidden="true" className="ic">
                    <svg
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      {controlIcons[control.icon]}
                    </svg>
                  </span>
                  <h3>{control.title}</h3>
                  <p>{control.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="op4-pricing-title"
          className="section"
          id="pricing"
        >
          <div className="wrap">
            <div className="head">
              <h2 id="op4-pricing-title">
                One monthly bill, and never a share of member funds
              </h2>
              <p>Every fee is listed here before you sign up.</p>
            </div>
            <dl className="prices">
              {publicPriceList.map((price) => (
                <div key={price.item}>
                  <dt>
                    <b>{price.item}</b>
                    <span>{price.detail}</span>
                  </dt>
                  <dd className={priceClassName(price)}>
                    {price.price}
                    {price.note ? <small>{price.note}</small> : null}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="price-notes">
              <div>
                <h3>How billing works</h3>
                <ul>
                  {monthlyBillTerms.map((term) => (
                    <PriceNote key={term}>{term}</PriceNote>
                  ))}
                </ul>
              </div>
              <div>
                <h3>Other costs</h3>
                <ul>
                  {/* The first principle (no share of member funds) is the
                      last price row above. */}
                  {pricingFeePrinciples.slice(1).map((principle) => (
                    <PriceNote key={principle}>{principle}</PriceNote>
                  ))}
                </ul>
                <Link href="/billing-policy">Read the billing policy</Link>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="op4-faq-title" className="section soft">
          <div className="wrap">
            <div className="head center">
              <h2 id="op4-faq-title">Questions cooperatives ask</h2>
            </div>
            <div className="faq">
              {faqs.map((faq) => (
                <details key={faq.question}>
                  <summary>
                    {faq.question}
                    <span aria-hidden="true" className="pm">
                      <svg
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="2.2"
                        viewBox="0 0 16 16"
                      >
                        <path d="M8 2v12M2 8h12" />
                      </svg>
                    </span>
                  </summary>
                  <div className="answer">
                    {faq.answer.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {signupMode === "early-access" ? (
          <section
            aria-labelledby="op4-final-title"
            className="final"
            id="early-access"
          >
            <div className="wrap">
              <div className="final-box request">
                <div>
                  <span className="chip">
                    {isLaunchReady
                      ? "Now onboarding selected cooperatives"
                      : "Private launch for cooperative teams"}
                  </span>
                  <h2 id="op4-final-title">Request a cooperative workspace</h2>
                  <p>
                    Sign-up is by approval while early access is on. Send a
                    request and we&apos;ll email the admin a private sign-up
                    link.
                  </p>
                  <ul className="tick-list">
                    <Tick>No member funds move through sign-up.</Tick>
                    <Tick>The web workspace stays free.</Tick>
                  </ul>
                </div>
                <div className="marketing-form">
                  <EarlyAccessForm quickFill={quickFill} />
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section aria-labelledby="op4-final-title" className="final">
            <div className="wrap">
              <div className="final-box">
                <h2 id="op4-final-title">
                  Run next month&apos;s books on Halaalvest
                </h2>
                <p>
                  Create your workspace in a few minutes. Sign-up moves no
                  money, and the web workspace stays free.
                </p>
                <CtaLink href={signupHref}>{signup.cta}</CtaLink>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-top">
            <div className="footer-about">
              <OnePlaceBrand />
              <p>
                Operating software for cooperatives: contributions,
                interest-free financing, repayments and member statements.
              </p>
            </div>
            {footerColumns.map((column) => (
              <nav aria-label={column.title} key={column.title}>
                <h3>{column.title}</h3>
                <ul>
                  {column.links.map(([href, label]) => (
                    <li key={label}>
                      {href.startsWith("#") ? (
                        <a href={href}>{label}</a>
                      ) : (
                        <Link href={href}>{label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="footer-bottom">
            <p>
              Halaalvest is not a lender, bank or custodian of member funds.
              Unity Staff Cooperative Society and every name and figure on this
              page are samples.
            </p>
            <p>© {new Date().getFullYear()} Halaalvest</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function priceClassName(price: (typeof publicPriceList)[number]) {
  const classes = [
    // Long labels use the smaller size.
    price.price.length > 12 ? "mid" : "",
    price.highlight ? "g" : "",
  ].filter(Boolean)

  return classes.length > 0 ? classes.join(" ") : undefined
}

function CtaLink({ children, href }: { children: ReactNode; href: string }) {
  return (
    <a className="btn btn-go" href={href}>
      {children}
      <svg
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.2"
        viewBox="0 0 20 20"
      >
        <path d="M4 10h11M11 5l5 5-5 5" />
      </svg>
    </a>
  )
}

function CheckIcon({ strokeWidth = "2.2" }: { strokeWidth?: string }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 20 20"
    >
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  )
}

function TickIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.2"
      viewBox="0 0 22 22"
    >
      <path d="m5 11.5 4 4 8-9" />
    </svg>
  )
}

function Tick({ children }: { children: ReactNode }) {
  return (
    <li className="tick">
      <TickIcon />
      {children}
    </li>
  )
}

function PriceNote({ children }: { children: ReactNode }) {
  return (
    <li>
      <CheckIcon />
      {children}
    </li>
  )
}

function StepCheck() {
  return (
    <span className="st">
      <svg
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.4"
        viewBox="0 0 16 16"
      >
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    </span>
  )
}

function PayrollTile() {
  return (
    <article aria-labelledby="op4-t1" className="tile mint">
      <div className="tile-text">
        <h2 id="op4-t1">See every deduction matched before it posts</h2>
        <p>
          Upload your employer&apos;s deduction file. Each line is matched to a
          member and what they owe, and split into savings and repayments.
          Matched lines post in one batch.
        </p>
        <ul className="tick-list">
          <Tick>Lines that don&apos;t match wait for your review.</Tick>
        </ul>
      </div>
      <div
        aria-label={`Sample payroll batch PD-2610 for October: 412 of 431 lines matched and 19 held for review. ${sampleMemberName}'s ₦55,000 deduction is split into ₦25,000 savings and ₦30,000 repayment on FN-0192.`}
        className="card num"
        role="img"
      >
        <div aria-hidden="true">
          <div className="card-head">
            <div>
              <b>
                October payroll · <span className="nw">PD-2610</span>
              </b>
              <span className="s">Ministry payroll file · 431 lines</span>
            </div>
            <span className="chip chip-green">Posted 25 Oct</span>
          </div>
          <div className="bar">
            <i />
          </div>
          <div className="legend">
            <span>
              <i />
              <b>412</b> matched and posted
            </span>
            <span>
              <i className="h" />
              <b>19</b> held for review
            </span>
          </div>
          <div className="split">
            <h3>{sampleMemberName} · UNI-0418</h3>
            <dl>
              <div>
                <dt>Savings contribution</dt>
                <dd>₦25,000</dd>
              </div>
              <div>
                <dt>Repayment, FN-0192</dt>
                <dd>₦30,000</dd>
              </div>
              <div className="tot">
                <dt>Deducted from salary</dt>
                <dd>₦55,000</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </article>
  )
}

function FinancingTile() {
  return (
    <article aria-labelledby="op4-t2" className="tile soft flip">
      <div className="tile-text">
        <h2 id="op4-t2">Approve financing without charging interest</h2>
        <p>
          Members request financing from their account. Guarantors answer in
          their own accounts, and the committee sees savings, pool funds and
          every approval before deciding.
        </p>
        <ul className="tick-list">
          <Tick>Members see the total payable before they accept.</Tick>
        </ul>
      </div>
      <div
        aria-label={`Sample financing request FN-0192: ₦540,000 over 18 months, ₦30,000 a month, interest ₦0. Guarantors ${sampleGuarantors.join(" and ")} approved; committee approved two of two on 12 July 2026.`}
        className="card num"
        role="img"
      >
        <div aria-hidden="true">
          <div className="card-head">
            <div>
              <b>
                Financing request <span className="nw">FN-0192</span>
              </b>
              <span className="s">{sampleMemberName} · 18 months</span>
            </div>
            <span className="chip chip-green">Approved</span>
          </div>
          <dl className="totals">
            <div>
              <dt>Total payable</dt>
              <dd>₦540,000</dd>
            </div>
            <div>
              <dt>Monthly</dt>
              <dd>₦30,000</dd>
            </div>
            <div>
              <dt>Interest</dt>
              <dd className="g">₦0.00</dd>
            </div>
          </dl>
          <ol className="steps-v">
            <li>
              <StepCheck />
              <div>
                <b>Savings and pool funds checked</b>
                <small>Eligible against savings</small>
              </div>
              <em>3 Jul</em>
            </li>
            <li>
              <StepCheck />
              <div>
                <b>Guarantors approved</b>
                <small>{sampleGuarantors.join(", ")}</small>
              </div>
              <em>6 Jul</em>
            </li>
            <li>
              <StepCheck />
              <div>
                <b>Committee approved</b>
                <small>2 of 2 approvals</small>
              </div>
              <em>12 Jul</em>
            </li>
          </ol>
        </div>
      </div>
    </article>
  )
}

function CorrectionsTile() {
  return (
    <article aria-labelledby="op4-t3" className="tile navy">
      <div className="tile-text">
        <h2 id="op4-t3">Never overwrite a posted entry again</h2>
        <p>
          A wrong entry is reversed with a note by an officer with correction
          rights. The original stays on the record, and the activity report
          shows who did what.
        </p>
        <ul className="tick-list">
          <Tick>Every approval and correction has a name and a date.</Tick>
        </ul>
      </div>
      <div
        aria-label={`Sample entries: receipt RC-2231 for ₦25,000 posted 20 October, then reversed on 21 October by ${sampleBatchOfficer} with the note 'Entered twice'. The original entry is kept.`}
        className="card num"
        role="img"
      >
        <div aria-hidden="true">
          <div className="card-head">
            <div>
              <b>Receipts · Hauwa Garba</b>
              <span className="s">Unity Staff Cooperative · sample</span>
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <div className="entry">
              <b>Receipt RC-2231</b>
              <span className="amt">₦25,000</span>
              <small>Cash contribution · posted 20 Oct</small>
            </div>
            <div className="entry">
              <b>Receipt RC-2232</b>
              <span className="amt">₦25,000</span>
              <small>Same payment, entered twice · posted 20 Oct</small>
            </div>
            <div className="entry rev">
              <b>Reversal of RC-2232</b>
              <span className="amt">−₦25,000</span>
              <small>
                21 Oct · {sampleBatchOfficer} · Note: “Entered twice”
              </small>
              <span className="c">
                <span className="chip chip-green">Original entry kept</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

const chevron = (
  <svg
    className="chev"
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeWidth="2"
    viewBox="0 0 16 16"
  >
    <path d="m6 3 5 5-5 5" />
  </svg>
)

function PhoneRow({
  children,
  icon,
  trailing = chevron,
}: {
  children: ReactNode
  icon: ReactNode
  trailing?: ReactNode
}) {
  return (
    <span>
      <span className="ic">
        <svg
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 20 20"
        >
          {icon}
        </svg>
      </span>
      <span>{children}</span>
      {trailing}
    </span>
  )
}

function MemberPhone() {
  return (
    <div className="phone-field">
      <div
        aria-label={`Sample member home screen for ${sampleMemberName}: savings ₦437,000, with links to download a statement, request financing, one guarantor request waiting, and receipts.`}
        className="phone"
        role="img"
      >
        <div aria-hidden="true" className="screen">
          <div className="scr-top num">
            <div className="scr-status">
              <span>9:41</span>
              <span>My account</span>
            </div>
            <small>Unity Staff Cooperative · sample</small>
            <b>{sampleMemberName}</b>
            <strong>₦437,000.00</strong>
            <small>Savings balance</small>
          </div>
          <div className="scr-list">
            <PhoneRow icon={<path d="M10 3v10M6 9l4 4 4-4M4 16h12" />}>
              <b>Download statement</b>
              <small>October 2026</small>
            </PhoneRow>
            <PhoneRow icon={<path d="M4 16V9M8 16V6M12 16v-4M16 16V4" />}>
              <b>My financing</b>
              <small>FN-0192 · ₦450,000 left</small>
            </PhoneRow>
            <PhoneRow
              icon={
                <>
                  <circle cx="8" cy="7" r="3" />
                  <path d="M3 16c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5M14 8l1.5 1.5L18 7" />
                </>
              }
              trailing={<span className="badge">1</span>}
            >
              <b>Guarantor requests</b>
              <small>{sampleGuarantors[1]} is waiting</small>
            </PhoneRow>
            <PhoneRow
              icon={
                <>
                  <path d="M5 3h10v14l-2.5-1.5L10 17l-2.5-1.5L5 17z" />
                  <path d="M8 7h4M8 10h4" />
                </>
              }
            >
              <b>Receipts</b>
              <small>12 this year</small>
            </PhoneRow>
          </div>
        </div>
      </div>
    </div>
  )
}
