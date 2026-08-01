import "@halaalvest/ui/globals.css"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import { Hedvig_Letters_Sans, Hedvig_Letters_Serif } from "next/font/google"
import { QaPreviewFlashConsumer } from "@/components/qa-preview-flash-consumer"
import { getMarketingConfig } from "@/lib/marketing-config"
import "./readability.css"

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

export const metadata = {
  title: !marketing.showHomePage
    ? "halaalvest | Early Access"
    : marketing.isLaunchReady
      ? "halaalvest"
      : "halaalvest | Pre-Launch",
  description: !marketing.showHomePage
    ? "Early access request entry for halaalvest, the interest-free cooperative operations platform."
    : marketing.isLaunchReady
      ? "Launch marketing site for halaalvest, the interest-free cooperative operations platform."
      : "Pre-launch landing page for halaalvest. Join early access before the cooperative platform goes live.",
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
  return (
    <html lang="en" className="antialiased">
      <body
        className={`${hedvigSans.variable} ${hedvigSerif.variable} font-sans`}
      >
        <NotificationsProvider>
          {children}
          <QaPreviewFlashConsumer />
        </NotificationsProvider>
      </body>
    </html>
  )
}
