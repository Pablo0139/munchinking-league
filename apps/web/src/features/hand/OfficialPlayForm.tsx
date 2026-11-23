import { MAX_TARGET_LABEL_LENGTH, type PlayCardInput, type SeasonField } from '@munchinking/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { trpcClient } from '../../lib/trpc';

type Props = {
  card: { name: string; description: string; usageRules: string; fields: readonly SeasonField[] };
  cardCopyId: string; actorId: string; pending: boolean; error?: string;
  onPlay: (input: PlayCardInput) => void; onBack: () => void;
};
type Option = { id: string; label: string };
const isManager = (field: SeasonField) => field.kind === 'rival' || field.kind === 'manager';
const validEuros = (value: string) => /^\d{1,10}(?:[.,]\d{1,2})?$/.test(value) &&
  Number(value.replace(',', '.')) > 0 && Number(value.replace(',', '.')) <= 1_000_000_000;

export function OfficialPlayForm({ card, cardCopyId, actorId, pending, error, onPlay, onBack }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const hasManagers = card.fields.some(isManager);
  const hasMovement = card.fields.some(f => f.kind === 'movement');
  const managers = useQuery({
    queryKey: ['manager.listTargets', actorId, { excludeSelf: false }], enabled: hasManagers, retry: false,
    queryFn: ({ signal }) => trpcClient.manager.listTargets.query({ excludeSelf: false }, { signal })
  });
  const movements = useQuery({
    queryKey: ['cards.mirrorTargets', actorId], enabled: hasMovement, retry: false,
    queryFn: ({ signal }) => trpcClient.cards.mirrorTargets.query(undefined, { signal })
  });
  function options(field: SeasonField): Option[] | undefined {
    if (isManager(field)) return (managers.isError ? [] : managers.data?.managers ?? [])
      .filter(m => (field.kind !== 'rival' || m.id !== actorId) &&
        !card.fields.some(other => other.key !== field.key && isManager(other) && values[other.key] === m.id))
      .map(m => ({ id: m.id, label: [m.displayName, m.teamName].filter(Boolean).join(' · ') + (m.id === actorId ? ' (tú)' : '') }));
    if (field.kind === 'movement') return (movements.isError ? [] : movements.data?.items ?? []).map(m => ({
      id: m.id, label: [m.cardName, m.managerName, new Date(m.createdAt).toLocaleString('es-ES'), m.targetLabel].filter(Boolean).join(' · ')
    }));
    if (field.kind === 'choice') return (field.options ?? []).map(id => ({ id, label: id }));
    return undefined;
  }
  const choices = Object.fromEntries(card.fields.map(f => [f.key, (values[f.key] ?? '').trim()]));
  const needsReflectedPlayer = hasMovement && movements.data?.items.find(m => m.id === choices.movement)?.requiresPlayer;
  if (needsReflectedPlayer) choices.reflectedPlayer = (values.reflectedPlayer ?? '').trim();
  const players = card.fields.filter(f => f.kind === 'player').map(f => choices[f.key]?.normalize('NFKD').replace(/\p{M}/gu, '').replace(/\s+/gu, ' ').toLocaleLowerCase('es')).filter(Boolean);
  const repeatedPlayer = new Set(players).size !== players.length;
  const ready = confirmed && !repeatedPlayer && (!needsReflectedPlayer || !!choices.reflectedPlayer) && card.fields.every(f => {
    const v = choices[f.key];
    const allowed = options(f);
    if (!v) return false;
    if (allowed) return allowed.some(option => option.id === v);
    if (f.kind === 'money') return validEuros(v);
    return v.length <= MAX_TARGET_LABEL_LENGTH;
  });
  function update(key: string, value: string) {
    setValues(previous => ({ ...previous, [key]: value }));
    setConfirmed(false);
  }
  return <form onSubmit={event => {
    event.preventDefault();
    if (ready && !pending) onPlay({ cardCopyId, choices, rulesConfirmed: true });
  }}>
    <h3>{card.name}</h3><p>{card.description}</p>
    <fieldset disabled={pending} className="ml-official-fields">
      <legend>{card.fields.length ? 'Selección de la jugada' : 'Condiciones de la jugada'}</legend>
      {card.fields.map(f => {
        const allowed = options(f);
        return <label key={f.key}>{f.label}
          {allowed ? <select required disabled={!allowed.length} value={values[f.key] ?? ''} onChange={e => update(f.key, e.target.value)}>
            <option value="">Selecciona una opción</option>
            {allowed.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select> : <input required inputMode={f.kind === 'money' ? 'decimal' : 'text'}
            maxLength={MAX_TARGET_LABEL_LENGTH}
            value={values[f.key] ?? ''} onChange={e => update(f.key, e.target.value)} />}
          {f.kind === 'money' && <small>Euros sin separadores de miles, con hasta dos decimales (p. ej., 1250000,50).</small>}
          {f.kind === 'movement' && values[f.key] && <small aria-live="polite">Selección: {allowed?.find(o => o.id === values[f.key])?.label}</small>}
          {f.kind === 'money' && values[f.key] && !validEuros(choices[f.key] ?? '') && <small role="status"> Introduce un importe positivo válido de hasta mil millones.</small>}
        </label>;
      })}
      {hasManagers && <ListStatus pending={managers.isPending} error={managers.isError}
        empty={card.fields.some(f => isManager(f) && !options(f)?.length)} fetching={managers.isFetching}
        noun="mánagers disponibles" retry={() => void managers.refetch()} />}
      {hasMovement && <>
        {needsReflectedPlayer && <label>Futbolista de la plantilla del emisor para la réplica
          <input required maxLength={MAX_TARGET_LABEL_LENGTH} value={values.reflectedPlayer ?? ''} onChange={e => update('reflectedPlayer', e.target.value)} />
        </label>}
        <ListStatus pending={movements.isPending} error={movements.isError} empty={!movements.data?.items.length}
          fetching={movements.isFetching} noun="jugadas recibidas elegibles" retry={() => void movements.refetch()} />
        <p>La réplica no cancela la jugada original. Si afecta a un futbolista, verifica que pertenece a la plantilla del mánager que lanzó la carta original.</p>
      </>}
      {repeatedPlayer && <p role="alert">Elige futbolistas distintos para cada puesto.</p>}
      <h3>Uso y condiciones</h3><p className="ml-focus__rules">{card.usageRules}</p>
      <p>Verificación externa: comprueba en la liga los plazos, las plantillas y las demás condiciones aplicables.</p>
      <label className="ml-official-check"><input required type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />He comprobado que se cumplen las reglas de esta jugada.</label>
    </fieldset>
    {error && <p role="alert">No se pudo completar la jugada. {error}</p>}
    <div className="ml-focus__actions">
      <button type="submit" className="ml-focus__primary" disabled={pending || !ready}>{pending ? 'Enviando…' : 'Confirmar jugada'}</button>
      <button type="button" disabled={pending} onClick={onBack}>Volver</button>
    </div>
  </form>;
}

function ListStatus({ pending, error, empty, fetching, noun, retry }: {
  pending: boolean; error: boolean; empty: boolean; fetching: boolean; noun: string; retry: () => void;
}) {
  if (pending) return <p role="status">Cargando {noun}…</p>;
  if (!error && !empty) return null;
  return <><p role={error ? 'alert' : 'status'}>{error ? `Error al cargar la lista de ${noun}.` : `No hay ${noun} para esta selección.`}</p>
    <button type="button" disabled={fetching} onClick={retry}>Actualizar lista</button></>;
}