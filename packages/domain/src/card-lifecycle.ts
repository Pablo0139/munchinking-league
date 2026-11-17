import { MAX_HAND_SIZE } from '@munchinking/shared';
import type {
  CardCopy,
  CardDefinition,
  CardMovement,
  Manager,
  Notification,
  Season
} from './entities';
import { DomainRuleError } from './errors';
import {
  renderWhatsappMessage,
  validatePlayTarget,
  type PlayTargetInput
} from './whatsapp-template';

export function assertActiveSeason(season: Pick<Season, 'id' | 'isActive'>): void {
  if (!season.isActive) {
    throw new DomainRuleError(
      'SEASON_INACTIVE',
      'Solo se permiten operaciones sobre la temporada activa.'
    );
  }
}

export function assertHandCapacity(currentHandSize: number): void {
  if (currentHandSize >= MAX_HAND_SIZE) {
    throw new DomainRuleError(
      'HAND_LIMIT_REACHED',
      `El manager ya ha alcanzado el límite máximo de ${MAX_HAND_SIZE} cartas en mano.`
    );
  }
}

export function assertManagerOwnsCardInHand(
  cardCopy: Pick<CardCopy, 'seasonId' | 'location' | 'currentManagerId'>,
  activeSeasonId: string,
  managerId: string
): void {
  if (cardCopy.seasonId !== activeSeasonId) {
    throw new DomainRuleError(
      'CARD_SEASON_MISMATCH',
      'La carta no pertenece a la temporada activa.'
    );
  }
  if (cardCopy.location !== 'HAND') {
    throw new DomainRuleError(
      'CARD_NOT_IN_HAND',
      'La carta seleccionada no se encuentra disponible en la mano.'
    );
  }
  if (cardCopy.currentManagerId !== managerId) {
    throw new DomainRuleError(
      'CARD_OWNERSHIP_MISMATCH',
      'No puedes operar con una carta que no pertenece a tu mano.'
    );
  }
}

export interface PlayCardDomainInput {
  season: Pick<Season, 'id' | 'isActive'>;
  cardCopy: CardCopy;
  definition: CardDefinition;
  actorManager: Manager;
  actorUserId: string;
  target: PlayTargetInput;
  movementId: string;
  nowIso: string;
  notes?: string | null;
  timeZone?: string;
}

export interface PlayCardDomainResult {
  updatedCardCopy: CardCopy;
  movement: CardMovement;
  whatsappMessage: string;
}

export function applyPlayCard(input: PlayCardDomainInput): PlayCardDomainResult {
  assertActiveSeason(input.season);
  assertManagerOwnsCardInHand(input.cardCopy, input.season.id, input.actorManager.id);

  const validatedTarget = validatePlayTarget(
    input.definition.targetType,
    input.actorManager.leagueId,
    input.target
  );

  const whatsappMessage = renderWhatsappMessage({
    definition: input.definition,
    actorManager: input.actorManager,
    validatedTarget,
    movementId: input.movementId,
    playedAtIso: input.nowIso,
    timeZone: input.timeZone
  });

  const updatedCardCopy: CardCopy = {
    ...input.cardCopy,
    location: 'DECK',
    currentManagerId: null
  };

  const movement: CardMovement = {
    id: input.movementId,
    seasonId: input.season.id,
    cardCopyId: input.cardCopy.id,
    managerId: input.actorManager.id,
    actorUserId: input.actorUserId,
    movementType: 'PLAYED',
    fromLocation: 'HAND',
    toLocation: 'DECK',
    targetManagerId: validatedTarget.targetManagerId,
    targetLabel: validatedTarget.targetLabel,
    whatsappMessage,
    distributionBatchId: null,
    relatedMovementId: null,
    notes: input.notes?.trim() || null,
    createdAt: input.nowIso
  };

  return {
    updatedCardCopy,
    movement,
    whatsappMessage
  };
}

export interface DiscardCardDomainInput {
  season: Pick<Season, 'id' | 'isActive'>;
  cardCopy: CardCopy;
  actorManager: Pick<Manager, 'id'>;
  actorUserId: string;
  movementId: string;
  nowIso: string;
}

export interface DiscardCardDomainResult {
  updatedCardCopy: CardCopy;
  movement: CardMovement;
}

export function applyDiscardCard(input: DiscardCardDomainInput): DiscardCardDomainResult {
  assertActiveSeason(input.season);
  assertManagerOwnsCardInHand(input.cardCopy, input.season.id, input.actorManager.id);

  const updatedCardCopy: CardCopy = {
    ...input.cardCopy,
    location: 'DECK',
    currentManagerId: null
  };

  const movement: CardMovement = {
    id: input.movementId,
    seasonId: input.season.id,
    cardCopyId: input.cardCopy.id,
    managerId: input.actorManager.id,
    actorUserId: input.actorUserId,
    movementType: 'DISCARDED',
    fromLocation: 'HAND',
    toLocation: 'DECK',
    targetManagerId: null,
    targetLabel: null,
    whatsappMessage: null,
    distributionBatchId: null,
    relatedMovementId: null,
    notes: null,
    createdAt: input.nowIso
  };

  return { updatedCardCopy, movement };
}

export interface ReturnCardDomainInput {
  season: Pick<Season, 'id' | 'isActive'>;
  playedMovement: CardMovement;
  alreadyReturned: boolean;
  deckCardCopyToReturn: CardCopy;
  cardDefinition: Pick<CardDefinition, 'name'>;
  recipientHandSize: number;
  adminUserId: string;
  newMovementId: string;
  newNotificationId: string;
  nowIso: string;
  reason?: string | null;
}

export interface ReturnCardDomainResult {
  updatedCardCopy: CardCopy;
  movement: CardMovement;
  notification: Notification;
}

export function applyReturnCard(input: ReturnCardDomainInput): ReturnCardDomainResult {
  assertActiveSeason(input.season);

  if (
    input.playedMovement.seasonId !== input.season.id ||
    input.playedMovement.movementType !== 'PLAYED'
  ) {
    throw new DomainRuleError(
      'INVALID_RETURN_MOVEMENT',
      'Solo se pueden devolver movimientos de cartas jugadas en la temporada activa.'
    );
  }

  if (input.alreadyReturned) {
    throw new DomainRuleError(
      'MOVEMENT_ALREADY_RETURNED',
      'Esta jugada ya fue devuelta anteriormente.'
    );
  }

  assertHandCapacity(input.recipientHandSize);

  if (
    input.deckCardCopyToReturn.seasonId !== input.season.id ||
    input.deckCardCopyToReturn.location !== 'DECK' ||
    input.deckCardCopyToReturn.currentManagerId !== null
  ) {
    throw new DomainRuleError(
      'CARD_NOT_IN_DECK',
      'No hay una copia disponible en el mazo para restituir la carta al manager.'
    );
  }

  const recipientManagerId = input.playedMovement.managerId;
  const cleanReason = input.reason?.trim() || null;

  const updatedCardCopy: CardCopy = {
    ...input.deckCardCopyToReturn,
    location: 'HAND',
    currentManagerId: recipientManagerId
  };

  const movement: CardMovement = {
    id: input.newMovementId,
    seasonId: input.season.id,
    cardCopyId: input.deckCardCopyToReturn.id,
    managerId: recipientManagerId,
    actorUserId: input.adminUserId,
    movementType: 'RETURNED',
    fromLocation: 'DECK',
    toLocation: 'HAND',
    targetManagerId: null,
    targetLabel: null,
    whatsappMessage: null,
    distributionBatchId: null,
    relatedMovementId: input.playedMovement.id,
    notes: cleanReason,
    createdAt: input.nowIso
  };

  const notification: Notification = {
    id: input.newNotificationId,
    managerId: recipientManagerId,
    notificationType: 'CARD_RETURNED',
    title: 'Carta devuelta a tu mano',
    message: cleanReason
      ? `El administrador ha devuelto "${input.cardDefinition.name}" a tu mano. Motivo: ${cleanReason}`
      : `El administrador ha devuelto "${input.cardDefinition.name}" a tu mano.`,
    relatedMovementId: movement.id,
    isRead: false,
    readAt: null,
    createdAt: input.nowIso
  };

  return {
    updatedCardCopy,
    movement,
    notification
  };
}
