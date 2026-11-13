import { EventsProvider } from "@halaalvest/events/client"
import "@halaalvest/ui/globals.css"
import "./dashboard-theme.css"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import { cn } from "@halaalvest/ui/lib/utils"
import { Inter, Inter_Tight } from "next/font/google"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { QaQuickFillProvider } from "@/components/qa-quick-fill-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { getQaPreviewFlashKey } from "@/lib/qa-preview-flash.server"
import { getRequestQaQuickFillContext } from "@/lib/server-context"
import { TRPCReactProvider } from "@/trpc/client"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
})
const iconName =
  process.env.NODE_ENV === "development"
    ? "halaalvest-icon-dev"
    : "halaalvest-icon"
const iconUrl = `/brand/${iconName}.svg`
const iconDarkUrl = `/brand/${iconName}-dark.svg`

export const metadata = {
  title: "Halaalvest Dashboard",
  description:
    "Cooperative dashboard for halaalvest, covering members, contributions, loans, charges, and operations.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const [quickFill, qaPreviewKey] = await Promise.all([
    getRequestQaQuickFillContext(),
    getQaPreviewFlashKey(),
  ])

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        inter.variable,
        interTight.variable
      )}
    >
      <body>
        <NuqsAdapter>
          <TRPCReactProvider>
            <ThemeProvider>
              <EventsProvider surface="dashboard">
                <NotificationsProvider>
                  <QaQuickFillProvider
                    previewKey={qaPreviewKey}
                    value={quickFill}
                  >
                    {children}
                  </QaQuickFillProvider>
                </NotificationsProvider>
              </EventsProvider>
            </ThemeProvider>
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
