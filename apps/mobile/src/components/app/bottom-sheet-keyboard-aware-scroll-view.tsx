import { BottomSheetInputProvider } from "@/components/ui/bottom-sheet-input-context"
import {
  type BottomSheetScrollableProps,
  type BottomSheetScrollViewMethods,
  SCROLLABLE_TYPE,
  createBottomSheetScrollableComponent,
} from "@gorhom/bottom-sheet"
import {
  type ForwardRefExoticComponent,
  type RefAttributes,
  forwardRef,
  memo,
} from "react"
import type { ScrollViewProps } from "react-native"
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller"
import Reanimated from "react-native-reanimated"

type BottomSheetKeyboardAwareScrollViewProps = ScrollViewProps &
  BottomSheetScrollableProps &
  KeyboardAwareScrollViewProps & {
    onInputFocus?: (nativeTarget: number) => void
  }

const AnimatedKeyboardAwareScrollView =
  Reanimated.createAnimatedComponent<KeyboardAwareScrollViewProps>(
    KeyboardAwareScrollView
  )

const BottomSheetKeyboardAwareScrollViewComponent =
  createBottomSheetScrollableComponent<
    BottomSheetScrollViewMethods,
    BottomSheetKeyboardAwareScrollViewProps
  >(SCROLLABLE_TYPE.SCROLLVIEW, AnimatedKeyboardAwareScrollView)

const BottomSheetKeyboardAwareScrollViewBase = forwardRef<
  BottomSheetScrollViewMethods,
  BottomSheetKeyboardAwareScrollViewProps
>(function BottomSheetKeyboardAwareScrollViewBase(
  {
    bottomOffset = 112,
    children,
    extraKeyboardSpace = 220,
    onInputFocus,
    ...props
  },
  ref
) {
  return (
    <BottomSheetKeyboardAwareScrollViewComponent
      bottomOffset={bottomOffset}
      extraKeyboardSpace={extraKeyboardSpace}
      ref={ref}
      {...props}
    >
      <BottomSheetInputProvider onInputFocus={onInputFocus}>
        {children}
      </BottomSheetInputProvider>
    </BottomSheetKeyboardAwareScrollViewComponent>
  )
})

export const BottomSheetKeyboardAwareScrollView = memo(
  BottomSheetKeyboardAwareScrollViewBase
) as ForwardRefExoticComponent<
  BottomSheetKeyboardAwareScrollViewProps &
    RefAttributes<BottomSheetScrollViewMethods>
>

BottomSheetKeyboardAwareScrollView.displayName =
  "BottomSheetKeyboardAwareScrollView"
