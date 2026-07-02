import { FloatingBottomSheet } from "@/components/floating-bottom-sheet";
import { SafeArea } from "@/components/safe-area";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAuthContext } from "@/hooks/use-auth";
import { useColors } from "@/hooks/use-color";
import { View } from "react-native";

export function SignInScreen() {
  const { signInAs } = useAuthContext();
  const colors = useColors();

  return (
    <SafeArea style={{ backgroundColor: colors.background }}>
      <View className="flex-1 justify-between px-6 pb-8 pt-10">
        <View className="gap-8">
          <View className="h-16 w-16 items-center justify-center rounded-md bg-primary">
            <Text className="text-3xl font-black text-primary-foreground">
              H
            </Text>
          </View>
          <View className="gap-3">
            <Text className="text-4xl font-black leading-[44px] text-foreground">
              Halaalvest
            </Text>
            <Text className="max-w-[320px] text-base leading-6 text-muted-foreground">
              Cooperative finance, commitments, shares, and member operations in
              one white-label mobile shell.
            </Text>
          </View>
        </View>

        <View className="rounded-md border border-border bg-card p-4">
          <View className="flex-row items-center gap-3">
            <Icon name="ShieldCheck" className="size-md text-success" />
            <Text className="flex-1 text-sm leading-5 text-muted-foreground">
              Starter mode uses local mock roles. Production mobile auth will
              replace this with signed server sessions.
            </Text>
          </View>
        </View>
      </View>

      <FloatingBottomSheet
        accessibilityLabel="Choose mobile workspace"
        onClose={() => undefined}
        snapPoints={["42%"]}
        title="Choose workspace"
        visible
      >
        <View className="gap-4 px-5 pb-6 pt-2">
          <Text className="text-center text-sm leading-5 text-muted-foreground">
            Jump into the member or admin experience and continue shaping the
            cooperative workflows.
          </Text>
          <Button className="h-12" onPress={() => signInAs("member")}>
            <Icon name="User" className="size-base text-primary-foreground" />
            <Text>Continue as Member</Text>
          </Button>
          <Button
            className="h-12"
            onPress={() => signInAs("admin")}
            variant="outline"
          >
            <Icon name="ShieldCheck" className="size-base text-foreground" />
            <Text>Continue as Admin</Text>
          </Button>
        </View>
      </FloatingBottomSheet>
    </SafeArea>
  );
}
