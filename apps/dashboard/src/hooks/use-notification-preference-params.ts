import { useQueryStates } from "nuqs"
import { createLoader, parseAsString } from "nuqs/server"

export const notificationPreferenceParamsSchema = {
  notificationPreferenceEnabled: parseAsString,
  notificationPreferenceRole: parseAsString,
  notificationPreferenceType: parseAsString,
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
