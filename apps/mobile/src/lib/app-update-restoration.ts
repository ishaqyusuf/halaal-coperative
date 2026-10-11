/** Only stable browsing routes can resume. Forms/commands are deliberately excluded. */
export const APP_UPDATE_RESUME_ROUTES = [
  "/",
  "/more",
  "/updates",
  "/members",
  "/finance",
  "/reports",
  "/commitments",
  "/shares",
]
export const canInstallBuildFromRoute = (route: string) =>
  APP_UPDATE_RESUME_ROUTES.includes(route) ||
  route === "/" ||
  route === "/sign-in" ||
  route === "/mobile-access"
export type AppUpdateResume = {
  schemaVersion: 1
  route: string
  userId: string
  tenantId: string | null
  membershipId: string | null
  targetBuild: number
  savedAt: number
}
export function getAppUpdateResume(
  value: unknown,
  current: {
    userId: string
    tenantId: string | null
    membershipId: string | null
    buildNumber: number
    now: number
  }
): string | null {
  if (!value || typeof value !== "object") return null
  const snapshot = value as AppUpdateResume
  return snapshot.schemaVersion === 1 &&
    APP_UPDATE_RESUME_ROUTES.includes(snapshot.route) &&
    snapshot.userId === current.userId &&
    snapshot.tenantId === current.tenantId &&
    snapshot.membershipId === current.membershipId &&
    snapshot.targetBuild === current.buildNumber &&
    Number.isFinite(snapshot.savedAt) &&
    current.now >= snapshot.savedAt &&
    current.now - snapshot.savedAt < 86400000
    ? snapshot.route
    : null
}
