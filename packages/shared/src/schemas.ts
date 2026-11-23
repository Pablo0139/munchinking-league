import { z } from 'zod';
import {
  CARD_LOCATIONS,
  CARD_RARITIES,
  DISTRIBUTION_TRIGGER_SOURCES,
  MAX_MOVEMENT_NOTES_LENGTH,
  MAX_TARGET_LABEL_LENGTH,
  MOVEMENT_TYPES,
  NOTIFICATION_TYPES,
  TARGET_TYPES,
  USER_ROLES
} from './constants';

export const uuidSchema = z.string().uuid();

export const userRoleSchema = z.enum(USER_ROLES);
export const cardRaritySchema = z.enum(CARD_RARITIES);
export const cardLocationSchema = z.enum(CARD_LOCATIONS);
export const movementTypeSchema = z.enum(MOVEMENT_TYPES);
export const targetTypeSchema = z.enum(TARGET_TYPES);
export const distributionTriggerSourceSchema = z.enum(DISTRIBUTION_TRIGGER_SOURCES);
export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const isoWeekKeySchema = z
  .string()
  .regex(/^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$/, 'Invalid ISO week key (expected YYYY-Www)');

export const loginInputSchema = z.object({
  username: z.string().trim().min(2).max(64),
  password: z.string().min(8).max(128)
});

export const playCardInputSchema = z.object({
  cardCopyId: uuidSchema,
  targetManagerId: uuidSchema.optional(),
  targetLabel: z.string().trim().min(1).max(MAX_TARGET_LABEL_LENGTH).optional(),
  choices: z.record(z.string().min(1).max(40), z.string().min(1).max(MAX_TARGET_LABEL_LENGTH))
    .refine(fields => Object.keys(fields).length <= 12, 'Demasiadas selecciones.').optional(),
  rulesConfirmed: z.boolean().optional(),
  notes: z.string().trim().min(1).max(MAX_MOVEMENT_NOTES_LENGTH).optional()
});

export const discardCardInputSchema = z.object({
  cardCopyId: uuidSchema
});

export const cursorPaginationInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional()
});

export const returnCardInputSchema = z.object({
  movementId: uuidSchema,
  reason: z.string().trim().min(1).max(MAX_MOVEMENT_NOTES_LENGTH).optional()
});

export const sendAdminNoticeInputSchema = z.object({
  title: z.string().trim().min(3).max(100),
  message: z.string().trim().min(3).max(500),
  targetManagerId: uuidSchema.optional()
});

export const cardDefinitionSeedSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(80),
  nickname: z.string().trim().max(120),
  rarity: cardRaritySchema,
  targetType: targetTypeSchema,
  defaultCopies: z.number().int().min(1).max(20),
  description: z.string().trim().min(5).max(500),
  usageRules: z.string().trim().min(5).max(600),
  imageUrl: z.string().trim().min(1).max(300),
  whatsappTemplate: z.string().trim().min(5).max(600)
});

export type LoginInput = z.infer<typeof loginInputSchema>;
export type PlayCardInput = z.infer<typeof playCardInputSchema>;
export type DiscardCardInput = z.infer<typeof discardCardInputSchema>;
export type CursorPaginationInput = z.infer<typeof cursorPaginationInputSchema>;
export type ReturnCardInput = z.infer<typeof returnCardInputSchema>;
export type SendAdminNoticeInput = z.infer<typeof sendAdminNoticeInputSchema>;
export type CardDefinitionSeed = z.infer<typeof cardDefinitionSeedSchema>;
