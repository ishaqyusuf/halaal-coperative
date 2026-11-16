import { AppSheet } from "@/components/app/app-sheet"
import { DatePicker } from "@/components/ui/date-picker"
import { useFormFieldControl } from "@/components/ui/form-field"
import { FieldTrigger } from "@/components/ui/select-field"
import { formatDateOnly } from "@/lib/date-only"
import { useState } from "react"

/**
 * Date input that opens the 02 calendar in a floating picker sheet. Stores
 * date-only strings (YYYY-MM-DD); min/max are enforced in the calendar.
 */
export function DateField({
  disabled,
  maximumDate,
  minimumDate,
  onChange,
  placeholder = "Select date",
  sheetTitle,
  testID,
  today,
  value,
}: {
  disabled?: boolean
  maximumDate?: string
  minimumDate?: string
  onChange: (value: string) => void
  placeholder?: string
  sheetTitle?: string
  testID?: string
  today?: string
  value: string | null | undefined
}) {
  const field = useFormFieldControl()
  const [open, setOpen] = useState(false)
  return (
    <>
      <FieldTrigger
        accessibilityHint="Opens a calendar. The keyboard will not open."
        disabled={disabled}
        icon="Calendar"
        onPress={() => setOpen(true)}
        placeholder={placeholder}
        testID={testID}
        trailingIcon={null}
        value={value ? formatDateOnly(value) : null}
      />
      <AppSheet
        onClose={() => setOpen(false)}
        title={sheetTitle ?? field?.label ?? "Choose date"}
        variant="picker"
        visible={open}
      >
        <DatePicker
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          onChange={(next) => {
            onChange(next)
            setOpen(false)
          }}
          today={today}
          value={value}
        />
      </AppSheet>
    </>
  )
}
