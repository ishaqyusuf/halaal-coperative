import * as React from "react";
import { View as RNView } from "react-native";
import { cn } from "@/lib/utils";

const ViewClassContext = React.createContext<string | undefined>(undefined);

function View({
  className,
  ...props
}: React.ComponentProps<typeof RNView> &
  React.RefAttributes<RNView> & {
    asChild?: boolean;
  }) {
  const viewClass = React.useContext(ViewClassContext);
  return <RNView className={cn(viewClass, className)} {...props} />;
}

export { View, ViewClassContext };
