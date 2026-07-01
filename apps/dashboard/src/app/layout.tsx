import "@halaalvest/ui/globals.css"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import { cn } from "@halaalvest/ui/lib/utils"
import { Inter } from "next/font/google"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ThemeProvider } from "@/components/theme-provider"
import { TRPCReactProvider } from "@/trpc/client"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
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
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans antialiased", inter.variable)}
    >
      <body>
        <NuqsAdapter>
          <TRPCReactProvider>
            <ThemeProvider>
              <NotificationsProvider>{children}</NotificationsProvider>
            </ThemeProvider>
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
