"use client"

import { useTransition } from "react"
import { z } from "zod"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import { Select } from "@halaalvest/ui/components/select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import {
  createMemberSignupLinkAction,
  rotateMemberSignupLinkAction,
  toggleMemberSignupLinkAction,
  updateMemberSignupAccessModeAction,
  updateMemberSignupLinkAction,
} from "@/lib/dashboard-actions"

type SignupAccessMode = "in_office" | "public"

const accessModeSchema = z.object({
  memberSignupAccessMode: z.enum(["in_office", "public"]),
})

const signupLinkSchema = z.object({
  expiresAt: z.string().optional(),
  maxSignups: z.string().optional(),
  name: z.string().trim().min(1, "Link name is required."),
  notes: z.string().optional(),
})

type MemberSignupLinkView = {
  analytics: {
    approvedCount: number
    pendingApprovalCount: number
    rejectedCount: number
    remainingSlots: number | null
    totalRequests: number
    verifiedCount: number
  }
  createdAt: string
  expiresAt: string | null
  id: string
  isEnabled: boolean
  lastUsedAt: string | null
  maxSignups: number | null
  name: string
  notes: string | null
  signupUrl: string
}

function AccessModeForm({
  defaultMode,
}: {
  defaultMode: SignupAccessMode
}) {
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const form = useZodForm<z.infer<typeof accessModeSchema>>(accessModeSchema, {
    defaultValues: {
      memberSignupAccessMode: defaultMode,
    },
  })

  function onSubmit(values: z.infer<typeof accessModeSchema>) {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("memberSignupAccessMode", values.memberSignupAccessMode)
        await updateMemberSignupAccessModeAction(formData)
        showSuccess(
          "Signup access updated",
          values.memberSignupAccessMode === "public"
            ? "Member signup is now open to the public on this tenant host."
            : "Member signup is now restricted to in-office use unless a staff link is issued.",
        )
      } catch (error) {
        showError(
          "Could not update signup access",
          error instanceof Error ? error.message : "Something went wrong.",
        )
      }
    })
  }

  return (
    <section id="signup-access-mode" className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Access mode</p>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Member signup gate</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            `In-office` blocks public signup unless the applicant uses a valid staff-issued link. `Public` keeps the signup page open without a token.
          </p>
        </div>
        <Form {...form}>
          <form
            className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="memberSignupAccessMode"
              render={({ field }) => (
                <FormItem className="min-w-[220px]">
                  <FormLabel className="sr-only">Access mode</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <option value="in_office">In-office only</option>
                      <option value="public">Public signup</option>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={isPending} type="submit">
              Save access mode
            </Button>
          </form>
        </Form>
      </div>
    </section>
  )
}

function CreateLinkForm() {
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const form = useZodForm<z.infer<typeof signupLinkSchema>>(signupLinkSchema, {
    defaultValues: {
      expiresAt: "",
      maxSignups: "",
      name: "",
      notes: "",
    },
  })

  function onSubmit(values: z.infer<typeof signupLinkSchema>) {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("name", values.name)
        formData.set("expiresAt", values.expiresAt ?? "")
        formData.set("maxSignups", values.maxSignups ?? "")
        formData.set("notes", values.notes ?? "")
        await createMemberSignupLinkAction(formData)
        showSuccess("Signup link created", "A new member signup link is now available below.")
        form.reset()
      } catch (error) {
        showError(
          "Could not create signup link",
          error instanceof Error ? error.message : "Something went wrong.",
        )
      }
    })
  }

  return (
    <section id="create-signup-link" className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Generator</p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-foreground">Create a staff signup link</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Generate a controlled signup URL for remote applicants when public signup is closed.
        </p>
      </div>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="April outreach batch" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxSignups"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum signups</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="numeric" placeholder="Optional" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Optional internal note about where this link will be shared."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="mt-4">
            <Button disabled={isPending} type="submit">
              Generate signup link
            </Button>
          </div>
        </form>
      </Form>
    </section>
  )
}

function MemberSignupLinkCard({
  link,
}: {
  link: MemberSignupLinkView
}) {
  const { showError, showSuccess } = useNotifications()
  const [isSaving, startSaveTransition] = useTransition()
  const [isRotating, startRotateTransition] = useTransition()
  const [isToggling, startToggleTransition] = useTransition()
  const form = useZodForm<z.infer<typeof signupLinkSchema>>(signupLinkSchema, {
    defaultValues: {
      expiresAt: link.expiresAt ?? "",
      maxSignups: link.maxSignups?.toString() ?? "",
      name: link.name,
      notes: link.notes ?? "",
    },
  })

  function onSave(values: z.infer<typeof signupLinkSchema>) {
    startSaveTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("linkId", link.id)
        formData.set("name", values.name)
        formData.set("expiresAt", values.expiresAt ?? "")
        formData.set("maxSignups", values.maxSignups ?? "")
        formData.set("notes", values.notes ?? "")
        await updateMemberSignupLinkAction(formData)
        showSuccess("Signup link saved", `${values.name} was updated.`)
      } catch (error) {
        showError(
          "Could not save signup link",
          error instanceof Error ? error.message : "Something went wrong.",
        )
      }
    })
  }

  function onToggle() {
    startToggleTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("enabled", String(!link.isEnabled))
        formData.set("linkId", link.id)
        await toggleMemberSignupLinkAction(formData)
        showSuccess(
          link.isEnabled ? "Signup link disabled" : "Signup link enabled",
          `${link.name} is now ${link.isEnabled ? "disabled" : "enabled"}.`,
        )
      } catch (error) {
        showError(
          "Could not update signup link",
          error instanceof Error ? error.message : "Something went wrong.",
        )
      }
    })
  }

  function onRotate() {
    startRotateTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("linkId", link.id)
        await rotateMemberSignupLinkAction(formData)
        showSuccess("Signup link regenerated", "The previous token is now invalid.")
      } catch (error) {
        showError(
          "Could not regenerate signup link",
          error instanceof Error ? error.message : "Something went wrong.",
        )
      }
    })
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(link.signupUrl)
      showSuccess("Signup link copied", "The full signup URL is now in your clipboard.")
    } catch {
      showError("Could not copy signup link", "Copy the link manually from the field.")
    }
  }

  return (
    <article className="rounded-[1.75rem] border border-border/70 bg-background/92 p-5 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold tracking-tight text-foreground">{link.name}</p>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${link.isEnabled ? "bg-emerald-100 text-emerald-900" : "bg-muted text-muted-foreground"}`}>
              {link.isEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Created on {link.createdAt}. {link.lastUsedAt ? `Last used on ${link.lastUsedAt}.` : "Not used yet."}
          </p>
        </div>

        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 xl:min-w-[360px]">
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-[0.16em]">Signups</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{link.analytics.totalRequests}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-[0.16em]">Remaining</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {link.analytics.remainingSlots === null ? "Unlimited" : link.analytics.remainingSlots}
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-[0.16em]">Verified</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{link.analytics.verifiedCount}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-[0.16em]">Approved</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{link.analytics.approvedCount}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Form {...form}>
          <form
            className="contents"
            onSubmit={form.handleSubmit(onSave)}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry date</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="maxSignups"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Maximum signups</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="numeric" placeholder="Unlimited" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem className="md:col-span-2">
              <FormLabel>Signup URL</FormLabel>
              <Input readOnly value={link.signupUrl} />
            </FormItem>

            <div className="mt-5 flex flex-wrap gap-3 md:col-span-2">
              <Button disabled={isSaving} type="submit">
                Save changes
              </Button>
              <Button type="button" variant="outline" onClick={onCopy}>
                Copy link
              </Button>
              <Button disabled={isRotating} type="button" variant="outline" onClick={onRotate}>
                Regenerate token
              </Button>
              <Button disabled={isToggling} type="button" variant="outline" onClick={onToggle}>
                {link.isEnabled ? "Disable link" : "Enable link"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
        <p>Pending approval: {link.analytics.pendingApprovalCount}</p>
        <p>Rejected: {link.analytics.rejectedCount}</p>
        <p>Expiry: {link.expiresAt ?? "No expiry"}</p>
      </div>
    </article>
  )
}

export function MemberSignupLinkManager({
  defaultMode,
  links,
}: {
  defaultMode: SignupAccessMode
  links: MemberSignupLinkView[]
}) {
  return (
    <div className="space-y-6">
      <AccessModeForm defaultMode={defaultMode} />
      <CreateLinkForm />
      <div className="space-y-4">
        {links.length > 0 ? (
          links.map((link) => <MemberSignupLinkCard key={link.id} link={link} />)
        ) : (
          <section className="rounded-[1.75rem] border border-dashed border-border/70 bg-background/92 p-6 text-sm text-muted-foreground shadow-sm">
            No signup links yet. Generate one when you need controlled remote member signup.
          </section>
        )}
      </div>
    </div>
  )
}
