import { MAX_HAND_SIZE, RARITY_LABELS_ES } from '@munchinking/shared';

export function App() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-between px-5 py-8">
      <header className="space-y-2 text-center">
        <span className="inline-block rounded-full bg-[#EFEAF8] px-3 py-1 text-xs font-semibold tracking-wide text-[#6D28D9]">
          MUNCHINKING LEAGUE · MVP
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1B1429]">
          Base del Monorepo Lista
        </h1>
        <p className="text-sm text-[#594F6E]">
          Dominio puro, esquema Cloudflare D1 y contrato tRPC conectados de extremo a extremo.
        </p>
      </header>

      <section className="rounded-2xl border border-[#DFD7F0] bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[#594F6E]">
          Invariantes activas
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-[#1B1429]">
          <li>• Mano máxima por manager: {MAX_HAND_SIZE} cartas</li>
          <li>
            • Rarezas soportadas: ● {RARITY_LABELS_ES.COMMON}, ◆ {RARITY_LABELS_ES.RARE}, ⬡{' '}
            {RARITY_LABELS_ES.EPIC}, ✦ {RARITY_LABELS_ES.LEGENDARY}
          </li>
        </ul>
      </section>

      <footer className="text-center text-xs text-[#594F6E]">
        Cloudflare Pages · Workers · D1 · R2
      </footer>
    </main>
  );
}
