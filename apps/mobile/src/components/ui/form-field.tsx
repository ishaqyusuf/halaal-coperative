import { Text } from "@/components/ui/text"
import { cn } from "@/lib/utils"
import {
  createContext,
  type ReactNode,
  useContext,
  useId,
  useMemo,
  useState,
} from "react"
import { View } from "react-native"

type FormFieldControl = {
  /** Native id of the label, for accessibilityLabelledBy. */
  labelId: string
  label: string
  invalid: boolean
  setFocused: (focused: boolean) => void
}

const FormFieldContext = createContext<FormFieldControl | null>(null)

/** Lets Input (and the custom fields) report focus and read error state. */
export function useFormFieldControl() {
  return useContext(FormFieldContext)
}

/**
 * 02 Brand native field: 13/18·700 label above, 52pt control, 14/20 helper
 * or error below. The label tints primary while focused and destructive on
 * error. Wrap any Input, MoneyField, PhoneField, SelectField or DateField.
 */
export function FormField({
  children,
  className,
  error,
  helper,
  label,
  optional = false,
  trailingLabel,
}: {
  children: ReactNode
  className?: string
  error?: string | null
  helper?: string
  label: string
  optional?: boolean
  /** Small right-aligned text beside the label, e.g. "1 of 2" or a count. */
  trailingLabel?: ReactNode
}) {
  const labelId = useId()
  const [focused, setFocused] = useState(false)
  const invalid = Boolean(error)
  const control = useMemo(
    () => ({ invalid, label, labelId, setFocused }),
    [invalid, label, labelId]
  )

  return (
    <FormFieldContext.Provider value={control}>
      <View className={cn("gap-[8px]", className)}>
        <View className="flex-row items-end justify-between gap-[12px]">
          <Text
            className={cn(
              invalid
                ? "text-destructive"
                : focused
                  ? "text-primary"
                  : "text-foreground-soft"
            )}
            nativeID={labelId}
            variant="label"
          >
            {label}
            {optional ? (
              <Text className="text-muted-foreground" variant="label">
                {" "}
                (optional)
              </Text>
            ) : null}
          </Text>
          {trailingLabel ? (
            <Text className="text-muted-foreground" variant="caption">
              {trailingLabel}
            </Text>
          ) : null}
        </View>
        {children}
        {error ? (
          <Text
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            className="text-destructive"
            variant="small"
          >
            {error}
          </Text>
        ) : helper ? (
          <Text className="text-muted-foreground" variant="small">
            {helper}
          </Text>
        ) : null}
      </View>
    </FormFieldContext.Provider>
  )
}
