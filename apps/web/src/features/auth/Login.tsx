import { useNavigate } from '@tanstack/react-router';
import { useRef, useState, type FormEvent } from 'react';
import { isUnauthorized, queryClient } from '../../lib/session';
import { trpcClient } from '../../lib/trpc';

export function Login() {
  const navigate = useNavigate();
  const sending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      await trpcClient.auth.login.mutate({
        username: String(fields.get('username')).trim(),
        password: String(fields.get('password')),
      });
      form.reset();
      queryClient.clear();
      await navigate({ to: '/home', replace: true });
    } catch (reason) {
      setError(
        isUnauthorized(reason)
          ? 'Usuario o contraseña incorrectos.'
          : 'No se pudo conectar con la liga. Vuelve a intentarlo.',
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="ml-login">
      <div className="ml-login__poster" aria-hidden="true">
        <div className="ml-poster-lines" />
        <div className="ml-poster-emblem">
          <img src="/icons/league-192.png" alt="" />
        </div>
        <span>MUNCHINKING LEAGUE</span>
      </div>
      <section className="ml-login__form">
        <p className="ml-kicker">Munchinking League · Acceso privado</p>
        <h1>Entra en la liga</h1>
        <p className="ml-muted">
          Consulta tu mano y juega tus cartas en la mesa de la liga.
        </p>
        <form onSubmit={submit}>
          <label>
            Usuario
            <input
              name="username"
              required
              minLength={2}
              maxLength={64}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete="current-password"
            />
          </label>
          {error && (
            <p className="ml-error" role="alert">
              {error}
            </p>
          )}
          <button className="ml-primary" disabled={busy}>
            {busy ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
        <small>¿No tienes acceso? Pídeselo al administrador de tu liga.</small>
      </section>
    </main>
  );
}