import { publicSiteOrigin } from "@/lib/public-site-origin"
import Constants from "expo-constants"
import { useRouter } from "expo-router"
import * as Updates from "expo-updates"
import { useEffect, useState } from "react"
import { Clipboard, Linking } from "react-native"
import {
  formatAppVersion,
  siteLabel,
  socialAccounts,
  SUPPORT_EMAIL,
  visibleSocialAccounts,
} from "../model/about-content"
import { AboutScreen } from "../screens/about-screen"

const version = formatAppVersion(
  Constants.expoConfig?.version ?? Constants.nativeAppVersion,
  Constants.nativeBuildVersion
)
const socials = visibleSocialAccounts(socialAccounts)

export function AboutRouteController() {
  const router = useRouter()
  const { isUpdateAvailable, isUpdatePending } = Updates.useUpdates()
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2000)
    return () => clearTimeout(timer)
  }, [copied])

  async function open(url: string) {
    setError(null)
    try {
      await Linking.openURL(url)
    } catch {
      setError("The page could not open. Please try again later.")
    }
  }

  return (
    <AboutScreen
      copied={copied}
      error={error}
      onBack={() => (router.canGoBack() ? router.back() : router.replace("/"))}
      onCopyVersion={() => {
        Clipboard.setString(version)
        setCopied(true)
      }}
      onEmail={() =>
        void open(
          `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`HalaalVest app ${version}`)}`
        )
      }
      onOpenLegal={(path) => {
        if (publicSiteOrigin) void open(`${publicSiteOrigin}${path}`)
      }}
      onOpenSocial={(account) => void open(account.url)}
      onOpenUpdates={() => router.push("/updates")}
      onOpenWebsite={() => {
        if (publicSiteOrigin) void open(publicSiteOrigin)
      }}
      socials={socials}
      updateReady={isUpdateAvailable || isUpdatePending}
      version={version}
      website={publicSiteOrigin ? siteLabel(publicSiteOrigin) : null}
    />
  )
}
