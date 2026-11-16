"use client"

import { useTransition } from "react"
import { z } from "zod"
import type { MembershipRole } from "@halaalvest/db"
import { useNotifications } from "@halaalvest/notifications-react"
import { Button } from "@halaalvest/ui/components/button"
import { Checkbox } from "@halaalvest/ui/components/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@halaalvest/ui/components/form"
import { Input } from "@halaalvest/ui/components/input"
import { NativeSelect } from "@halaalvest/ui/components/native-select"
import { useZodForm } from "@halaalvest/ui/hooks/use-zod-form"
import { DashboardQuickFill } from "@/components/dashboard-quick-fill"
import { provisionTenantUserRoleAction } from "@/lib/dashboard-actions"
import { applyDashboardDevFormFill } from "@/lib/dev-form-fill"
import { objectToFormData } from "@/lib/form-submit"
import { getRoleAbility, getRoleWord } from "@/lib/settings/role-words"

const roleSchema = z.object({
  email: z.string().trim().email("Enter their email address."),
  fullName: z.string().trim().min(1, "Enter their full name."),
  makeDefault: z.boolean().default(false),
  role: z.string().min(1, "Choose a role."),
})

type RoleValues = z.infer<typeof roleSchema>

const fieldClass = "h-11 text-base"

export function RoleAssignmentForm({
  devMode,
  onSuccess,
  roles,
}: {
  devMode: boolean
  onSuccess?: () => void
  roles: MembershipRole[]
}) {
  const form = useZodForm<RoleValues>(roleSchema, {
    defaultValues: {
      email: "",
      fullName: "",
      makeDefault: false,
      role: roles.includes("operations_officer")
        ? "operations_officer"
        : roles[0],
    },
  })
  const { showError, showSuccess } = useNotifications()
  const [isPending, startTransition] = useTransition()
  const selectedRole = form.watch("role") as MembershipRole

  function onSubmit(values: RoleValues) {
    startTransition(async () => {
      try {
        await provisionTenantUserRoleAction(objectToFormData(values))
        showSuccess(
          "Person added",
          `${values.fullName} is now a ${getRoleWord(values.role as MembershipRole).toLowerCase()}.`
        )
        form.reset()
        onSuccess?.()
      } catch (error) {
        showError(
          "Could not add",
          error instanceof Error ? error.message : "Something went wrong."
        )
      }
    })
  }

  return (
    <Form {...form}>
      <form className="grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
        {devMode ? (
          <div className="flex justify-end">
            <DashboardQuickFill
              className="h-11 w-full sm:w-auto"
              form={form}
              onFill={({ emailDomain }) =>
                applyDashboardDevFormFill(form, "role_assignment", undefined, {
                  emailDomain,
                })
              }
            />
          </div>
        ) : null}

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full name</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="off" className={fieldClass} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="off"
                  className={fieldClass}
                  type="email"
                />
              </FormControl>
              <FormDescription>
                If they already sign in with this email, the role is added to
                their login.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <FormControl>
                <NativeSelect
                  {...field}
                  className="w-full [&_select]:text-base"
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {getRoleWord(role)}
                    </option>
                  ))}
                </NativeSelect>
              </FormControl>
              {selectedRole ? (
                <FormDescription>
                  {getRoleAbility(selectedRole)}
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="makeDefault"
          render={({ field }) => (
            <FormItem className="flex min-h-11 flex-row items-center gap-3">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  className="size-5"
                  onCheckedChange={(checked) =>
                    field.onChange(checked === true)
                  }
                />
              </FormControl>
              <FormLabel className="text-base font-normal">
                Open this role first when they sign in
              </FormLabel>
            </FormItem>
          )}
        />
        <div className="border-t border-border pt-4 sm:flex sm:justify-end">
          <Button
            size="touch"
            className="w-full text-base sm:w-auto"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Adding…" : "Add person"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
