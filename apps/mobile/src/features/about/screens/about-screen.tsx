import { GroupedRow, GroupedSection } from "@/components/app/grouped-section"
import { ScreenShell } from "@/components/app/screen-shell"
import { Icon } from "@/components/ui/icon"
import { Pressable } from "@/components/ui/pressable"
import { Text } from "@/components/ui/text"
import { Image, View } from "react-native"
import {
  aboutCopy,
  aboutLegalLinks,
  SUPPORT_EMAIL,
  type SocialAccount,
} from "../model/about-content"

const halaalvestLogo = require("../../../../assets/icons/app-icon.png")

const external = (
  <Icon className="size-sm text-muted-foreground" name="ArrowUpRight" />
)

/**
 * About HalaalVest on 01 Grouped settings (T28): who we are, how to reach us,
 * the app version, and the platform documents as a quiet footer.
 */
export function AboutScreen({
  copied,
  error,
  onBack,
  onCopyVersion,
  onEmail,
  onOpenLegal,
  onOpenSocial,
  onOpenUpdates,
  onOpenWebsite,
  socials,
  updateReady,
  version,
  website,
}: {
  copied: boolean
  error: string | null
  onBack: () => void
  onCopyVersion: () => void
  onEmail: () => void
  onOpenLegal: (path: string) => void
  onOpenSocial: (account: SocialAccount) => void
  onOpenUpdates: () => void
  onOpenWebsite: () => void
  socials: readonly SocialAccount[]
  updateReady: boolean
  version: string
  /** Host label of the public site, or null when this build has none. */
  website: string | null
}) {
  return (
    <ScreenShell back={onBack} testID="about-screen" title="About">
      <View className="items-center gap-[4px] pt-[4px]">
        <View className="mb-[8px] size-[76px] items-center justify-center overflow-hidden rounded-[22px] bg-hero-foreground">
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel="HalaalVest logo"
            className="size-[56px]"
            resizeMode="contain"
            source={halaalvestLogo}
          />
        </View>
        <Text accessibilityRole="header" variant="title">
          {aboutCopy.name}
        </Text>
        <Text className="text-muted-foreground" variant="small">
          {aboutCopy.tagline}
        </Text>
        <Text
          className="mt-[10px] text-center text-foreground-soft"
          variant="small"
        >
          {aboutCopy.body}
        </Text>
      </View>

      <GroupedSection caption="Contact">
        {website ? (
          <GroupedRow
            accessibilityLabel={`Website, ${website}, opens browser`}
            icon="Globe"
            onPress={onOpenWebsite}
            title="Website"
            trailing={external}
            value={website}
          />
        ) : null}
        <GroupedRow
          accessibilityLabel={`Email, ${SUPPORT_EMAIL}, opens your email app`}
          icon="Mail"
          onPress={onEmail}
          title="Email"
          tone="sky"
          trailing={external}
          value={SUPPORT_EMAIL}
        />
      </GroupedSection>

      {socials.length > 0 ? (
        <GroupedSection caption="Follow us">
          {socials.map((account) => (
            <GroupedRow
              accessibilityLabel={`${account.label} ${account.handle}, opens browser`}
              icon={account.icon}
              key={account.key}
              onPress={() => onOpenSocial(account)}
              title={account.label}
              tone="neutral"
              trailing={external}
              value={account.handle}
            />
          ))}
        </GroupedSection>
      ) : null}

      <GroupedSection caption="App">
        <GroupedRow
          accessibilityLabel={`Version ${version}. Copy`}
          icon="Info"
          onPress={onCopyVersion}
          title="Version"
          tone="neutral"
          value={copied ? "Copied" : version}
        />
        {updateReady ? (
          <GroupedRow
            chevron
            detail="Update to get the latest fixes."
            icon="Gift"
            onPress={onOpenUpdates}
            title="An update is ready"
          />
        ) : null}
      </GroupedSection>

      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          className="text-center text-destructive"
          variant="small"
        >
          {error}
        </Text>
      ) : null}

      <View className="items-center gap-[2px] pt-[10px]">
        {website ? (
          <View
            accessibilityLabel="Platform documents"
            className="flex-row flex-wrap justify-center gap-x-[16px]"
          >
            {aboutLegalLinks.map((link) => (
              <Pressable
                accessibilityLabel={`${link.label}, opens browser`}
                accessibilityRole="link"
                className="min-h-[44px] justify-center px-[2px]"
                key={link.path}
                onPress={() => onOpenLegal(link.path)}
              >
                <Text className="text-foreground-soft underline" variant="caption">
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <Text className="text-muted-foreground" variant="caption">
          © {new Date().getFullYear()} HalaalVest
        </Text>
      </View>
    </ScreenShell>
  )
}
