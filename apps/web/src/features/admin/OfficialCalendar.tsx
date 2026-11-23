import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { trpcClient } from '../../lib/trpc';
import { PanelError, tableKey } from '../table/shared';

const clock = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'longOffset' });
function display(iso: string) {
  const p = Object.fromEntries(clock.formatToParts(new Date(iso)).map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}${p.timeZoneName!.slice(3)}`;
}
const blank = { roundNumber: '', firstStart: '', lastStart: '', endAt: '', endKind: 'planned' as 'planned' | 'actual', expectedRevision: 0 };
const fields = [['firstStart', 'Primer inicio'], ['lastStart', 'Último inicio'], ['endAt', 'Fin de la jornada']] as const;

export function OfficialCalendar({ managerId }: { managerId: string }) {
  const agenda = useQuery({ queryKey: [...tableKey(managerId), 'admin', 'calendar'], queryFn: ({ signal }) => trpcClient.calendar.list.query(undefined, { signal }) });
  return <section className="ml-panel" aria-label="Calendario oficial"><h2>Calendario oficial</h2>
    <p>Opcional · Europe/Madrid. Sin una jornada verificable, confirma el horario externamente.</p>
    {agenda.isError ? <PanelError retry={() => void agenda.refetch()} /> : agenda.data?.seasonId
      ? <RoundEditor key={agenda.data.seasonId} seasonId={agenda.data.seasonId} rounds={agenda.data.rounds} refresh={() => agenda.refetch()} />
      : <p>{agenda.isPending ? 'Cargando agenda…' : 'No hay temporada activa.'}</p>}
  </section>;
}

type Round = Awaited<ReturnType<typeof trpcClient.calendar.list.query>>['rounds'][number];
function RoundEditor({ seasonId, rounds, refresh }: { seasonId: string; rounds: Round[]; refresh: () => Promise<unknown> }) {
  const [draft, setDraft] = useState(blank);
  const [message, setMessage] = useState('');
  const save = useMutation({ mutationFn: (input: Parameters<typeof trpcClient.calendar.save.mutate>[0]) => trpcClient.calendar.save.mutate(input), retry: false });
  function edit(r: Round) {
    setDraft({ roundNumber: String(r.roundNumber), expectedRevision: r.revision, endKind: r.endKind,
      firstStart: display(r.firstStart), lastStart: display(r.lastStart), endAt: display(r.endAt) });
    setMessage('');
  }
  return <>
    {!rounds.length && <p>No hay jornadas cargadas.</p>}
    <ul>{rounds.map(r => <li key={r.roundNumber}><strong>Jornada {r.roundNumber}</strong>
      {fields.map(([key, label]) => <div key={key}>{label}: {display(r[key]).replace('T', ' ')}</div>)}
      Fin {r.endKind === 'actual' ? 'real' : 'previsto'}. <button type="button" disabled={save.isPending} onClick={() => edit(r)}>Revisar J{r.roundNumber}</button>
    </li>)}</ul>
    <form className="ml-admin-form" onSubmit={async e => {
      e.preventDefault(); if (save.isPending) return;
      setMessage('');
      try {
        await save.mutateAsync({ ...draft, seasonId, roundNumber: Number(draft.roundNumber) });
        setDraft(blank); setMessage('Jornada guardada.');
      } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar la jornada.'); }
      await refresh();
    }}>
      <label className="ml-field">Número de jornada<input type="number" min="1" step="1" required readOnly={!!draft.expectedRevision} value={draft.roundNumber} onChange={e => setDraft({ ...draft, roundNumber: e.target.value })} /></label>
      <p>Escribe la hora de Madrid como AAAA-MM-DDThh:mm. En la hora repetida de otoño añade +02:00 (primera) o +01:00 (segunda).</p>
      {fields.map(([key, label]) => <label key={key} className="ml-field">{label}<input required maxLength={22} placeholder="AAAA-MM-DDThh:mm" value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
      <label className="ml-field">Tipo de fin<select value={draft.endKind} onChange={e => setDraft({ ...draft, endKind: e.target.value === 'actual' ? 'actual' : 'planned' })}>
        <option value="planned">Previsto</option><option value="actual">Real (confirmado)</option>
      </select></label>
      <button className="ml-primary" disabled={save.isPending}>{draft.expectedRevision ? 'Actualizar jornada' : 'Registrar jornada'}</button>
      {!!draft.expectedRevision && <button type="button" disabled={save.isPending} onClick={() => setDraft(blank)}>Cancelar revisión</button>}
    </form><p role="status">{message}</p>
  </>;
}