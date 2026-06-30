import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@halaalvest/ui/lib/utils"

export const halaalvestBrandColors = {
  green: "#1F7A3D",
  leaf: "#2F9A56",
  navy: "#0B1F36",
  gold: "#D6A63A",
  canvas: "#F7FAF7",
} as const

type HalaalvestLogoMarkProps = ComponentPropsWithoutRef<"svg"> & {
  monochrome?: boolean
}

export function HalaalvestLogoMark({
  className,
  monochrome = false,
  ...props
}: HalaalvestLogoMarkProps) {
  const navy = monochrome ? "currentColor" : halaalvestBrandColors.navy
  const green = monochrome ? "currentColor" : halaalvestBrandColors.green
  const leaf = monochrome ? "currentColor" : halaalvestBrandColors.leaf

  return (
    <svg
      viewBox="0 0 96 96"
      className={cn("block", className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M16 18h18v58h-8.5A9.5 9.5 0 0 1 16 66.5V18Z" fill={navy} />
      <path d="M34 49.5 57 39 50.5 52 34 60V49.5Z" fill={navy} />
      <path d="m45 58 12-7v25H45V58Z" fill={green} />
      <path d="m61 49 12-8v35H61V49Z" fill={green} />
      <path d="M77 36h13v40H77V36Z" fill={green} />
      <path
        d="M65 39c-7.4-2.8-10.4-9.7-7.8-17.9 8.1 2.2 11.9 9.2 7.8 17.9Z"
        fill={leaf}
      />
      <path
        d="M73.8 30.8c.6-10.1 6.9-16.5 17.1-17.4.2 10.2-6.4 17.4-17.1 17.4Z"
        fill={leaf}
      />
    </svg>
  )
}

type HalaalvestLogoProps = ComponentPropsWithoutRef<"span"> & {
  label?: string
  markClassName?: string
  showWordmark?: boolean
  wordmarkClassName?: string
}

export function HalaalvestLogo({
  className,
  label = "Halaalvest",
  markClassName,
  showWordmark = true,
  wordmarkClassName,
  ...props
}: HalaalvestLogoProps) {
  return (
    <span
      aria-label={label}
      role="img"
      className={cn("inline-flex items-center gap-2.5", className)}
      {...props}
    >
      <HalaalvestLogoMark
        aria-hidden="true"
        focusable="false"
        className={cn("size-8 shrink-0", markClassName)}
      />
      {showWordmark ? (
        <span
          aria-hidden="true"
          className={cn(
            "text-sm leading-none font-semibold tracking-tight",
            wordmarkClassName
          )}
        >
          <span className="text-[#0B1F36] dark:text-foreground">Halaal</span>
          <span className="text-[#1F7A3D]">vest</span>
        </span>
      ) : null}
    </span>
  )
}

type HalaalvestAppIconProps = ComponentPropsWithoutRef<"span"> & {
  environment?: "development" | "production"
}

export function HalaalvestAppIcon({
  className,
  environment = "production",
  ...props
}: HalaalvestAppIconProps) {
  return (
    <span
      aria-label={
        environment === "development" ? "Halaalvest development" : "Halaalvest"
      }
      role="img"
      className={cn(
        "relative inline-flex aspect-square items-center justify-center overflow-hidden rounded-lg border border-border bg-[#F7FAF7]",
        className
      )}
      {...props}
    >
      <HalaalvestLogoMark
        aria-hidden="true"
        focusable="false"
        className="size-[78%]"
      />
      {environment === "development" ? (
        <span
          aria-hidden="true"
          className="absolute right-0 bottom-0 flex size-4 items-center justify-center bg-[#D6A63A] text-[7px] leading-none font-bold text-[#0B1F36]"
        >
          D
        </span>
      ) : null}
    </span>
  )
}
