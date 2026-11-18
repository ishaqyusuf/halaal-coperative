import { getQaAcceleratorEnvCapability } from "@halaalvest/api/qa-accelerator-config"
import { EventsProvider } from "@halaalvest/events/client"
import "@halaalvest/ui/globals.css"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import type { Metadata } from "next"
import { Hedvig_Letters_Sans, Hedvig_Letters_Serif } from "next/font/google"
import { QaFormAccess } from "@/components/qa-form-access"
import { getMarketingConfig } from "@/lib/marketing-config"
import {
  createMarketingSocialMetadata,
  marketingSiteUrl,
} from "@/lib/social-metadata"
import "./readability.css"
import "./homepage.css"

const hedvigSans = Hedvig_Letters_Sans({
  weight: "400",
  subsets: ["latin"],
  display: "optional",
  variable: "--font-hedvig-sans",
  preload: true,
  adjustFontFallback: true,
  fallback: ["system-ui", "Arial"],
})

const hedvigSerif = Hedvig_Letters_Serif({
  weight: "400",
  subsets: ["latin"],
  display: "optional",
  variable: "--font-hedvig-serif",
  preload: true,
  adjustFontFallback: true,
  fallback: ["Georgia", "Times New Roman", "serif"],
})

const marketing = getMarketingConfig()
const iconName =
  process.env.NODE_ENV === "development"
    ? "halaalvest-icon-dev"
    : "halaalvest-icon"
const iconUrl = `/brand/${iconName}.svg`
const iconDarkUrl = `/brand/${iconName}-dark.svg`
const title = !marketing.showHomePage
  ? "halaalvest | Sign up"
  : marketing.isLaunchReady
    ? "halaalvest"
    : "halaalvest | Pre-Launch"
const description = !marketing.showHomePage
  ? "Sign up your cooperative for HalaalVest records and interest-free financing with separately shown charges."
  : marketing.isLaunchReady
    ? "HalaalVest helps cooperatives manage contributions, interest-free financing with separately shown charges, and member records."
    : "Pre-launch landing page for halaalvest. Sign up before the cooperative platform goes live."

export const metadata: Metadata = {
  ...createMarketingSocialMetadata({ description, title }),
  metadataBase: new URL(marketingSiteUrl),
  icons: {
    icon: [
      {
        url: iconUrl,
        type: "image/svg+xml",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: iconDarkUrl,
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    shortcut: [{ url: iconUrl, type: "image/svg+xml" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const qaAvailable = getQaAcceleratorEnvCapability({
    clientKind: "web",
    contractVersion: 1,
  }).available

  return (
    <html lang="en" className="antialiased">
      <body
        className={`${hedvigSans.variable} ${hedvigSerif.variable} font-sans`}
      >
        <NotificationsProvider>
          <EventsProvider surface="marketing">{children}</EventsProvider>
          {qaAvailable ? <QaFormAccess /> : null}
        </NotificationsProvider>
      </body>
    </html>
  )
}
