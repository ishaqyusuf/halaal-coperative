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
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { DatePickerInput } from "@/components/date-picker-input"
import {
  createMemberSignupLinkAction,
  updateMemberSignupAccessModeAction,
  updateMemberSignupLinkAction,
} from "@/lib/dashboard-actions"

export type SignupAccessMode = "disabled" | "hidden" | "in_office" | "public"

export type MemberSignupLinkView = {
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

const accessModeSchema = z.object({
  memberSignupAccessMode: z.enum(["in_office", "public", "hidden", "disabled"]),
})

const signupLinkSchema = z.object({
  expiresAt: z.string().optional(),
  maxSignups: z.string().optional(),
  name: z.string().trim().min(1, "Link name is required."),
  notes: z.string().optional(),
})

function accessModeSuccessDescription(mode: SignupAccessMode) {
  if (mode === "public") {
    return "Member signup is now open to the public on this cooperative host."
  }

  if (mode === "hidden") {
    return "Public signup entry points are hidden, but staff-issued links can still be used."
  }

  if (mode === "disabled") {
    return "Member self-service signup is disabled for public pages and staff-issued links."
  }

  return "Member signup is now restricted to in-office use unless a staff link is issued."
}

function AccessModeForm({ defaultMode }: { defaultMode: SignupAccessMode }) {
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
          accessModeSuccessDescription(values.memberSignupAccessMode)
        )
      } catch (error) {
        showError(
          "Could not update signup access",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <section className="rounded-lg border border-border/70 bg-background/92 p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs text-muted-foreground uppercase">
            Access mode
          </p>
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            Member signup gate
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose whether signup is open, link-only, hidden from entry points,
            or fully disabled. New applicants still require admin approval.
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
                    <NativeSelect {...field}>
                      <option value="in_office">In-office only</option>
                      <option value="public">Public signup</option>
                      <option value="hidden">Hidden, links only</option>
                      <option value="disabled">Disabled</option>
                    </NativeSelect>
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
        showSuccess(
          "Signup link created",
          "A new member signup link is now available below."
        )
        form.reset()
      } catch (error) {
        showError(
          "Could not create signup link",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <section>
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
                    <DatePickerInput
                      {...field}
                      placeholder="Select expiry date"
                    />
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
                    <Input
                      {...field}
                      inputMode="numeric"
                      placeholder="Optional"
                    />
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

function EditLinkForm({ link }: { link: MemberSignupLinkView }) {
  const { showError, showSuccess } = useNotifications()
  const [isSaving, startSaveTransition] = useTransition()
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
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSave)}>
        <div className="grid gap-4 md:grid-cols-2">
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
                  <DatePickerInput
                    {...field}
                    placeholder="Select expiry date"
                  />
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
                  <Input
                    {...field}
                    inputMode="numeric"
                    placeholder="Unlimited"
                  />
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
        </div>

        <Button disabled={isSaving} type="submit">
          Save changes
        </Button>
      </form>
    </Form>
  )
}

export function MemberSignupLinkContent({
  defaultMode,
  selectedLink,
  signupLinkSheetType,
}: {
  defaultMode: SignupAccessMode
  selectedLink: MemberSignupLinkView | null
  signupLinkSheetType: "access" | "create" | "edit" | null
}) {
  if (signupLinkSheetType === "access") {
    return <AccessModeForm defaultMode={defaultMode} />
  }

  if (signupLinkSheetType === "create") {
    return <CreateLinkForm />
  }

  if (signupLinkSheetType === "edit" && selectedLink) {
    return <EditLinkForm link={selectedLink} />
  }

  return (
    <p className="text-sm text-muted-foreground">
      Select a signup link to edit.
    </p>
  )
}
