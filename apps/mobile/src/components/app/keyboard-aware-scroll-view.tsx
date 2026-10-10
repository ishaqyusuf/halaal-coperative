import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ComponentProps,
} from "react"
import { Platform, View, type ScrollView } from "react-native"
import { KeyboardAwareScrollView } from "react-native-keyboard-controller"

type AppKeyboardAwareScrollViewProps = ComponentProps<
  typeof KeyboardAwareScrollView
>

const KeyboardScrollFallbackContext = createContext<
  ((nativeTarget: number) => void) | null
>(null)

export function useKeyboardScrollFallback() {
  return useContext(KeyboardScrollFallbackContext)
}

/**
 * The default scroll surface for any route-level form.
 *
 * Keep the keyboard contract here so individual features cannot accidentally
 * ship inputs that are hidden by the keyboard or a sticky action surface.
 */
export function AppKeyboardAwareScrollView({
  bottomOffset = 160,
  children,
  className,
  contentContainerClassName,
  contentContainerStyle,
  disableScrollOnKeyboardHide = true,
  keyboardDismissMode = "interactive",
  keyboardShouldPersistTaps = "handled",
  ...props
}: AppKeyboardAwareScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null)
  const scrollInputIntoView = useCallback(
    (nativeTarget: number) => {
      if (Platform.OS !== "android") return

      setTimeout(() => {
        scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(
          nativeTarget,
          bottomOffset,
          true
        )
      }, 280)
    },
    [bottomOffset]
  )
  const fallback = useMemo(() => scrollInputIntoView, [scrollInputIntoView])

  return (
    <KeyboardAwareScrollView
      bottomOffset={bottomOffset}
      className={className ?? "flex-1"}
      disableScrollOnKeyboardHide={disableScrollOnKeyboardHide}
      keyboardDismissMode={keyboardDismissMode}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      ref={scrollRef}
      {...props}
    >
      <KeyboardScrollFallbackContext.Provider value={fallback}>
        <View
          className={contentContainerClassName}
          style={contentContainerStyle}
        >
          {children}
        </View>
      </KeyboardScrollFallbackContext.Provider>
    </KeyboardAwareScrollView>
  )
}
