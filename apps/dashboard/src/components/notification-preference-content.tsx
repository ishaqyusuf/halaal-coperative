"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useNotificationPreferenceParams } from "@/hooks/use-notification-preference-params"
import { saveNotificationPreferenceAction } from "@/lib/dashboard-actions"

export function NotificationPreferenceContent() {
  const {
    notificationPreferenceEnabled,
    notificationPreferenceRole,
    notificationPreferenceType,
  } = useNotificationPreferenceParams()

  return (
    <form
      action={saveNotificationPreferenceAction}
      className="grid gap-4 px-6"
    >
      <input
        name="notificationType"
        type="hidden"
        value={notificationPreferenceType ?? ""}
      />
      <input name="channel" type="hidden" value="email" />
      <input
        name="role"
        type="hidden"
        value={notificationPreferenceRole ?? ""}
      />
      <input
        name="enabled"
        type="hidden"
        value={notificationPreferenceEnabled ?? ""}
      />
      <p className="text-sm text-muted-foreground">
        {notificationPreferenceEnabled === "true" ? "Enable" : "Disable"} email
        notifications for{" "}
        {notificationPreferenceRole ? notificationPreferenceRole : "all roles"}{" "}
        on {notificationPreferenceType}.
      </p>
      <Button type="submit" variant="outline">
        Save preference
      </Button>
    </form>
  )
}
