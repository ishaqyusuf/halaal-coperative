import type {
  NotificationEmailDelivery,
  NotificationQaArtifact,
  QaNotificationPreview,
} from "./core-types"

function isActionableUrl(value: string) {
  const normalized = value.trim()

  return normalized.length > 1 && normalized !== "#" && normalized !== "/"
}

export function createQaNotificationPreview(
  delivery: NotificationEmailDelivery,
): QaNotificationPreview | null {
  if (delivery.routing?.mode !== "qa_domain") {
    return null
  }

  const artifacts: NotificationQaArtifact[] = []

  if (isActionableUrl(delivery.draft.actionUrl)) {
    artifacts.push({
      kind: "link",
      label: delivery.draft.actionLabel,
      value: delivery.draft.actionUrl,
    })
  }

  for (const artifact of delivery.draft.qaArtifacts ?? []) {
    if (
      !artifacts.some(
        (candidate) =>
          candidate.kind === artifact.kind && candidate.value === artifact.value,
      )
    ) {
      artifacts.push(artifact)
    }
  }

  if (artifacts.length === 0) {
    return null
  }

  return {
    artifacts,
    deliveryStatus: delivery.status,
    id: delivery.messageId,
    notificationType: delivery.draft.notificationType,
    recipient: delivery.routing.originalRecipient,
  }
}

export function createQaNotificationPreviews(
  deliveries: readonly NotificationEmailDelivery[],
) {
  return deliveries
    .map(createQaNotificationPreview)
    .filter((preview): preview is QaNotificationPreview => Boolean(preview))
}
