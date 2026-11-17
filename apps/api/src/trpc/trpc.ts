import { initTRPC, TRPCError } from '@trpc/server';
import type { TrpcContext } from './context';

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.auth) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Debes iniciar sesión para realizar esta operación.'
    });
  }
  return next({
    ctx: {
      ...ctx,
      auth: ctx.auth
    }
  });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.auth.user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Se requieren permisos de administrador.'
    });
  }
  return next({ ctx });
});
