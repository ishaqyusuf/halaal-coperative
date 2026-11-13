import { getEmailDomain } from "@halaalvest/utils"
import { getSessionProfile } from "@/lib/session-store"
import { mobileDevQuickFillPerson } from "@/dev/mobile-dev-quick-fill"

const fallbackQaDomain = "ishaq.qa.test"

/**
 * The QA Domain for synthetic emails: the signed-in QA profile's own domain,
 * or the default tester domain for local mock sessions.
 */
export function mobileDevQuickFillEmailDomain() {
  const domain = getEmailDomain(getSessionProfile()?.user.email)
  return domain.endsWith(".qa.test") ? domain : fallbackQaDomain
}

/** A unique person whose email uses the active QA Domain. */
export function mobileDevQuickFillIdentity() {
  return mobileDevQuickFillPerson(mobileDevQuickFillEmailDomain())
}
