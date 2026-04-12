/**
 * extract-from-chrome.ts
 *
 * Connects to your already-running Chrome browser via remote debugging
 * and extracts ALL cookies for roadtrippers.com — including httpOnly ones
 * like _session_id that copy(document.cookie) can't see.
 *
 * STEPS:
 *   1. Close ALL Chrome windows first (required)
 *   2. Relaunch Chrome with remote debugging enabled:
 *
 *      Windows (paste into Run dialog or PowerShell):
 *      "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome-debug"
 *
 *   3. In that Chrome window, go to maps.roadtrippers.com and LOG IN normally
 *   4. Confirm you can see the map (not the login page)
 *   5. Run:  npx tsx scripts/extract-from-chrome.ts
 */

import * as http from 'http';
import * as fs   from 'fs';
import * as path from 'path';

const AUTH_FILE  = path.resolve(process.cwd(), 'config/state/auth.json');
const DEBUG_PORT = 9222;

function httpGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function sendCdpCommand(ws: any, method: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 100000);
    const msg = JSON.stringify({ id, method, params });
    
    const handler = (data: Buffer) => {
      const resp = JSON.parse(data.toString());
      if (resp.id === id) {
        ws.off('message', handler);
        if (resp.error) reject(new Error(resp.error.message));
        else resolve(resp.result);
      }
    };
    ws.on('message', handler);
    ws.send(msg);
  });
}

(async () => {
  console.log('\n🍪 Chrome Cookie Extractor\n');

  // Check Chrome is running with remote debugging
  let targets: any[];
  try {
    const raw = await httpGet(`http://localhost:${DEBUG_PORT}/json/list`);
    targets = JSON.parse(raw);
  } catch (e) {
    console.error(`❌ Could not connect to Chrome on port ${DEBUG_PORT}`);
    console.error('\nMake sure Chrome is running with remote debugging. Launch it with:');
    console.error('\n  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\\chrome-debug"');
    console.error('\nThen log in to maps.roadtrippers.com and run this script again.\n');
    process.exit(1);
  }

  // Find a Roadtrippers tab, or use the first available tab
  const rtTarget = targets.find((t: any) => t.url?.includes('roadtrippers.com')) 
                || targets.find((t: any) => t.type === 'page');

  if (!rtTarget) {
    console.error('❌ No browser tabs found. Open maps.roadtrippers.com in Chrome first.');
    process.exit(1);
  }

  console.log(`   Connected to tab: ${rtTarget.url}`);

  // Connect via WebSocket
  const WebSocket = require('ws');
  const ws = new WebSocket(rtTarget.webSocketDebuggerUrl);

  await new Promise<void>((resolve, reject) => {
    ws.on('open', resolve);
    ws.on('error', reject);
  });

  try {
    // Use Network.getAllCookies to get ALL cookies including httpOnly
    const result = await sendCdpCommand(ws, 'Network.getAllCookies');
    const allCookies: any[] = result.cookies;

    // Filter to roadtrippers.com cookies only
    const rtCookies = allCookies.filter((c: any) =>
      c.domain.includes('roadtrippers.com')
    );

    if (rtCookies.length === 0) {
      console.error('❌ No roadtrippers.com cookies found.');
      console.error('   Make sure you are logged in at maps.roadtrippers.com.');
      process.exit(1);
    }

    // Convert to Playwright format
    const playwrightCookies = rtCookies.map((c: any) => ({
      name:     c.name,
      value:    c.value,
      domain:   c.domain,
      path:     c.path     || '/',
      expires:  c.expires  || -1,
      httpOnly: c.httpOnly || false,
      secure:   c.secure   || false,
      sameSite: (c.sameSite || 'Lax') as 'Strict' | 'Lax' | 'None',
    }));

    // Verify the important cookies are present
    const sessionCookie = playwrightCookies.find(c => c.name === '_session_id');
    const authToken     = playwrightCookies.find(c => c.name === 'auth_token');

    // Also check rt_bootstrap.current_user in the tab
    const bootstrapResult = await sendCdpCommand(ws, 'Runtime.evaluate', {
      expression: 'JSON.stringify(window.rt_bootstrap ? window.rt_bootstrap.current_user : null)',
    });
    const currentUser = JSON.parse(bootstrapResult.result?.value || 'null');

    ws.close();

    // Write auth.json
    fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
    fs.writeFileSync(AUTH_FILE, JSON.stringify({
      cookies: playwrightCookies,
      origins: [{ origin: 'https://maps.roadtrippers.com', localStorage: [] }],
    }, null, 2));

    console.log(`\n✅ Saved ${playwrightCookies.length} cookies to config/state/auth.json`);
    console.log(`   _session_id  : ${sessionCookie ? '✅ present (httpOnly)' : '❌ missing'}`);
    console.log(`   auth_token   : ${authToken     ? '✅ present' : '❌ missing'}`);
    console.log(`   current_user : ${currentUser   ? `✅ logged in as id=${currentUser.id}` : '❌ null — not logged in!'}`);

    if (!currentUser) {
      console.warn('\n   ⚠️  You do not appear to be logged in on that tab.');
      console.warn('   Go to maps.roadtrippers.com, log in, then run this script again.\n');
    } else {
      console.log('\n   Run your tests:  npm run bdd\n');
    }

  } catch (e: any) {
    ws.close();
    console.error('❌ CDP error:', e.message);
    process.exit(1);
  }
})();