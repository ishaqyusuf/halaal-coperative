"use client"

import { Button } from "@halaalvest/ui/components/button"
import { motion } from "framer-motion"
import type { ReactNode } from "react"
import { Portal } from "@/components/portal"

interface BottomBarProps {
  selectedCount: number
  onDeselect: () => void
  children: ReactNode
}

export function BottomBar({
  selectedCount,
  onDeselect,
  children,
}: BottomBarProps) {
  return (
    <Portal>
      <motion.div
        className="pointer-events-none fixed right-0 bottom-4 left-0 z-50 flex justify-center px-4 sm:bottom-6"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="pointer-events-auto relative min-h-12 w-full max-w-xl sm:w-auto sm:min-w-[400px]">
          <motion.div
            className="absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg backdrop-filter dark:bg-[rgba(19,19,19,0.7)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <div className="relative flex min-h-12 items-center justify-between gap-2 px-3 py-2 sm:pr-2 sm:pl-4">
            <span className="shrink-0 text-sm">{selectedCount} selected</span>

            <div className="flex min-w-0 items-center gap-1 overflow-x-auto sm:gap-2">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={onDeselect}
              >
                <span className="hidden sm:inline">Deselect all</span>
                <span className="sm:hidden">Deselect</span>
              </Button>

              {children}
            </div>
          </div>
        </div>
      </motion.div>
    </Portal>
  )
}
