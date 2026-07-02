import { cn } from "@/lib/utils";
import { Platform, TextInput, type TextInputProps } from "react-native";

function Input({
  className,
  ...props
}: TextInputProps & React.RefAttributes<TextInput>) {
  return (
    <TextInput
      className={cn(
        "h-12 w-full rounded-md border border-border bg-background px-3 text-base text-foreground shadow-sm shadow-black/5",
        props.editable === false &&
          cn(
            "opacity-50",
            Platform.select({
              web: "disabled:pointer-events-none disabled:cursor-not-allowed",
            }),
          ),
        Platform.select({
          native: "placeholder:text-muted-foreground/50",
          web: cn(
            "outline-none transition-[color,box-shadow] selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground md:text-sm",
            "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
            "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          ),
        }),
        className,
      )}
      placeholderTextColor="#746E64"
      {...props}
    />
  );
}

export { Input };
