import type { D1Database } from '@cloudflare/workers-types';
import { DomainRuleError, resolveSeasonPlay } from '@munchinking/domain';
import { findSeasonCard, type PlayCardInput, type SeasonCard } from '@munchinking/shared';
import { TRPCError } from '@trpc/server';
import { protectionGuard } from './card-protections';
import { validateScheduledWindow } from './season-calendar';

// Only directed adverse effects can be returned to their sender; naming a buyer, for
// example, does not make the buyer the victim of Bono de representación.
const mirrorable = ['capitan-obligatorio', 'titular-obligatorio', 'jugador-inutil', 'jugador-prohibido', 'egoista',
  'cesion-obligatoria', 'intercambio-puntuacion-jugador', 'alineacion-congelada', 'clausulazo-directo', 'lesion-de-cruzado'];
const sourceWhere = `m.movement_type='PLAYED' AND m.season_id=? AND m.target_manager_id=? AND m.manager_id<>m.target_manager_id
  AND e.effective_slug IN (${mirrorable.map(slug => `'${slug}'`).join(',')}) AND author.is_active=1
  AND NOT EXISTS (SELECT 1 FROM card_movement r WHERE r.related_movement_id=m.id AND r.movement_type='RETURNED')
  AND NOT EXISTS (SELECT 1 FROM card_play_effect echo JOIN card_movement played ON played.id=echo.movement_id
    WHERE echo.mirror_source_id=m.id AND played.manager_id=m.target_manager_id AND NOT EXISTS
    (SELECT 1 FROM card_movement r WHERE r.related_movement_id=played.id AND r.movement_type='RETURNED'))`;
const sourceTables = `FROM card_movement m JOIN card_play_effect e ON e.movement_id=m.id
  JOIN manager author ON author.id=m.manager_id JOIN season s ON s.id=m.season_id AND s.league_id=author.league_id`;
type MirrorRow = {id:string; senderId:string; managerName:string; slug:string; createdAt:string; targetLabel:string|null; roundNumber:number|null};

function mirrorQuery(db: D1Database, seasonId: string, managerId: string, movementId?: string) {
  return db.prepare(`SELECT m.id, m.manager_id AS senderId, author.display_name AS managerName, e.effective_slug AS slug,
    m.created_at AS createdAt, m.target_label AS targetLabel, e.round_number AS roundNumber ${sourceTables}
    WHERE ${sourceWhere} ${movementId ? 'AND m.id=?' : ''} ORDER BY m.created_at DESC, m.id DESC ${movementId ? 'LIMIT 1' : ''}`)
    .bind(seasonId, managerId, ...(movementId ? [movementId] : []));
}
export async function listMirrorTargets(db: D1Database, seasonId: string, managerId: string) {
  return (await mirrorQuery(db, seasonId, managerId).all<MirrorRow>()).results.map(row => {
    const source = findSeasonCard(row.slug)!;
    return { id: row.id, cardName: source.name, managerName: row.managerName, createdAt: row.createdAt,
      targetLabel: row.targetLabel, requiresPlayer: source.fields.some(f => f.kind === 'player') };
  });
}

export async function officialPlay(db: D1Database, card: SeasonCard, input: PlayCardInput,
  actor: {id:string; leagueId:string}, seasonId: string, nowIso: string) {
  if (!input.rulesConfirmed || !input.choices || input.targetLabel !== undefined || input.targetManagerId !== undefined) {
    throw new DomainRuleError('TARGET_REQUIRED', 'Completa el formulario de esta carta y confirma sus condiciones de uso.');
  }
  const choices = { ...input.choices };
  const isMirror = card.slug === 'carta-espejo';
  let effectiveCard = card, effectiveChoices = choices;
  let mirror: MirrorRow | undefined;
  if (isMirror) {
    const sourceId = choices.movement;
    mirror = sourceId ? await mirrorQuery(db, seasonId, actor.id, sourceId).first<MirrorRow>() ?? undefined : undefined;
    if (!mirror) throw new DomainRuleError('TARGET_REQUIRED', 'Elige una jugada recibida, vigente y reflejable.');
    effectiveCard = findSeasonCard(mirror.slug)!;
    const hasPlayer = effectiveCard.fields.some(f => f.kind === 'player');
    if (Object.keys(choices).some(k => k !== 'movement' && !(hasPlayer && k === 'reflectedPlayer'))) {
      throw new DomainRuleError('UNEXPECTED_TARGET', 'Espejo solo se dirige al emisor original.');
    }
    effectiveChoices = {};
    for (const f of effectiveCard.fields) {
      if (f.kind === 'rival' || f.kind === 'manager') effectiveChoices[f.key] = mirror.senderId;
      if (f.kind === 'player' && choices.reflectedPlayer) effectiveChoices[f.key] = choices.reflectedPlayer;
    }
  }
  const needsRoster = isMirror || effectiveCard.fields.some(f => ['manager','rival'].includes(f.kind));
  const [roster, window] = await Promise.all([
    needsRoster ? db.prepare('SELECT id, display_name AS name FROM manager WHERE league_id=? AND is_active=1')
      .bind(actor.leagueId).all<{id:string; name:string}>().then(r => r.results) : [],
    validateScheduledWindow(db, seasonId, card.slug, nowIso)
  ]);
  if (window.status === 'closed') throw new TRPCError({code:'PRECONDITION_FAILED', message: `${window.reason} Jornada ${window.round?.roundNumber}.`});
  const context = {actorId:actor.id, managerNames:new Map(roster.map(m => [m.id, m.name])), nowIso};
  const effect = resolveSeasonPlay(effectiveCard, effectiveChoices, context);
  const resolved = mirror ? resolveSeasonPlay(card, {movement:mirror.id}, { ...context, mirror:{id:mirror.id,
    cardName:effectiveCard.name, senderId:mirror.senderId, senderName:mirror.managerName, effect:effect.summary} }) : effect;
  if (mirror && effectiveChoices.player) resolved.details.unshift(`Futbolista de la plantilla del emisor: ${effectiveChoices.player.normalize('NFC').trim()}`);
  if (window.status === 'open' && window.round) resolved.details.push(`Ventana comprobada: jornada ${window.round.roundNumber}.`);
  if (card.slug !== 'mus') resolved.details.push('La app registra la jugada; los cambios en Biwenger se aplican fuera de la app.');
  const getValues = (kinds: string[]) => effectiveCard.fields.filter(f => kinds.includes(f.kind))
    .map(f => effectiveChoices[f.key]?.normalize('NFC').trim()).filter((v): v is string => !!v);
  const guard = protectionGuard({actorId:actor.id, seasonId, slug:card.slug, effectiveSlug:effectiveCard.slug,
    rarity:effectiveCard.rarity, targetManagerIds:getValues(['manager','rival']), players:getValues(['player']), nowIso});
  if (mirror) {
    guard.sql += ` AND EXISTS (SELECT 1 ${sourceTables} WHERE ${sourceWhere} AND m.id=?)`;
    guard.binds.push(seasonId, actor.id, mirror.id);
  }
  return {resolved, guard, choices, effectiveChoices, effectiveSlug:effectiveCard.slug,
    mirrorSourceId:mirror?.id ?? null, roundNumber:mirror?.roundNumber ?? (window.status === 'open' ? window.round?.roundNumber ?? null : null)};
}