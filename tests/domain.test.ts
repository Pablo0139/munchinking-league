import { describe, expect, it } from 'vitest';
import {
  applyDiscardCard,
  applyPlayCard,
  applyReturnCard,
  computeIsoWeekKey,
  DomainRuleError,
  planWeeklyDistribution,
  type CardCopy,
  type CardDefinition,
  type Manager,
  type Season
} from '../packages/domain/src/index';

const activeSeason: Season = {
  id: '11111111-1111-4111-8111-111111111111',
  leagueId: '00000000-0000-4000-8000-000000000001',
  name: 'Temporada 2026/2027',
  isActive: true,
  createdAt: '2026-08-15T10:00:00.000Z'
};

const actorManager: Manager = {
  id: '22222222-2222-4222-8222-222222222221',
  userId: '33333333-3333-4333-8333-333333333331',
  leagueId: activeSeason.leagueId,
  displayName: 'Bar Zacarías',
  teamName: 'Bar Zacarías',
  avatarUrl: null,
  isActive: true,
  createdAt: '2026-08-15T10:00:00.000Z'
};

const rivalManager: Manager = {
  id: '22222222-2222-4222-8222-222222222222',
  userId: '33333333-3333-4333-8333-333333333332',
  leagueId: activeSeason.leagueId,
  displayName: 'Manu Eleven',
  teamName: 'Manu Eleven',
  avatarUrl: null,
  isActive: true,
  createdAt: '2026-08-15T10:00:00.000Z'
};

const presiCuloDefinition: CardDefinition = {
  id: '44444444-4444-4444-8444-444444444441',
  slug: 'presi-culo',
  name: 'Presi-Culo',
  nickname: 'El decreto del palco',
  description: 'Aplica sanción presidencial directa sobre un rival.',
  usageRules: 'Anunciar antes del inicio del primer partido de la jornada.',
  rarity: 'EPIC',
  targetType: 'MANAGER',
  defaultCopies: 3,
  imageUrl: '/assets/cards/presi-culo.webp',
  whatsappTemplate:
    '{{managerName}} activa *Presi-Culo* contra *{{targetManager}}*. El palco ha hablado.',
  isEnabled: true,
  createdAt: '2026-08-15T10:00:00.000Z'
};

const copyInHand: CardCopy = {
  id: '55555555-5555-4555-8555-555555555551',
  seasonId: activeSeason.id,
  cardDefinitionId: presiCuloDefinition.id,
  currentManagerId: actorManager.id,
  location: 'HAND',
  createdAt: '2026-08-15T10:00:00.000Z'
};

describe('Domain — Card lifecycle & WhatsApp formatting', () => {
  it('plays a card in hand, returns it immediately to DECK and renders official WhatsApp message', () => {
    const result = applyPlayCard({
      season: activeSeason,
      cardCopy: copyInHand,
      definition: presiCuloDefinition,
      actorManager,
      actorUserId: actorManager.userId,
      target: { targetManager: rivalManager },
      movementId: '8f3a19c2-0000-4000-8000-000000000099',
      nowIso: '2026-11-17T19:14:00.000Z'
    });

    expect(result.updatedCardCopy.location).toBe('DECK');
    expect(result.updatedCardCopy.currentManagerId).toBeNull();
    expect(result.movement.movementType).toBe('PLAYED');
    expect(result.movement.fromLocation).toBe('HAND');
    expect(result.movement.toLocation).toBe('DECK');
    expect(result.movement.targetManagerId).toBe(rivalManager.id);
    expect(result.whatsappMessage).toContain('🃏 *MUNCHINKING LEAGUE — CARTA JUGADA*');
    expect(result.whatsappMessage).toContain('🎯 *Objetivo:* Manu Eleven');
    expect(result.whatsappMessage).toContain('Ref: #8f3a19c2');
  });

  it('rejects playing a card without required manager target', () => {
    expect(() =>
      applyPlayCard({
        season: activeSeason,
        cardCopy: copyInHand,
        definition: presiCuloDefinition,
        actorManager,
        actorUserId: actorManager.userId,
        target: {},
        movementId: '8f3a19c2-0000-4000-8000-000000000099',
        nowIso: '2026-11-17T19:14:00.000Z'
      })
    ).toThrowError(DomainRuleError);
  });

  it('discards a card returning it to DECK without WhatsApp message', () => {
    const result = applyDiscardCard({
      season: activeSeason,
      cardCopy: copyInHand,
      actorManager,
      actorUserId: actorManager.userId,
      movementId: '77777777-7777-4777-8777-777777777777',
      nowIso: '2026-11-17T19:20:00.000Z'
    });

    expect(result.updatedCardCopy.location).toBe('DECK');
    expect(result.updatedCardCopy.currentManagerId).toBeNull();
    expect(result.movement.movementType).toBe('DISCARDED');
    expect(result.movement.whatsappMessage).toBeNull();
  });

  it('allows admin to return a played card when recipient has fewer than 3 cards and blocks if hand is full', () => {
    const played = applyPlayCard({
      season: activeSeason,
      cardCopy: copyInHand,
      definition: presiCuloDefinition,
      actorManager,
      actorUserId: actorManager.userId,
      target: { targetManager: rivalManager },
      movementId: '8f3a19c2-0000-4000-8000-000000000099',
      nowIso: '2026-11-17T19:14:00.000Z'
    });

    const returned = applyReturnCard({
      season: activeSeason,
      playedMovement: played.movement,
      alreadyReturned: false,
      deckCardCopyToReturn: played.updatedCardCopy,
      cardDefinition: presiCuloDefinition,
      recipientHandSize: 2,
      adminUserId: '99999999-9999-4999-8999-999999999999',
      newMovementId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      newNotificationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      nowIso: '2026-11-17T19:30:00.000Z',
      reason: 'Jugada fuera de ventana horaria'
    });

    expect(returned.updatedCardCopy.location).toBe('HAND');
    expect(returned.updatedCardCopy.currentManagerId).toBe(actorManager.id);
    expect(returned.movement.movementType).toBe('RETURNED');
    expect(returned.movement.relatedMovementId).toBe(played.movement.id);
    expect(returned.notification.notificationType).toBe('CARD_RETURNED');

    expect(() =>
      applyReturnCard({
        season: activeSeason,
        playedMovement: played.movement,
        alreadyReturned: false,
        deckCardCopyToReturn: played.updatedCardCopy,
        cardDefinition: presiCuloDefinition,
        recipientHandSize: 3,
        adminUserId: '99999999-9999-4999-8999-999999999999',
        newMovementId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab',
        newNotificationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbc',
        nowIso: '2026-11-17T19:31:00.000Z'
      })
    ).toThrow(/límite máximo de 3 cartas/);
  });
});

describe('Domain — Weekly distribution & ISO week idempotency', () => {
  it('computes ISO week key accurately in Europe/Madrid and skips managers with 3 cards', () => {
    const weekKey = computeIsoWeekKey(new Date('2026-11-16T07:05:00.000Z'), 'Europe/Madrid');
    expect(weekKey).toBe('2026-W47');

    let seq = 0;
    const plan = planWeeklyDistribution({
      season: activeSeason,
      alreadyExecutedForWeek: false,
      managers: [
        { manager: actorManager, currentHandCount: 2 },
        { manager: rivalManager, currentHandCount: 3 }
      ],
      availableDeckCopies: [
        {
          ...copyInHand,
          id: '55555555-5555-4555-8555-555555555599',
          location: 'DECK',
          currentManagerId: null
        }
      ],
      distributionBatchId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      actorUserId: null,
      nowIso: '2026-11-16T07:05:00.000Z',
      randomFloat: () => 0.25,
      createUuid: () => {
        seq += 1;
        return `00000000-0000-4000-8000-${String(seq).padStart(12, '0')}`;
      }
    });

    expect(plan.distributedCount).toBe(1);
    expect(plan.skippedFullHandCount).toBe(1);
    expect(plan.assignments[0]?.managerId).toBe(actorManager.id);
    expect(plan.assignments[0]?.updatedCardCopy.location).toBe('HAND');
    expect(plan.assignments[0]?.notification.notificationType).toBe('CARD_DISTRIBUTED');
  });
});
