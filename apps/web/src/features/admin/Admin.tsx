import { useQuery } from '@tanstack/react-query';
import { trpcClient } from '../../lib/trpc';
import { PanelError, ScreenHeading, tableKey } from '../table/shared';
import { Audit } from './Audit';
import { SendNotice } from './SendNotice';
import { WeeklyDistribution } from './WeeklyDistribution';
import './admin.css';

export function Admin({ managerId }: { managerId: string }) {
  const roster = useQuery({
    queryKey: [...tableKey(managerId), 'admin', 'roster'],
    queryFn: ({ signal }) => trpcClient.admin.roster.query(undefined, { signal }),
  });
  const managers = roster.isSuccess ? roster.data.managers : undefined;
  return <div className="ml-page ml-admin">
    <ScreenHeading kicker="Comisionado de la liga" title="Administración">
      <p className="ml-muted">Gestiona el reparto, comunica novedades y revisa los movimientos de la temporada.</p>
    </ScreenHeading>
    <nav className="ml-admin-jumps" aria-label="Secciones de administración">
      <a href="#auditoria">Auditoría</a><a href="#reparto">Reparto</a><a href="#comunicados">Avisos</a>
    </nav>
    {roster.isError && <PanelError retry={() => void roster.refetch()} />}
    <div className="ml-admin-board">
      <div id="auditoria"><Audit managerId={managerId} roster={managers} /></div>
      <div className="ml-admin-side">
        <div id="reparto"><WeeklyDistribution managerId={managerId} /></div>
        <div id="comunicados"><SendNotice managerId={managerId} roster={managers} /></div>
      </div>
    </div>
  </div>;
}