import { TextClassContext } from "./text"
import { cn } from "@/lib/utils"
import * as TabsPrimitive from "@rn-primitives/tabs"
import { Platform, View } from "react-native"
import Animated, { FadeIn } from "react-native-reanimated"

function Tabs({ className, ...props }: Omit<TabsPrimitive.RootProps, "ref">) {
  return (
    <TabsPrimitive.Root
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function TabsList({
  className,
  ...props
}: Omit<TabsPrimitive.ListProps, "ref">) {
  return (
    <TabsPrimitive.List
      className={cn(
        "flex h-9 flex-row items-center justify-center rounded-lg bg-muted p-[3px]",
        Platform.select({ web: "inline-flex w-fit", native: "mr-auto" }),
        className
      )}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: Omit<TabsPrimitive.TriggerProps, "ref">) {
  const { value } = TabsPrimitive.useRootContext()
  return (
    <TextClassContext.Provider
      value={cn(
        "text-sm font-medium text-foreground dark:text-muted-foreground",
        value === props.value && "dark:text-foreground"
      )}
    >
      <TabsPrimitive.Trigger
        className={cn(
          "flex h-[calc(100%-1px)] flex-row items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 shadow-none shadow-black/5",
          Platform.select({
            web: "inline-flex cursor-default whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0",
          }),
          props.disabled && "opacity-50",
          props.value === value &&
            "bg-background dark:border-foreground/10 dark:bg-input/30",
          className
        )}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

function TabsContent({
  className,
  ...props
}: Omit<TabsPrimitive.ContentProps, "ref">) {
  return (
    <TabsPrimitive.Content
      className={cn(Platform.select({ web: "flex-1 outline-none" }), className)}
      {...props}
      asChild // Use asChild to pass styles to our animated view
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        style={{
          flex: 1,
        }}
      >
        {/* We need a View here because Animated.View can't have text as a direct child */}
        <View className="flex-1">{props.children}</View>
      </Animated.View>
    </TabsPrimitive.Content>
  )
}

export { Tabs, TabsContent, TabsList, TabsTrigger }
