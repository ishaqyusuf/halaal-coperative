-- Archive tenant-scoped legacy delivery rows before removing the retired outbox.
INSERT INTO "audit_logs" (
  "tenant_id",
  "actor_type",
  "action",
  "entity_type",
  "entity_id",
  "metadata",
  "occurred_at"
)
SELECT
  "tenant_id",
  'system'::"AuditActorType",
  CASE "status"
    WHEN 'sent' THEN 'notification.email_sent'
    WHEN 'failed' THEN 'notification.email_failed'
    ELSE 'notification.email_queued'
  END,
  'NotificationEmail',
  COALESCE("message_id", "id"::text),
  jsonb_strip_nulls(
    jsonb_build_object(
      'actionLabel', "action_label",
      'actionUrl', "action_url",
      'attempts', "attempts",
      'bodyText', "body_text",
      'channel', "channel",
      'errorMessage', "error_message",
      'legacyOutboxId', "id"::text,
      'metadata', "metadata",
      'notificationType', "notification_type",
      'recipient', "recipient",
      'source', "source",
      'status', "status"::text,
      'subject', "subject"
    )
  ),
  COALESCE("sent_at", "updated_at", "created_at")
FROM "notification_outbox"
WHERE "tenant_id" IS NOT NULL;

DROP TABLE IF EXISTS "notification_outbox";
DROP TYPE IF EXISTS "NotificationDeliveryStatus";
