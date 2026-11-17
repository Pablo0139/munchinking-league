export const USER_ROLES = ['MANAGER', 'ADMIN'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CARD_RARITIES = ['COMMON', 'RARE', 'EPIC', 'LEGENDARY'] as const;
export type CardRarity = (typeof CARD_RARITIES)[number];

export const CARD_LOCATIONS = ['DECK', 'HAND'] as const;
export type CardLocation = (typeof CARD_LOCATIONS)[number];

export const MOVEMENT_TYPES = ['DISTRIBUTED', 'PLAYED', 'DISCARDED', 'RETURNED'] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const TARGET_TYPES = ['NONE', 'MANAGER', 'PLAYER', 'FREE_TEXT'] as const;
export type TargetType = (typeof TARGET_TYPES)[number];

export const DISTRIBUTION_TRIGGER_SOURCES = ['CRON', 'ADMIN'] as const;
export type DistributionTriggerSource = (typeof DISTRIBUTION_TRIGGER_SOURCES)[number];

export const NOTIFICATION_TYPES = ['CARD_DISTRIBUTED', 'CARD_RETURNED', 'ADMIN_NOTICE'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const MAX_HAND_SIZE = 3;
export const MAX_NOTIFICATION_BADGE = 9;
export const MAX_TARGET_LABEL_LENGTH = 120;
export const MAX_MOVEMENT_NOTES_LENGTH = 240;

export const RARITY_LABELS_ES: Record<CardRarity, string> = {
  COMMON: 'Común',
  RARE: 'Rara',
  EPIC: 'Épica',
  LEGENDARY: 'Legendaria'
};
