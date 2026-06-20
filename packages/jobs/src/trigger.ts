import type { JobHandler, RetryOptions } from "./queue"
import { runInBackground } from "./queue"

export type BackgroundTask<TPayload = unknown> = {
  id: string
  run: (payload: TPayload) => Promise<void>
}

export function isTriggerConfigured() {
  return Boolean(process.env.TRIGGER_SECRET_KEY)
}

export async function triggerJob<TPayload>(
  task: BackgroundTask<TPayload>,
  handler: JobHandler<TPayload>,
  payload: TPayload,
  options: RetryOptions = {},
) {
  if (isTriggerConfigured()) {
    // Local placeholder until Trigger.dev is added to this workspace.
    await task.run(payload)
    return
  }

  await runInBackground(handler, payload, options)
}
