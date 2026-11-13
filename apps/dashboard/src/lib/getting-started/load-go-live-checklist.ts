import {
  getGoLiveFinancingReadiness,
  getGoLiveOwnerMember,
} from "@halaalvest/db"
import type { GoLiveChecklistData } from "@/lib/getting-started/go-live-readiness"

/**
 * Owner KYC and financing readiness for the Go live checklist, read for the
 * signed-in admin. Shared by Getting Started step 11 and the finance
 * migration page so both surfaces apply the same rules.
 */
export async function loadGoLiveChecklistData(input: {
  tenantId: string
  user: { email?: string | null; id: string } | null | undefined
}): Promise<GoLiveChecklistData> {
  const [financing, owner] = await Promise.all([
    getGoLiveFinancingReadiness(input.tenantId),
    input.user
      ? getGoLiveOwnerMember({
          email: input.user.email,
          tenantId: input.tenantId,
          userId: input.user.id,
        })
      : Promise.resolve(null),
  ])

  return { financing, owner }
}
