import type {
  MemberHomeSnapshot,
  MemberOperationalReadiness,
} from "@halaalvest/db"
import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import { BadgeCheck, ChevronRight, CircleAlert } from "lucide-react"
import { MemberDocumentSelfServiceForm } from "@/components/member-document-self-service-form"
import { SummaryCard } from "@/components/summary-card"
import {
  getMemberStatusWord,
  getMemberWaitingItems,
} from "@/lib/dashboard/member-home"
import { formatDayMonthYear } from "@/utils/format"

const sectionClassName =
  "min-w-0 rounded-(--ui-radius-surface) border border-border bg-card p-5"

function memberSupportPrefillHref(values: Record<string, string>) {
  return `/support?${new URLSearchParams(values).toString()}`
}

const detailsUpdateHref = memberSupportPrefillHref({
  category: "account_update",
  description: "Please update my details. The changes are:",
  subject: "Update my details",
})

export function MemberPortalOverview({
  canSendReceipt,
  operationalReadiness,
  snapshot,
}: {
  canSendReceipt: boolean
  operationalReadiness: MemberOperationalReadiness
  snapshot: MemberHomeSnapshot
}) {
  const { activity, member, summary } = snapshot
  const isReady = operationalReadiness.isReady
  const waitingItems = getMemberWaitingItems(snapshot.inProgress)
  const firstName = member.fullName.trim().split(/\s+/)[0] ?? ""
  const otherOwed =
    (summary?.procurementOutstanding ?? 0) +
    (summary?.foodPurchaseOutstanding ?? 0)
  const monthlyPayment = summary?.activeCommitmentAmount ?? 0

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground sm:text-3xl">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-lg text-muted-foreground">
            <span>Member {member.memberNumber}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1.5">
              {isReady ? (
                <BadgeCheck
                  aria-hidden="true"
                  className="size-5 text-emerald-600"
                />
              ) : null}
              {getMemberStatusWord(member.status, isReady)}
            </span>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {canSendReceipt && isReady ? (
            <Link
              className={buttonVariants({ variant: "default" })}
              href="/payment-receipts"
            >
              Send a payment receipt
            </Link>
          ) : null}
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/member-statement-export"
          >
            Download statement
          </Link>
        </div>
      </section>

      {!isReady ? (
        <section
          className="flex flex-col gap-4 rounded-(--ui-radius-surface) border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          <div className="flex items-start gap-3">
            <CircleAlert
              aria-hidden="true"
              className="mt-0.5 size-6 shrink-0"
            />
            <div>
              <h3 className="text-lg font-semibold">
                We are still checking your details
              </h3>
              <p className="mt-1 text-base">
                You can see your records and ask for help. New requests open
                once the checks are done.
              </p>
            </div>
          </div>
          <div>
            <Link
              className={buttonVariants({ variant: "outline" })}
              href={detailsUpdateHref}
            >
              Ask for help
            </Link>
          </div>
        </section>
      ) : null}

      <section
        aria-label="Your money"
        className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <SummaryCard
          detail={
            monthlyPayment > 0
              ? `You pay ${formatCurrency(monthlyPayment)} a month`
              : "Your savings so far"
          }
          label="Savings"
          tone="good"
          value={formatCurrency(summary?.totalSavingsSnapshot ?? 0)}
        />
        <SummaryCard
          detail="Extra savings you can ask to withdraw"
          label="Special savings"
          value={formatCurrency(summary?.specialSavingsBalance ?? 0)}
        />
        <SummaryCard
          detail={
            (summary?.totalOutstandingPrincipal ?? 0) > 0
              ? "Still to repay"
              : "You owe nothing on loans"
          }
          href="/loans"
          label="Loans you owe"
          tone={
            (summary?.totalOutstandingPrincipal ?? 0) > 0
              ? "attention"
              : "default"
          }
          value={formatCurrency(summary?.totalOutstandingPrincipal ?? 0)}
        />
        <SummaryCard
          detail="Your shares in the cooperative"
          href="/shares"
          label="Share capital"
          value={formatCurrency(summary?.shareCapitalBalance ?? 0)}
        />
        {otherOwed > 0 ? (
          <SummaryCard
            detail="For items and food bought for you"
            label="Other amounts you owe"
            tone="attention"
            value={formatCurrency(otherOwed)}
          />
        ) : null}
        {(summary?.totalDividendAllocations ?? 0) > 0 ? (
          <SummaryCard
            detail="Your share of the profit"
            label="Dividends"
            tone="good"
            value={formatCurrency(summary?.totalDividendAllocations ?? 0)}
          />
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section
          aria-labelledby="member-waiting-title"
          className={sectionClassName}
        >
          <h2
            className="text-xl font-semibold text-foreground"
            id="member-waiting-title"
          >
            In progress
          </h2>
          {waitingItems.length > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {waitingItems.map((item) => (
                <li key={item.key}>
                  <Link
                    className="group -mx-2 flex min-h-14 items-center gap-4 rounded-(--ui-radius-control) px-2 py-2 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                    href={item.href}
                  >
                    <span
                      className={cn(
                        "flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full px-2 text-lg font-semibold tabular-nums",
                        item.needsYou
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                          : "bg-muted text-foreground"
                      )}
                    >
                      {item.count}
                    </span>
                    <span className="min-w-0 flex-1 text-base font-medium text-foreground first-letter:uppercase">
                      {item.label}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-5 shrink-0 text-muted-foreground"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-base text-muted-foreground">
              Nothing is waiting right now.
            </p>
          )}
        </section>

        <section
          aria-labelledby="member-activity-title"
          className={sectionClassName}
        >
          <h2
            className="text-xl font-semibold text-foreground"
            id="member-activity-title"
          >
            Your recent payments
          </h2>
          {activity.length > 0 ? (
            <ul className="mt-3 divide-y divide-border">
              {activity.map((item) => (
                <li
                  className="flex min-h-14 items-center justify-between gap-4 py-2"
                  key={item.id}
                >
                  <span className="min-w-0">
                    <span className="block text-base font-medium text-foreground">
                      {item.kind === "repayment"
                        ? "Loan repayment"
                        : "Savings payment"}
                    </span>
                    <span className="block text-base text-muted-foreground">
                      {formatDayMonthYear(item.occurredAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-lg font-semibold text-foreground tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-base text-muted-foreground">
              Your payments will show here once they are recorded.
            </p>
          )}
        </section>
      </div>

      <section
        aria-labelledby="member-details-title"
        className={sectionClassName}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2
            className="text-xl font-semibold text-foreground"
            id="member-details-title"
          >
            Your details
          </h2>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href={detailsUpdateHref}
          >
            Ask to change them
          </Link>
        </div>
        <dl className="mt-4 grid gap-4 text-base sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Email" value={member.email} />
          <DetailItem label="Phone" value={member.phoneNumber} />
          <DetailItem label="Workplace" value={member.workplaceName} />
          <DetailItem
            label="Joined"
            value={formatDayMonthYear(member.joinedAt)}
          />
        </dl>
        {member.kycStatus !== "verified" ? (
          <div className="mt-6 border-t border-border pt-5">
            <h3 className="text-lg font-semibold text-foreground">
              Send your ID document
            </h3>
            <MemberDocumentSelfServiceForm />
          </div>
        ) : null}
      </section>
    </div>
  )
}

function DetailItem({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="min-w-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium break-words text-foreground">
        {value || "Not given"}
      </dd>
    </div>
  )
}
