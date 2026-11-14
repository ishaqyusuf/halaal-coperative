"use client"

import { TenantLink as Link } from "@halaalvest/tenant-url/next"
import { Button } from "@halaalvest/ui/components/button"
import {
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@halaalvest/ui/components/sheet"
import { useQuery } from "@tanstack/react-query"
import {
  RequestFacts,
  RequestSection,
} from "@/components/requests/request-facts"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useActivityEntryParams } from "@/hooks/use-activity-entry-params"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"
import { useTRPC } from "@/trpc/client"
import { formatDateAndTime } from "@/utils/format"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Where a record lives, for the few kinds staff can open. */
function getRecordHref(entityType: string, entityId: string | null) {
  if (!entityId || !uuidPattern.test(entityId)) return null
  if (entityType === "Member") return `/members/${entityId}`
  if (entityType === "Loan") {
    return `/loans?view=portfolio&loanSheetType=loan-details&loanId=${entityId}`
  }
  if (entityType === "LoanRequest") {
    return `/loans?loanSheetType=request-details&loanRequestId=${entityId}`
  }
  return null
}

const authorizerLabels: Record<string, string> = {
  Approver: "Approved by",
  Authorizer: "Authorised by",
  "Disbursement authorizer": "Paid out by",
  Poster: "Recorded by",
  Receiver: "Received by",
  Responder: "Answered by",
  Reviewer: "Checked by",
  "Settlement authorizer": "Settled by",
}

/** One activity entry, URL-addressed by `activityId` (a right sheet). */
export function ActivityEntrySheet() {
  const trpc = useTRPC()
  const { activityId, setParams } = useActivityEntryParams()
  const id = activityId && uuidPattern.test(activityId) ? activityId : null
  const entry = useQuery(
    trpc.reports.auditEvent.queryOptions(
      { id: id ?? "" },
      { enabled: Boolean(id) }
    )
  )
  const close = () => void setParams({ activityId: null })
  const event = entry.data
  const recordHref = event
    ? getRecordHref(event.entityType, event.entityId)
    : null

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("activityEntry", id ? "details" : null)}
      mobileFullScreen
      onOpenChange={(open) => {
        if (!open) close()
      }}
      open={Boolean(id)}
    >
      <SheetHeader>
        <SheetTitle className="text-xl font-semibold">
          {event?.actionLabel ?? "Activity"}
        </SheetTitle>
        <SheetDescription className="text-base">
          {event ? formatDateAndTime(event.occurredAt) : " "}
        </SheetDescription>
      </SheetHeader>
      <div className="grid gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] md:px-6">
        {entry.isPending && id ? (
          <p className="text-base text-muted-foreground">Loading…</p>
        ) : entry.isError ? (
          <div className="grid justify-items-start gap-3">
            <p className="text-base">This could not be loaded.</p>
            <Button
              className="h-11 text-base"
              onClick={() => void entry.refetch()}
              type="button"
              variant="outline"
            >
              Try again
            </Button>
          </div>
        ) : event ? (
          <>
            <RequestFacts
              items={[
                { label: "Who", value: event.actorLabel },
                {
                  label: "Record",
                  value: recordHref ? (
                    <Link
                      className="text-primary underline underline-offset-4"
                      href={recordHref}
                    >
                      Open {event.entityLabel.toLowerCase()}
                    </Link>
                  ) : (
                    event.entityLabel
                  ),
                },
                {
                  label:
                    authorizerLabels[event.authorizationRole] ?? "Approved by",
                  value: event.authorizerUserId ? event.authorizerLabel : null,
                },
              ]}
            />
            {event.metadataSummary.length ? (
              <RequestSection title="What changed">
                <ul className="grid gap-2">
                  {event.metadataSummary.map((line) => (
                    <li
                      className="text-base [overflow-wrap:anywhere] text-foreground"
                      key={line}
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </RequestSection>
            ) : null}
            <div>
              <Button
                className="h-11 text-base"
                onClick={close}
                type="button"
                variant="outline"
              >
                Close
              </Button>
            </div>
          </>
        ) : (
          <p className="text-base text-muted-foreground">
            This entry could not be found.
          </p>
        )}
      </div>
    </WorkflowPresentation>
  )
}
