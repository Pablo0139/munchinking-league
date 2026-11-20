import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { leaveSession } from '../../lib/session';
import { trpcClient } from '../../lib/trpc';
import { PanelError, ScreenHeading, tableKey, type Session } from '../table/shared';

function Avatar({ name, url }: { name: string; url: string | null }) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/u).slice(0, 2)
    .map((word) => Array.from(word)[0]).join('').toLocaleUpperCase('es');
  return url && !failed ? (
    <img className="ml-avatar" src={url} alt="" onError={() => setFailed(true)} />
  ) : (
    <span className="ml-avatar" aria-hidden="true">{initials || '?'}</span>
  );
}

export function Profile({ session }: { session: Session }) {
  const profile = useQuery({
    queryKey: [...tableKey(session.manager.id), 'profile'],
    queryFn: ({ signal }) => trpcClient.manager.getProfile.query(undefined, { signal }),
  });
  const logout = useMutation({
    mutationFn: () => trpcClient.auth.logout.mutate(),
    onSuccess: leaveSession,
  });
  const manager = profile.data ?? session.manager;
  const role = profile.data?.role ?? session.user.role;
  const stats = profile.data?.stats;

  return (
    <div className="ml-page">
      <ScreenHeading kicker="Mi cuenta" title="Perfil" />
      <section className="ml-panel ml-profile-head" aria-label="Datos de la cuenta">
        <Avatar key={manager.avatarUrl} name={manager.displayName} url={manager.avatarUrl} />
        <div>
          <h2>{manager.displayName}</h2>
          {manager.teamName && <p>Equipo: {manager.teamName}</p>}
          <p className="ml-muted">Usuario: {session.user.username}</p>
          <span className="ml-pill">{role === 'ADMIN' ? 'Administrador' : 'Mánager'}</span>
        </div>
      </section>
      <section className="ml-panel" aria-label="Estadísticas de temporada">
        <h2>Estadísticas de temporada</h2>
        {profile.isError && <PanelError retry={() => void profile.refetch()} />}
        {!stats && !profile.isError && <p className="ml-muted" role="status">Cargando estadísticas…</p>}
        {stats && (
          <dl className="ml-metrics">
            <div><dt>En mano</dt><dd>{stats.handCount} de {stats.maxHandSize}</dd></div>
            <div><dt>Jugadas</dt><dd>{stats.playedCount}</dd></div>
            <div><dt>Descartadas</dt><dd>{stats.discardedCount}</dd></div>
            <div><dt>Devueltas</dt><dd>{stats.returnedCount}</dd></div>
          </dl>
        )}
      </section>
      <button type="button" className="ml-primary" disabled={logout.isPending} onClick={() => logout.mutate()}>
        {logout.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
      {logout.isError && <p className="ml-error" role="alert">No se pudo cerrar la sesión. Inténtalo de nuevo.</p>}
    </div>
  );
}