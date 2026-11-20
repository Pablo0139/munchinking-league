import { MutationCache, QueryCache, QueryClient, queryOptions } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { trpcClient } from './trpc';

export const isUnauthorized = (error: unknown) =>
  error instanceof TRPCClientError && error.data?.code === 'UNAUTHORIZED';

// A full navigation also drops the previous manager's router state and open dialogs.
export function leaveSession() {
  queryClient.clear();
  window.location.replace('/login');
}

function handlePrivateError(error: unknown) {
  if (isUnauthorized(error) && window.location.pathname !== '/login') {
    leaveSession();
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handlePrivateError }),
  mutationCache: new MutationCache({ onError: handlePrivateError }),
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false, networkMode: 'always' },
  },
});

export const sessionQuery = queryOptions({
  queryKey: ['auth.me'],
  networkMode: 'always',
  queryFn: async ({ signal }) => {
    try {
      return await trpcClient.auth.me.query(undefined, { signal });
    } catch (error) {
      if (isUnauthorized(error)) return null;
      throw error;
    }
  },
});