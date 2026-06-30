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
        className="pointer-events-none fixed right-0 bottom-6 left-0 z-50 flex h-12 justify-center"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <div className="pointer-events-auto relative h-12 min-w-[400px]">
          <motion.div
            className="backdrop-filter absolute inset-0 bg-[rgba(247,247,247,0.85)] backdrop-blur-lg dark:bg-[rgba(19,19,19,0.7)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <div className="relative flex h-12 items-center justify-between pr-2 pl-4">
            <span className="text-sm">{selectedCount} selected</span>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={onDeselect}
              >
                <span>Deselect all</span>
              </Button>

              {children}
            </div>
          </div>
        </div>
      </motion.div>
    </Portal>
  )
}
