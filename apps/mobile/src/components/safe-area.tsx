import {
  SafeAreaView,
  type StyleProp,
  type ViewStyle,
} from "react-native-safe-area-context";

export function SafeArea({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <SafeAreaView style={[{ flex: 1 }, style]}>{children}</SafeAreaView>;
}
