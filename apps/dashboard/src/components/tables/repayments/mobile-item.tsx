"use client"

import { useState } from "react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@halaalvest/ui/components/item"
import { formatCurrency } from "@halaalvest/utils"
import { Banknote, Eye, MessageSquarePlus, MoreHorizontal } from "lucide-react"
import { MobileActionsDrawer } from "@/components/tables/core/mobile-actions-drawer"
import { useRepaymentParams } from "@/hooks/use-repayment-params"
import {
  formatRepaymentDate,
  getOutstandingAmount,
  RepaymentStatusBadge,
} from "./formatters"
import type { RepaymentHistoryRow, RepaymentScheduleRow } from "./types"

export function RepaymentScheduleMobileItem({
  canPostRepayment,
  item,
}: {
  canPostRepayment: boolean
  item: RepaymentScheduleRow
}) {
  const { setParams } = useRepaymentParams()
  const [actionsOpen, setActionsOpen] = useState(false)
  const followUp = item.latestCollectionFollowUp
  const canPost = canPostRepayment && item.outstandingAmount > 0

  function open(type: "followUp" | "post" | "scheduleDetails") {
    setActionsOpen(false)
    void setParams({
      loanId: type === "post" ? item.loan.id : null,
      repaymentId: null,
      repaymentScheduleItemId: type === "post" ? null : item.id,
      repaymentSheetType: type,
    })
  }

  return (
    <>
      <Item className="gap-3 border-0 bg-transparent px-0 py-4">
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate text-sm">
              {item.loan.member.fullName}
            </ItemTitle>
            <ItemDescription className="line-clamp-1">
              {item.loan.member.memberNumber} · {item.loan.loanProduct.name} · #
              {item.installmentNumber}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              aria-label={`Open actions for installment ${item.installmentNumber}`}
              className="size-11"
              onClick={() => setActionsOpen(true)}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </ItemHeader>
        <ItemContent className="min-w-0 basis-full">
          <RepaymentStatusBadge status={item.status} />
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Due</dt>
            <dd className="text-right">{formatRepaymentDate(item.dueAt)}</dd>
            <dt className="text-muted-foreground">Repayment</dt>
            <dd className="text-right">
              {formatCurrency(Number(item.totalDue))} · {formatCurrency(getOutstandingAmount(item))} outstanding
            </dd>
            <dt className="text-muted-foreground">Follow-up</dt>
            <dd className="text-right capitalize">
              {followUp?.caseStage?.replaceAll("_", " ") ?? "Not started"}
            </dd>
          </dl>
        </ItemContent>
      </Item>
      <MobileActionsDrawer
        description={`Choose the next step for installment ${item.installmentNumber}.`}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Repayment actions"
      >
        <Button
          className="h-11 w-full justify-start"
          onClick={() => open("scheduleDetails")}
          type="button"
          variant="ghost"
        >
          <Eye data-icon="inline-start" />
          View installment
        </Button>
        {canPost ? (
          <Button
            className="h-11 w-full justify-start"
            onClick={() => open("post")}
            type="button"
            variant="ghost"
          >
            <Banknote data-icon="inline-start" />
            Post repayment
          </Button>
        ) : null}
        {canPostRepayment && item.status === "overdue" ? (
          <Button
            className="h-11 w-full justify-start"
            onClick={() => open("followUp")}
            type="button"
            variant="ghost"
          >
            <MessageSquarePlus data-icon="inline-start" />
            Record follow-up
          </Button>
        ) : null}
      </MobileActionsDrawer>
    </>
  )
}

export function RepaymentHistoryMobileItem({ item }: { item: RepaymentHistoryRow }) {
  const { setParams } = useRepaymentParams()
  const [actionsOpen, setActionsOpen] = useState(false)

  return (
    <>
      <Item className="gap-3 border-0 bg-transparent px-0 py-4">
        <ItemHeader>
          <ItemContent className="min-w-0">
            <ItemTitle className="truncate text-sm">{item.member.fullName}</ItemTitle>
            <ItemDescription className="line-clamp-1">
              {item.member.memberNumber} · {item.loan.loanProduct.name}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <Button
              aria-label={`Open repayment evidence for ${item.member.fullName}`}
              className="size-11"
              onClick={() => setActionsOpen(true)}
              size="icon-lg"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </ItemActions>
        </ItemHeader>
        <ItemContent className="min-w-0 basis-full">
          <RepaymentStatusBadge status={item.status} />
          <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
            <dt className="text-muted-foreground">Received</dt>
            <dd className="text-right">{formatCurrency(Number(item.amount))}</dd>
            <dt className="text-muted-foreground">Paid on</dt>
            <dd className="text-right">{formatRepaymentDate(item.paidAt)}</dd>
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="truncate text-right">{item.reference || "Not supplied"}</dd>
          </dl>
        </ItemContent>
      </Item>
      <MobileActionsDrawer
        description={`Review the posting evidence for ${item.member.fullName}.`}
        onOpenChange={setActionsOpen}
        open={actionsOpen}
        title="Repayment evidence"
      >
        <Button
          className="h-11 w-full justify-start"
          onClick={() => {
            setActionsOpen(false)
            void setParams({
              loanId: null,
              repaymentId: item.id,
              repaymentScheduleItemId: null,
              repaymentSheetType: "repaymentDetails",
            })
          }}
          type="button"
          variant="ghost"
        >
          <Eye data-icon="inline-start" />
          View repayment evidence
        </Button>
      </MobileActionsDrawer>
    </>
  )
}
