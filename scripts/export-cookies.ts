/**
 * export-cookies.ts
 *
 * Converts browser cookies into config/state/auth.json for Playwright.
 *
 * RECOMMENDED WORKFLOW (avoids PowerShell buffer issues):
 *
 *   1. Log in at https://maps.roadtrippers.com in your normal browser
 *   2. Open DevTools Console (F12), paste and run:  copy(document.cookie)
 *   3. Open Notepad, paste (Ctrl+V), save as cookies.txt in your project root
 *   4. Run:  npx tsx scripts/export-cookies.ts --from-file cookies.txt
 *   5. Delete cookies.txt (it contains your session token)
 */

import * as fs   from 'fs';
import * as path from 'path';

const AUTH_FILE = path.resolve(process.cwd(), 'config/state/auth.json');

interface PlaywrightCookie {
  name: string; value: string; domain: string; path: string;
  expires: number; httpOnly: boolean; secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

function parseCookieString(raw: string): PlaywrightCookie[] {
  return raw.split(';').map(s => s.trim()).filter(Boolean).map(pair => {
    const eq = pair.indexOf('=');
    const name  = (eq === -1 ? pair : pair.substring(0, eq)).trim();
    const value = eq === -1 ? '' : pair.substring(eq + 1).trim();
    return { name, value, domain: '.roadtrippers.com', path: '/',
      expires: Math.floor(Date.now() / 1000) + 86400 * 30,
      httpOnly: false, secure: true, sameSite: 'Lax' as const };
  }).filter(c => c.name.length > 0);
}

function parseJsonExport(raw: any[]): PlaywrightCookie[] {
  return raw.map(c => ({
    name: String(c.name ?? ''), value: String(c.value ?? ''),
    domain: String(c.domain ?? '.roadtrippers.com'), path: String(c.path ?? '/'),
    expires: Number(c.expirationDate ?? c.expires ?? (Date.now()/1000 + 86400*30)),
    httpOnly: Boolean(c.httpOnly ?? false), secure: Boolean(c.secure ?? true),
    sameSite: (c.sameSite ?? 'Lax') as PlaywrightCookie['sameSite'],
  })).filter(c => c.name.length > 0);
}

function writeAuthJson(cookies: PlaywrightCookie[]): void {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify({
    cookies,
    origins: [{ origin: 'https://maps.roadtrippers.com', localStorage: [] }],
  }, null, 2));
}

function printSuccess(cookies: PlaywrightCookie[]): void {
  const tok = cookies.find(c => c.name === 'auth_token');
  console.log(`\n✅ Saved ${cookies.length} cookies to ${AUTH_FILE}`);
  if (!tok) {
    console.warn('   ⚠️  No auth_token found — are you logged in?');
  } else {
    console.log(`   auth_token: ${tok.value.substring(0,8)}...`);
    console.log('\n   Run tests:  npm run bdd\n');
  }
}

const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help')) {
  console.log(`
Usage:
  npx tsx scripts/export-cookies.ts --from-file cookies.txt      ← RECOMMENDED
  npx tsx scripts/export-cookies.ts --cookie-string "a=b; c=d"
  npx tsx scripts/export-cookies.ts --from-json cookies.json

Recommended workflow:
  1. Log in at https://maps.roadtrippers.com
  2. F12 → Console → run:  copy(document.cookie)
  3. Paste into Notepad, save as cookies.txt in project root
  4. npx tsx scripts/export-cookies.ts --from-file cookies.txt
  5. Delete cookies.txt
`);
  process.exit(0);
}

const fromFileIdx = args.indexOf('--from-file');
if (fromFileIdx !== -1) {
  const fp = path.resolve(args[fromFileIdx + 1] ?? '');
  if (!fs.existsSync(fp)) { console.error(`File not found: ${fp}`); process.exit(1); }
  const cookies = parseCookieString(fs.readFileSync(fp, 'utf-8').trim());
  if (!cookies.length) { console.error('No cookies parsed'); process.exit(1); }
  writeAuthJson(cookies); printSuccess(cookies); process.exit(0);
}

const csIdx = args.indexOf('--cookie-string');
if (csIdx !== -1) {
  const cookies = parseCookieString(args[csIdx + 1] ?? '');
  if (!cookies.length) { console.error('No cookies parsed'); process.exit(1); }
  writeAuthJson(cookies); printSuccess(cookies); process.exit(0);
}

const jsonIdx = args.indexOf('--from-json');
if (jsonIdx !== -1) {
  const fp = path.resolve(args[jsonIdx + 1] ?? '');
  if (!fs.existsSync(fp)) { console.error(`File not found: ${fp}`); process.exit(1); }
  const raw = JSON.parse(fs.readFileSync(fp, 'utf-8'));
  const cookies = parseJsonExport(Array.isArray(raw) ? raw : raw.cookies ?? []);
  if (!cookies.length) { console.error('No cookies in JSON'); process.exit(1); }
  writeAuthJson(cookies); printSuccess(cookies); process.exit(0);
}

console.error('Unknown arguments. Run with --help for usage.');
process.exit(1);