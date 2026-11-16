"use client"

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { formatCurrency } from "@halaalvest/utils"
import { useContributionParams } from "@/hooks/use-contribution-params"
import type { ContributionLedgerRow } from "./columns"

function formatPostedDate(date: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date))
}

/** One ledger entry on a phone: tap anywhere to open its details (WP15). */
export function ContributionMobileItem({
  item,
}: {
  item: ContributionLedgerRow
}) {
  const { setParams } = useContributionParams()

  return (
    <Item
      className="w-full gap-3 border-0 bg-transparent px-0 py-4 text-left focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      render={
        <button
          aria-label={`Open payment from ${item.member?.fullName ?? "unknown member"}`}
          onClick={() =>
            void setParams({
              contributionSheetType: "details",
              selectedContributionId: item.id,
            })
          }
          type="button"
        />
      }
    >
      <ItemHeader>
        <ItemContent className="min-w-0">
          <ItemTitle className="truncate text-sm">
            {item.member?.fullName ?? "Unknown member"}
          </ItemTitle>
          <ItemDescription className="line-clamp-1">
            {item.member?.memberNumber ?? "No member number"}
          </ItemDescription>
        </ItemContent>
      </ItemHeader>
      <ItemContent className="min-w-0 basis-full">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
          <dt className="text-muted-foreground">Savings</dt>
          <dd className="text-right font-medium text-foreground">
            {formatCurrency(Number(item.amount))}
          </dd>
          <dt className="text-muted-foreground">Committed</dt>
          <dd className="text-right">
            {item.committedAmount === null
              ? "Not linked"
              : formatCurrency(Number(item.committedAmount))}
          </dd>
          <dt className="text-muted-foreground">Extra savings</dt>
          <dd className="text-right">
            {formatCurrency(Number(item.extraSavingsAmount ?? 0))}
          </dd>
          <dt className="text-muted-foreground">Posted</dt>
          <dd className="text-right">{formatPostedDate(item.postedAt)}</dd>
        </dl>
      </ItemContent>
    </Item>
  )
}
