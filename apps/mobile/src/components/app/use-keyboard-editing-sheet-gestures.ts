import {
  GESTURE_SOURCE,
  KEYBOARD_STATUS,
  type GestureEventsHandlersHookType,
  useBottomSheetInternal,
  useGestureEventsHandlersDefault,
} from "@gorhom/bottom-sheet"
import { useCallback } from "react"
import { Platform } from "react-native"
import { useSharedValue } from "react-native-reanimated"

/** Keep the native content tree mounted while Android inputs own scrolling. */
export const useKeyboardEditingSheetGestures: GestureEventsHandlersHookType = () => {
  const {
    handleOnStart: defaultStart,
    handleOnChange: defaultChange,
    handleOnEnd: defaultEnd,
    handleOnFinalize: defaultFinalize,
  } = useGestureEventsHandlersDefault()
  const { animatedKeyboardState } = useBottomSheetInternal()
  const contentPanLocked = useSharedValue(false)

  const handleOnStart = useCallback<typeof defaultStart>((source, event) => {
    "worklet"
    contentPanLocked.set(
      Platform.OS === "android" &&
      source !== GESTURE_SOURCE.HANDLE &&
      animatedKeyboardState.get().status === KEYBOARD_STATUS.SHOWN
    )
    if (!contentPanLocked.get()) defaultStart(source, event)
  }, [animatedKeyboardState, contentPanLocked, defaultStart])

  const handleOnChange = useCallback<typeof defaultChange>((source, event) => {
    "worklet"
    if (!contentPanLocked.get()) defaultChange(source, event)
  }, [contentPanLocked, defaultChange])

  const handleOnEnd = useCallback<typeof defaultEnd>((source, event) => {
    "worklet"
    if (!contentPanLocked.get()) defaultEnd(source, event)
    contentPanLocked.set(false)
  }, [contentPanLocked, defaultEnd])

  const handleOnFinalize = useCallback<typeof defaultFinalize>((source, event) => {
    "worklet"
    if (!contentPanLocked.get()) defaultFinalize(source, event)
    contentPanLocked.set(false)
  }, [contentPanLocked, defaultFinalize])

  return { handleOnStart, handleOnChange, handleOnEnd, handleOnFinalize }
}
