"use client"

import { Button } from "@halaalvest/ui/components/button"
import { cn } from "@halaalvest/ui/lib/utils"
import { ArrowLeft, ArrowRight } from "lucide-react"

interface HorizontalPaginationProps {
  canScrollLeft: boolean
  canScrollRight: boolean
  onScrollLeft: () => void
  onScrollRight: () => void
  className?: string
}

export function HorizontalPagination({
  canScrollLeft,
  canScrollRight,
  onScrollLeft,
  onScrollRight,
  className,
}: HorizontalPaginationProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Button
        variant="outline"
        size="icon-xs"
        disabled={!canScrollLeft}
        aria-label="Scroll left"
        onClick={onScrollLeft}
      >
        <ArrowLeft
          className={cn("size-3.5", canScrollLeft && "text-primary")}
        />
      </Button>
      <Button
        variant="outline"
        size="icon-xs"
        disabled={!canScrollRight}
        aria-label="Scroll right"
        onClick={onScrollRight}
      >
        <ArrowRight
          className={cn("size-3.5", canScrollRight && "text-primary")}
        />
      </Button>
    </div>
  )
}
