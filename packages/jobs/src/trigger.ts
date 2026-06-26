import type { JobHandler, RetryOptions } from "./queue"
import { runInBackground } from "./queue"
import { tasks } from "@trigger.dev/sdk/v3"

export type BackgroundTask<TPayload = unknown> = {
  id: string
  run: (payload: TPayload) => Promise<unknown>
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
    await tasks.trigger(task.id, payload as never)
    return
  }

  await runInBackground(handler, payload, options)
}
