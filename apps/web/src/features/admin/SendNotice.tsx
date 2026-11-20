import { sendAdminNoticeInputSchema, type SendAdminNoticeInput } from '@munchinking/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { trpcClient } from '../../lib/trpc';
import { DetailDialog, tableKey } from '../table/shared';
import type { AdminRoster } from './adminData';

type Draft = { input: SendAdminNoticeInput; recipient: string };

export function SendNotice({ managerId, roster }: { managerId: string; roster?: AdminRoster }) {
  const [target, setTarget] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState<Draft>();
  const [feedback, setFeedback] = useState('');
  const submitting = useRef(false);
  const client = useQueryClient();
  const active = roster?.filter(member => member.isActive);
  const recipient = target === 'all' && active?.length ? 'Toda la liga (mánagers activos)' : active?.find(m => m.id === target)?.displayName;
  const parsed = sendAdminNoticeInputSchema.safeParse({title, message, targetManagerId: target === 'all' ? undefined : target});
  const send = useMutation({ mutationFn: (input: SendAdminNoticeInput) => trpcClient.admin.sendNotice.mutate(input), retry: false });

  function review(event: FormEvent) {
    event.preventDefault();
    if (!recipient || !parsed.success || submitting.current) return;
    setFeedback('');
    setDraft({ input: parsed.data, recipient });
  }
  async function confirm() {
    if (!draft || !recipient || submitting.current) return;
    submitting.current = true;
    try {
      const { deliveredCount } = await send.mutateAsync(draft.input);
      setFeedback(`Aviso enviado a ${deliveredCount} ${deliveredCount === 1 ? 'destinatario' : 'destinatarios'}.`);
      setTarget(''); setTitle(''); setMessage('');
      void client.invalidateQueries({ queryKey: [...tableKey(managerId), 'unread'] });
      void client.invalidateQueries({ queryKey: [...tableKey(managerId), 'notices'] });
    } catch {
      setFeedback('No se pudo confirmar la entrega. Comprueba el buzón del destinatario antes de reenviar. El borrador se ha conservado.');
    } finally {
      submitting.current = false; setDraft(undefined);
    }
  }

  return <section className="ml-panel" aria-label="Comunicados de la liga">
    <h2>Enviar aviso</h2>
    <form className="ml-admin-form" onSubmit={review}>
      <label className="ml-field">Destinatario
        <select required disabled={!active?.length} value={target} onChange={e => setTarget(e.target.value)}>
          <option value="">Elige un destinatario</option>
          <option value="all">Toda la liga (mánagers activos)</option>
          {active?.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
        </select>
      </label>
      <label className="ml-field">Título del aviso<input required minLength={3} maxLength={100} value={title} onChange={e => setTitle(e.target.value)} /></label>
      <label className="ml-field">Mensaje<textarea required rows={3} minLength={3} maxLength={500} value={message} onChange={e => setMessage(e.target.value)} /></label>
      <button className="ml-primary" type="submit" disabled={!recipient || !parsed.success || send.isPending}>Revisar aviso</button>
    </form>
    <p role="status">{feedback}</p>
    {draft && <DetailDialog kicker="Comunicado interno" title="Confirmar envío" busy={send.isPending} onClose={() => { if (!submitting.current) setDraft(undefined); }}>
      <p>Destinatario: <strong>{draft.recipient}</strong></p><h3>{draft.input.title}</h3><p className="ml-focus__rules">{draft.input.message}</p>
      <button type="button" className="ml-focus__primary" disabled={send.isPending || !recipient} onClick={() => void confirm()}>
        {send.isPending ? 'Enviando…' : 'Enviar aviso'}
      </button>
    </DetailDialog>}
  </section>;
}