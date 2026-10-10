import { DeviceSessionsRouteController } from "@/features/device-sessions/routes/device-sessions-route-controller"
import { useLocalSearchParams } from "expo-router"

const userIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default function DeviceSessionsRoute() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>()
  const rawUserId = params.userId
  const targetUserId =
    typeof rawUserId === "string" && userIdPattern.test(rawUserId)
      ? rawUserId
      : undefined
  const invalidTarget = rawUserId !== undefined && targetUserId === undefined

  return (
    <DeviceSessionsRouteController
      invalidTarget={invalidTarget}
      targetUserId={targetUserId}
    />
  )
}
