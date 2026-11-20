import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex
} from 'drizzle-orm/sqlite-core';
import type {
  CardLocation,
  CardRarity,
  DistributionTriggerSource,
  MovementType,
  NotificationType,
  TargetType,
  UserRole
} from '@munchinking/shared';

export const league = sqliteTable(
  'league',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: text('created_at').notNull()
  },
  (table) => [index('idx_league_name').on(table.name)]
);

export const season = sqliteTable(
  'season',
  {
    id: text('id').primaryKey(),
    leagueId: text('league_id')
      .notNull()
      .references(() => league.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    index('idx_season_league_id').on(table.leagueId),
    uniqueIndex('idx_season_single_active')
      .on(table.leagueId)
      .where(sql`${table.isActive} = 1`)
  ]
);

export const user = sqliteTable(
  'user',
  {
    id: text('id').primaryKey(),
    username: text('username').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').$type<UserRole>().notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull()
  },
  (table) => [uniqueIndex('idx_user_username_unique').on(table.username)]
);

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_session_token_hash_unique').on(table.tokenHash),
    index('idx_session_user_id').on(table.userId)
  ]
);

export const manager = sqliteTable(
  'manager',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    leagueId: text('league_id')
      .notNull()
      .references(() => league.id, { onDelete: 'restrict' }),
    displayName: text('display_name').notNull(),
    teamName: text('team_name'),
    avatarUrl: text('avatar_url'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_manager_user_id_unique').on(table.userId),
    index('idx_manager_league_id').on(table.leagueId)
  ]
);

export const cardDefinition = sqliteTable(
  'card_definition',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    nickname: text('nickname').notNull(),
    description: text('description').notNull(),
    usageRules: text('usage_rules').notNull(),
    rarity: text('rarity').$type<CardRarity>().notNull(),
    targetType: text('target_type').$type<TargetType>().notNull(),
    defaultCopies: integer('default_copies').notNull(),
    imageUrl: text('image_url').notNull(),
    whatsappTemplate: text('whatsapp_template').notNull(),
    isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_card_definition_slug_unique').on(table.slug),
    index('idx_card_definition_rarity').on(table.rarity),
    check('chk_card_definition_copies_positive', sql`${table.defaultCopies} >= 1`)
  ]
);

export const distributionBatch = sqliteTable(
  'distribution_batch',
  {
    id: text('id').primaryKey(),
    seasonId: text('season_id')
      .notNull()
      .references(() => season.id, { onDelete: 'restrict' }),
    weekKey: text('week_key').notNull(),
    triggerSource: text('trigger_source').$type<DistributionTriggerSource>().notNull(),
    triggeredByUserId: text('triggered_by_user_id').references(() => user.id, {
      onDelete: 'restrict'
    }),
    distributedCount: integer('distributed_count').notNull(),
    skippedFullHandCount: integer('skipped_full_hand_count').notNull(),
    skippedFullHandManagers: text('skipped_full_hand_managers', { mode: 'json' }).$type<
      Array<{ id: string; displayName: string }>
    >(),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    uniqueIndex('idx_distribution_season_week_cron')
      .on(table.seasonId, table.weekKey)
      .where(sql`${table.triggerSource} = 'CRON'`),
    index('idx_distribution_season_week_created').on(
      table.seasonId,
      table.weekKey,
      table.createdAt
    ),
    index('idx_distribution_season_created').on(table.seasonId, table.createdAt)
  ]
);

export const cardCopy = sqliteTable(
  'card_copy',
  {
    id: text('id').primaryKey(),
    seasonId: text('season_id')
      .notNull()
      .references(() => season.id, { onDelete: 'restrict' }),
    cardDefinitionId: text('card_definition_id')
      .notNull()
      .references(() => cardDefinition.id, { onDelete: 'restrict' }),
    currentManagerId: text('current_manager_id').references(() => manager.id, {
      onDelete: 'restrict'
    }),
    location: text('location').$type<CardLocation>().notNull(),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    index('idx_card_copy_season_location').on(table.seasonId, table.location),
    index('idx_card_copy_manager_location').on(table.currentManagerId, table.location),
    check(
      'chk_card_copy_location_owner',
      sql`(${table.location} = 'DECK' AND ${table.currentManagerId} IS NULL) OR (${table.location} = 'HAND' AND ${table.currentManagerId} IS NOT NULL)`
    )
  ]
);

export const cardMovement = sqliteTable(
  'card_movement',
  {
    id: text('id').primaryKey(),
    seasonId: text('season_id')
      .notNull()
      .references(() => season.id, { onDelete: 'restrict' }),
    cardCopyId: text('card_copy_id')
      .notNull()
      .references(() => cardCopy.id, { onDelete: 'restrict' }),
    managerId: text('manager_id')
      .notNull()
      .references(() => manager.id, { onDelete: 'restrict' }),
    actorUserId: text('actor_user_id').references(() => user.id, { onDelete: 'restrict' }),
    movementType: text('movement_type').$type<MovementType>().notNull(),
    fromLocation: text('from_location').$type<CardLocation>().notNull(),
    toLocation: text('to_location').$type<CardLocation>().notNull(),
    targetManagerId: text('target_manager_id').references(() => manager.id, {
      onDelete: 'restrict'
    }),
    targetLabel: text('target_label'),
    whatsappMessage: text('whatsapp_message'),
    distributionBatchId: text('distribution_batch_id').references(() => distributionBatch.id, {
      onDelete: 'restrict'
    }),
    relatedMovementId: text('related_movement_id').references(
      (): AnySQLiteColumn => cardMovement.id,
      { onDelete: 'restrict' }
    ),
    notes: text('notes'),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    index('idx_card_movement_season_type_created').on(
      table.seasonId,
      table.movementType,
      table.createdAt
    ),
    index('idx_card_movement_manager_created').on(table.managerId, table.createdAt),
    index('idx_card_movement_card_copy').on(table.cardCopyId),
    uniqueIndex('idx_movement_unique_return')
      .on(table.relatedMovementId)
      .where(sql`${table.movementType} = 'RETURNED' AND ${table.relatedMovementId} IS NOT NULL`)
  ]
);

export const notification = sqliteTable(
  'notification',
  {
    id: text('id').primaryKey(),
    managerId: text('manager_id')
      .notNull()
      .references(() => manager.id, { onDelete: 'restrict' }),
    notificationType: text('notification_type').$type<NotificationType>().notNull(),
    title: text('title').notNull(),
    message: text('message').notNull(),
    relatedMovementId: text('related_movement_id').references(() => cardMovement.id, {
      onDelete: 'restrict'
    }),
    isRead: integer('is_read', { mode: 'boolean' }).notNull().default(false),
    readAt: text('read_at'),
    createdAt: text('created_at').notNull()
  },
  (table) => [
    index('idx_notification_manager_unread_created').on(
      table.managerId,
      table.isRead,
      table.createdAt
    )
  ]
);
