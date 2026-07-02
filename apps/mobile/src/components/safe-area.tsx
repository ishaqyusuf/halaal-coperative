import {
  SafeAreaView,
} from "react-native-safe-area-context";
import type { StyleProp, ViewStyle } from "react-native";

export function SafeArea({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <SafeAreaView style={[{ flex: 1 }, style]}>{children}</SafeAreaView>;
}
