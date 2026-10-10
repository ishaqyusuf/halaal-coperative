import { useRouter } from "expo-router"
import { useAuthContext } from "@/hooks/use-auth"
import { useState } from "react"
import { Linking, View } from "react-native"
import { Button } from "@/components/ui/button"
import { Text } from "@/components/ui/text"
import {
  mobileLegalLinks,
  publicLegalLinkPath,
  type MobileLegalLinkSlug,
} from "./legal-link-targets"

const configuredLegalOrigin = process.env.EXPO_PUBLIC_LEGAL_ORIGIN?.trim()
const legalOrigin = (() => {
  if (!configuredLegalOrigin) return null
  try {
    const url = new URL(configuredLegalOrigin)
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "")
    return url.protocol === "https:" &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password &&
      hostname !== "localhost" &&
      !/(?:^|\.)(?:localhost|local|internal|invalid|test|example)$/.test(
        hostname
      ) &&
      !/(?:^|\.)example\.(?:com|net|org)$/.test(hostname) &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(hostname) &&
      !hostname.startsWith("[")
      ? url.origin
      : null
  } catch {
    return null
  }
})()

export function LegalLinks() {
  const router = useRouter()
  const { profile } = useAuthContext()
  const [error, setError] = useState<string | null>(null)
  async function open(slug: MobileLegalLinkSlug) {
    setError(null)
    if (slug === "legal-agreements" && profile) {
      router.push("/legal-agreements")
      return
    }
    if (slug === "delete-account" && profile) {
      router.push("/account-privacy")
      return
    }
    try {
      if (!legalOrigin) return
      await Linking.openURL(`${legalOrigin}${publicLegalLinkPath(slug)}`)
    } catch {
      setError("The page could not open. Please try again later.")
    }
  }
  return (
    <View className="gap-1 border-t border-border pt-4">
      <Text className="text-sm font-semibold text-foreground">
        Account and privacy
      </Text>
      {!legalOrigin ? (
        <Text className="text-sm text-muted-foreground">
          Public legal and support pages are not available for this build yet.
        </Text>
      ) : null}
      {mobileLegalLinks.map(([slug, label]) => (
        <Button
          accessibilityLabel={
            (slug === "delete-account" || slug === "legal-agreements") &&
            profile
              ? label
              : legalOrigin
                ? `${label}, opens browser`
                : `${label}, unavailable`
          }
          className="min-h-11 justify-start"
          disabled={
            !legalOrigin &&
            !(
              profile &&
              (slug === "delete-account" || slug === "legal-agreements")
            )
          }
          key={slug}
          onPress={() => void open(slug)}
          variant="ghost"
        >
          <Text>{label}</Text>
        </Button>
      ))}
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-sm text-destructive"
        >
          {error}
        </Text>
      ) : null}
    </View>
  )
}
