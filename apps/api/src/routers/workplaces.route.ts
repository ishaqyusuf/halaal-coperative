import { createWorkplace, listWorkplaces, renameWorkplace } from "@halaalvest/db"
import { createTRPCRouter, permissionProcedure } from "../lib.trpc"
import { createWorkplaceSchema, renameWorkplaceSchema } from "../schemas/workplaces"

// Workplaces are deduction sources in the data model: the employer or office
// that pays members' monthly amounts.
export const workplacesRouter = createTRPCRouter({
  list: permissionProcedure("view_contribution_operations").query(({ ctx }) =>
    listWorkplaces(ctx.tenant.current.id)
  ),

  create: permissionProcedure("manage_members")
    .input(createWorkplaceSchema)
    .mutation(({ ctx, input }) =>
      createWorkplace({
        actorUserId: ctx.auth.session.user.id,
        name: input.name,
        tenantId: ctx.tenant.current.id,
      })
    ),

  rename: permissionProcedure("manage_members")
    .input(renameWorkplaceSchema)
    .mutation(({ ctx, input }) =>
      renameWorkplace({
        actorUserId: ctx.auth.session.user.id,
        id: input.id,
        name: input.name,
        tenantId: ctx.tenant.current.id,
      })
    ),
})
