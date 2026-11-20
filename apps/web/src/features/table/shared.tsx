import { queryOptions } from '@tanstack/react-query';
import { createContext, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { trpcClient } from '../../lib/trpc';
import '../hand/focus.css';

export type Session = Awaited<ReturnType<typeof trpcClient.auth.me.query>>;
export const tableKey = (id: string) => ['table', id] as const;
export const NoticeReadSignal = createContext<() => void>(() => {});
export const unreadQuery = (managerId: string) => queryOptions({
  queryKey: [...tableKey(managerId), 'unread'],
  queryFn: ({ signal }) => trpcClient.notifications.unreadCount.query(undefined, { signal }),
});

const date = new Intl.DateTimeFormat('es-ES', {
  timeZone: 'Europe/Madrid', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
});

export function Stamp({ iso }: { iso: string }) {
  return <time dateTime={iso}>{date.format(new Date(iso))}</time>;
}

export function ScreenHeading({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return <header className="ml-intro"><p className="ml-kicker">{kicker}</p><h1>{title}</h1>{children}</header>;
}

export function PanelError({ retry }: { retry: () => void }) {
  return <div className="ml-panel-note" role="alert">No se pudieron cargar los datos.{' '}
    <button className="ml-text-btn" type="button" onClick={retry}>Reintentar</button>
  </div>;
}

export function MoreButton({ busy, failed, onMore }: { busy: boolean; failed: boolean; onMore: () => void }) {
  return <div>
    {failed && <p className="ml-error" role="alert">No se pudo cargar la página siguiente.</p>}
    <button className="ml-text-btn" type="button" disabled={busy} onClick={onMore}>
      {busy ? 'Cargando…' : failed ? 'Reintentar cargar más' : 'Cargar más'}
    </button>
  </div>;
}

export function DetailDialog({ kicker, title, children, busy = false, onClose }: {
  kicker: string; title: string; children: ReactNode; busy?: boolean; onClose: () => void;
}) {
  const id = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const node = ref.current!;
    const opener = document.activeElement;
    node.showModal();
    return () => {
      node.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);
  return <dialog ref={ref} className="ml-focus" aria-labelledby={id}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="ml-focus__header">
      <div><small>{kicker}</small><h2 id={id}>{title}</h2></div>
      <button type="button" disabled={busy} onClick={onClose}>Cerrar</button>
    </header>
    {children}
  </dialog>;
}