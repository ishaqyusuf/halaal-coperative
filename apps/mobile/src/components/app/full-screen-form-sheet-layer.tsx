import { useModalAccessibility } from "@/components/app/modal-accessibility-isolation"
import { PortalHost } from "@gorhom/portal"
import { StyleSheet, View } from "react-native"

export const FULL_SCREEN_FORM_PORTAL_HOST = "full-screen-form"

export function FullScreenFormSheetLayer() {
  const { floatingSheetVisible } = useModalAccessibility()

  return (
    <View
      aria-hidden={floatingSheetVisible}
      accessibilityElementsHidden={floatingSheetVisible}
      className="absolute inset-0"
      collapsable={false}
      importantForAccessibility={
        floatingSheetVisible ? "no-hide-descendants" : "auto"
      }
      nativeID="full-screen-form-accessibility-layer"
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, { elevation: 3000, zIndex: 3000 }]}
    >
      <PortalHost name={FULL_SCREEN_FORM_PORTAL_HOST} />
    </View>
  )
}
