import { LaunchLanding } from "@/components/marketing/launch-landing"
import { PrelaunchLanding } from "@/components/marketing/prelaunch-landing"
import { getMarketingConfig } from "@/lib/marketing-config"

export default function Page() {
  const marketing = getMarketingConfig()

  return marketing.isLaunchReady ? <LaunchLanding /> : <PrelaunchLanding />
}
