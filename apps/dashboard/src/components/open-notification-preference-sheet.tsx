"use client"

import { Button } from "@halaalvest/ui/components/button"
import { useNotificationPreferenceParams } from "@/hooks/use-notification-preference-params"

export function OpenNotificationPreferenceSheet({
  enabled,
  label,
  notificationType,
  role,
}: {
  enabled: boolean
  label: string
  notificationType: string
  role: string | null
}) {
  const { setParams } = useNotificationPreferenceParams()

  return (
    <Button
      onClick={() =>
        setParams({
          notificationPreferenceEnabled: enabled ? "false" : "true",
          notificationPreferenceRole: role ?? "",
          notificationPreferenceType: notificationType,
        })
      }
      size="xs"
      type="button"
      variant={enabled ? "default" : "outline"}
    >
      {label} {enabled ? "on" : "off"}
    </Button>
  )
}
