"use client"

import { getRoleDisplayName, normalizeRole } from "@halaalvest/auth/roles"
import { Switch } from "@halaalvest/ui/components/switch"
import { toast } from "@halaalvest/ui/components/use-toast"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { getEmailLabel } from "@/lib/notifications/email-labels"
import { useTRPC } from "@/trpc/client"

/**
 * One switch per staff role for each email staff get. A switch saves at once
 * (no confirm step): turning an email off only stops that role's copy.
 */
export function EmailSettingsContent() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const settingsQuery = trpc.notifications.staffEmailSettings.queryOptions()
  const { data } = useSuspenseQuery(settingsQuery)
  const save = useMutation(
    trpc.notifications.setStaffEmailSetting.mutationOptions({
      onError: (error) =>
        toast({
          description: error.message,
          title: "Not saved",
          variant: "destructive",
        }),
      onSettled: () =>
        queryClient.invalidateQueries({ queryKey: settingsQuery.queryKey }),
      onSuccess: (_result, input) =>
        toast({
          title: `${getEmailLabel(input.notificationType)}: ${input.enabled ? "on" : "off"} for ${getRoleDisplayName(normalizeRole(input.role))}`,
        }),
    })
  )

  return (
    <div className="flex flex-col gap-1 px-6 pb-8">
      <p className="text-base text-muted-foreground">
        Choose which staff get each email. Members always get the emails about
        their own records.
      </p>
      <ul className="mt-3 divide-y divide-border">
        {data.map((setting) => (
          <li className="py-4" key={setting.notificationType}>
            <p className="text-base font-semibold text-foreground">
              {getEmailLabel(setting.notificationType)}
            </p>
            <div className="mt-2 flex flex-col">
              {setting.roles.map((role) => {
                const id = `email-${setting.notificationType}-${role.role}`
                const isSaving =
                  save.isPending &&
                  save.variables?.notificationType ===
                    setting.notificationType &&
                  save.variables?.role === role.role
                const checked =
                  isSaving && save.variables
                    ? save.variables.enabled
                    : role.enabled

                return (
                  <label
                    className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-(--ui-radius-control) px-2 hover:bg-muted"
                    htmlFor={id}
                    key={role.role}
                  >
                    <span className="text-base text-foreground">
                      {getRoleDisplayName(normalizeRole(role.role))}
                    </span>
                    <Switch
                      checked={checked}
                      disabled={isSaving}
                      id={id}
                      onCheckedChange={(enabled) =>
                        save.mutate({
                          enabled,
                          notificationType: setting.notificationType,
                          role: role.role,
                        })
                      }
                    />
                  </label>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
