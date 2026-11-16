import { isMobileQaClientBuild } from "@/dev/mobile-dev-session"
import {
  DesignSystemGalleryScreen,
  type GalleryPose,
  type GallerySheet,
  type GalleryView,
} from "@/features/design-system/screens/design-system-gallery-screen"
import { Redirect, useLocalSearchParams } from "expo-router"

const VIEWS = new Set<GalleryView>([
  "kit",
  "lanes",
  "list",
  "hero",
  "success",
  "error",
  "submitting",
  "boot-loading",
  "boot-fatal",
  "boot-offline",
])
const SHEETS = new Set<GallerySheet>([
  "floating",
  "auto-long",
  "form",
  "confirm",
  "date",
  "select",
])

/**
 * T01 design-system gallery: every primitive and state, for device
 * screenshots. Dev and QA builds only; production redirects home and the
 * route params are ignored there (check:dev-fixtures, production-absence).
 * Deep link: halaalvest-dev:///design-system?view=kit&sheet=date
 * (lanes: ?view=lanes, optionally &pose=swipe|tap for a frozen mid-motion frame)
 */
export function DesignSystemRouteController() {
  const params = useLocalSearchParams<{
    pose?: string
    sheet?: string
    view?: string
  }>()
  if (!isMobileQaClientBuild) return <Redirect href="/" />

  const view = VIEWS.has(params.view as GalleryView)
    ? (params.view as GalleryView)
    : "kit"
  const sheet = SHEETS.has(params.sheet as GallerySheet)
    ? (params.sheet as GallerySheet)
    : null
  // Dev-only frozen motion frames for screenshots (lanes view only).
  const pose: GalleryPose | null =
    params.pose === "swipe" || params.pose === "tap" ? params.pose : null
  return (
    <DesignSystemGalleryScreen initialSheet={sheet} pose={pose} view={view} />
  )
}
