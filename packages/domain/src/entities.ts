import type {
  CardLocation,
  CardRarity,
  DistributionTriggerSource,
  MovementType,
  NotificationType,
  TargetType,
  UserRole
} from '@munchinking/shared';

export interface League {
  id: string;
  name: string;
  createdAt: string;
}

export interface Season {
  id: string;
  leagueId: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Manager {
  id: string;
  userId: string;
  leagueId: string;
  displayName: string;
  teamName: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CardDefinition {
  id: string;
  slug: string;
  name: string;
  nickname: string;
  description: string;
  usageRules: string;
  rarity: CardRarity;
  targetType: TargetType;
  defaultCopies: number;
  imageUrl: string;
  whatsappTemplate: string;
  isEnabled: boolean;
  createdAt: string;
}

export interface CardCopy {
  id: string;
  seasonId: string;
  cardDefinitionId: string;
  currentManagerId: string | null;
  location: CardLocation;
  createdAt: string;
}

export interface CardMovement {
  id: string;
  seasonId: string;
  cardCopyId: string;
  managerId: string;
  actorUserId: string | null;
  movementType: MovementType;
  fromLocation: CardLocation;
  toLocation: CardLocation;
  targetManagerId: string | null;
  targetLabel: string | null;
  whatsappMessage: string | null;
  distributionBatchId: string | null;
  relatedMovementId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface DistributionBatch {
  id: string;
  seasonId: string;
  weekKey: string;
  triggerSource: DistributionTriggerSource;
  triggeredByUserId: string | null;
  distributedCount: number;
  skippedFullHandCount: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  managerId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  relatedMovementId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}
