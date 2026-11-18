import { Public_Sans, Schibsted_Grotesk } from "next/font/google"

// The homepage's two faces ("Two people, one line"). /signup uses them too, so
// the sign-up page reads as the same product.
const homepageDisplay = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-hp-display",
  fallback: ["Helvetica Neue", "Arial"],
})

const homepageText = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-hp-text",
  fallback: ["system-ui", "Arial"],
})

/** Defines --font-hp-display and --font-hp-text on the element. */
export const homepageFontVariables = `${homepageDisplay.variable} ${homepageText.variable}`
