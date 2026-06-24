import type { NotificationHrefActionDescriptor } from "./core-types"

export function createHrefNotificationAction(input: {
  actionId?: string
  href: string
  label: string
}): NotificationHrefActionDescriptor {
  return {
    actionId: input.actionId,
    href: input.href,
    kind: "href",
    label: input.label,
  }
}
