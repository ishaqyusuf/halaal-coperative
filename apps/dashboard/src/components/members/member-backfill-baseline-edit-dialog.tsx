"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@halaalvest/ui/components/dialog"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@halaalvest/ui/components/select"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import { updateMemberAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"

const memberTypeOptions = [
  { label: "Individual", value: "individual" },
  { label: "Civil servant", value: "civil_servant" },
  { label: "Business", value: "business" },
]

const memberBaselineEditSchema = z.object({
  address: z.string().optional(),
  email: z
    .string()
    .email("Enter a valid email.")
    .optional()
    .or(z.literal("")),
  fullName: z.string().min(1, "Full name is required."),
  memberId: z.string().min(1),
  memberType: z.enum(["individual", "civil_servant", "business"]),
  occupation: z.string().optional(),
  phoneNumber: z.string().optional(),
})

type MemberBaselineEditValues = z.infer<typeof memberBaselineEditSchema>

type MemberBackfillBaselineMember = {
  address: string | null
  email: string | null
  fullName: string
  id: string
  memberType: "individual" | "civil_servant" | "business"
  occupation: string | null
  phoneNumber: string | null
}

function getDefaultValues(
  member: MemberBackfillBaselineMember
): MemberBaselineEditValues {
  return {
    address: member.address ?? "",
    email: member.email ?? "",
    fullName: member.fullName,
    memberId: member.id,
    memberType: member.memberType,
    occupation: member.occupation ?? "",
    phoneNumber: member.phoneNumber ?? "",
  }
}

function MemberTypeSelectInput({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean
  onChange: (value: MemberBaselineEditValues["memberType"]) => void
  value?: MemberBaselineEditValues["memberType"]
}) {
  const selectedOption = memberTypeOptions.find(
    (option) => option.value === value
  )

  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(nextValue) => {
        if (
          nextValue === "individual" ||
          nextValue === "civil_servant" ||
          nextValue === "business"
        ) {
          onChange(nextValue)
        }
      }}
    >
      <SelectTrigger className="w-full">
        <span
          className={cn(
            "truncate",
            selectedOption ? undefined : "text-muted-foreground"
          )}
        >
          {selectedOption?.label ?? "Select member type"}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {memberTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function MemberBackfillBaselineEditDialog({
  disabled,
  member,
}: {
  disabled?: boolean
  member: MemberBackfillBaselineMember
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { showError, showSuccess } = useNotifications()
  const router = useRouter()
  const form = useZodForm<MemberBaselineEditValues>(
    memberBaselineEditSchema,
    {
      defaultValues: getDefaultValues(member),
    }
  )
  const { reset } = form

  useEffect(() => {
    if (open) {
      reset(getDefaultValues(member))
    }
  }, [member, open, reset])

  function onSubmit(values: MemberBaselineEditValues) {
    startTransition(async () => {
      try {
        await updateMemberAction(objectToFormData(values))
        showSuccess("Member updated", "Basic information saved.")
        setOpen(false)
        router.refresh()
      } catch (error) {
        showError(
          "Could not update member",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button disabled={disabled} size="sm" variant="outline" />}
      >
        Edit basic information
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="max-h-[calc(100vh-2rem)] overflow-hidden p-0 sm:max-w-[520px]"
      >
        <div className="max-h-[calc(100vh-2rem)] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>Edit basic information</DialogTitle>
            <DialogDescription>
              Update profile details only. Member No., joined date, and
              brought-forward balances or commitment history stay on the
              migration steps.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="mt-5 grid gap-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <input type="hidden" {...form.register("memberId")} />
              <div className="grid gap-4 sm:grid-cols-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-3">
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
                  name="memberType"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel>Member type</FormLabel>
                      <FormControl>
                        <MemberTypeSelectInput
                          disabled={isPending}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="+234 800 000 0000"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="amina@example.com"
                          type="email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Occupation</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Trader" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          className="min-h-20"
                          placeholder="No. 12 Cooperative Road"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="border-t border-border/70 pt-4">
                <Button
                  disabled={isPending}
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button disabled={isPending} type="submit">
                  Save
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
