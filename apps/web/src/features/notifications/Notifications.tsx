import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { useContext, useLayoutEffect, useRef, useState } from 'react';
import { trpcClient } from '../../lib/trpc';
import { Card, CardBack } from '../hand/CardFan';
import { DetailDialog, MoreButton, NoticeReadSignal, PanelError, ScreenHeading, Stamp, tableKey, unreadQuery } from '../table/shared';

type NoticePage = Awaited<ReturnType<typeof trpcClient.notifications.list.query>>;
type Notice = NoticePage['items'][number];
type ReadAction = { kind: 'one'; id: string } | { kind: 'all' };
const labels = { CARD_DISTRIBUTED: 'Reparto', CARD_RETURNED: 'Devolución', ADMIN_NOTICE: 'Comunicado' } as const;

function Discovery({ card, sealed }: { card: NonNullable<Notice['card']>; sealed: boolean }) {
  const [revealed, setRevealed] = useState(!sealed);
  const title = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => { if (sealed && revealed) title.current?.focus({ preventScroll: true }); }, [sealed, revealed]);
  return <>
    {!revealed ? <div className="ml-sealed">
      <div className="ml-focus__card"><CardBack /></div>
      <button type="button" className="ml-focus__primary" onClick={() => setRevealed(true)}>Descubrir carta</button>
    </div> : <div>
      <div className={`ml-focus__card${sealed ? ' ml-reveal' : ''}`} data-rarity={card.rarity}><Card definition={card} /></div>
      <h3 ref={title} tabIndex={-1}>{card.name}</h3><p>{card.description}</p>
      <h3>Reglas de uso</h3><p className="ml-focus__rules">{card.usageRules}</p>
    </div>}
  </>;
}

export function Notifications({ managerId }: { managerId: string }) {
  const client = useQueryClient();
  const notifyPeers = useContext(NoticeReadSignal);
  const [opened, setOpened] = useState<Notice | null>(null);
  const countQuery = unreadQuery(managerId);
  const unread = useQuery(countQuery);
  const listKey = [...tableKey(managerId), 'notices'];
  const notices = useInfiniteQuery({
    queryKey: listKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => trpcClient.notifications.list.query({ limit: 15, cursor: pageParam }, { signal }),
    getNextPageParam: page => page.nextCursor ?? undefined,
  });
  const read = useMutation({
    mutationFn: async (action: ReadAction) => {
      if (action.kind === 'one') await trpcClient.notifications.markAsRead.mutate({ notificationId: action.id });
      else await trpcClient.notifications.markAllAsRead.mutate();
    },
    onSuccess: async (_, action) => {
      // Only acknowledge the change after persistence; then reconcile with any concurrent delivery.
      client.setQueryData<InfiniteData<NoticePage>>(listKey, old => old && ({ ...old,
        pages: old.pages.map(page => ({ ...page, items: page.items.map(n =>
          action.kind === 'all' || n.id === action.id ? { ...n, isRead: true } : n) })),
      }));
      client.setQueryData(countQuery.queryKey, old => old && ({ count: action.kind === 'all' ? 0 : Math.max(0, old.count - 1) }));
      notifyPeers();
      await Promise.all([client.invalidateQueries({ queryKey: countQuery.queryKey }), client.invalidateQueries({ queryKey: listKey })]);
    },
  });
  const items = notices.data?.pages.flatMap(page => page.items);
  const canMarkAll = !!unread.data?.count || items?.some(n => !n.isRead);
  const open = (n: Notice) => {
    read.reset();
    setOpened(n);
    if (!n.isRead) read.mutate({ kind: 'one', id: n.id });
  };
  const readError = read.isError && <div role="alert" className="ml-error">
    No se pudo guardar la lectura.{' '}
    <button type="button" className="ml-text-btn" onClick={() => read.variables && read.mutate(read.variables)}>Reintentar</button>
  </div>;

  return <div className="ml-page">
    <ScreenHeading kicker="Buzón personal" title="Avisos">
      <p className="ml-muted">Repartos, devoluciones y comunicados de la liga.</p>
    </ScreenHeading>
    <section className="ml-panel" aria-label="Notificaciones personales">
      <div className="ml-mailbar"><h2>Mis notificaciones</h2>
        <button type="button" className="ml-text-btn" disabled={!canMarkAll || read.isPending}
          onClick={() => read.mutate({ kind: 'all' })}>Marcar todas como leídas</button>
      </div>
      {!opened && readError}
      {read.isSuccess && read.variables.kind === 'all' && <p role="status">Lectura guardada.</p>}
      {notices.isError && !notices.isFetchNextPageError && <PanelError retry={() => void notices.refetch()} />}
      {!items && !notices.isError && <p role="status">Cargando avisos…</p>}
      {items?.length === 0 && <p className="ml-panel-note">No tienes avisos.</p>}
      {!!items?.length && <ol className="ml-mail-list">{items.map(n => <li key={n.id}>
        <button type="button" className="ml-mail" data-unread={!n.isRead} aria-disabled={read.isPending}
          onClick={() => { if (!read.isPending) open(n); }}>
          <span className="ml-mail-type">{labels[n.notificationType]} · {n.isRead ? 'Leída' : 'Sin leer'}</span>
          <strong>{n.title}</strong><Stamp iso={n.createdAt} />
        </button>
      </li>)}</ol>}
      {notices.hasNextPage && <MoreButton busy={notices.isFetching} failed={notices.isFetchNextPageError}
        onMore={() => void notices.fetchNextPage()} />}
    </section>
    {opened && <DetailDialog key={opened.id} kicker={labels[opened.notificationType]}
      title={opened.notificationType === 'CARD_DISTRIBUTED' && !opened.isRead ? 'Descubrimiento de nueva carta' : opened.title}
      onClose={() => setOpened(null)}>
      {readError}
      {opened.card ? <Discovery card={opened.card} sealed={!opened.isRead} /> : <>
        <p className="ml-focus__rules">{opened.message}</p>
        {opened.notificationType === 'CARD_DISTRIBUTED' && <p className="ml-muted">El detalle de esta carta no está disponible.</p>}
      </>}
      <Stamp iso={opened.createdAt} />
    </DetailDialog>}
  </div>;
}