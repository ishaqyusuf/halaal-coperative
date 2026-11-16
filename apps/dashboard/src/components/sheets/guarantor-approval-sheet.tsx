"use client"

import type { GuarantorRequestForMember } from "@halaalvest/db"
import { useNotifications } from "@halaalvest/notifications-react"
import {
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@halaalvest/ui/components/alert-dialog"
import { Button } from "@halaalvest/ui/components/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { formatCurrency } from "@halaalvest/utils"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { z } from "zod"
import { WorkflowConfirmFooter } from "@/components/workflow-confirm-footer"
import { WorkflowPresentation } from "@/components/workflow-presentation"
import { useGuarantorApprovalParams } from "@/hooks/use-guarantor-approval-params"
import { respondMemberLoanGuarantorApprovalAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import { getWorkflowPresentation } from "@/lib/workflow-presentations"

const agreeSchema = z.object({ notes: z.string().max(500).optional() })
const declineSchema = z.object({
  notes: z.string().trim().min(1, "Say why you cannot.").max(500),
})

type ResponseValues = { notes?: string }

function GuarantorResponseConfirm({
  answer,
  onDone,
  request,
}: {
  answer: "approved" | "rejected"
  onDone: () => Promise<void>
  request: GuarantorRequestForMember
}) {
  const form = useZodForm<ResponseValues>(
    answer === "approved" ? agreeSchema : declineSchema,
    { defaultValues: { notes: "" } }
  )
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const borrower = request.loanRequest.member.fullName
  const amount = formatCurrency(request.loanRequest.requestedAmount)

  function onSubmit(values: ResponseValues) {
    startTransition(async () => {
      try {
        await respondMemberLoanGuarantorApprovalAction(
          objectToFormData({
            guarantorApprovalId: request.id,
            notes: values.notes ?? "",
            status: answer,
          })
        )
        showSuccess(
          "Answer sent",
          answer === "approved"
            ? `You are now ${borrower}'s guarantor.`
            : `We told the cooperative you cannot guarantee ${borrower}.`
        )
        await onDone()
      } catch (error) {
        showError(
          "Could not send your answer",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <>
      <AlertDialogHeader className="mb-4">
        <AlertDialogTitle className="text-xl">
          {answer === "approved"
            ? `Guarantee ${borrower}'s loan?`
            : `Say no to ${borrower}?`}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-base">
          {answer === "approved"
            ? `${amount} over ${request.loanRequest.requestedTermMonths} months. If ${borrower} stops paying, the cooperative may ask you to help. You cannot change this later.`
            : `${amount} over ${request.loanRequest.requestedTermMonths} months. You cannot change this later.`}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <Form {...form}>
        <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base">
                  {answer === "approved" ? "Note (optional)" : "Why not?"}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    className="min-h-20 text-base"
                    disabled={isPending}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <WorkflowConfirmFooter disabled={isPending}>
            <Button
              size="touch"
              disabled={isPending}
              type="submit"
              variant={answer === "approved" ? "default" : "destructive"}
            >
              {isPending
                ? "Sending…"
                : answer === "approved"
                  ? "Yes, I agree"
                  : "Send my answer"}
            </Button>
          </WorkflowConfirmFooter>
        </form>
      </Form>
    </>
  )
}

/**
 * The member's answer to a guarantor request (`?guarantorApprovalId=&
 * guarantorResponseStatus=`): a real AlertDialog, hosted by the page that
 * lists the requests.
 */
export function GuarantorApprovalSheet({
  requests,
}: {
  requests: GuarantorRequestForMember[]
}) {
  const router = useRouter()
  const { guarantorApprovalId, guarantorResponseStatus, setParams } =
    useGuarantorApprovalParams()
  const request = requests.find(
    (row) => row.id === guarantorApprovalId && row.status === "pending"
  )
  const isOpen = Boolean(request && guarantorResponseStatus)

  return (
    <WorkflowPresentation
      config={getWorkflowPresentation("guarantorApproval", "response")}
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) void setParams(null)
      }}
    >
      {request && guarantorResponseStatus ? (
        <GuarantorResponseConfirm
          answer={guarantorResponseStatus}
          onDone={async () => {
            await setParams(null)
            router.refresh()
          }}
          request={request}
        />
      ) : null}
    </WorkflowPresentation>
  )
}
