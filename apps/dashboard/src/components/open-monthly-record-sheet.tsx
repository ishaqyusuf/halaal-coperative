"use client"

import type { ReactNode } from "react"
import { Button } from "@halaalvest/ui/components/button"
import { CheckIcon, PlusIcon, RefreshCwIcon, Settings2Icon, XIcon } from "lucide-react"
import { useMonthlyRecordParams } from "@/hooks/use-monthly-record-params"

export function OpenMonthlyRecordGenerateSheet() {
  const { setParams } = useMonthlyRecordParams()

  return (
    <Button
      onClick={() =>
        setParams({
          monthlyRecordMemberId: null,
          monthlyRecordSheetType: "generate",
          targetMonth: null,
          targetYear: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <RefreshCwIcon data-icon="inline-start" />
      Generate due records now
    </Button>
  )
}

export function OpenMonthlyRecordSettingsSheet() {
  const { setParams } = useMonthlyRecordParams()

  return (
    <Button
      onClick={() =>
        setParams({
          monthlyRecordMemberId: null,
          monthlyRecordSheetType: "settings",
          targetMonth: null,
          targetYear: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <Settings2Icon data-icon="inline-start" />
      Edit settings
    </Button>
  )
}

export function OpenMonthlyRecordCreateSheet({
  children,
  month,
  year,
}: {
  children: ReactNode
  month: number
  year: number
}) {
  const { setParams } = useMonthlyRecordParams()

  return (
    <button
      className="block w-full text-left"
      onClick={() =>
        setParams({
          monthlyRecordMemberId: null,
          monthlyRecordSheetType: "create",
          targetMonth: month,
          targetYear: year,
        })
      }
      type="button"
    >
      <PlusIcon className="sr-only" />
      {children}
    </button>
  )
}

export function OpenMonthlyRecordApplySheet({
  disabled,
  monthlyRecordMemberId,
}: {
  disabled?: boolean
  monthlyRecordMemberId: string
}) {
  const { setParams } = useMonthlyRecordParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          monthlyRecordMemberId,
          monthlyRecordSheetType: "apply",
          targetMonth: null,
          targetYear: null,
        })
      }
      size="sm"
      type="button"
    >
      <CheckIcon data-icon="inline-start" />
      Apply
    </Button>
  )
}

export function OpenMonthlyRecordCancelSheet({
  disabled,
  monthlyRecordMemberId,
}: {
  disabled?: boolean
  monthlyRecordMemberId: string
}) {
  const { setParams } = useMonthlyRecordParams()

  return (
    <Button
      disabled={disabled}
      onClick={() =>
        setParams({
          monthlyRecordMemberId,
          monthlyRecordSheetType: "cancel",
          targetMonth: null,
          targetYear: null,
        })
      }
      size="sm"
      type="button"
      variant="outline"
    >
      <XIcon data-icon="inline-start" />
      Cancel
    </Button>
  )
}
