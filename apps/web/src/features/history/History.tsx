import { MOVEMENT_TYPES, type MovementType } from '@munchinking/shared';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { trpcClient } from '../../lib/trpc';
import { MoreButton, PanelError, ScreenHeading, Stamp, tableKey } from '../table/shared';

const scopes = ['public', 'mine'] as const;
type Scope = (typeof scopes)[number];
const scopeLabels = { public: 'Público', mine: 'Mis movimientos' };
const movements: Record<MovementType, string> = {
  DISTRIBUTED: 'Reparto',
  PLAYED: 'Jugada',
  DISCARDED: 'Descarte',
  RETURNED: 'Devolución',
};

export function History({ managerId }: { managerId: string }) {
  const id = useId();
  const tabs = useRef<Partial<Record<Scope, HTMLButtonElement | null>>>({});
  const [scope, setScope] = useState<Scope>('public');
  const [filter, setFilter] = useState<MovementType | 'all'>('all');
  const movementType = scope === 'mine' && filter !== 'all' ? filter : undefined;
  const history = useInfiniteQuery({
    queryKey: [...tableKey(managerId), 'history', scope, movementType ?? 'all'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => {
      const input = { limit: 15, cursor: pageParam };
      return scope === 'public'
        ? trpcClient.history.public.query(input, { signal })
        : trpcClient.history.mine.query({ ...input, movementType }, { signal });
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const rows = history.data?.pages.flatMap((page) => page.items);

  function navigate(event: KeyboardEvent<HTMLButtonElement>, current: Scope) {
    let next: Scope;
    switch (event.key) {
      case 'Home': next = 'public'; break;
      case 'End': next = 'mine'; break;
      case 'ArrowLeft':
      case 'ArrowRight': next = current === 'public' ? 'mine' : 'public'; break;
      default: return;
    }
    event.preventDefault();
    setScope(next);
    tabs.current[next]?.focus();
  }

  return (
    <div className="ml-page">
      <ScreenHeading kicker="Actividad de la temporada" title="Historial" />
      <div className="ml-tabs" role="tablist" aria-label="Ámbito del historial">
        {scopes.map((value) => (
          <button key={value} type="button" role="tab" id={`${id}-tab-${value}`}
            aria-selected={scope === value} aria-controls={`${id}-panel-${value}`}
            tabIndex={scope === value ? 0 : -1} ref={(node) => { tabs.current[value] = node; }}
            onClick={() => setScope(value)} onKeyDown={(event) => navigate(event, value)}>
            {scopeLabels[value]}
          </button>
        ))}
      </div>
      {scopes.map((value) => (
        <section key={value} id={`${id}-panel-${value}`} role="tabpanel" tabIndex={0}
          aria-labelledby={`${id}-tab-${value}`} hidden={scope !== value} className="ml-panel">
          {scope === value && <>
            {scope === 'mine' && (
              <label className="ml-field">
                Tipo de movimiento
                <select value={filter} onChange={(event) =>
                  setFilter(MOVEMENT_TYPES.find((type) => type === event.target.value) ?? 'all')}>
                  <option value="all">Todos los movimientos</option>
                  {MOVEMENT_TYPES.map((type) => <option key={type} value={type}>{movements[type]}</option>)}
                </select>
              </label>
            )}
            {history.isError && !history.isFetchNextPageError && (
              <PanelError retry={() => void history.refetch()} />
            )}
            {!rows && !history.isError && <p className="ml-muted" role="status">Cargando historial…</p>}
            {rows?.length === 0 && <p className="ml-muted" role="status">
              {scope === 'public' ? 'Todavía no hay jugadas públicas.' : 'No hay movimientos para este filtro.'}
            </p>}
            {rows && rows.length > 0 && (
              <ol className="ml-list" aria-label="Movimientos, del más reciente al más antiguo">
                {rows.map((row) => (
                  <li key={row.id}>
                    <strong className="ml-event-name">{row.cardName}</strong>{' '}
                    <span className="ml-pill">{movements[row.movementType]}</span>{' '}
                    {row.isReturned && <span className="ml-pill ml-pill--returned">Devuelta</span>}
                    <p className="ml-muted">{row.managerName} · <Stamp iso={row.createdAt} /></p>
                    {(row.targetManagerName || row.targetLabel) && <p>Objetivo: {row.targetManagerName || row.targetLabel}</p>}
                    {row.movementType === 'PLAYED' && row.whatsappMessage && <details><summary>Ver jugada y resultado</summary>
                      <p style={{whiteSpace:'pre-line'}}>{row.whatsappMessage}</p>
                    </details>}
                  </li>
                ))}
              </ol>
            )}
            {history.hasNextPage && <MoreButton busy={history.isFetching} failed={history.isFetchNextPageError}
              onMore={() => { if (!history.isFetching) void history.fetchNextPage(); }} />}
          </>}
        </section>
      ))}
    </div>
  );
}