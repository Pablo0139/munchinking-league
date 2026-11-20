import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, expect } from 'vitest';
import { unstable_splitSqlQuery as splitSql } from 'wrangler';
import { buildDevSeedSql } from '../db/seed/dev.seed';

// Resolve Wrangler's own build/runtime tools, including under pnpm's strict layout.
const requireWrangler = createRequire(createRequire(import.meta.url).resolve('wrangler'));
const { Miniflare, convertV4MiniflareOptions } = requireWrangler('miniflare');
const { build } = requireWrangler('esbuild');

export function useTestWorker() {
  let runtime: InstanceType<typeof Miniflare>;
  const database = () => runtime.getD1Database('DB');

  beforeAll(async () => {
    const bundle = await build({
      entryPoints: [fileURLToPath(new URL('../apps/api/src/index.ts', import.meta.url))],
      format: 'esm', platform: 'browser', bundle: true, write: false
    });
    runtime = new Miniflare(convertV4MiniflareOptions({
      modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-04-01',
      d1Databases: ['DB'], d1Persist: false, cf: false, host: '127.0.0.1', port: 0
    }));
    const db = await database();
    const dir = new URL('../db/migrations/', import.meta.url);
    const migrations = readdirSync(dir).filter(name => name.endsWith('.sql')).sort();
    for (const sql of [...migrations.map(name => readFileSync(new URL(name, dir), 'utf8')), buildDevSeedSql().sql]) {
      await db.batch(splitSql(sql).map(statement => db.prepare(statement)));
    }
  }, 30_000);

  afterAll(async () => { await runtime?.dispose(); });

  async function rpc(path: string, method: 'GET' | 'POST', cookie = '', input?: object) {
    const url = new URL(`/trpc/${path}`, 'http://localhost');
    if (method === 'GET' && input) url.searchParams.set('input', JSON.stringify(input));
    const response = await runtime.dispatchFetch(url.toString(), {
      method, headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
      body: method === 'POST' ? JSON.stringify(input ?? null) : undefined
    });
    return { response, body: await response.json() };
  }

  async function ok(path: string, method: 'GET' | 'POST', cookie: string, input?: object) {
    const { response, body } = await rpc(path, method, cookie, input);
    expect(response.status, `${path}: ${JSON.stringify(body.error)}`).toBe(200);
    expect(body).toHaveProperty('result.data');
    return body.result.data;
  }

  async function login(username: string, role: 'MANAGER' | 'ADMIN' = 'MANAGER') {
    const { response, body } = await rpc('auth.login', 'POST', '', { username, password: 'munchinking-dev-2026' });
    expect(response.status).toBe(200);
    expect(body.result.data.user).toMatchObject({ username, role });
    const header = response.headers.get('set-cookie');
    expect(header).toMatch(/^munchinking_session=[^;]+;.*HttpOnly/i);
    return header.split(';')[0] as string;
  }

  async function scheduled(scheduledTime: number) {
    const worker = await runtime.getWorker();
    return worker.scheduled({ scheduledTime, cron: '0 7 * * MON' });
  }

  return { database, rpc, ok, login, scheduled };
}