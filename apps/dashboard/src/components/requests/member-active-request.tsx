import { buttonVariants } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { formatCurrency } from "@halaalvest/utils"
import { Check, Clock, Wallet } from "lucide-react"
import Link from "next/link"
import {
  type MemberActiveInstalment,
  type MemberActiveItem,
  memberPayHref,
} from "@/lib/requests/member-service-state"
import { formatDayMonthYear } from "@/utils/format"

const pill =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-sm font-medium"
const goodPill = cn(
  pill,
  "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
)
const warnPill = cn(
  pill,
  "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
)

/**
 * The member's current item (T30 direction 01): instalments with Pay on the
 * due row, a "Next payment" card, the item facts and a progress meter.
 */
export function MemberActiveRequest({ item }: { item: MemberActiveItem }) {
  const paidOff = item.left <= 0
  const checking = item.checkingAmount ?? 0
  const percent = Math.min(
    100,
    Math.round((item.paid / Math.max(item.total, 1)) * 100)
  )

  return (
    <section aria-labelledby="active-request-title" className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2
          className="text-xl font-semibold text-foreground"
          id="active-request-title"
        >
          {item.title}
        </h2>
        <span className={goodPill}>{paidOff ? "Paid off" : "Active"}</span>
      </div>

      <div
        className={cn(
          "grid gap-4",
          item.instalments.length && "xl:grid-cols-[minmax(0,1fr)_360px]"
        )}
      >
        {item.instalments.length ? (
          <InstalmentTable
            checking={checking > 0}
            instalments={item.instalments}
            nextPayable={item.next?.payable}
          />
        ) : null}

        <div className="grid content-start gap-4">
          {checking > 0 ? (
            <div className="flex gap-3 rounded-(--ui-radius-surface) border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <Clock aria-hidden className="mt-0.5 size-5 shrink-0" />
              <p className="text-base">
                <span className="font-semibold">
                  {formatCurrency(checking)} is being checked.
                </span>{" "}
                It applies once finance confirms.
              </p>
            </div>
          ) : paidOff ? (
            <div className="flex gap-3 rounded-(--ui-radius-surface) border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              <Check aria-hidden className="mt-0.5 size-5 shrink-0" />
              <p className="text-base">
                <span className="font-semibold">Fully paid.</span> Nothing more
                is due on this item.
              </p>
            </div>
          ) : item.next ? (
            <NextPaymentCard next={item.next} />
          ) : null}

          <div className="rounded-(--ui-radius-surface) border border-border bg-card">
            <dl className="divide-y divide-border">
              {[
                ...item.facts,
                { label: "Total", value: formatCurrency(item.total) },
                { label: "Paid", value: formatCurrency(item.paid) },
                { label: "Left", value: formatCurrency(item.left) },
              ].map((fact) => (
                <div
                  className="flex items-baseline justify-between gap-4 px-4 py-3"
                  key={fact.label}
                >
                  <dt className="text-base text-muted-foreground">
                    {fact.label}
                  </dt>
                  <dd className="text-right text-base font-medium [overflow-wrap:anywhere] text-foreground tabular-nums">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-2 px-4 py-3">
              <div
                aria-label={item.progressLabel}
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={percent}
                className="h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
              >
                <div
                  className="h-full rounded-full bg-emerald-700 dark:bg-emerald-400"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {item.progressLabel}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function NextPaymentCard({
  next,
}: {
  next: NonNullable<MemberActiveItem["next"]>
}) {
  const href = memberPayHref(next.payable)
  const due = formatDayMonthYear(next.dueDate)

  return (
    <div
      className={cn(
        "grid gap-3 rounded-(--ui-radius-surface) border bg-card p-4",
        next.overdue ? "border-rose-300 dark:border-rose-800" : "border-border"
      )}
    >
      <p
        className={cn(
          "text-base",
          next.overdue
            ? "font-semibold text-rose-700 dark:text-rose-300"
            : "text-muted-foreground"
        )}
      >
        {due
          ? `Next payment · ${next.overdue ? `was due ${due}` : `due ${due}`}`
          : "Left to pay"}
      </p>
      <p className="text-3xl font-semibold text-foreground tabular-nums">
        {formatCurrency(next.amount)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Link className={buttonVariants({ size: "touch" })} href={href}>
          <Wallet aria-hidden />
          {due ? "Pay instalment" : "Pay"}
        </Link>
        <Link
          className={buttonVariants({ size: "touch", variant: "ghost" })}
          href={href}
        >
          Pay a different amount
        </Link>
      </div>
    </div>
  )
}

function InstalmentTable({
  checking,
  instalments,
  nextPayable,
}: {
  checking: boolean
  instalments: MemberActiveInstalment[]
  nextPayable?: string
}) {
  return (
    <div className="min-w-0 overflow-x-auto rounded-(--ui-radius-surface) border border-border bg-card">
      <table className="w-full text-base">
        <caption className="sr-only">Instalments</caption>
        <thead>
          <tr className="border-b border-border text-left text-sm text-muted-foreground">
            <th className="px-4 py-3 font-medium" scope="col">
              Instalment
            </th>
            <th className="px-4 py-3 text-right font-medium" scope="col">
              Amount
            </th>
            <th
              className="hidden px-4 py-3 font-medium sm:table-cell"
              scope="col"
            >
              Due
            </th>
            <th className="hidden px-4 py-3 sm:table-cell" scope="col">
              <span className="sr-only">Status</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {instalments.map((row) => {
            const paid = row.status === "paid" || row.paidAmount >= row.amount
            const isNext = row.payable === nextPayable
            const due = formatDayMonthYear(row.dueDate)
            const dueText = paid
              ? "Paid"
              : row.overdue
                ? `Was due ${due}`
                : `Due ${due}`
            const dueTone = row.overdue
              ? "font-semibold text-rose-700 dark:text-rose-300"
              : "text-muted-foreground"
            const action = paid ? (
              <span className={goodPill}>
                <Check aria-hidden className="size-4" />
                Applied
              </span>
            ) : row.status === "waived" ? (
              <span className="text-muted-foreground">Waived</span>
            ) : isNext && checking ? (
              <span className={warnPill}>
                <Clock aria-hidden className="size-4" />
                Checking
              </span>
            ) : isNext ? (
              <Link
                className={buttonVariants({ size: "touch" })}
                href={memberPayHref(row.payable)}
              >
                <Wallet aria-hidden />
                Pay
              </Link>
            ) : (
              <span className="text-muted-foreground">Upcoming</span>
            )
            return (
              <tr key={row.id}>
                <td className="px-4 py-3 whitespace-nowrap text-foreground">
                  Instalment {row.number}
                  <span className={cn("block text-sm sm:hidden", dueTone)}>
                    {dueText}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap text-foreground tabular-nums">
                  {formatCurrency(row.amount)}
                  {paid || isNext ? (
                    <div className="mt-2 sm:hidden">{action}</div>
                  ) : null}
                </td>
                <td
                  className={cn(
                    "hidden px-4 py-3 whitespace-nowrap sm:table-cell",
                    dueTone
                  )}
                >
                  {dueText}
                </td>
                <td className="hidden px-4 py-2 text-right sm:table-cell">
                  {action}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
