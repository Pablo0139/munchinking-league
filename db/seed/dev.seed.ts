import { createHash, pbkdf2Sync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CardDefinitionSeed, UserRole } from '@munchinking/shared';
import { INITIAL_CARD_CATALOG_SEED } from './cards.seed';
import { catalogStatements, deterministicUuid, leagueId, seasonId, sqlString } from './catalog.sql';

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

export function buildDevSeedSql(catalog: readonly CardDefinitionSeed[] = INITIAL_CARD_CATALOG_SEED): { sql: string; totalCopies: number; totalManagers: number } {
  const nowIso = '2026-11-17T08:00:00.000Z';
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

  statements.push(...catalogStatements(catalog));
  const totalCopies = catalog.reduce((sum, card) => sum + card.defaultCopies, 0);

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
