"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
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
import {
  RadioGroup,
  RadioGroupItem,
} from "@halaalvest/ui/components/radio-group"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { CopyIcon } from "lucide-react"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { DatePickerInput } from "@/components/date-picker-input"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { useMemberSignupLinkParams } from "@/hooks/use-member-signup-link-params"
import {
  createMemberSignupLinkAction,
  updateMemberSignupAccessModeAction,
  updateMemberSignupLinkAction,
} from "@/lib/dashboard-actions"
import {
  signupAccessModeChoices,
  toSignupAccessChoice,
  type MemberSignupLinkView,
  type SignupAccessMode,
} from "@/lib/signup-links/member-signup-links"

const accessModeSchema = z.object({
  memberSignupAccessMode: z.enum(["in_office", "public", "disabled"]),
})

const signupLinkSchema = z.object({
  expiresAt: z.string().optional(),
  maxSignups: z
    .string()
    .trim()
    .regex(/^\d*$/, "Enter a whole number, or leave it empty.")
    .optional(),
  name: z.string().trim().min(1, "Give the link a name."),
  notes: z.string().optional(),
})

type SignupLinkValues = z.infer<typeof signupLinkSchema>

// With size="touch" (44px), shrinking on md (WP18).
const footerButtonClassName = "w-full md:h-9 md:w-auto"

function signupLinkFormData(values: SignupLinkValues, linkId?: string) {
  const formData = new FormData()
  if (linkId) formData.set("linkId", linkId)
  formData.set("name", values.name)
  formData.set("expiresAt", values.expiresAt ?? "")
  formData.set("maxSignups", values.maxSignups ?? "")
  formData.set("notes", values.notes ?? "")
  return formData
}

function FormFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 flex justify-end border-t border-border/70 pt-4">
      {children}
    </div>
  )
}

function AccessModeForm({
  defaultMode,
  onSuccess,
}: {
  defaultMode: SignupAccessMode
  onSuccess: () => Promise<void>
}) {
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const form = useZodForm<z.infer<typeof accessModeSchema>>(accessModeSchema, {
    defaultValues: {
      memberSignupAccessMode: toSignupAccessChoice(defaultMode),
    },
  })

  function onSubmit(values: z.infer<typeof accessModeSchema>) {
    startTransition(async () => {
      try {
        const formData = new FormData()
        formData.set("memberSignupAccessMode", values.memberSignupAccessMode)
        await updateMemberSignupAccessModeAction(formData)
        showSuccess(
          "Saved",
          signupAccessModeChoices.find(
            (choice) => choice.value === values.memberSignupAccessMode
          )?.label ?? ""
        )
        await onSuccess()
      } catch (error) {
        showError(
          "Could not save",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="grid gap-6" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="memberSignupAccessMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="sr-only">Who can join online</FormLabel>
              <FormControl>
                <RadioGroup
                  className="gap-3"
                  onValueChange={(value) => field.onChange(value)}
                  value={field.value}
                >
                  {signupAccessModeChoices.map((choice) => (
                    <label
                      className="flex min-h-11 cursor-pointer items-start gap-3 rounded-(--ui-radius-control) border border-border p-4 has-data-checked:border-primary has-data-checked:bg-primary/5"
                      key={choice.value}
                    >
                      <RadioGroupItem className="mt-1" value={choice.value} />
                      <span className="grid gap-0.5">
                        <span className="text-lg font-semibold">
                          {choice.label}
                        </span>
                        <span className="text-base text-muted-foreground">
                          {choice.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormFooter>
          <Button
            className={footerButtonClassName}
            size="touch"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </FormFooter>
      </form>
    </Form>
  )
}

function SignupLinkFields({
  form,
}: {
  form: ReturnType<typeof useZodForm<SignupLinkValues>>
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} placeholder="For example: March new members" />
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
            <FormLabel>Last day (optional)</FormLabel>
            <FormControl>
              <DatePickerInput {...field} placeholder="No end date" />
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
            <FormLabel>Most people (optional)</FormLabel>
            <FormControl>
              <Input {...field} inputMode="numeric" placeholder="No limit" />
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
            <FormLabel>Note for staff (optional)</FormLabel>
            <FormControl>
              <Textarea {...field} rows={2} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}

function CreateLinkForm({ onSuccess }: { onSuccess: () => Promise<void> }) {
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const form = useZodForm<SignupLinkValues>(signupLinkSchema, {
    defaultValues: { expiresAt: "", maxSignups: "", name: "", notes: "" },
  })

  function onSubmit(values: SignupLinkValues) {
    startTransition(async () => {
      try {
        await createMemberSignupLinkAction(signupLinkFormData(values))
        showSuccess("Link ready", "Use Copy link to share it.")
        form.reset()
        await onSuccess()
      } catch (error) {
        showError(
          "Could not make the link",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
        <DashboardQuickFill
          form={form}
          onFill={({ emailDomain }) =>
            applyDashboardDevFormFill(form, "signup_link", undefined, {
              emailDomain,
            })
          }
        />
        <SignupLinkFields form={form} />
        <FormFooter>
          <Button
            className={footerButtonClassName}
            size="touch"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Making link…" : "Make link"}
          </Button>
        </FormFooter>
      </form>
    </Form>
  )
}

export function useCopySignupLink() {
  const { showError, showSuccess } = useNotifications()

  return async (link: Pick<MemberSignupLinkView, "name" | "signupUrl">) => {
    try {
      await navigator.clipboard.writeText(link.signupUrl)
      showSuccess(
        "Link copied",
        `Paste it into a message to share ${link.name}.`
      )
    } catch {
      showError("Could not copy", "Open Edit to see the link and copy it.")
    }
  }
}

function EditLinkForm({
  link,
  onSuccess,
}: {
  link: MemberSignupLinkView
  onSuccess: () => Promise<void>
}) {
  const { showError, showSuccess } = useNotifications()
  const copyLink = useCopySignupLink()
  const [isSaving, startSaveTransition] = useTransition()
  const form = useZodForm<SignupLinkValues>(signupLinkSchema, {
    defaultValues: {
      expiresAt: link.expiresAt ?? "",
      maxSignups: link.maxSignups?.toString() ?? "",
      name: link.name,
      notes: link.notes ?? "",
    },
  })

  function onSave(values: SignupLinkValues) {
    startSaveTransition(async () => {
      try {
        await updateMemberSignupLinkAction(signupLinkFormData(values, link.id))
        showSuccess("Saved", `${values.name} is updated.`)
        await onSuccess()
      } catch (error) {
        showError(
          "Could not save",
          error instanceof Error ? error.message : "Please try again."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="grid gap-5" onSubmit={form.handleSubmit(onSave)}>
        <SignupLinkFields form={form} />
        <div className="grid gap-2">
          <label className="text-sm font-medium" htmlFor="signup-link-url">
            Link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              className="min-w-0 flex-1 text-muted-foreground"
              id="signup-link-url"
              onFocus={(event) => event.currentTarget.select()}
              readOnly
              value={link.signupUrl}
            />
            <Button
              size="touch"
              className="sm:h-auto"
              onClick={() => void copyLink(link)}
              type="button"
              variant="outline"
            >
              <CopyIcon />
              Copy link
            </Button>
          </div>
        </div>
        <FormFooter>
          <Button
            className={footerButtonClassName}
            size="touch"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </FormFooter>
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
  const router = useRouter()
  const { setParams } = useMemberSignupLinkParams()

  async function handleSuccess() {
    await setParams({ signupLinkId: null, signupLinkSheetType: null })
    router.refresh()
  }

  if (signupLinkSheetType === "access") {
    return (
      <AccessModeForm defaultMode={defaultMode} onSuccess={handleSuccess} />
    )
  }

  if (signupLinkSheetType === "create") {
    return <CreateLinkForm onSuccess={handleSuccess} />
  }

  if (signupLinkSheetType === "edit" && selectedLink) {
    return <EditLinkForm link={selectedLink} onSuccess={handleSuccess} />
  }

  return <p className="text-muted-foreground">This link no longer exists.</p>
}
