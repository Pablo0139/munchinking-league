import { findSeasonCard, MAX_HAND_SIZE, RARITY_LABELS_ES } from '@munchinking/shared';
import { useId, useState } from 'react';
import type { trpcClient } from '../../lib/trpc';
import './hand.css';

export type HandCard = Awaited<ReturnType<typeof trpcClient.manager.getHand.query>>['cards'][number];

type HandProps = { cards: HandCard[]; onSelect: (card: HandCard) => void };

const emblems = { COMMON: '●', RARE: '◆', EPIC: '⬢', LEGENDARY: '✦' } as const;
const targets: Readonly<Record<string, string>> = {
  NONE: 'Sin objetivo', MANAGER: 'Mánager', PLAYER: 'Jugador', FREE_TEXT: 'Libre'
};

function Crest() {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 64 72" className="ml-hand-crest">
    <path d="M4 5h56v35Q57 55 32 68 7 55 4 40Z" fill="#2e1065" stroke="#eadbff" strokeWidth="3" />
    <path d="m14 43 4-25 14 12 14-12 4 25h-8l-2-11-8 7-8-7-2 11Z" fill="#faf5ff" />
    <path d="m23 49 9 6 9-6" fill="none" stroke="#e9b65b" strokeWidth="4" />
  </svg>;
}

export function CardBack() {
  return <span className="ml-hand-back" aria-hidden="true"><Crest /></span>;
}

function Illustration({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="ml-hand-art" aria-hidden="true">
    <Crest />
    {src && !failed && <img src={src} alt="" decoding="async" onError={() => setFailed(true)} />}
  </span>;
}

type CardFace = Pick<HandCard['definition'], 'name' | 'nickname' | 'description' | 'imageUrl' | 'targetType' | 'rarity'> & { slug?: string };

export function Card({ definition: d }: { definition: CardFace }) {
  const official = d.slug ? findSeasonCard(d.slug) : undefined;
  const face = official ?? d;
  const rarity = Object.hasOwn(emblems, d.rarity) ? d.rarity as keyof typeof emblems : null;
  return <span className="ml-hand-face" data-rarity={rarity ?? 'unknown'}>
    <span className="ml-hand-target">{official ? `T26/27 · Reglamento p. ${official.page}` : targets[d.targetType] ?? 'Especial'}</span>
    {d.imageUrl === '/icons/league-192.png' ? <img className="ml-hand-badge" src={d.imageUrl} alt="" decoding="async" /> : <Illustration key={d.imageUrl} src={d.imageUrl} />}
    <span className="ml-hand-name">{face.name}</span>
    {face.nickname && <i className="ml-hand-nick">{face.nickname}</i>}
    <span className="ml-hand-effect">{face.description}</span>
    <span className="ml-hand-rarity"><b aria-hidden="true">{rarity ? emblems[rarity] : '◇'}</b>
      {rarity ? RARITY_LABELS_ES[rarity] : 'Sin clasificar'}</span>
  </span>;
}

export function CardFan({ cards, onSelect }: HandProps) {
  const hand = cards.slice(0, MAX_HAND_SIZE);
  return <HandPanel cards={hand} onSelect={onSelect} />;
}

function HandPanel({ cards, onSelect }: HandProps) {
  const [shown, setShown] = useState(false);
  const id = useId();
  return <section className="ml-hand" aria-labelledby={`${id}-title`}>
    <header className="ml-hand-header">
      <div><p className="ml-hand-kicker">Munchinking League</p><h2 id={`${id}-title`}>Tu mano</h2></div>
      <div className="ml-hand-controls"><span className="ml-hand-count" aria-label={`${cards.length} de ${MAX_HAND_SIZE} cartas`}>{cards.length} / {MAX_HAND_SIZE}</span>
        {cards.length > 0 && <button className="ml-hand-toggle" type="button" aria-controls={id} aria-expanded={shown} onClick={() => setShown(!shown)}>
          <svg width="18" height="18" aria-hidden="true" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.7"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{shown && <path d="m3 3 18 18"/>}</svg>
          {shown ? 'Ocultar cartas' : 'Mostrar cartas'}
        </button>}
      </div>
    </header>
    <div className="ml-hand-table" id={id} data-count={cards.length}>
      {cards.length === 0 ? <div className="ml-hand-empty"><Crest /><strong>Sin cartas en mano</strong><span>Próximo reparto el lunes</span></div> : cards.map((card, i) =>
        <div className="ml-hand-slot" key={card.cardCopyId}>
          {shown ? <button className="ml-hand-pick" type="button" aria-label={`Ver ${card.definition.name}, carta ${i + 1} de ${cards.length}`} onClick={() => onSelect(card)}><Card definition={card.definition} /></button> : <CardBack />}
        </div>)}
    </div>
    {cards.length > 0 && <footer className="ml-hand-footer"><p>{shown ? 'Elige una carta para verla de cerca.' : 'Tus cartas están boca abajo.'}</p></footer>}
  </section>;
}