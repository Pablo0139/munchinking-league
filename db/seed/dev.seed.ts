import { createHash, pbkdf2Sync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { UserRole } from '@munchinking/shared';
import { INITIAL_CARD_CATALOG_SEED } from './cards.seed';

function deterministicUuid(seedKey: string): string {
  const hex = createHash('sha256').update(`munchinking:${seedKey}`).digest('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `8${hex.slice(17, 20)}`,
    hex.slice(20, 32)
  ].join('-');
}

function hashDevPassword(password: string, saltSeed: string): string {
  const iterations = 100_000;
  const saltHex = createHash('sha256').update(`salt:${saltSeed}`).digest('hex').slice(0, 32);
  const derivedHex = pbkdf2Sync(
    password,
    Buffer.from(saltHex, 'hex'),
    iterations,
    32,
    'sha256'
  ).toString('hex');
  return `pbkdf2_sha256$${iterations}$${saltHex}$${derivedHex}`;
}

function sqlString(value: string | null): string {
  if (value === null) {
    return 'NULL';
  }
  return `'${value.replace(/'/g, "''")}'`;
}

interface DevAccountSeed {
  username: string;
  displayName: string;
  teamName: string;
  role: UserRole;
}

const DEV_ACCOUNTS: readonly DevAccountSeed[] = [
  {
    username: 'admin',
    displayName: 'Comisionado Liga',
    teamName: 'C.A. P.Simeone',
    role: 'ADMIN'
  },
  {
    username: 'zacarias',
    displayName: 'Bar Zacarías',
    teamName: 'Bar Zacarías',
    role: 'MANAGER'
  },
  {
    username: 'contratodo',
    displayName: 'Contratodo',
    teamName: 'Contratodo y contratodos',
    role: 'MANAGER'
  },
  {
    username: 'goldito',
    displayName: 'Goldito',
    teamName: 'Ahora menos Goldito F.C.',
    role: 'MANAGER'
  },
  {
    username: 'paniagua',
    displayName: 'Paniagua',
    teamName: 'Paniagua Galáctica',
    role: 'MANAGER'
  },
  {
    username: 'manu',
    displayName: 'Manu Eleven',
    teamName: 'Manu Eleven',
    role: 'MANAGER'
  },
  {
    username: 'locos',
    displayName: 'Locos FC',
    teamName: 'Locos fc',
    role: 'MANAGER'
  },
  {
    username: 'cereales',
    displayName: 'CerealesConLeche',
    teamName: 'CerealesConLeche',
    role: 'MANAGER'
  },
  {
    username: 'martesloco',
    displayName: 'Martes Loco',
    teamName: 'Martes Loco',
    role: 'MANAGER'
  }
];

export function buildDevSeedSql(): { sql: string; totalCopies: number; totalManagers: number } {
  const nowIso = '2026-11-17T08:00:00.000Z';
  const leagueId = deterministicUuid('league:munchinking');
  const seasonId = deterministicUuid('season:2026-2027');
  const devPassword = 'munchinking-dev-2026';

  const statements: string[] = [
    '-- Auto-generated local development seed (DO NOT RUN IN PRODUCTION)',
    'PRAGMA foreign_keys = ON;',
    `INSERT OR IGNORE INTO league (id, name, created_at) VALUES (${sqlString(leagueId)}, 'Munchinking League', ${sqlString(nowIso)});`,
    `INSERT OR IGNORE INTO season (id, league_id, name, is_active, created_at) VALUES (${sqlString(seasonId)}, ${sqlString(leagueId)}, 'Temporada 2026/2027', 1, ${sqlString(nowIso)});`
  ];

  for (const account of DEV_ACCOUNTS) {
    const userId = deterministicUuid(`user:${account.username}`);
    const managerId = deterministicUuid(`manager:${account.username}`);
    const passwordHash = hashDevPassword(devPassword, account.username);

    statements.push(
      `INSERT OR IGNORE INTO user (id, username, password_hash, role, is_active, created_at, updated_at) VALUES (${sqlString(userId)}, ${sqlString(account.username)}, ${sqlString(passwordHash)}, ${sqlString(account.role)}, 1, ${sqlString(nowIso)}, ${sqlString(nowIso)});`
    );
    statements.push(
      `INSERT OR IGNORE INTO manager (id, user_id, league_id, display_name, team_name, avatar_url, is_active, created_at) VALUES (${sqlString(managerId)}, ${sqlString(userId)}, ${sqlString(leagueId)}, ${sqlString(account.displayName)}, ${sqlString(account.teamName)}, NULL, 1, ${sqlString(nowIso)});`
    );
  }

  let totalCopies = 0;

  for (const card of INITIAL_CARD_CATALOG_SEED) {
    const definitionId = deterministicUuid(`card_definition:${card.slug}`);
    statements.push(
      `INSERT OR IGNORE INTO card_definition (id, slug, name, nickname, description, usage_rules, rarity, target_type, default_copies, image_url, whatsapp_template, is_enabled, created_at) VALUES (${sqlString(definitionId)}, ${sqlString(card.slug)}, ${sqlString(card.name)}, ${sqlString(card.nickname)}, ${sqlString(card.description)}, ${sqlString(card.usageRules)}, ${sqlString(card.rarity)}, ${sqlString(card.targetType)}, ${card.defaultCopies}, ${sqlString(card.imageUrl)}, ${sqlString(card.whatsappTemplate)}, 1, ${sqlString(nowIso)});`
    );

    for (let copyIndex = 1; copyIndex <= card.defaultCopies; copyIndex += 1) {
      totalCopies += 1;
      const copyId = deterministicUuid(`card_copy:${seasonId}:${card.slug}:${copyIndex}`);
      statements.push(
        `INSERT OR IGNORE INTO card_copy (id, season_id, card_definition_id, current_manager_id, location, created_at) VALUES (${sqlString(copyId)}, ${sqlString(seasonId)}, ${sqlString(definitionId)}, NULL, 'DECK', ${sqlString(nowIso)});`
      );
    }
  }

  return {
    sql: `${statements.join('\n')}\n`,
    totalCopies,
    totalManagers: DEV_ACCOUNTS.length
  };
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(currentFile)) {
  const outputFile = resolve(dirname(currentFile), '../.generated/dev.seed.sql');
  mkdirSync(dirname(outputFile), { recursive: true });
  const result = buildDevSeedSql();
  writeFileSync(outputFile, result.sql, 'utf8');
  console.log(
    `Generated local seed SQL at ${outputFile} (${result.totalManagers} managers, ${INITIAL_CARD_CATALOG_SEED.length} definitions, ${result.totalCopies} deck copies).`
  );
}
