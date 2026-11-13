import { tenantRedirect } from "@/utils/tenant-redirect"

// The first-run checklist was replaced by One Path (Getting started), which
// sends a live cooperative home. Old links and bookmarks land there.
export default async function OnboardingPage() {
  await tenantRedirect("/getting-started")
  return null
}
