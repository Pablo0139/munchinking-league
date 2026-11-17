import { MAX_TARGET_LABEL_LENGTH, RARITY_LABELS_ES, type TargetType } from '@munchinking/shared';
import type { CardDefinition, Manager } from './entities';
import { DomainRuleError } from './errors';

export interface PlayTargetInput {
  targetManager?: Pick<Manager, 'id' | 'displayName' | 'leagueId'> | null;
  targetLabel?: string | null;
}

export interface ValidatedPlayTarget {
  targetManagerId: string | null;
  targetLabel: string | null;
  resolvedDisplayTarget: string | null;
}

export function sanitizeInlineWhatsappText(raw: string): string {
  return raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function validatePlayTarget(
  targetType: TargetType,
  actorLeagueId: string,
  input: PlayTargetInput
): ValidatedPlayTarget {
  const cleanedLabel = input.targetLabel ? sanitizeInlineWhatsappText(input.targetLabel) : '';

  switch (targetType) {
    case 'NONE': {
      if (input.targetManager || cleanedLabel.length > 0) {
        throw new DomainRuleError(
          'UNEXPECTED_TARGET',
          'Esta carta no admite seleccionar objetivo.'
        );
      }
      return { targetManagerId: null, targetLabel: null, resolvedDisplayTarget: null };
    }
    case 'MANAGER': {
      if (input.targetLabel != null) {
        throw new DomainRuleError(
          'UNEXPECTED_TARGET',
          'Esta carta requiere un manager y no admite texto de objetivo.'
        );
      }
      if (!input.targetManager) {
        throw new DomainRuleError(
          'TARGET_REQUIRED',
          'Debes seleccionar un manager objetivo para jugar esta carta.'
        );
      }
      if (input.targetManager.leagueId !== actorLeagueId) {
        throw new DomainRuleError(
          'TARGET_REQUIRED',
          'El manager objetivo no pertenece a la misma liga.'
        );
      }
      const managerDisplay = sanitizeInlineWhatsappText(input.targetManager.displayName);
      return {
        targetManagerId: input.targetManager.id,
        targetLabel: managerDisplay,
        resolvedDisplayTarget: managerDisplay
      };
    }
    case 'PLAYER':
    case 'FREE_TEXT': {
      if (input.targetManager) {
        throw new DomainRuleError(
          'UNEXPECTED_TARGET',
          'Esta carta requiere un objetivo de texto y no admite seleccionar un manager.'
        );
      }
      if (cleanedLabel.length === 0 || cleanedLabel.length > MAX_TARGET_LABEL_LENGTH) {
        throw new DomainRuleError(
          'TARGET_REQUIRED',
          'Debes indicar un objetivo válido antes de jugar esta carta.'
        );
      }
      return {
        targetManagerId: null,
        targetLabel: cleanedLabel,
        resolvedDisplayTarget: cleanedLabel
      };
    }
  }
}

export function formatMadridTimestamp(isoUtc: string, timeZone = 'Europe/Madrid'): string {
  const date = new Date(isoUtc);
  const formatter = new Intl.DateTimeFormat('es-ES', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return formatter.format(date).replace(',', '');
}

export interface RenderWhatsappMessageParams {
  definition: Pick<
    CardDefinition,
    'name' | 'nickname' | 'rarity' | 'targetType' | 'whatsappTemplate'
  >;
  actorManager: Pick<Manager, 'displayName' | 'teamName'>;
  validatedTarget: ValidatedPlayTarget;
  movementId: string;
  playedAtIso: string;
  timeZone?: string;
}

export function renderWhatsappMessage(params: RenderWhatsappMessageParams): string {
  const managerName = sanitizeInlineWhatsappText(params.actorManager.displayName);
  const teamName = sanitizeInlineWhatsappText(
    params.actorManager.teamName ?? params.actorManager.displayName
  );
  const cardName = sanitizeInlineWhatsappText(params.definition.name);
  const cardNickname = sanitizeInlineWhatsappText(params.definition.nickname);
  const rarityLabel = RARITY_LABELS_ES[params.definition.rarity];
  const playedAt = formatMadridTimestamp(params.playedAtIso, params.timeZone);
  const movementShortId = params.movementId.replace(/-/g, '').slice(0, 8);
  const targetText = params.validatedTarget.resolvedDisplayTarget ?? '';

  const variables: Record<string, string> = {
    managerName,
    teamName,
    cardName,
    cardNickname,
    rarityLabel,
    targetManager: targetText,
    targetLabel: targetText,
    playedAt,
    movementShortId
  };

  const renderedBody = params.definition.whatsappTemplate.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_fullMatch, key: string) => variables[key] ?? ''
  );

  const lines: string[] = [
    '🃏 *MUNCHINKING LEAGUE — CARTA JUGADA*',
    `👤 *Manager:* ${managerName}`,
    `✨ *Carta:* ${cardName} _${cardNickname}_ (${rarityLabel})`
  ];

  if (params.definition.targetType !== 'NONE' && targetText.length > 0) {
    lines.push(`🎯 *Objetivo:* ${targetText}`);
  }

  lines.push(
    '',
    '📜 *Efecto:*',
    renderedBody.trim(),
    '',
    `🕒 ${playedAt} · Ref: #${movementShortId}`
  );

  return lines.join('\n');
}
