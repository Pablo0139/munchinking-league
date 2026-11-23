import {
  discardCardInputSchema,
  findSeasonCard,
  MAX_TARGET_LABEL_LENGTH,
  playCardInputSchema,
  type DiscardCardInput,
  type PlayCardInput
} from '@munchinking/shared';
import { useMutation, useQuery } from '@tanstack/react-query';
import { TRPCClientError } from '@trpc/client';
import { useId, useLayoutEffect, useRef, useState } from 'react';
import { trpcClient } from '../../lib/trpc';
import { Card, type HandCard } from './CardFan';
import { OfficialPlayForm } from './OfficialPlayForm';
import './focus.css';

type Props = { card: HandCard; actorId: string; onClose: () => void; onChanged: () => void };
type Action = { kind: 'play'; input: PlayCardInput } | { kind: 'discard'; input: DiscardCardInput };

function playInput(card: HandCard, value: string, managerIds: string[]) {
  const base = { cardCopyId: card.cardCopyId };
  switch (card.definition.targetType) {
    case 'NONE':
      return playCardInputSchema.safeParse(base);
    case 'MANAGER':
      return managerIds.includes(value)
        ? playCardInputSchema.safeParse({ ...base, targetManagerId: value })
        : null;
    case 'PLAYER':
    case 'FREE_TEXT':
      return playCardInputSchema.safeParse({ ...base, targetLabel: value });
    default:
      return null;
  }
}

export function CardFocusSheet(props: Props) {
  return <FocusDialog key={props.card.cardCopyId} {...props} />;
}

function FocusDialog({ card, actorId, onClose, onChanged }: Props) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const preview = useRef<HTMLTextAreaElement>(null);
  const locked = useRef(false);
  const [step, setStep] = useState<'inspect' | 'play' | 'discard'>('inspect');
  const [value, setValue] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const type = card.definition.targetType;
  const official = findSeasonCard(card.definition.slug);
  const face = official ?? card.definition;
  const compensation = official && <p className="ml-focus__notice">Compensación indicativa por descarte: <strong>{{ COMMON: '250.000 €', RARE: '500.000 €', EPIC: '1.000.000 €' }[official.rarity]}</strong>. Requiere aviso previo en el grupo; no se abona automáticamente.</p>;

  const write = useMutation({
    retry: false,
    networkMode: 'always',
    mutationFn: async (action: Action) => {
      if (action.kind === 'play') {
        const { whatsappMessage } = await trpcClient.cards.play.mutate(action.input);
        return { kind: 'played' as const, whatsappMessage };
      }
      await trpcClient.cards.discard.mutate(action.input);
      return { kind: 'discarded' as const };
    },
    onSuccess: () => { onChanged(); },
    onError: (error) => {
      if (isConflict(error)) onChanged();
      else locked.current = false;
    }
  });
  const screen = write.data?.kind ?? (isConflict(write.error) ? 'conflict' : step);
  const targets = useQuery({
    queryKey: ['manager.listTargets', actorId, { excludeSelf: true }],
    queryFn: ({ signal }) => trpcClient.manager.listTargets.query({ excludeSelf: true }, { signal }),
    enabled: !official && screen === 'play' && type === 'MANAGER',
    retry: false
  });
  const managers = targets.data?.managers ?? [];
  const play = playInput(card, value, targets.isError ? [] : managers.map((m) => m.id));
  const discard = discardCardInputSchema.safeParse({ cardCopyId: card.cardCopyId });

  useLayoutEffect(() => {
    const node = dialog.current!;
    const opener = document.activeElement;
    const origin = opener?.closest('main, [role="main"]');
    node.showModal();
    return () => {
      node.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
      else origin?.querySelector<HTMLElement>('button:not(:disabled), a[href], [tabindex="0"]')?.focus();
    };
  }, []);
  useLayoutEffect(() => { heading.current?.focus(); }, [screen]);

  function navigate(next: typeof step) {
    if (locked.current) return;
    write.reset();
    setValue('');
    setStep(next);
  }
  function confirm() {
    if (locked.current) return;
    const action: Action | null = screen === 'play' && play?.success
      ? { kind: 'play', input: play.data }
      : screen === 'discard' && discard.success ? { kind: 'discard', input: discard.data } : null;
    if (!action) return;
    locked.current = true;
    write.mutate(action);
  }
  async function copyMessage() {
    if (write.data?.kind !== 'played') return;
    try {
      await navigator.clipboard.writeText(write.data.whatsappMessage);
      setCopyStatus('Mensaje copiado.');
    } catch {
      preview.current?.focus();
      preview.current?.select();
      setCopyStatus('No se pudo copiar. Usa la opción Copiar del dispositivo sobre el texto seleccionado.');
    }
  }

  const titles = {
    inspect: face.name, play: 'Confirmar jugada', discard: 'Confirmar descarte',
    played: 'Carta jugada', discarded: 'Carta descartada', conflict: 'La mano ha cambiado'
  };
  return (
    <dialog ref={dialog} className="ml-focus" aria-labelledby={titleId}
      onCancel={(event) => { event.preventDefault(); if (!write.isPending) onClose(); }}>
      <header className="ml-focus__header">
        <div><small>MI MANO</small><h2 id={titleId} ref={heading} tabIndex={-1}>{titles[screen]}</h2></div>
        <button type="button" onClick={onClose} disabled={write.isPending}>Cerrar</button>
      </header>
      {screen === 'inspect' && <>
        <div className="ml-focus__card"><Card definition={card.definition} /></div>
        <h3>Efecto</h3><p>{face.description}</p>
        <h3>Reglas de uso</h3><p className="ml-focus__rules">{face.usageRules}</p>
        {compensation}
        <div className="ml-focus__actions">
          <button type="button" className="ml-focus__primary" onClick={() => navigate('play')}>Jugar</button>
          <button type="button" className="ml-focus__danger" onClick={() => navigate('discard')}>Descartar</button>
        </div>
      </>}
      {screen === 'play' && official && <OfficialPlayForm card={official} cardCopyId={card.cardCopyId} actorId={actorId}
        pending={write.isPending} error={write.error?.message} onBack={() => navigate('inspect')} onPlay={input => {
          if (locked.current) return;
          locked.current = true;
          write.mutate({ kind: 'play', input });
        }} />}
      {((screen === 'play' && !official) || screen === 'discard') && <form onSubmit={(event) => { event.preventDefault(); confirm(); }}>
        <p><strong>{face.name}</strong></p>
        {screen === 'discard' && compensation}
        {screen === 'discard' ? <p>Perderás esta carta de tu mano. Volverá al mazo sin aplicar su efecto.</p>
          : type === 'NONE' ? <p>Esta carta no necesita objetivo. ¿Quieres jugarla?</p>
          : type === 'MANAGER' ? <>
            <label>Mánager objetivo
              <select required disabled={write.isPending || !managers.length || targets.isError} value={value} onChange={(e) => setValue(e.target.value)}>
                <option value="">Selecciona un mánager</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.displayName}{m.teamName && ` · ${m.teamName}`}</option>)}
              </select>
            </label>
            {targets.isPending && <p role="status">Cargando mánagers…</p>}
            {targets.isError && <p role="alert">No se pudieron cargar los mánagers.</p>}
            {targets.isSuccess && !managers.length && <p role="status">No hay mánagers disponibles.</p>}
            {(targets.isError || (targets.isSuccess && !managers.length)) &&
              <button type="button" disabled={targets.isFetching} onClick={() => void targets.refetch()}>Actualizar lista</button>}
          </> : type === 'PLAYER' || type === 'FREE_TEXT' ? <label>
            {type === 'PLAYER' ? 'Nombre del jugador' : 'Texto del objetivo'} (máx. {MAX_TARGET_LABEL_LENGTH} caracteres)
            <input required maxLength={MAX_TARGET_LABEL_LENGTH} disabled={write.isPending} value={value} onChange={(e) => setValue(e.target.value)} />
          </label> : <p role="alert">Esta carta tiene un tipo de objetivo desconocido.</p>}
        {!discard.success && <p role="alert">El identificador de esta carta no es válido.</p>}
        {write.isError && <p role="alert">No se pudo completar la acción. {write.error.message}</p>}
        <div className="ml-focus__actions">
          <button type="submit" className={screen === 'play' ? 'ml-focus__primary' : 'ml-focus__danger'}
            disabled={write.isPending || !(screen === 'play' ? play?.success : discard.success)}>
            {write.isPending ? 'Enviando…' : screen === 'play' ? 'Confirmar jugada' : 'Confirmar descarte'}
          </button>
          <button type="button" disabled={write.isPending} onClick={() => navigate('inspect')}>Volver</button>
        </div>
      </form>}
      {screen === 'conflict' && <p role="alert">{write.error?.message} Cierra para revisar la mano actualizada.</p>}
      {screen === 'discarded' && <><p>La carta ha vuelto al mazo sin aplicar su efecto.</p>{compensation}</>}
      {write.data?.kind === 'played' && <>
        <label>Mensaje para WhatsApp<textarea ref={preview} readOnly rows={5} value={write.data.whatsappMessage} /></label>
        <button type="button" className="ml-focus__primary" onClick={copyMessage}>Copiar mensaje para WhatsApp</button>
        <p role="status">{copyStatus}</p>
      </>}
    </dialog>
  );
}

function isConflict(error: unknown) {
  return error instanceof TRPCClientError && error.data?.code === 'CONFLICT';
}