import { createTRPCClient, httpBatchLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '@munchinking/api/router';

const apiUrl =
  import.meta.env.VITE_API_TRPC_URL ??
  (import.meta.env.DEV ? 'http://localhost:8787/trpc' : '/trpc');

export const trpcClient: TRPCClient<AppRouter> = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: apiUrl,
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: 'include'
        });
      }
    })
  ]
});
