import {
  MAX_HAND_SIZE, MAX_MOVEMENT_NOTES_LENGTH, MOVEMENT_TYPES, returnCardInputSchema, type MovementType, type ReturnCardInput,
} from '@munchinking/shared';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useRef, useState, type FormEvent } from 'react';
import { trpcClient } from '../../lib/trpc';
import { DetailDialog, MoreButton, PanelError, Stamp, tableKey } from '../table/shared';
import { refreshAdmin, type AdminRoster } from './adminData';

const labels: Record<MovementType, string> = {
  DISTRIBUTED: 'Reparto', PLAYED: 'Jugada', DISCARDED: 'Descarte', RETURNED: 'Devolución',
};

function capacity(member: AdminRoster[number] | undefined) {
  if (!member || !Number.isInteger(member.handCount) || member.handCount < 0) {
    return { available: false, text: 'Capacidad desconocida. No se puede devolver la carta.' };
  }
  const available = member.handCount < MAX_HAND_SIZE;
  return { available, text: `${available ? 'Mano' : 'Mano llena'}: ${member.handCount}/${MAX_HAND_SIZE}` };
}

export function Audit({ managerId, roster }: { managerId: string; roster: AdminRoster | undefined }) {
  const client = useQueryClient();
  const [manager, setManager] = useState('');
  const [type, setType] = useState<MovementType>();
  const [selectedId, setSelectedId] = useState<string>();
  const [reason, setReason] = useState('');
  const [problem, setProblem] = useState('');
  const [result, setResult] = useState('');
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const history = useInfiniteQuery({
    queryKey: [...tableKey(managerId), 'admin', 'history', manager, type ?? 'all'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => trpcClient.admin.history.query({
      limit: 15, cursor: pageParam, managerId: manager || undefined, movementType: type,
    }, { signal }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const mutation = useMutation({
    mutationFn: (input: ReturnCardInput) => trpcClient.admin.returnCard.mutate(input), retry: false,
  });
  const rows = history.data?.pages.flatMap((page) => page.items);
  const selected = rows?.find((row) => row.id === selectedId);
  const recipient = roster?.find((member) => member.id === selected?.managerId);
  const hand = capacity(recipient);
  const eligible = selected?.movementType === 'PLAYED' && !selected.isReturned && hand.available;

  async function confirm(event: FormEvent) {
    event.preventDefault();
    if (lock.current || !selected || !eligible) return;
    const input = returnCardInputSchema.safeParse({ movementId: selected.id, reason: reason.trim() || undefined });
    if (!input.success) {
      setProblem(`Comprueba la jugada y el motivo (máximo ${MAX_MOVEMENT_NOTES_LENGTH} caracteres).`);
      return;
    }
    lock.current = true;
    setBusy(true);
    setProblem('');
    try {
      try {
        const { notification } = await mutation.mutateAsync(input.data);
        setResult(`${selected.cardName} devuelta a ${selected.managerName}. Aviso enviado: ${notification.message}`);
      } catch (error) {
        const code = error instanceof TRPCClientError ? error.data?.code : undefined;
        if (code !== 'CONFLICT') {
          setProblem(code === 'UNAUTHORIZED' || code === 'FORBIDDEN'
            ? 'No tienes autorización para devolver cartas. Comprueba tu sesión.'
            : code === 'BAD_REQUEST' || code === 'NOT_FOUND'
              ? 'La jugada no existe o no admite devolución en esta temporada.'
              : 'No se pudo confirmar la devolución. Comprueba el historial antes de volver a intentarlo.');
          return;
        }
        setResult(`No se realizó la devolución de ${selected.cardName}: ${error instanceof Error ? error.message : 'la jugada o la mano han cambiado.'}`);
      }
      setSelectedId(undefined);
      try {
        await refreshAdmin(client, managerId);
      } catch {
        setResult((message) => `${message} No se pudo actualizar la vista. Recarga para comprobar el estado actual.`);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return <section className="ml-panel" aria-label="Auditoría de movimientos">
    <h2>Auditoría de movimientos</h2>
    <div className="ml-admin-filters">
      <label className="ml-field">Mánager
        <select value={manager} onChange={(event) => setManager(event.target.value)}>
          <option value="">Todos los mánagers</option>
          {roster?.map((member) => <option key={member.id} value={member.id}>
            {member.displayName}{member.isActive ? '' : ' (inactivo)'}
          </option>)}
        </select>
      </label>
      <label className="ml-field">Tipo de movimiento
        <select value={type ?? ''} onChange={(event) => setType(MOVEMENT_TYPES.find((t) => t === event.target.value))}>
          <option value="">Todos los movimientos</option>
          {MOVEMENT_TYPES.map((t) => <option key={t} value={t}>{labels[t]}</option>)}
        </select>
      </label>
    </div>
    {!roster && <p className="ml-muted">No se conoce la plantilla. Las devoluciones están desactivadas hasta verificar la capacidad.</p>}
    <p role="status">{result}</p>
    {history.isError && !history.isFetchNextPageError && <PanelError retry={() => void history.refetch()} />}
    {history.isPending && <p role="status">Cargando auditoría…</p>}
    {rows?.length === 0 && <p role="status">No hay movimientos para estos filtros.</p>}
    {rows && rows.length > 0 && <ol className="ml-list" aria-label="Movimientos, del más reciente al más antiguo">
      {rows.map((row) => {
        const target = row.targetManagerName || row.targetLabel || row.targetManagerId;
        const rowHand = capacity(roster?.find((member) => member.id === row.managerId));
        return <li className="ml-admin-row" key={row.id}>
          <strong>{row.cardName}</strong>{' '}<span className="ml-pill">{labels[row.movementType]}</span>{' '}
          {row.isReturned && <span className="ml-pill">Devuelta</span>}
          <p className="ml-admin-meta">{row.managerName} · <Stamp iso={row.createdAt} /></p>
          {target && <p>Objetivo: {target}</p>}
          {row.notes && <p>{row.movementType === 'RETURNED' ? 'Motivo' : 'Notas'}: {row.notes}</p>}
          <details className="ml-admin-meta">
            <summary>Trazabilidad</summary>
            <p>Movimiento: {row.id}</p>
            {row.whatsappMessage && <p style={{whiteSpace:'pre-line'}}>{row.whatsappMessage}</p>}
            {row.actorUserId && <p>Actor: {row.actorUserId}</p>}
            {row.relatedMovementId && <p>Movimiento de referencia: {row.relatedMovementId}</p>}
            {row.distributionBatchId && <p>Lote de reparto: {row.distributionBatchId}</p>}
          </details>
          {row.movementType === 'PLAYED' && !row.isReturned && <div className="ml-admin-actions">
            <span className="ml-muted" id={`capacity-${row.id}`}>{rowHand.text}</span>
            <button type="button" disabled={busy || !rowHand.available} aria-describedby={`capacity-${row.id}`}
              aria-label={`Devolver carta: ${row.cardName} a ${row.managerName}`} onClick={() => {
                setSelectedId(row.id); setReason(''); setProblem(''); setResult('');
              }}>Devolver carta</button>
          </div>}
        </li>;
      })}
    </ol>}
    {history.hasNextPage && <MoreButton busy={history.isFetching} failed={history.isFetchNextPageError}
      onMore={() => { if (!history.isFetching) void history.fetchNextPage(); }} />}
    {selected && <DetailDialog kicker="Auditoría" title="Confirmar devolución" busy={busy}
      onClose={() => { if (!lock.current) setSelectedId(undefined); }}>
      <form onSubmit={(event) => void confirm(event)} aria-busy={busy}>
        <p>¿Devolver <strong>{selected.cardName}</strong> a <strong>{selected.managerName}</strong>?</p>
        <p>{hand.text}{hand.available && recipient && ` → ${recipient.handCount + 1}/${MAX_HAND_SIZE} tras devolverla.`}</p>
        {selected.isReturned && <p role="alert">Esta jugada ya fue devuelta.</p>}
        <label className="ml-field">Motivo (opcional, máximo {MAX_MOVEMENT_NOTES_LENGTH} caracteres)
          <textarea value={reason} maxLength={MAX_MOVEMENT_NOTES_LENGTH} disabled={busy}
            onChange={(event) => setReason(event.target.value)} />
        </label>
        {problem && <p role="alert" className="ml-error">{problem}</p>}
        <button type="submit" disabled={busy || !eligible}>{busy ? 'Devolviendo…' : 'Confirmar devolución'}</button>
      </form>
    </DetailDialog>}
  </section>;
}