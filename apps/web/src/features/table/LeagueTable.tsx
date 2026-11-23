import { MAX_NOTIFICATION_BADGE } from '@munchinking/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { trpcClient } from '../../lib/trpc';
import { CardFan, type HandCard } from '../hand/CardFan';
import { CardFocusSheet } from '../hand/CardFocusSheet';
import { NoticeReadSignal, PanelError, Stamp, tableKey, unreadQuery, type Session } from './shared';

function Icon({ name }: { name: 'home' | 'activity' | 'library' | 'account' | 'bell' | 'admin' }) {
  const paths = {
    home: 'm3 10 9-7 9 7v10H3z M9 20v-6h6v6',
    activity: 'M3 19h18 M5 15l4-5 4 2 6-8',
    library: 'M3 4h4v16H3z M9 4h4v16H9z M15 5l4-1 3 15-4 1z',
    account: 'M16 8a4 4 0 1 1-8 0 4 4 0 1 1 8 0 M4 21a8 8 0 0 1 16 0',
    bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 20a2 2 0 0 0 4 0',
    admin: 'M12 2l8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5z M8 12l3 3 5-6',
  };

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export function LeagueLayout({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const managerId = session.manager.id;
  const client = useQueryClient();
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const peer = new BroadcastChannel(`ml-notice-read:${managerId}`);
    channel.current = peer;
    peer.onmessage = () => {
      void client.invalidateQueries({ queryKey: unreadQuery(managerId).queryKey });
      void client.invalidateQueries({ queryKey: [...tableKey(managerId), 'notices'] });
    };
    return () => { peer.close(); channel.current = null; };
  }, [managerId, client]);
  const unread = useQuery({ ...unreadQuery(managerId), refetchInterval: 60_000 });
  const count = unread.data?.count ?? 0;

  return (
    <div className="ml-club">
      <a className="ml-skip" href="#contenido">
        Saltar al contenido
      </a>
      <header className="ml-top">
        <div className="ml-top-inner">
          <Link to="/home" className="ml-brand">
            <img src="/icons/league-192.png" width="36" height="36" alt="" />
            <span>
              Munchinking <b>League</b>
            </span>
          </Link>
          <Link
            to="/notifications"
            className="ml-notice-link"
            aria-label={
              unread.isError
                ? 'Avisos, contador no disponible'
                : `Avisos${count ? `, ${count} sin leer` : ''}`
            }
          >
            <Icon name="bell" />
            {count > 0 && <span>{count > MAX_NOTIFICATION_BADGE ? '9+' : count}</span>}
          </Link>
        </div>
      </header>
      <main id="contenido" className="ml-content" tabIndex={-1}>
        <NoticeReadSignal.Provider value={() => channel.current?.postMessage('refresh')}>
          {children}
        </NoticeReadSignal.Provider>
      </main>
      <nav className="ml-nav" aria-label="Navegación principal">
        <Link to="/home">
          <Icon name="home" />
          Inicio
        </Link>
        <Link to="/history">
          <Icon name="activity" />
          Historial
        </Link>
        <Link to="/library">
          <Icon name="library" />
          Biblioteca
        </Link>
        <Link to="/profile">
          <Icon name="account" />
          Perfil
        </Link>
        {session.user.role === 'ADMIN' && <Link to="/admin" aria-label="Administración">
          <Icon name="admin" />Admin
        </Link>}
      </nav>
    </div>
  );
}

export function Home({ session }: { session: Session }) {
  const client = useQueryClient();
  const [focused, setFocused] = useState<HandCard | null>(null);
  const hand = useQuery({
    queryKey: [...tableKey(session.manager.id), 'hand'],
    queryFn: ({ signal }) => trpcClient.manager.getHand.query(undefined, { signal }),
  });

  return (
    <>
      <header className="ml-intro">
        <p className="ml-kicker">Zona de mánager</p>
        <h1>La mesa de la liga</h1>
        <p className="ml-muted">
          {session.manager.displayName}
          {session.manager.teamName &&
            session.manager.teamName !== session.manager.displayName && (
              <> · {session.manager.teamName}</>
            )}
        </p>
      </header>
      <div className="ml-board">
        <div>
          {hand.isError ? (
            <PanelError retry={() => void hand.refetch()} />
          ) : hand.data ? (
            <>
              {hand.data.musDiscardRequired && (
                <p className="ml-panel-note" role="status">
                  Mus: antes de jugar, descarta una de tus cartas de mayor rareza.
                  Si hay empate, tú eliges cuál.
                </p>
              )}
              <CardFan cards={hand.data.cards} onSelect={setFocused} />
            </>
          ) : (
            <p className="ml-panel-note" role="status">
              Preparando tu mano…
            </p>
          )}
        </div>
        <RecentPlays managerId={session.manager.id} />
      </div>
      {focused && (
        <CardFocusSheet
          card={focused}
          actorId={session.manager.id}
          onClose={() => setFocused(null)}
          onChanged={() => {
            void client.invalidateQueries({ queryKey: tableKey(session.manager.id) });
          }}
        />
      )}
    </>
  );
}

function RecentPlays({ managerId }: { managerId: string }) {
  const plays = useQuery({
    queryKey: [...tableKey(managerId), 'recentPlays'],
    queryFn: ({ signal }) => trpcClient.history.public.query({ limit: 6, activeOnly: true }, { signal }),
  });

  return (
    <section className="ml-panel ml-plays" aria-label="Jugadas públicas">
      <p className="ml-kicker">Actividad pública</p>
      <h2>Últimas cartas jugadas</h2>
      {plays.isError ? (
        <PanelError retry={() => void plays.refetch()} />
      ) : !plays.data ? (
        <p role="status">Cargando jugadas…</p>
      ) : plays.data.items.length === 0 ? (
        <p className="ml-panel-note">
          Todavía no hay jugadas. La primera carta que se juegue aparecerá aquí.
        </p>
      ) : (
        <ul className="ml-ticker">
          {plays.data.items.map((row) => (
            <li key={row.id}>
              <details>
                <summary>
                  <span className="ml-event-name">{row.cardName}</span>
                  <span>{row.managerName}</span>
                  <Stamp iso={row.createdAt} />
                </summary>
                <p>{row.cardNickname}</p>
                {(row.targetManagerName || row.targetLabel) && (
                  <p>Objetivo: {row.targetManagerName || row.targetLabel}</p>
                )}
              </details>
            </li>
          ))}
        </ul>
      )}
      <Link className="ml-text-btn" to="/history">
        Ver jugadas públicas <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
