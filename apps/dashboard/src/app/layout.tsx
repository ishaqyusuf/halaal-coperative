import "@halaalvest/ui/globals.css"
import { NotificationsProvider } from "@halaalvest/notifications-react"
import { cn } from "@halaalvest/ui/lib/utils"
import { Inter } from "next/font/google"
import { NuqsAdapter } from "nuqs/adapters/next/app"
import { ThemeProvider } from "@/components/theme-provider"
import { TRPCReactProvider } from "@/trpc/client"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })
const iconUrl =
  process.env.NODE_ENV === "development"
    ? "/brand/halaalvest-icon-dev.svg"
    : "/brand/halaalvest-icon.svg"

export const metadata = {
  title: "Halaalvest Dashboard",
  description:
    "Tenant dashboard for halaalvest, covering members, contributions, loans, charges, and operations.",
  icons: {
    icon: [{ url: iconUrl, type: "image/svg+xml" }],
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
