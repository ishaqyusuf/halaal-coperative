import Link from "next/link"
import type { ReactNode } from "react"
import { pricingFeePrinciples } from "../pricing-data"
import { HomepageAssistant } from "./homepage-assistant"
import { HomepageBill } from "./homepage-bill"
import {
  assistantFreeMessages,
  assistantMessageLabel,
  homepageFaqs,
  homepageFooterColumns,
  homepageNavLinks,
  mobileAccessLabel,
  mobileAccessMonths,
  samplePayroll,
  seatFeeLabel,
  setupSteps,
  trustControls,
} from "./homepage-data"
import { homepageFontVariables } from "./homepage-fonts"
import { HomepageGuarantor } from "./homepage-guarantor"
import { HomepageHeader } from "./homepage-header"
import { HomepageHero } from "./homepage-hero"
import { HomepageMark } from "./homepage-mark"
import { HomepageTabs } from "./homepage-tabs"

export type HomepageProps = {
  /** /signup, or the local dev sign-up URL. */
  signupHref: string
}

function Arrow() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 16 16">
      <path d="M3 8h9.5M8.5 4l4 4-4 4" />
    </svg>
  )
}

function Tick({ size = 20 }: { size?: 16 | 20 }) {
  return size === 16 ? (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 16 16">
      <path d="m3 8.5 3 3 7-7.5" />
    </svg>
  ) : (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 20 20">
      <path d="m4.5 10.5 3.5 3.5 7.5-8" />
    </svg>
  )
}

function SmallTick() {
  return (
    <span className="tick">
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.4" viewBox="0 0 16 16">
        <path d="m3.5 8.5 3 3 6-7" />
      </svg>
    </span>
  )
}

function Plus() {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 16 16">
      <path d="M8 2.5v11M2.5 8h11" />
    </svg>
  )
}

function SectionHead({ id, lede, title }: { id: string; lede: ReactNode; title: ReactNode }) {
  return (
    <div className="sec-head">
      <h2 className="h2" id={id}>
        {title}
      </h2>
      <p className="lede">{lede}</p>
    </div>
  )
}

const officerJobs = [
  {
    body: "Upload the employer's deduction file. Matched lines post together, and each line that doesn't match waits with its reason.",
    id: "job-payroll",
    title: "Payroll day",
    view: (
      <div className="frame">
        <div className="frame-head">
          <div>
            <h4>Held for review</h4>
            <p>
              October payroll · {samplePayroll.batch} · {samplePayroll.held} of{" "}
              {samplePayroll.lines} lines
            </p>
          </div>
          <span className="st st-held">{samplePayroll.held} held</span>
        </div>
        <div className="frame-body num">
          <ul className="rows">
            {[
              ["Ibrahim Yusuf", "UNI-0391", "Deducted 35,000, expected 45,000", "35,000"],
              ["Staff no. 70-11842", "Not on the member list", "No member match", "25,000"],
              ["Aisha Musa", "UNI-0205", "Same line appears twice in the file", "25,000"],
            ].map(([name, detail, why, amount]) => (
              <li key={name}>
                <div>
                  <b>{name}</b>
                  <small>{detail}</small>
                  <span className="why">{why}</span>
                </div>
                <span className="amt">{amount}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  },
  {
    body: "Members apply from their own account and guarantors answer in theirs. The committee decides with savings, pool funds and every approval in view, and no interest is calculated.",
    id: "job-financing",
    title: "A financing request",
    view: (
      <div className="frame">
        <div className="frame-head">
          <div>
            <h4>Financing request FN-0192</h4>
            <p>Amina Suleiman · UNI-0418 · 18 months</p>
          </div>
          <span className="st st-ok">Approved</span>
        </div>
        <div className="frame-body num">
          <dl className="facts">
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
            <div>
              <dt>Left to repay</dt>
              <dd>₦450,000</dd>
            </div>
          </dl>
          <ul className="rows approvals">
            {[
              ["Savings and pool funds checked", "Eligible against savings", "3 Jul"],
              ["Guarantors approved", "Maryam Lawal, Musa Bello", "6 Jul"],
              ["Committee approved", "2 of 2 approvals", "12 Jul"],
            ].map(([title, detail, date]) => (
              <li key={title}>
                <SmallTick />
                <div>
                  <b>{title}</b>
                  <small>{detail}</small>
                </div>
                <small>{date}</small>
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  },
  {
    body: "An officer with correction rights posts a reversal with a note. The original entry stays on the record.",
    id: "job-correction",
    title: "A wrong entry",
    view: (
      <div className="frame">
        <div className="frame-head">
          <div>
            <h4>Receipts · Hauwa Garba</h4>
            <p>UNI-0533 · cash contributions</p>
          </div>
        </div>
        <div className="frame-body num">
          <ul className="rows">
            <li>
              <div>
                <b>Receipt RC-2231</b>
                <small>Cash contribution · posted 20 Oct</small>
              </div>
              <span className="amt">25,000</span>
            </li>
            <li className="struck">
              <div>
                <b>Receipt RC-2232</b>
                <small>Same payment, entered twice · posted 20 Oct</small>
              </div>
              <span className="amt">25,000</span>
            </li>
            <li>
              <div>
                <b>Reversal of RC-2232</b>
                <small>21 Oct · Ali Danjuma · note: “Entered twice”</small>
                <span className="kept">Original entry kept on the record</span>
              </div>
              <span className="amt">−25,000</span>
            </li>
          </ul>
        </div>
      </div>
    ),
  },
] as const

export function Homepage({ signupHref }: HomepageProps) {
  return (
    <div className={`hp ${homepageFontVariables}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <HomepageHeader navLinks={homepageNavLinks} signupHref={signupHref} />

      <main id="main">
        <section aria-labelledby="hero-title" className="hero">
          <div className="wrap hero-top">
            <h1 id="hero-title">Start running your cooperative here</h1>
            <div className="hero-copy">
              <p className="lede">
                Post the payroll deduction file once. Halaalvest splits each
                line into savings and repayments, and every member sees it on
                their own statement.
              </p>
              <div className="hero-actions">
                <a className="btn btn-green btn-lg" href={signupHref}>
                  Create your workspace <Arrow />
                </a>
                <Link className="btn btn-quiet btn-lg" href="/login">
                  Member sign in
                </Link>
              </div>
              <ul className="hero-proof num">
                <li>
                  <Tick size={16} />
                  <span>
                    <b>{seatFeeLabel}</b> per active member a month
                  </span>
                </li>
                <li>
                  <Tick size={16} />
                  <span>Interest-free financing</span>
                </li>
                <li>
                  <Tick size={16} />
                  <span>No share of member funds</span>
                </li>
              </ul>
            </div>
          </div>
          <HomepageHero />
        </section>

        <section aria-labelledby="officers-title" className="section" id="officers">
          <div className="wrap">
            <SectionHead
              id="officers-title"
              lede="Payroll, financing and corrections each leave a record with a name and a date. Nobody retypes a figure that is already in the workspace."
              title="Officers do the month's work once"
            />
            <HomepageTabs
              ariaLabel="Officer jobs"
              className="jobs"
              listClassName="job-tabs"
              orientation="vertical"
              panelClassName="job-panel"
              panelsClassName="job-views"
              tabClassName="job-tab"
              tabs={officerJobs.map((job) => ({
                id: job.id,
                label: (
                  <>
                    <h3>{job.title}</h3>
                    <p>{job.body}</p>
                  </>
                ),
                panel: (
                  <>
                    <div className="inline-h">
                      <h3>{job.title}</h3>
                      <p>{job.body}</p>
                    </div>
                    {job.view}
                  </>
                ),
              }))}
            />
          </div>
        </section>

        <section aria-labelledby="members-title" className="section members" id="members">
          <div className="wrap members-grid">
            <div>
              <h2 className="h2" id="members-title">
                Every member can check their own account
              </h2>
              <p className="lede">
                Members sign in to see savings, financing and charges on
                separate lines. Each line names the payroll batch or approval
                behind it, so fewer questions reach your officers.
              </p>
              <ul className="m-list">
                {[
                  "Download a statement at any time",
                  "Request financing from their own account",
                  "Approve or decline when someone asks them to be a guarantor",
                  "Keep every receipt in one place",
                ].map((item) => (
                  <li key={item}>
                    <Tick />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="m-note">
                <b>The mobile app is optional.</b> A member requests it, the
                cooperative approves it, and it costs {mobileAccessLabel} for{" "}
                {mobileAccessMonths} months. The web is included in the seat fee.
              </p>
            </div>
            <div className="m-stage">
              <HomepageGuarantor mobileAccessLabel={mobileAccessLabel} />
            </div>
          </div>
        </section>

        <section aria-labelledby="how-title" className="section" id="how-it-works">
          <div className="wrap">
            <SectionHead
              id="how-title"
              lede="An admin can set up the workspace in one sitting. Bring long histories across in full, or as reviewed opening balances with their source documents."
              title="Get your cooperative running in four steps"
            />
            <HomepageTabs
              ariaLabel="Steps for"
              listClassName="aud"
              orientation="horizontal"
              tabs={(
                [
                  ["steps-coop", "I run a cooperative", setupSteps.cooperative],
                  ["steps-member", "I'm a member", setupSteps.member],
                ] as const
              ).map(([id, label, steps]) => ({
                id,
                label,
                panel: (
                  <ol className="steps">
                    {steps.map((step) => (
                      <li key={step.title}>
                        <h3>{step.title}</h3>
                        <p>{step.body}</p>
                      </li>
                    ))}
                  </ol>
                ),
              }))}
            />
          </div>
        </section>

        <section aria-labelledby="trust-title" className="section wash">
          <div className="wrap">
            <SectionHead
              id="trust-title"
              lede="Halaalvest is software. It is not a lender, bank or custodian of member funds, and your officers make every decision."
              title="Your cooperative keeps its money and its decisions"
            />
            <ul className="controls">
              {trustControls.map((control) => (
                <li key={control.title}>
                  <h3>{control.title}</h3>
                  <p>{control.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="assist-title" className="assist" id="assistant">
          <div className="wrap">
            <HomepageAssistant />
            <ol className="a-steps">
              <li>
                <b>Ask in plain words</b>
                <span>
                  “How much is left on my financing?” or “Record ₦25,000 for
                  UNI-0533, November.”
                </span>
              </li>
              <li>
                <b>Check the answer or the draft</b>
                <span>
                  Balances come from the statement. Drafts show the amount,
                  month and how it will be split.
                </span>
              </li>
              <li>
                <b>Confirm, and it posts once</b>
                <span>
                  Members&apos; receipts go to the treasurer for review. Staff
                  payments post once, with their name on them.
                </span>
              </li>
            </ol>
          </div>
        </section>

        <section aria-labelledby="pricing-title" className="section" id="pricing">
          <div className="wrap">
            <SectionHead
              id="pricing-title"
              lede="Every fee is listed here before you sign up. Put in your own numbers to see this month's bill."
              title="One bill a month, priced per active member"
            />
            <div className="price-grid">
              <div>
                <dl className="rates num">
                  <div>
                    <dt>
                      <b>Seat fee</b>
                      <span>
                        The web workspace for admins, finance officers and
                        members. A seat is a member who is active when the month
                        closes. Your cooperative pays, or charges each counted
                        member.
                      </span>
                    </dt>
                    <dd>
                      <strong>{seatFeeLabel}</strong>
                      <small>per active member a month</small>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <b>Website AI assistant</b>
                      <span>
                        {assistantFreeMessages} messages a month are shared by
                        your staff. Extra messages are billed only if your
                        cooperative turns on assistant billing and sets a monthly
                        cap.
                      </span>
                    </dt>
                    <dd>
                      <strong>{assistantMessageLabel}</strong>
                      <small>per extra message</small>
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <b>Mobile app access</b>
                      <span>
                        Optional. A member requests it and your cooperative
                        approves it.
                      </span>
                    </dt>
                    <dd>
                      <strong>{mobileAccessLabel}</strong>
                      <small>per member, {mobileAccessMonths} months</small>
                    </dd>
                  </div>
                  <div className="zero">
                    <dt>
                      <b>Share of member funds</b>
                      <span>Savings, financing, repayments, dividends and profits.</span>
                    </dt>
                    <dd>
                      <strong>None</strong>
                      <small>never a percentage</small>
                    </dd>
                  </div>
                </dl>
                <div className="other">
                  {pricingFeePrinciples.slice(1).map((principle) => (
                    <p key={principle}>{principle}</p>
                  ))}
                  <p>
                    <Link href="/billing-policy">Read the billing policy</Link>
                  </p>
                </div>
              </div>
              <HomepageBill />
            </div>
          </div>
        </section>

        <section aria-labelledby="faq-title" className="section wash">
          <div className="wrap faq-grid">
            <h2 className="h2" id="faq-title">
              Questions cooperatives ask
            </h2>
            <div className="faq">
              {homepageFaqs.map((faq) => (
                <details key={faq.question} open={faq.open}>
                  <summary>
                    {faq.question}
                    <Plus />
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

        <section aria-labelledby="close-title" className="closing" id="signup">
          <div className="wrap close-grid">
            <h2 id="close-title">Run next month&apos;s books on Halaalvest</h2>
            <div className="close-copy">
              <p>
                Create your workspace in a few minutes. Sign-up moves no money,
                and every fee is on this page before you start.
              </p>
              <div className="close-actions">
                <a className="btn btn-green btn-lg" href={signupHref}>
                  Create your workspace <Arrow />
                </a>
                <Link className="link" href="/login">
                  Member? Sign in
                </Link>
              </div>
              <p className="close-fine num">
                <b>{seatFeeLabel}</b> per active member a month · <b>₦0</b> share
                of member funds
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div className="footer-top">
            <div className="footer-about">
              <Link aria-label="Halaalvest home" className="brand" href="/">
                <HomepageMark inverse />
                <span>
                  Halaal<i>vest</i>
                </span>
              </Link>
              <p>
                Operating software for cooperatives: contributions,
                interest-free financing, repayments and member statements.
              </p>
            </div>
            {homepageFooterColumns.map((column) => (
              <nav aria-label={column.title} key={column.title}>
                <h3>{column.title}</h3>
                <ul>
                  {column.links.map(([href, label]) => (
                    <li key={label}>
                      {href.startsWith("#") ? <a href={href}>{label}</a> : <Link href={href}>{label}</Link>}
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
