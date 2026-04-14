"use client"

import { useTransition } from "react"
import { usePathname, useRouter } from "next/navigation"
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
import { useZodForm } from "@halaal-vest/ui/hooks/use-zod-form"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import { createTenantDomainAction } from "@/lib/dashboard-actions"

const domainSchema = z.object({
  hostname: z.string().min(3, "Hostname is required."),
})

export function CustomDomainForm({ devMode }: { devMode: boolean }) {
  const form = useZodForm<z.infer<typeof domainSchema>>(domainSchema, {
    defaultValues: { hostname: "" },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()

  function onSubmit(values: z.infer<typeof domainSchema>) {
    startTransition(async () => {
      try {
        await createTenantDomainAction(objectToFormData(values))
        showSuccess("Domain added", "Custom domain saved.")
        form.reset()
      } catch (error) {
        showError("Could not add domain", error instanceof Error ? error.message : "Something went wrong.")
      }
    })
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-[minmax(0,1fr)_auto_auto]"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="hostname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom hostname</FormLabel>
              <FormControl>
                <Input {...field} placeholder="coop.example.org" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {devMode ? (
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={() => applyDashboardDevFormFill(form, "custom_domain")}>
              Quick fill
            </Button>
          </div>
        ) : null}
        <div className="flex items-end">
          <Button disabled={isPending} type="submit">Add custom domain</Button>
        </div>
      </form>
    </Form>
  )
}

const reportFilterSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
})

export function ReportsFilterForm({
  defaultValues,
  devMode,
}: {
  defaultValues: z.infer<typeof reportFilterSchema>
  devMode: boolean
}) {
  const form = useZodForm<z.infer<typeof reportFilterSchema>>(reportFilterSchema, { defaultValues })
  const router = useRouter()
  const pathname = usePathname()

  function onSubmit(values: z.infer<typeof reportFilterSchema>) {
    const params = new URLSearchParams()
    if (values.from) params.set("from", values.from)
    if (values.to) params.set("to", values.to)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField
          control={form.control}
          name="from"
          render={({ field }) => (
            <FormItem>
              <FormLabel>From</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>To</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {devMode ? (
          <div className="flex items-end">
            <Button type="button" variant="outline" onClick={() => applyDashboardDevFormFill(form, "audit_filters")}>
              Quick fill
            </Button>
          </div>
        ) : null}
        <div className="flex items-end">
          <Button type="submit">Apply report window</Button>
        </div>
      </form>
    </Form>
  )
}

const auditFilterSchema = z.object({
  action: z.string().optional(),
  from: z.string().optional(),
  search: z.string().optional(),
  to: z.string().optional(),
})

export function AuditFilterForm({
  defaultValues,
  devMode,
}: {
  defaultValues: z.infer<typeof auditFilterSchema>
  devMode: boolean
}) {
  const form = useZodForm<z.infer<typeof auditFilterSchema>>(auditFilterSchema, { defaultValues })
  const router = useRouter()
  const pathname = usePathname()

  function onSubmit(values: z.infer<typeof auditFilterSchema>) {
    const params = new URLSearchParams()
    if (values.search) params.set("search", values.search)
    if (values.action) params.set("action", values.action)
    if (values.from) params.set("from", values.from)
    if (values.to) params.set("to", values.to)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-5"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField control={form.control} name="search" render={({ field }) => (
          <FormItem>
            <FormLabel>Search</FormLabel>
            <FormControl><Input {...field} placeholder="approved" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="action" render={({ field }) => (
          <FormItem>
            <FormLabel>Action</FormLabel>
            <FormControl><Input {...field} placeholder="loan_request" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="from" render={({ field }) => (
          <FormItem>
            <FormLabel>From</FormLabel>
            <FormControl><Input {...field} type="date" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="to" render={({ field }) => (
          <FormItem>
            <FormLabel>To</FormLabel>
            <FormControl><Input {...field} type="date" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex items-end gap-2">
          {devMode ? (
            <Button type="button" variant="outline" onClick={() => applyDashboardDevFormFill(form, "audit_filters")}>
              Quick fill
            </Button>
          ) : null}
          <Button type="submit">Apply</Button>
        </div>
      </form>
    </Form>
  )
}

const notificationFilterSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
})

export function NotificationFilterForm({
  defaultValues,
}: {
  defaultValues: z.infer<typeof notificationFilterSchema>
}) {
  const form = useZodForm<z.infer<typeof notificationFilterSchema>>(notificationFilterSchema, { defaultValues })
  const router = useRouter()
  const pathname = usePathname()

  function onSubmit(values: z.infer<typeof notificationFilterSchema>) {
    const params = new URLSearchParams()
    if (values.search) params.set("search", values.search)
    if (values.status) params.set("status", values.status)
    if (values.type) params.set("type", values.type)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <Form {...form}>
      <form
        className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-4"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <FormField control={form.control} name="search" render={({ field }) => (
          <FormItem>
            <FormLabel>Search</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ""} placeholder="recipient or subject" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem>
            <FormLabel>Status</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">All statuses</option>
                <option value="queued">Queued</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ""} placeholder="repayment.posted" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex items-end">
          <Button type="submit">Apply filters</Button>
        </div>
      </form>
    </Form>
  )
}

const contributionFilterSchema = z.object({
  channel: z.string().optional(),
  memberId: z.string().optional(),
  search: z.string().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export function ContributionFilterForm({
  defaultValues,
  members,
}: {
  defaultValues: z.infer<typeof contributionFilterSchema>
  members: Array<{ id: string; label: string }>
}) {
  const form = useZodForm<z.infer<typeof contributionFilterSchema>>(contributionFilterSchema, { defaultValues })
  const router = useRouter()
  const pathname = usePathname()

  function onSubmit(values: z.infer<typeof contributionFilterSchema>) {
    const params = new URLSearchParams()
    if (values.search) params.set("search", values.search)
    if (values.memberId) params.set("memberId", values.memberId)
    if (values.channel) params.set("channel", values.channel)
    if (values.status) params.set("status", values.status)
    if (values.from) params.set("from", values.from)
    if (values.to) params.set("to", values.to)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <Form {...form}>
      <form className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="search" render={({ field }) => (
          <FormItem>
            <FormLabel>Search</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ""} placeholder="member name" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="memberId" render={({ field }) => (
          <FormItem>
            <FormLabel>Member</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">All members</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="channel" render={({ field }) => (
          <FormItem>
            <FormLabel>Channel</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">All channels</option>
                <option value="payroll">Payroll</option>
                <option value="transfer">Transfer</option>
                <option value="cash">Cash</option>
                <option value="manual">Manual</option>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="from" render={({ field }) => (
          <FormItem>
            <FormLabel>From</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ""} type="date" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="to" render={({ field }) => (
          <FormItem>
            <FormLabel>To</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ""} type="date" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex items-end">
          <Button type="submit">Apply filters</Button>
        </div>
      </form>
    </Form>
  )
}

const repaymentFilterSchema = z.object({
  assignedToUserId: z.string().optional(),
  memberId: z.string().optional(),
  resolutionStatus: z.string().optional(),
  scheduleStatus: z.string().optional(),
  stage: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export function RepaymentFilterForm({
  assignees,
  defaultValues,
  members,
}: {
  assignees: Array<{ id: string; label: string }>
  defaultValues: z.infer<typeof repaymentFilterSchema>
  members: Array<{ id: string; label: string }>
}) {
  const form = useZodForm<z.infer<typeof repaymentFilterSchema>>(repaymentFilterSchema, { defaultValues })
  const router = useRouter()
  const pathname = usePathname()

  function onSubmit(values: z.infer<typeof repaymentFilterSchema>) {
    const params = new URLSearchParams()
    if (values.memberId) params.set("memberId", values.memberId)
    if (values.assignedToUserId) params.set("assignedToUserId", values.assignedToUserId)
    if (values.scheduleStatus) params.set("scheduleStatus", values.scheduleStatus)
    if (values.stage) params.set("stage", values.stage)
    if (values.resolutionStatus) params.set("resolutionStatus", values.resolutionStatus)
    if (values.from) params.set("from", values.from)
    if (values.to) params.set("to", values.to)
    router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
  }

  return (
    <Form {...form}>
      <form className="grid gap-4 rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm md:grid-cols-7" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField control={form.control} name="memberId" render={({ field }) => (
          <FormItem>
            <FormLabel>Member</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">All members</option>
                {members.map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="assignedToUserId" render={({ field }) => (
          <FormItem>
            <FormLabel>Assignee</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">All assignees</option>
                {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.label}</option>)}
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="scheduleStatus" render={({ field }) => (
          <FormItem>
            <FormLabel>Schedule status</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="due">Due</option>
                <option value="partially_paid">Partially paid</option>
                <option value="overdue">Overdue</option>
                <option value="paid">Paid</option>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="stage" render={({ field }) => (
          <FormItem>
            <FormLabel>Case stage</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">All stages</option>
                <option value="active">Active</option>
                <option value="promise_tracking">Promise tracking</option>
                <option value="escalated">Escalated</option>
                <option value="resolved">Resolved</option>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="resolutionStatus" render={({ field }) => (
          <FormItem>
            <FormLabel>Resolution</FormLabel>
            <FormControl>
              <Select {...field}>
                <option value="">All cases</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="from" render={({ field }) => (
          <FormItem>
            <FormLabel>From</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ""} type="date" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="to" render={({ field }) => (
          <FormItem>
            <FormLabel>To</FormLabel>
            <FormControl><Input {...field} value={field.value ?? ""} type="date" /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex items-end">
          <Button type="submit">Apply filters</Button>
        </div>
      </form>
    </Form>
  )
}
