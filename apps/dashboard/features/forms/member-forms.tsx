"use client"

import { useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaal-vest/notifications-react"
import { Button } from "@halaal-vest/ui/components/button"
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
  fullName: z.string().min(1, "Full name is required."),
  joinedAt: z.string().min(1, "Joined date is required."),
  memberNumber: z.string().min(1, "Member number is required."),
  memberType: z.enum(["individual", "civil_servant", "business"]),
})

type MemberCreateValues = z.infer<typeof memberCreateSchema>

export function MemberCreateForm({ devMode }: { devMode: boolean }) {
  const form = useZodForm<MemberCreateValues>(memberCreateSchema, {
    defaultValues: {
      fullName: "",
      joinedAt: "",
      memberNumber: "",
      memberType: "individual",
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: MemberCreateValues) {
    startTransition(async () => {
      try {
        await createMemberAction(objectToFormData(values))
        showSuccess("Member added", "Member record created.")
        form.reset({
          fullName: "",
          joinedAt: "",
          memberNumber: "",
          memberType: "individual",
        })
      } catch (error) {
        showError("Could not add member", error instanceof Error ? error.message : "Something went wrong.")
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-2 xl:grid-cols-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="xl:col-span-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">Add member</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Standardized with shared field validation and dev quick fill.
            </p>
          </div>
          {devMode ? (
            <Button type="button" variant="outline" onClick={() => applyDashboardDevFormFill(form, "member_create")}>
              Quick fill
            </Button>
          ) : null}
        </div>

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
        <div className="xl:col-span-5">
          <Button disabled={isPending} type="submit">Add member</Button>
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
