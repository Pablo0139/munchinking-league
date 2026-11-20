import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useEffect, useRef, useState } from 'react';
import { trpcClient } from '../../lib/trpc';
import { DetailDialog, PanelError, Stamp, tableKey } from '../table/shared';
import { refreshAdmin } from './adminData';

type Status = Awaited<ReturnType<typeof trpcClient.distribution.status.query>>;

function canDistribute(status: Status) {
  return status.availableDeckCopies > 0 && status.eligibleManagersCount > 0;
}

function matches(confirmed: Status, current: Status | undefined) {
  return !!current
    && canDistribute(current)
    && current.weekKey === confirmed.weekKey
    && current.seasonId === confirmed.seasonId
    && current.weekBatchCount === confirmed.weekBatchCount
    && current.availableDeckCopies === confirmed.availableDeckCopies
    && current.eligibleManagersCount === confirmed.eligibleManagersCount;
}

const errorCode = (error: unknown) => error instanceof TRPCClientError ? error.data?.code : undefined;

export function WeeklyDistribution({ managerId }: { managerId: string }) {
  return <DistributionCard key={managerId} managerId={managerId} />;
}

function DistributionCard({ managerId }: { managerId: string }) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [...tableKey(managerId), 'admin', 'distribution'],
    queryFn: ({ signal }) => trpcClient.distribution.status.query(undefined, { signal }),
    retry: false, networkMode: 'always', enabled: !!managerId,
  });
  const execute = useMutation({
    mutationFn: (input: {
      weekKey: string;
      seasonId: string;
      forceAdditional?: boolean;
      expectedWeekBatchCount?: number;
    }) => trpcClient.distribution.execute.mutate(input),
    retry: false, networkMode: 'always',
  });
  const [confirmed, setConfirmed] = useState<Status>();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const status = query.isSuccess ? query.data : undefined;
  const changed = !!confirmed && !matches(confirmed, status);

  async function submit() {
    if (!confirmed || changed || lock.current || query.isFetching) return;
    lock.current = true;
    setBusy(true);
    let sent = false;
    try {
      // Ask for the current week, not the pinned week: a rollover must invalidate consent.
      const fresh = await query.refetch({ throwOnError: true });
      if (!mounted.current) return;
      if (!matches(confirmed, fresh.data)) {
        setMessage('El estado ha cambiado. No se ha solicitado el reparto. Revisa los datos actuales.');
      } else {
        sent = true;
        const result = await execute.mutateAsync({
          weekKey: confirmed.weekKey,
          seasonId: confirmed.seasonId,
          forceAdditional: confirmed.alreadyExecuted,
          expectedWeekBatchCount: confirmed.weekBatchCount,
        });
        setMessage(`Reparto ejecutado · ${result.weekKey}. Cartas repartidas: ${result.distributed}. Excluidos por mano llena: ${result.skippedFullHandCount}.`);
      }
    } catch (error) {
      const code = errorCode(error);
      setMessage(code === 'CONFLICT' || code === 'PRECONDITION_FAILED'
        ? 'La semana, la temporada o el lote han cambiado. No se ha ejecutado este reparto.'
        : sent ? 'No se pudo confirmar el resultado del reparto. Comprueba el lote antes de volver a intentarlo.'
          : 'No se pudo verificar el estado actual. No se ha solicitado el reparto.');
    } finally {
      try {
        if (sent) await refreshAdmin(client, managerId);
      } catch {
        setMessage((previous) => `${previous} No se pudo actualizar la vista. Pulsa «Actualizar estado».`);
      } finally {
        setConfirmed(undefined);
        setBusy(false);
        lock.current = false;
      }
    }
  }

  return <section className="ml-panel" aria-label="Reparto semanal">
    <h2>Reparto semanal</h2>
    <p role="status">{message}</p>
    {query.isPending && <p role="status">Cargando reparto semanal…</p>}
    {query.isError && (errorCode(query.error) === 'PRECONDITION_FAILED'
      ? <p role="status">No hay temporada activa.</p>
      : <PanelError retry={() => void query.refetch()} />)}
    {status && <>
      <h3>Semana ISO {status.weekKey} · Europa/Madrid</h3>
      <p>Temporada: {status.seasonId}</p>
      <span className="ml-pill">
        {!status.alreadyExecuted
          ? 'Pendiente'
          : status.weekBatchCount > 1
            ? `Ejecutado (${status.weekBatchCount} lotes)`
            : 'Ejecutado'}
      </span>
      <p>Cartas en el mazo: {status.availableDeckCopies} · Mánagers elegibles: {status.eligibleManagersCount}</p>
      {status.availableDeckCopies === 0 && <p>El mazo está vacío.</p>}
      {status.eligibleManagersCount === 0 && <p>No hay candidatos elegibles (todos los mánagers activos tienen la mano llena).</p>}
      {status.batch && <div>
        <h3>{status.weekBatchCount > 1 ? `Último lote (${status.weekBatchCount} en la semana)` : 'Resultado del lote'}</h3>
        <p>Cartas repartidas: {status.batch.distributedCount}</p>
        <p>Origen: {status.batch.triggerSource === 'CRON' ? 'Automático (CRON)' : 'Manual (ADMIN)'} · Fecha: <Stamp iso={status.batch.createdAt} /></p>
        <p>Excluidos por mano llena: {status.batch.skippedFullHandCount}</p>
        {status.skippedFullHandManagers === null ? <p>Lote antiguo: nombres no registrados.</p>
          : status.skippedFullHandManagers.length === 0 ? <p>Nadie quedó excluido por mano llena.</p>
            : <ul aria-label="Excluidos por mano llena">{status.skippedFullHandManagers.map((m) => <li key={m.id}>{m.displayName}</li>)}</ul>}
      </div>}
    </>}
    <div className="ml-admin-actions">
      <button type="button" disabled={!managerId || busy || query.isFetching} onClick={() => void query.refetch()}>Actualizar estado</button>
      {status && <button type="button" className="ml-primary" disabled={busy || query.isFetching || !canDistribute(status)}
        onClick={() => setConfirmed(status)}>
        {status.alreadyExecuted ? 'Repartir cartas adicionales' : 'Repartir cartas'}
      </button>}
    </div>
    {confirmed && <DetailDialog
      kicker="Reparto semanal"
      title={confirmed.alreadyExecuted ? 'Confirmar reparto manual adicional' : 'Confirmar reparto semanal'}
      busy={busy}
      onClose={() => { if (!lock.current) setConfirmed(undefined); }}>
        {confirmed.alreadyExecuted
          ? <p>La semana <strong>{confirmed.weekKey}</strong> ya registra <strong>{confirmed.weekBatchCount}</strong> {confirmed.weekBatchCount === 1 ? 'lote' : 'lotes'}. ¿Ejecutar un reparto manual adicional para la temporada <strong>{confirmed.seasonId}</strong>?</p>
          : <p>¿Ejecutar el reparto de la semana <strong>{confirmed.weekKey}</strong> para la temporada <strong>{confirmed.seasonId}</strong>?</p>}
        <p>Cartas en el mazo: {confirmed.availableDeckCopies} · Mánagers elegibles: {confirmed.eligibleManagersCount}</p>
        {changed && !busy && <p role="alert">El estado ha cambiado. Cierra la confirmación y revisa los datos actuales.</p>}
        <div className="ml-admin-actions" aria-busy={busy}>
          <button type="button" disabled={busy} onClick={() => setConfirmed(undefined)}>Cancelar</button>
          <button type="button" className="ml-primary" disabled={busy || changed || query.isFetching} onClick={() => void submit()}>
            {busy ? 'Procesando reparto…' : confirmed.alreadyExecuted ? 'Confirmar reparto adicional' : 'Confirmar y repartir cartas'}
          </button>
        </div>
    </DetailDialog>}
  </section>;
}