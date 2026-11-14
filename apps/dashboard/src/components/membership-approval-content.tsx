"use client"

import type { RouterOutputs } from "@halaalvest/api/trpc/routers/_app"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { Skeleton } from "@halaalvest/ui/components/skeleton"
import { useQuery } from "@tanstack/react-query"
import { MembershipApprovalForm } from "@/components/onboarding/membership-approval-form"
import { MembershipApprovalStatusBadge } from "@/components/tables/membership-approvals/columns"
import { useTRPC } from "@/trpc/client"
import { formatDayMonthYear } from "@/utils/format"

export type MembershipApprovalRequest =
  RouterOutputs["onboarding"]["membershipApproval"]

function RequestDetails({ request }: { request: MembershipApprovalRequest }) {
  const rows = [
    ["Phone", request.phoneNumber ?? "Not given"],
    ["Email", request.email],
    ["Member number", request.memberNumber],
    [
      "Email confirmed",
      formatDayMonthYear(request.emailVerifiedAt) ?? "Not yet",
    ],
    ["Asked to join", formatDayMonthYear(request.createdAt)],
    ["Joined with", request.signupLink?.name ?? "Joining page"],
  ] as const

  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div className="grid gap-0.5" key={label}>
          <dt className="text-base text-muted-foreground">{label}</dt>
          <dd className="font-semibold break-words text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function RequestOutcome({ request }: { request: MembershipApprovalRequest }) {
  if (request.status === "approved") {
    return (
      <p className="rounded-(--ui-radius-control) border border-border bg-muted px-4 py-3">
        Approved on {formatDayMonthYear(request.approvedAt)}. They can sign in
        now.
      </p>
    )
  }

  return (
    <div className="rounded-(--ui-radius-control) border border-border bg-muted px-4 py-3">
      <p>
        {request.status === "rejected"
          ? `Declined on ${formatDayMonthYear(request.rejectedAt)}.`
          : "This request was cancelled."}
      </p>
      {request.rejectionReason ? (
        <p className="mt-1 text-muted-foreground">
          Reason: {request.rejectionReason}
        </p>
      ) : null}
    </div>
  )
}

export function MembershipApprovalContent({
  requestId,
}: {
  requestId: string
}) {
  const trpc = useTRPC()
  const {
    data: request,
    error,
    isPending,
  } = useQuery(trpc.onboarding.membershipApproval.queryOptions({ requestId }))

  if (isPending) {
    return (
      <>
        <SheetHeader>
          <SheetTitle>
            <Skeleton className="h-7 w-48" />
          </SheetTitle>
          <SheetDescription className="sr-only">Loading</SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 px-4 pb-6 sm:px-6">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="h-12 w-full" key={index} />
          ))}
        </div>
      </>
    )
  }

  if (error || !request) {
    return (
      <SheetHeader>
        <SheetTitle>Request not found</SheetTitle>
        <SheetDescription>
          It may have been removed. Close this and refresh the list.
        </SheetDescription>
      </SheetHeader>
    )
  }

  const isOpen =
    request.status === "pending_approval" ||
    request.status === "pending_email_verification"

  return (
    <>
      <SheetHeader className="sm:px-6">
        <SheetTitle className="break-words">{request.fullName}</SheetTitle>
        <SheetDescription render={<div />}>
          <MembershipApprovalStatusBadge status={request.status} />
        </SheetDescription>
      </SheetHeader>

      <div className="grid gap-8 px-4 pb-6 sm:px-6">
        <RequestDetails request={request} />

        {isOpen ? (
          <MembershipApprovalForm request={request} />
        ) : (
          <RequestOutcome request={request} />
        )}
      </div>
    </>
  )
}
