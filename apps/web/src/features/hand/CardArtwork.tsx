import { useState, type ReactNode } from 'react';
import { cardArtUrl } from '../../lib/card-art';

export function CardArtwork({ slug, name, children }: { slug?: string; name: string; children?: ReactNode }) {
  const src = cardArtUrl(slug);
  return <Artwork key={src ?? slug} src={src} name={name}>{children}</Artwork>;
}

function Artwork({ src, name, children }: { src?: string; name: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{children}</>;
  return <img className="ml-card-artwork" src={src} alt={`Anverso de ${name}`}
    width={608} height={874} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}