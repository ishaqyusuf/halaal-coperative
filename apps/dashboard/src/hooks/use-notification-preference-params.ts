import { useQueryStates } from "nuqs"
import { createLoader, parseAsBoolean } from "nuqs/server"

/** Opens the staff email settings sheet (`?emailSettings=true`). */
export const notificationPreferenceParamsSchema = {
  emailSettings: parseAsBoolean,
}

export function useNotificationPreferenceParams() {
  const [params, setParams] = useQueryStates(notificationPreferenceParamsSchema)

  return {
    ...params,
    setParams,
  }
}

export const loadNotificationPreferenceParams = createLoader(
  notificationPreferenceParamsSchema
)
