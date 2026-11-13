import { z } from "zod"

const workplaceNameSchema = z.string().trim().min(2).max(120)

export const createWorkplaceSchema = z.object({ name: workplaceNameSchema })

export const renameWorkplaceSchema = z.object({
  id: z.string().uuid(),
  name: workplaceNameSchema,
})
