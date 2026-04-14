"use client"

import { useMemo, useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaal-vest/notifications-react"
import { Button } from "@halaal-vest/ui/components/button"
import { Checkbox } from "@halaal-vest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaal-vest/ui/components/form"
import { Input } from "@halaal-vest/ui/components/input"
import { Select } from "@halaal-vest/ui/components/select"
import { Textarea } from "@halaal-vest/ui/components/textarea"
import { useZodForm } from "@halaal-vest/ui/hooks/use-zod-form"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import {
  createMemberAction,
  createMemberDocumentAction,
  updateMemberDocumentReviewAction,
  updateMemberKycAction,
} from "@/lib/dashboard-actions"

const memberCreateSchema = z.object({
  currentSavingsBalance: z.string().optional(),
  fullName: z.string().min(1, "Full name is required."),
  hasServingLoan: z.boolean().default(false),
  joinedAt: z.string().min(1, "Joined date is required."),
  loanAmount: z.string().optional(),
  loanMonthlyCommitment: z.string().optional(),
  loanServed: z.string().optional(),
  loanStartDate: z.string().optional(),
  monthlyCommitment: z.string().optional(),
  memberNumber: z.string().min(1, "Member number is required."),
  memberType: z.enum(["individual", "civil_servant", "business"]),
}).superRefine((values, ctx) => {
  if (!values.hasServingLoan) {
    return
  }

  if (!values.loanStartDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Loan start date is required.", path: ["loanStartDate"] })
  }

  const amount = Number(values.loanAmount ?? "")
  const served = Number(values.loanServed ?? "0")
  const monthly = Number(values.loanMonthlyCommitment ?? "")

  if (!values.loanAmount || Number.isNaN(amount) || amount <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Loan amount must be greater than 0.", path: ["loanAmount"] })
  }

  if (values.loanServed && (Number.isNaN(served) || served < 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Served amount cannot be negative.", path: ["loanServed"] })
  }

  if (!values.loanMonthlyCommitment || Number.isNaN(monthly) || monthly <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Monthly servicing must be greater than 0.", path: ["loanMonthlyCommitment"] })
  }

  if (!Number.isNaN(amount) && !Number.isNaN(served) && served > amount) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Served amount cannot be more than the loan amount.", path: ["loanServed"] })
  }
})

type MemberCreateValues = z.infer<typeof memberCreateSchema>

export function MemberCreateForm({
  devMode,
  inModal = false,
  onSuccess,
}: {
  devMode: boolean
  inModal?: boolean
  onSuccess?: () => void
}) {
  const form = useZodForm<MemberCreateValues>(memberCreateSchema, {
    defaultValues: {
      currentSavingsBalance: "",
      fullName: "",
      hasServingLoan: false,
      joinedAt: "",
      loanAmount: "",
      loanMonthlyCommitment: "",
      loanServed: "",
      loanStartDate: "",
      monthlyCommitment: "",
      memberNumber: "",
      memberType: "individual",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const hasServingLoan = form.watch("hasServingLoan")
  const loanAmount = Number(form.watch("loanAmount") || 0)
  const loanServed = Number(form.watch("loanServed") || 0)
  const loanMonthlyCommitment = Number(form.watch("loanMonthlyCommitment") || 0)
  const loanStartDate = form.watch("loanStartDate")
  const pendingAmount = Math.max(0, loanAmount - loanServed)
  const estimatedEndMonth = useMemo(() => {
    if (!hasServingLoan || !loanStartDate || !loanMonthlyCommitment || pendingAmount <= 0) {
      return null
    }

    const remainingMonths = Math.ceil(pendingAmount / loanMonthlyCommitment)
    const endDate = new Date(`${loanStartDate}T00:00:00.000Z`)
    endDate.setUTCMonth(endDate.getUTCMonth() + remainingMonths)

    return endDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
  }, [hasServingLoan, loanMonthlyCommitment, loanStartDate, pendingAmount])

  function onSubmit(values: MemberCreateValues) {
    startTransition(async () => {
      try {
        await createMemberAction(objectToFormData(values))
        showSuccess("Member added", "Member record created.")
        form.reset({
          currentSavingsBalance: "",
          fullName: "",
          hasServingLoan: false,
          joinedAt: "",
          loanAmount: "",
          loanMonthlyCommitment: "",
          loanServed: "",
          loanStartDate: "",
          monthlyCommitment: "",
          memberNumber: "",
          memberType: "individual",
        })
        onSuccess?.()
      } catch (error) {
        showError("Could not add member", error instanceof Error ? error.message : "Something went wrong.")
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className={inModal ? "space-y-6" : "grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5"}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className={inModal ? "flex items-start justify-between gap-4" : "xl:col-span-5 flex items-start justify-between gap-4"}>
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">New member</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Capture the member profile and current cooperative state in one pass.
            </p>
          </div>
          {devMode ? (
            <Button type="button" variant="outline" onClick={() => applyDashboardDevFormFill(form, "member_create")}>
              Quick fill
            </Button>
          ) : null}
        </div>

        <div className={inModal ? "grid gap-6" : "contents"}>
          <div className={inModal ? "grid gap-4 md:grid-cols-2 xl:grid-cols-5" : "contents"}>
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="xl:col-span-2">
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Amina Yusuf" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member number</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="MEM-1024" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member type</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="individual">Individual</option>
                      <option value="civil_servant">Civil servant</option>
                      <option value="business">Business</option>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="joinedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Joined date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-muted/20 p-4">
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground">Current state</h4>
              <p className="mt-1 text-sm text-muted-foreground">Set the member’s existing savings and active commitment at the point of onboarding.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="currentSavingsBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current balance</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="monthlyCommitment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monthly commitment</FormLabel>
                    <FormControl>
                      <Input {...field} inputMode="decimal" placeholder="25000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-4">
            <FormField
              control={form.control}
              name="hasServingLoan"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />
                  </FormControl>
                  <div className="space-y-1">
                    <FormLabel>Serving loan</FormLabel>
                    <p className="text-sm text-muted-foreground">Create an active loan snapshot for this member during onboarding.</p>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            {hasServingLoan ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <FormField
                  control={form.control}
                  name="loanStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan start date</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="loanAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Loan amount</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="decimal" placeholder="500000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="loanServed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Served</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="decimal" placeholder="200000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="loanMonthlyCommitment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly commitment</FormLabel>
                      <FormControl>
                        <Input {...field} inputMode="decimal" placeholder="50000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="md:col-span-2 xl:col-span-4 grid gap-3 rounded-[1.25rem] border border-border/60 bg-muted/25 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Pending</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{Number.isFinite(pendingAmount) ? pendingAmount.toLocaleString() : "0"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Estimated end month</p>
                    <p className="mt-2 text-lg font-semibold text-foreground">{estimatedEndMonth ?? "Waiting for loan inputs"}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className={inModal ? "flex justify-end gap-3 border-t border-border/70 pt-4" : "xl:col-span-5"}>
          <Button disabled={isPending} type="submit" className={inModal ? "rounded-full px-5" : undefined}>
            Add member
          </Button>
        </div>
      </form>
    </Form>
  )
}

const memberKycSchema = z.object({
  governmentIdNumber: z.string().optional(),
  kycDocumentType: z.string().optional(),
  kycDocumentUrl: z.string().optional(),
  kycReviewNotes: z.string().optional(),
  kycStatus: z.enum(["not_started", "pending", "verified", "rejected"]),
  memberId: z.string().min(1),
})

type MemberKycValues = z.infer<typeof memberKycSchema>

export function MemberKycForm({
  defaultValues,
  devMode,
}: {
  defaultValues: MemberKycValues
  devMode: boolean
}) {
  const form = useZodForm<MemberKycValues>(memberKycSchema, { defaultValues })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberKycValues) {
    startTransition(async () => {
      try {
        await updateMemberKycAction(objectToFormData(values))
        showSuccess("KYC saved", "Member KYC details updated.")
      } catch (error) {
        showError("Could not save KYC", error instanceof Error ? error.message : "Something went wrong.")
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="md:col-span-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">KYC details</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Identity fields now follow the same shared dashboard form standard.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                applyDashboardDevFormFill(form, "member_kyc", {
                  memberId: defaultValues.memberId,
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField
          control={form.control}
          name="kycStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>KYC status</FormLabel>
              <FormControl>
                <Select {...field}>
                  <option value="not_started">Not started</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kycDocumentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document type</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} placeholder="National ID" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="governmentIdNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>ID number</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kycDocumentUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document URL</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="kycReviewNotes"
          render={({ field }) => (
            <FormItem className="md:col-span-4">
              <FormLabel>Review notes</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} className="min-h-24" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="md:col-span-4 hidden">
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => <input {...field} type="hidden" />}
          />
        </div>
        <div className="md:col-span-4">
          <Button disabled={isPending} type="submit">Save KYC</Button>
        </div>
      </form>
    </Form>
  )
}

const memberDocumentSchema = z.object({
  documentType: z.string().min(1, "Document type is required."),
  documentUrl: z.string().url("Document URL must be valid."),
  memberId: z.string().min(1),
  reviewNotes: z.string().optional(),
  reviewStatus: z.enum(["pending", "verified", "rejected"]),
})

type MemberDocumentValues = z.infer<typeof memberDocumentSchema>

export function MemberDocumentForm({
  defaultMemberId,
  devMode,
}: {
  defaultMemberId: string
  devMode: boolean
}) {
  const form = useZodForm<MemberDocumentValues>(memberDocumentSchema, {
    defaultValues: {
      documentType: "",
      documentUrl: "",
      memberId: defaultMemberId,
      reviewNotes: "",
      reviewStatus: "pending",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberDocumentValues) {
    startTransition(async () => {
      try {
        await createMemberDocumentAction(objectToFormData(values))
        showSuccess("Document added", "KYC document attached to the member profile.")
        form.reset({
          documentType: "",
          documentUrl: "",
          memberId: defaultMemberId,
          reviewNotes: "",
          reviewStatus: "pending",
        })
      } catch (error) {
        showError("Could not add document", error instanceof Error ? error.message : "Something went wrong.")
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="md:col-span-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Add KYC document</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Keep multiple identity and compliance documents on one member profile.
            </p>
          </div>
          {devMode ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.reset({
                  documentType: "National ID",
                  documentUrl: "https://example.com/kyc/member-document.pdf",
                  memberId: defaultMemberId,
                  reviewNotes: "Imported during KYC review.",
                  reviewStatus: "pending",
                })
              }
            >
              Quick fill
            </Button>
          ) : null}
        </div>

        <FormField control={form.control} name="documentType" render={({ field }) => (
          <FormItem>
            <FormLabel>Document type</FormLabel>
            <FormControl><Input {...field} placeholder="National ID" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="reviewStatus" render={({ field }) => (
          <FormItem>
            <FormLabel>Initial review status</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="documentUrl" render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Document URL</FormLabel>
            <FormControl><Input {...field} placeholder="https://..." /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="reviewNotes" render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>Review notes</FormLabel>
            <FormControl><Textarea {...field} value={field.value ?? ""} className="min-h-24" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="hidden">
          <FormField control={form.control} name="memberId" render={({ field }) => <input {...field} type="hidden" />} />
        </div>
        <div className="md:col-span-4">
          <Button disabled={isPending} type="submit">Add document</Button>
        </div>
      </form>
    </Form>
  )
}

const memberDocumentReviewSchema = z.object({
  documentId: z.string().min(1),
  reviewNotes: z.string().optional(),
  reviewStatus: z.enum(["pending", "verified", "rejected"]),
})

type MemberDocumentReviewValues = z.infer<typeof memberDocumentReviewSchema>

export function MemberDocumentReviewForm({
  defaultValues,
}: {
  defaultValues: MemberDocumentReviewValues
}) {
  const form = useZodForm<MemberDocumentReviewValues>(memberDocumentReviewSchema, { defaultValues })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberDocumentReviewValues) {
    startTransition(async () => {
      try {
        await updateMemberDocumentReviewAction(objectToFormData(values))
        showSuccess("Document review saved", "Document review state updated.")
      } catch (error) {
        showError("Could not save review", error instanceof Error ? error.message : "Something went wrong.")
      }
    })
  }

  return (
    <Form {...form}>
      <form className="mt-3 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)_auto]" onSubmit={form.handleSubmit(onSubmit)}>
        <input type="hidden" {...form.register("documentId")} />
        <FormField control={form.control} name="reviewStatus" render={({ field }) => (
          <FormItem>
            <FormControl>
              <Select {...field}>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="reviewNotes" render={({ field }) => (
          <FormItem>
            <FormControl><Input {...field} value={field.value ?? ""} placeholder="Review notes" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button disabled={isPending} size="sm" type="submit" variant="outline">Update review</Button>
      </form>
    </Form>
  )
}
