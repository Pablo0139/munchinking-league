import { initTRPC, TRPCError } from '@trpc/server';
import { DomainRuleError } from '@munchinking/domain';
import type { TrpcContext } from './context';

const t = initTRPC.context<TrpcContext>().create({
  errorFormatter({ shape, error }) {
    return { ...shape, data: { ...shape.data, ...(error.cause instanceof DomainRuleError && { appCode: error.cause.code }) } };
  }
});

export const router = t.router;
export const publicProcedure = t.procedure.use(({ ctx, next }) => {
  const origin = ctx.req.headers.get('Origin');
  if (origin && origin !== (ctx.env.APP_ORIGIN ?? 'http://localhost:5173')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Origen de solicitud no permitido.' });
  }
  return next();
});

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
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
