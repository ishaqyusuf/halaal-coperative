import { CalendarPickerSheet } from "@/components/app/calendar-picker-sheet"
import { useEffect, useState } from "react"
import { Keyboard } from "react-native"

type CalendarRequest = {
  label: string
  value: string
  onChange: (value: string) => void
  selectionMode?: "date" | "month"
  minimumDate?: string
  maximumDate?: string
}

/** The owning form mounts this overlay and suspends its own Back handling. */
export function useFormCalendar(ownerVisible: boolean) {
  const [request, setRequest] = useState<CalendarRequest | null>(null)
  useEffect(() => {
    if (!ownerVisible) setRequest(null)
  }, [ownerVisible])
  const isOpen = ownerVisible && request !== null
  return {
    isOpen,
    open: (next: CalendarRequest) => {
      Keyboard.dismiss()
      setRequest(next)
    },
    overlay: request ? (
      <CalendarPickerSheet
        {...request}
        onClose={() => setRequest(null)}
        visible={isOpen}
      />
    ) : null,
  }
}
