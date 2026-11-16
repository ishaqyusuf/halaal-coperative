import { cn } from "@/lib/utils"
import * as Slot from "@rn-primitives/slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"
import { Platform, Text as RNText, type Role } from "react-native"

const textVariants = cva(
  cn(
    "text-base text-foreground",
    Platform.select({
      web: "select-text",
    })
  ),
  {
    variants: {
      color: {
        default: "text-foreground",
        secondary: "text-muted-foreground",
      },
      variant: {
        default: "",
        h1: cn(
          "text-center text-4xl font-extrabold tracking-tight",
          Platform.select({ web: "scroll-m-20 text-balance" })
        ),
        h2: cn(
          "border-b border-border pb-2 text-3xl font-semibold tracking-tight",
          Platform.select({ web: "scroll-m-20 first:mt-0" })
        ),
        h3: cn(
          "text-2xl font-semibold tracking-tight",
          Platform.select({ web: "scroll-m-20" })
        ),
        h4: cn(
          "text-xl font-semibold tracking-tight",
          Platform.select({ web: "scroll-m-20" })
        ),
        p: "mt-3 leading-7 sm:mt-6",
        blockquote: "mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6",
        code: cn(
          "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
        ),
        lead: "text-xl text-muted-foreground",
        large: "text-lg font-semibold",
        muted: "text-sm text-muted-foreground",
        // 02 Brand native type scale (lib/design-tokens.ts typeScale).
        // Exact px: NativeWind here resolves rem as 14px (text-base = 14).
        hero: "text-[36px] leading-[42px] font-extrabold tracking-tight",
        screenTitle: "text-[26px] leading-[32px] font-extrabold tracking-tight",
        title: "text-[20px] leading-[26px] font-extrabold tracking-tight",
        section: "text-[16px] leading-[22px] font-extrabold",
        body: "text-[16px] leading-[22px] font-medium",
        small: "text-[14px] leading-[20px] font-medium",
        label: "text-[13px] leading-[18px] font-bold",
        caption: "text-[12px] leading-[16px] font-bold",
        money: "text-[16px] leading-[22px] font-extrabold",
      },
    },
    defaultVariants: {
      variant: "default",
      color: "default",
    },
  }
)

type TextVariantProps = VariantProps<typeof textVariants>

type TextVariant = NonNullable<TextVariantProps["variant"]>

/** Money and hero figures line their digits up in columns. */
const TABULAR_VARIANTS = new Set<TextVariant>(["hero", "money"])
const TABULAR_STYLE = { fontVariant: ["tabular-nums" as const] }

const ROLE: Partial<Record<TextVariant, Role>> = {
  screenTitle: "heading",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  blockquote: Platform.select({ web: "blockquote" as Role }),
  code: Platform.select({ web: "code" as Role }),
}

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: "1",
  h2: "2",
  h3: "3",
  h4: "4",
}

const TextClassContext = React.createContext<string | undefined>(undefined)

function Text({
  className,
  asChild = false,
  variant = "default",
  children,
  color,
  style,
  tabular = false,
  ...props
}: React.ComponentProps<typeof RNText> &
  TextVariantProps &
  React.RefAttributes<RNText> & {
    asChild?: boolean
    /** Column-aligned digits for amounts and counts. */
    tabular?: boolean
  }) {
  const textClass = React.useContext(TextClassContext)
  const Component: any = asChild ? Slot.Text : RNText
  return (
    <Component
      className={cn(textVariants({ variant, color }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      {...(style ? { style } : null)}
      {...props}
    >
      {tabular || (variant && TABULAR_VARIANTS.has(variant)) ? (
        // A nested Text inherits the className styles and adds tabular
        // digits. react-native-css drops className styles from an element
        // that also receives an inline style, so the outer stays class-only.
        <RNText style={TABULAR_STYLE}>{children}</RNText>
      ) : (
        children
      )}
    </Component>
  )
}

export { Text, TextClassContext }
