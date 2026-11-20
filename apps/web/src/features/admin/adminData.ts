import type { QueryClient } from '@tanstack/react-query';
import type { trpcClient } from '../../lib/trpc';
import { tableKey } from '../table/shared';

export type AdminRoster = Awaited<ReturnType<typeof trpcClient.admin.roster.query>>['managers'];

export function refreshAdmin(client: QueryClient, managerId: string) {
  // Audit, roster and distribution are under this key, as are the admin's own hand and inbox.
  return client.invalidateQueries({ queryKey: tableKey(managerId) }, { throwOnError: true });
}