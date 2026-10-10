import { PortalHost } from "@gorhom/portal"

export const DEV_QUICK_FILL_PORTAL_HOST = "dev-quick-fill"

export function DevQuickFillLayer() {
  return <PortalHost name={DEV_QUICK_FILL_PORTAL_HOST} />
}
