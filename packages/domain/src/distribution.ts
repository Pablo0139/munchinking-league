import { MAX_HAND_SIZE } from '@munchinking/shared';
import type { CardCopy, CardMovement, Manager, Notification, Season } from './entities';
import { assertActiveSeason } from './card-lifecycle';
import { DomainRuleError } from './errors';

export interface EligibleManagerSnapshot {
  manager: Pick<Manager, 'id' | 'displayName' | 'isActive'>;
  currentHandCount: number;
}

export interface PlanWeeklyDistributionInput {
  season: Pick<Season, 'id' | 'isActive'>;
  alreadyExecutedForWeek: boolean;
  managers: EligibleManagerSnapshot[];
  availableDeckCopies: CardCopy[];
  distributionBatchId: string;
  actorUserId: string | null;
  nowIso: string;
  randomFloat?: () => number;
  createUuid: () => string;
}

export interface DistributionAssignment {
  managerId: string;
  updatedCardCopy: CardCopy;
  movement: CardMovement;
  notification: Notification;
}

export interface PlanWeeklyDistributionResult {
  assignments: DistributionAssignment[];
  distributedCount: number;
  skippedFullHandCount: number;
  unfulfilledDueToEmptyDeckCount: number;
}

export function computeIsoWeekKey(date: Date, timeZone = 'Europe/Madrid'): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayOfWeek);
  const isoYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const weekNumber = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${isoYear}-W${String(weekNumber).padStart(2, '0')}`;
}

export function shuffleCopy<T>(items: readonly T[], randomFloat: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(randomFloat() * (i + 1));
    const current = result[i]!;
    result[i] = result[j]!;
    result[j] = current;
  }
  return result;
}

export function planWeeklyDistribution(
  input: PlanWeeklyDistributionInput
): PlanWeeklyDistributionResult {
  assertActiveSeason(input.season);

  if (input.alreadyExecutedForWeek) {
    throw new DomainRuleError(
      'ALREADY_DISTRIBUTED_THIS_WEEK',
      'El reparto semanal correspondiente a esta semana ya ha sido ejecutado.'
    );
  }

  const activeManagers = input.managers.filter((entry) => entry.manager.isActive);
  let skippedFullHandCount = 0;
  const eligibleManagers: EligibleManagerSnapshot[] = [];

  for (const entry of activeManagers) {
    if (entry.currentHandCount >= MAX_HAND_SIZE) {
      skippedFullHandCount += 1;
    } else {
      eligibleManagers.push(entry);
    }
  }

  const validDeckPool = input.availableDeckCopies.filter(
    (copy) =>
      copy.seasonId === input.season.id &&
      copy.location === 'DECK' &&
      copy.currentManagerId === null
  );

  const randomFn = input.randomFloat ?? Math.random;
  const shuffledManagers = shuffleCopy(eligibleManagers, randomFn);
  const shuffledDeck = shuffleCopy(validDeckPool, randomFn);

  const pairCount = Math.min(shuffledManagers.length, shuffledDeck.length);
  const assignments: DistributionAssignment[] = [];

  for (let index = 0; index < pairCount; index += 1) {
    const recipient = shuffledManagers[index]!;
    const cardCopy = shuffledDeck[index]!;
    const movementId = input.createUuid();
    const notificationId = input.createUuid();

    const updatedCardCopy: CardCopy = {
      ...cardCopy,
      location: 'HAND',
      currentManagerId: recipient.manager.id
    };

    const movement: CardMovement = {
      id: movementId,
      seasonId: input.season.id,
      cardCopyId: cardCopy.id,
      managerId: recipient.manager.id,
      actorUserId: input.actorUserId,
      movementType: 'DISTRIBUTED',
      fromLocation: 'DECK',
      toLocation: 'HAND',
      targetManagerId: null,
      targetLabel: null,
      whatsappMessage: null,
      distributionBatchId: input.distributionBatchId,
      relatedMovementId: null,
      notes: null,
      createdAt: input.nowIso
    };

    const notification: Notification = {
      id: notificationId,
      managerId: recipient.manager.id,
      notificationType: 'CARD_DISTRIBUTED',
      title: '¡Nueva carta semanal disponible!',
      message: 'Has recibido una nueva carta del mazo. Pulsa para descubrirla.',
      relatedMovementId: movementId,
      isRead: false,
      readAt: null,
      createdAt: input.nowIso
    };

    assignments.push({
      managerId: recipient.manager.id,
      updatedCardCopy,
      movement,
      notification
    });
  }

  return {
    assignments,
    distributedCount: assignments.length,
    skippedFullHandCount,
    unfulfilledDueToEmptyDeckCount: Math.max(0, shuffledManagers.length - pairCount)
  };
}
