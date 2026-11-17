import { createTRPCClient, httpBatchLink, type TRPCClient } from '@trpc/client';
import type { AppRouter } from '@munchinking/api/router';

const apiUrl = import.meta.env.VITE_API_TRPC_URL ?? 'http://localhost:8787/trpc';

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
