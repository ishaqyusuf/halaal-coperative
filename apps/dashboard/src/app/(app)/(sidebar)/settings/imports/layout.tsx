import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Imports | Halaalvest",
}

export default function ImportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
