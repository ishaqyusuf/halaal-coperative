import { TextClassContext } from "@/components/ui/text"
import { useColors } from "@/hooks/use-color"
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"
import { ActivityIndicator, Platform, Pressable, View } from "react-native"
import { useReducedMotion } from "react-native-reanimated"

/**
 * 02 Brand native button: 52 tall, radius 16, 16/700 label, press scale .97
 * over 120ms. `size="sm"`/`"icon"` keep the 44pt minimum touch target.
 */
const buttonVariants = cva(
  cn(
    "group min-h-[44px] min-w-[44px] shrink-0 flex-row items-center justify-center gap-[8px] rounded-2xl",
    Platform.select({
      web: "whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          "bg-primary active:bg-primary/90",
          Platform.select({ web: "hover:bg-primary/90" })
        ),
        destructive: cn(
          "bg-destructive active:bg-destructive/90",
          Platform.select({
            web: "hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
          })
        ),
        outline: cn(
          "border border-border bg-card active:bg-muted",
          Platform.select({ web: "hover:bg-muted" })
        ),
        secondary: cn(
          "bg-accent active:bg-accent/80",
          Platform.select({ web: "hover:bg-accent/80" })
        ),
        ghost: cn(
          "active:bg-accent dark:active:bg-accent/50",
          Platform.select({ web: "hover:bg-accent dark:hover:bg-accent/50" })
        ),
        link: "",
      },
      size: {
        default: cn(
          "h-[52px] px-[20px]",
          Platform.select({ web: "has-[>svg]:px-4" })
        ),
        sm: cn(
          "min-h-[44px] gap-[6px] rounded-xl px-[16px]",
          Platform.select({ web: "has-[>svg]:px-3" })
        ),
        lg: cn(
          "h-[52px] px-[24px]",
          Platform.select({ web: "has-[>svg]:px-5" })
        ),
        icon: "h-[44px] w-[44px] rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const buttonTextVariants = cva(
  cn(
    "text-[16px] font-bold text-foreground",
    Platform.select({ web: "pointer-events-none transition-colors" })
  ),
  {
    variants: {
      variant: {
        default: "text-primary-foreground",
        destructive: "text-destructive-foreground",
        outline: "text-foreground",
        secondary: "text-accent-foreground",
        // Neutral: legacy screens use ghost buttons as tabs and toolbars.
        ghost: "text-foreground",
        link: cn(
          "text-primary group-active:underline",
          Platform.select({
            web: "underline-offset-4 group-hover:underline hover:underline",
          })
        ),
      },
      size: {
        default: "",
        sm: "text-[14px]",
        lg: "",
        icon: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants> & {
    /** Keeps the label, adds a spinner and blocks repeat presses. */
    loading?: boolean
  }

function Button({
  accessibilityState,
  children,
  className,
  disabled,
  loading = false,
  role,
  variant,
  size,
  ...props
}: ButtonProps) {
  const colors = useColors()
  const reduceMotion = useReducedMotion()
  const isDisabled = Boolean(disabled) || loading
  const resolvedAccessibilityState =
    disabled == null && !loading
      ? accessibilityState
      : { ...accessibilityState, busy: loading, disabled: isDisabled }
  const spinnerColor =
    variant === "outline" || variant === "ghost" || variant === "link"
      ? colors.foreground
      : variant === "secondary"
        ? colors.accentForeground
        : variant === "destructive"
          ? colors.destructiveForeground
          : colors.primaryForeground

  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant, size })}>
      <Pressable
        className={cn(
          disabled && !loading && "opacity-40",
          loading && "opacity-90",
          buttonVariants({ variant, size }),
          !reduceMotion &&
            !isDisabled &&
            "will-change-animation transition-transform active:scale-[0.97]",
          className
        )}
        accessibilityState={resolvedAccessibilityState}
        disabled={isDisabled}
        role={role ?? "button"}
        {...props}
      >
        {(state) => (
          <>
            {loading ? (
              <View accessible={false} className="items-center justify-center">
                <ActivityIndicator color={spinnerColor} size="small" />
              </View>
            ) : null}
            {typeof children === "function" ? children(state) : children}
          </>
        )}
      </Pressable>
    </TextClassContext.Provider>
  )
}

export { Button, buttonTextVariants, buttonVariants }
export type { ButtonProps }
