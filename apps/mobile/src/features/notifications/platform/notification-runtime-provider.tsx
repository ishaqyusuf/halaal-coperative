import AsyncStorage from "@react-native-async-storage/async-storage"
import Constants from "expo-constants"
import * as Notifications from "expo-notifications"
import { useRouter } from "expo-router"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { AppState, Linking, Platform } from "react-native"
import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import {
  disableNotificationPush,
  markNotificationsRead,
  registerNotificationPush,
} from "@/features/notifications/api/notification-center-api"
import { resolveNotificationDestination } from "@/features/notifications/model/notification-destination-registry"
import { toNotificationPlatformColor } from "@/features/notifications/platform/notification-platform-color"
import { useAuthContext } from "@/hooks/use-auth"
import { captureMobileError } from "@/lib/sentry"
import { THEME } from "@/lib/theme"

export type NotificationPermissionState =
  | "denied"
  | "granted"
  | "undetermined"
  | "unavailable"

export type NotificationRegistrationState =
  | "idle"
  | "registering"
  | "registered"
  | "failed"

type NotificationRuntimeContextValue = {
  clearDestinationError: () => void
  destinationError: string | null
  openSystemSettings: () => Promise<void>
  permissionState: NotificationPermissionState
  refreshPermission: () => Promise<NotificationPermissionState>
  registrationState: NotificationRegistrationState
  requestPermission: () => Promise<NotificationPermissionState>
  retryRegistration: () => Promise<void>
}

const NotificationRuntimeContext =
  createContext<NotificationRuntimeContextValue | null>(null)
const HANDLED_RESPONSES_KEY = "halaalvest_handled_notification_responses_v1"
const MAX_HANDLED_RESPONSES = 50
const NOTIFICATION_COLOR = toNotificationPlatformColor(THEME.light.brand)

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

function projectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  ) as string | null
}

function permissionState(status: Notifications.PermissionStatus) {
  if (status === Notifications.PermissionStatus.GRANTED) return "granted"
  if (status === Notifications.PermissionStatus.DENIED) return "denied"
  return "undetermined"
}

async function configureAndroidChannels() {
  if (Platform.OS !== "android") return
  await Promise.all([
    Notifications.setNotificationChannelAsync("security", {
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: NOTIFICATION_COLOR,
      name: "Security",
      vibrationPattern: [0, 250, 150, 250],
    }),
    Notifications.setNotificationChannelAsync("transactions", {
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: NOTIFICATION_COLOR,
      name: "Transactions",
      vibrationPattern: [0, 180],
    }),
    Notifications.setNotificationChannelAsync("updates", {
      importance: Notifications.AndroidImportance.DEFAULT,
      lightColor: NOTIFICATION_COLOR,
      name: "Cooperative updates",
    }),
  ])
}

async function claimNotificationResponse(notificationId: string) {
  try {
    const stored = await AsyncStorage.getItem(HANDLED_RESPONSES_KEY)
    const parsed = stored ? (JSON.parse(stored) as unknown) : []
    const ids = Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : []
    if (ids.includes(notificationId)) return false
    await AsyncStorage.setItem(
      HANDLED_RESPONSES_KEY,
      JSON.stringify([notificationId, ...ids].slice(0, MAX_HANDLED_RESPONSES))
    )
    return true
  } catch {
    return true
  }
}

export function NotificationRuntimeProvider({
  children,
}: {
  children: ReactNode
}) {
  const auth = useAuthContext()
  const router = useRouter()
  const profileRef = useRef(auth.profile)
  const [destinationError, setDestinationError] = useState<string | null>(null)
  const [permission, setPermission] =
    useState<NotificationPermissionState>("undetermined")
  const [registration, setRegistration] =
    useState<NotificationRegistrationState>("idle")
  profileRef.current = auth.profile

  const refreshPermission = useCallback(async () => {
    try {
      await configureAndroidChannels()
      const response = await Notifications.getPermissionsAsync()
      const next = permissionState(response.status)
      setPermission(next)
      return next
    } catch (error) {
      captureMobileError(error, "mobile.notifications.permission_read")
      setPermission("unavailable")
      return "unavailable" as const
    }
  }, [])

  const synchronizeRegistration = useCallback(async () => {
    if (!auth.profile) {
      setRegistration("idle")
      return
    }
    const status = await refreshPermission()
    if (status !== "granted") {
      setRegistration("idle")
      if (status !== "unavailable") {
        await disableNotificationPush(status).catch(() => undefined)
      }
      return
    }

    setRegistration("registering")
    try {
      const expoProjectId = projectId()
      const providerToken = isMobileDevFixtureSession()
        ? "ExponentPushToken[halaalvest-dev-fixture]"
        : expoProjectId
          ? (
              await Notifications.getExpoPushTokenAsync({
                projectId: expoProjectId,
              })
            ).data
          : null
      if (!providerToken) {
        setRegistration("failed")
        return
      }
      await registerNotificationPush({
        permissionStatus: "granted",
        platform: Platform.OS,
        projectId: expoProjectId,
        providerToken,
      })
      setRegistration("registered")
    } catch (error) {
      captureMobileError(error, "mobile.notifications.registration")
      setRegistration("failed")
    }
  }, [auth.profile, refreshPermission])

  const requestPermission = useCallback(async () => {
    const current = await refreshPermission()
    if (current === "denied" || current === "unavailable") return current
    if (current === "granted") {
      await synchronizeRegistration()
      return current
    }
    try {
      const response = await Notifications.requestPermissionsAsync()
      const next = permissionState(response.status)
      setPermission(next)
      if (next === "granted") await synchronizeRegistration()
      else await disableNotificationPush(next).catch(() => undefined)
      return next
    } catch (error) {
      captureMobileError(error, "mobile.notifications.permission_request")
      setPermission("unavailable")
      return "unavailable" as const
    }
  }, [refreshPermission, synchronizeRegistration])

  const processResponse = useCallback(
    async (response: Notifications.NotificationResponse) => {
      const result = resolveNotificationDestination(
        response.notification.request.content.data,
        profileRef.current
      )
      if (!result.ok) {
        setDestinationError(result.message)
        return
      }
      if (!(await claimNotificationResponse(result.payload.notificationId))) {
        return
      }
      setDestinationError(null)
      router.push(result.href as never)
      await markNotificationsRead([result.payload.notificationId]).catch(
        () => undefined
      )
    },
    [router]
  )

  useEffect(() => {
    void refreshPermission().then((status) => {
      if (status === "granted") void synchronizeRegistration()
    })
  }, [auth.profile?.activeMembershipId, refreshPermission, synchronizeRegistration])

  useEffect(() => {
    const responseSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        void processResponse(response)
      })
    const tokenSubscription = Notifications.addPushTokenListener(() => {
      void synchronizeRegistration()
    })
    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextState) => {
        if (nextState === "active") {
          void refreshPermission().then((status) => {
            if (status === "granted") void synchronizeRegistration()
          })
        }
      }
    )
    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!response) return
      void processResponse(response).finally(() => {
        void Notifications.clearLastNotificationResponseAsync()
      })
    })
    return () => {
      responseSubscription.remove()
      tokenSubscription.remove()
      appStateSubscription.remove()
    }
  }, [processResponse, refreshPermission, synchronizeRegistration])

  const value = useMemo<NotificationRuntimeContextValue>(
    () => ({
      clearDestinationError: () => setDestinationError(null),
      destinationError,
      openSystemSettings: async () => {
        await Linking.openSettings()
      },
      permissionState: permission,
      refreshPermission,
      registrationState: registration,
      requestPermission,
      retryRegistration: synchronizeRegistration,
    }),
    [
      destinationError,
      permission,
      refreshPermission,
      registration,
      requestPermission,
      synchronizeRegistration,
    ]
  )

  return (
    <NotificationRuntimeContext.Provider value={value}>
      {children}
    </NotificationRuntimeContext.Provider>
  )
}

export function useNotificationRuntime() {
  const value = useContext(NotificationRuntimeContext)
  if (!value) {
    throw new Error(
      "useNotificationRuntime must be used within NotificationRuntimeProvider"
    )
  }
  return value
}
