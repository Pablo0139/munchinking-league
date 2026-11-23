import { cardDefinitionSeedSchema, SEASON_CARDS, type CardDefinitionSeed } from '@munchinking/shared';

// Dotación operativa por rareza, no cantidades prescritas por el reglamento.
const COPIES = { COMMON: 3, RARE: 2, EPIC: 1 } as const;

export const INITIAL_CARD_CATALOG_SEED: readonly CardDefinitionSeed[] = SEASON_CARDS.map(
  ({ slug, name, nickname, rarity, description, usageRules }) => cardDefinitionSeedSchema.parse({
    slug, name, nickname, rarity, description, usageRules,
    targetType: 'NONE', defaultCopies: COPIES[rarity], imageUrl: '/icons/league-192.png',
    whatsappTemplate: `{{managerName}} juega *${name}*.`
  })
);
