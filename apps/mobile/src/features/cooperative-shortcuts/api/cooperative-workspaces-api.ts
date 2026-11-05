import { isMobileDevFixtureSession } from "@/dev/mobile-dev-session"
import { createMobileTrpcClient } from "@/lib/mobile-trpc-client"
import type { MobileProfile } from "@/lib/session-store"

import type { CooperativeWorkspace } from "../model/shortcut-policy"

/**
 * Current-user cooperative discovery. Results are selection hints only;
 * `auth.mobile.switchRole` revalidates ownership and tenant state.
 */
export async function getCooperativeWorkspaces(
  profile: MobileProfile
): Promise<CooperativeWorkspace[]> {
  if (isMobileDevFixtureSession(profile.token)) {
    return [
      {
        isCurrent: true,
        memberships: (profile.availableRoles ?? []).map((role) => ({
          id: role.id,
          isDefault: role.isDefault,
          role: role.role,
          workspaceRole: role.workspaceRole,
        })),
        tenant: {
          id: profile.tenant.id,
          logoUrl: null,
          mark: profile.tenant.branding.mark,
          name: profile.tenant.name,
        },
      },
    ]
  }
  const response = await createMobileTrpcClient().auth.mobile.workspaces.query()
  return response.workspaces
}
