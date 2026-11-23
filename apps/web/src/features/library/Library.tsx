import { CARD_RARITIES, findSeasonCard, RARITY_LABELS_ES, type CardRarity } from '@munchinking/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { trpcClient } from '../../lib/trpc';
import { Card } from '../hand/CardFan';
import { DetailDialog, PanelError, ScreenHeading, tableKey } from '../table/shared';

type Entry = Awaited<ReturnType<typeof trpcClient.library.list.query>>['cards'][number];
const searchable = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('es');
const copies = (count: number) => `${count} ${count === 1 ? 'copia' : 'copias'} en temporada`;

export function Library({ managerId }: { managerId: string }) {
  const [search, setSearch] = useState('');
  const [rarity, setRarity] = useState<CardRarity | null>(null);
  const [selected, setSelected] = useState<Entry | null>(null);
  // The season catalogue is small and public to members. Filter in memory, even on a slow connection.
  const catalog = useQuery({
    queryKey: [...tableKey(managerId), 'library'],
    queryFn: ({ signal }) => trpcClient.library.list.query(undefined, { signal }),
  });
  const term = searchable(search.trim());
  const entries = catalog.data?.cards.filter(card => {
    const face = findSeasonCard(card.slug) ?? card;
    return (!rarity || card.rarity === rarity) && (!term || [face.name, face.nickname].some(label => searchable(label).includes(term)));
  });
  const official = selected && findSeasonCard(selected.slug);

  return <div className="ml-page">
    <ScreenHeading kicker="Catálogo de temporada" title="Biblioteca">
      <p className="ml-muted">Consulta el efecto de cada carta y sus reglas de uso.</p>
    </ScreenHeading>
    <section className="ml-panel" aria-label="Buscar y filtrar cartas">
      <label className="ml-field">Buscar por nombre o apodo
        <input type="search" maxLength={100} value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <div className="ml-chips" role="group" aria-label="Filtrar por rareza">
        {([null, ...CARD_RARITIES] as const).map(value =>
          <button type="button" key={value ?? 'all'} aria-pressed={value === rarity} onClick={() => setRarity(value)}>
            {value ? RARITY_LABELS_ES[value] : 'Todas'}
          </button>)}
      </div>
    </section>
    {catalog.isError && <PanelError retry={() => void catalog.refetch()} />}
    {!entries && !catalog.isError && <p role="status">Cargando catálogo…</p>}
    {entries && <>
      <p role="status" className="ml-muted">{entries.length === 1 ? '1 carta' : `${entries.length} cartas`}</p>
      {entries.length ? <ul className="ml-catalog">
        {entries.map(card => <li key={card.id}><button className="ml-catalog-card" type="button"
          aria-label={`Ver detalle: ${card.name}, ${RARITY_LABELS_ES[card.rarity]}`} onClick={() => setSelected(card)}>
          <Card definition={card} /><span className="ml-copies">{copies(card.seasonCopiesCount)}</span>
        </button></li>)}
      </ul> : <div className="ml-panel-note">{catalog.data?.cards.length ? <>
        <p>No hay cartas que coincidan con estos filtros.</p>
        <button type="button" className="ml-text-btn" onClick={() => { setSearch(''); setRarity(null); }}>Quitar filtros</button>
      </> : 'No hay cartas en el catálogo.'}</div>}
    </>}
    {selected && <DetailDialog kicker="Biblioteca" title={selected.name} onClose={() => setSelected(null)}>
      <div className="ml-focus__card"><Card definition={selected} /></div>
      <p className="ml-copies">{copies(selected.seasonCopiesCount)}</p>
      <h3>Efecto</h3><p>{official?.description ?? selected.description}</p>
      {!!official?.fields.length && <><h3>Selección de la jugada</h3><ul>{official.fields.map(f => <li key={f.key}>{f.label}{f.options && `: ${f.options.join(' / ')}`}</li>)}</ul></>}
      <h3>Reglas de uso</h3><p className="ml-focus__rules">{official?.usageRules ?? selected.usageRules}</p>
    </DetailDialog>}
  </div>;
}