import { isMobileQaClientBuild } from "@/dev/mobile-dev-session"
import {
  DesignSystemGalleryScreen,
  type GallerySheet,
  type GalleryView,
} from "@/features/design-system/screens/design-system-gallery-screen"
import { Redirect, useLocalSearchParams } from "expo-router"

const VIEWS = new Set<GalleryView>([
  "kit",
  "list",
  "hero",
  "success",
  "error",
  "submitting",
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
 */
export function DesignSystemRouteController() {
  const params = useLocalSearchParams<{ sheet?: string; view?: string }>()
  if (!isMobileQaClientBuild) return <Redirect href="/" />

  const view = VIEWS.has(params.view as GalleryView)
    ? (params.view as GalleryView)
    : "kit"
  const sheet = SHEETS.has(params.sheet as GallerySheet)
    ? (params.sheet as GallerySheet)
    : null
  return <DesignSystemGalleryScreen initialSheet={sheet} view={view} />
}
