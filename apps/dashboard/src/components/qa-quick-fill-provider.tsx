"use client"

import { createContext, type ReactNode, use } from "react"
import type { QaQuickFillContext } from "@halaalvest/utils"
import { QaPreviewFlashConsumer } from "@/components/qa-preview-flash-consumer"
import { UniversalQaQuickFill } from "@/components/universal-qa-quick-fill"

const disabledQuickFill: QaQuickFillContext = {
  emailDomain: "",
  enabled: false,
  qaDomains: [],
}

const QaQuickFillContext = createContext<QaQuickFillContext>(disabledQuickFill)

export function QaQuickFillProvider({
  children,
  value,
}: {
  children: ReactNode
  value: QaQuickFillContext
}) {
  return (
    <QaQuickFillContext value={value}>
      {children}
      <UniversalQaQuickFill quickFill={value} />
      <QaPreviewFlashConsumer enabled={value.enabled} />
    </QaQuickFillContext>
  )
}

export function useQaQuickFill() {
  return use(QaQuickFillContext)
}
