"use client"

import { useEffect, useTransition } from "react"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@halaalvest/ui/components/select"
import { SheetFooter } from "@halaalvest/ui/components/sheet"
import { Textarea } from "@halaalvest/ui/components/textarea"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { cn } from "@halaalvest/ui/lib/utils"
import { updateMemberAction } from "@/lib/dashboard-actions"
import { objectToFormData } from "@/lib/form-submit"
import type { MemberCollectionSourceOption } from "@/lib/members/load-members-page"
import type { MemberBackfillBaselineMember } from "@/components/members/member-backfill-baseline-edit-types"

const memberTypeOptions = [
  { label: "Individual", value: "individual" },
  { label: "Civil servant", value: "civil_servant" },
  { label: "Business", value: "business" },
]

const memberBaselineEditSchema = z.object({
  address: z.string().optional(),
  deductionSourceId: z.string().optional(),
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

function getDefaultValues(
  member: MemberBackfillBaselineMember
): MemberBaselineEditValues {
  return {
    address: member.address ?? "",
    deductionSourceId: member.deductionSourceId ?? "none",
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

function CollectionSourceSelectInput({
  disabled,
  onChange,
  options,
  value,
}: {
  disabled?: boolean
  onChange: (value: string) => void
  options: MemberCollectionSourceOption[]
  value?: string
}) {
  const selectOptions = [
    { label: "None/manual", value: "none" },
    ...options.map((option) => ({ label: option.label, value: option.id })),
  ]
  const selectedOption = selectOptions.find((option) => option.value === value)

  return (
    <Select
      disabled={disabled}
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) {
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
          {selectedOption?.label ?? "Select collection source"}
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {selectOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

export function MemberBackfillBaselineEditContent({
  canManageCollectionSources = false,
  collectionSourceOptions = [],
  isOpen,
  member,
  onClose,
}: {
  canManageCollectionSources?: boolean
  collectionSourceOptions?: MemberCollectionSourceOption[]
  isOpen: boolean
  member: MemberBackfillBaselineMember
  onClose: () => void
}) {
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
    if (isOpen) {
      reset(getDefaultValues(member))
    }
  }, [member, isOpen, reset])

  function onSubmit(values: MemberBaselineEditValues) {
    startTransition(async () => {
      try {
        await updateMemberAction(objectToFormData(values))
        showSuccess("Member updated", "Basic information saved.")
        onClose()
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
    <Form {...form}>
      <form className="mt-5 grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
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
          {canManageCollectionSources ? (
            <FormField
              control={form.control}
              name="deductionSourceId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Collection source</FormLabel>
                  <FormControl>
                    <CollectionSourceSelectInput
                      disabled={isPending}
                      onChange={field.onChange}
                      options={collectionSourceOptions}
                      value={field.value}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="+234 800 000 0000" />
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

        <SheetFooter className="border-t border-border/70 pt-4">
          <Button
            disabled={isPending}
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button disabled={isPending} type="submit">
            Save
          </Button>
        </SheetFooter>
      </form>
    </Form>
  )
}
