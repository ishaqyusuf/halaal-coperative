"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  type FieldValues,
  type Resolver,
  type UseFormProps,
  useForm,
} from "react-hook-form"
import { z } from "zod"

export const useZodForm = <TFieldValues extends FieldValues>(
  schema: z.ZodTypeAny,
  options?: Omit<UseFormProps<TFieldValues>, "resolver">,
) => {
  return useForm<TFieldValues>({
    resolver: zodResolver(schema as any) as Resolver<TFieldValues>,
    ...options,
  })
}
