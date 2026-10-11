import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
assert.equal(manifest.display, 'standalone', 'manifest must use standalone display');
assert.ok(manifest.name && manifest.short_name && manifest.start_url && manifest.scope && manifest.theme_color, 'manifest identity/theme is incomplete');

const icons = manifest.icons || [];
const icon192 = icons.find((icon) => icon.sizes === '192x192' && icon.type === 'image/png');
const icon512 = icons.find((icon) => icon.sizes === '512x512' && icon.type === 'image/png' && !String(icon.purpose || '').includes('maskable'));
const maskable = icons.find((icon) => icon.sizes === '512x512' && icon.type === 'image/png' && String(icon.purpose || '').includes('maskable'));
assert.ok(icon192, 'manifest needs a 192x192 PNG icon');
assert.ok(icon512, 'manifest needs a 512x512 PNG icon');
assert.ok(maskable, 'manifest needs a 512x512 maskable PNG icon');
for (const icon of [icon192, icon512, maskable]) assert.ok(fs.existsSync(icon.src.replace(/^\.\//, '')), `missing icon file: ${icon.src}`);

const sw = fs.readFileSync('sw.js', 'utf8');
const swLower = sw.toLowerCase();
for (const marker of ['authorization', 'cookie', 'range', 'if-range', 'no-store', 'private', 'set-cookie', 'content-range', 'supabase', 'api', 'vary']) {
  assert.ok(swLower.includes(marker), `service worker cache policy must handle: ${marker}`);
}
const cacheMatch = sw.match(/const\s+CACHE\s*=\s*['"]([^'"]+)['"]/);
assert.ok(cacheMatch, 'service worker cache must be versioned');
const cacheVersion = cacheMatch[1];
assert.match(cacheVersion, /(?:setembrox|raiox)-v\d+[-\w]*/, 'service worker cache must be versioned');
assert.ok(swLower.includes('response.status === 206') || swLower.includes('response.status!==206') || swLower.includes('response.status != 206'), 'service worker must reject partial responses');
assert.match(sw, /function\s+isPublicShellRequest\s*\(/, 'service worker must explicitly whitelist public shell requests');
assert.match(sw, /fetch\(request,\s*\{[^}]*cache:\s*['"]no-store['"][^}]*\}/s, 'navigation must use network fetch with no-store');
const navigationMatch = sw.match(new RegExp('if\\s*\\(isNavigation\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}\\n\\s*\\n\\s*if\\s*\\(!isPublicShellRequest'));
assert.ok(navigationMatch, 'navigation branch must be isolated from shell caching');
assert.doesNotMatch(navigationMatch[1], /cache\.put\(/, 'navigation responses must not be written to cache');

const html = fs.readFileSync('index.html', 'utf8');
const appJs = fs.readFileSync('app.js', 'utf8');
assert.match(html, /rel=["']manifest["'][^>]*manifest\.webmanifest/i, 'index must link manifest.webmanifest');
assert.match(html, /name=["']viewport["']/i, 'index needs viewport meta');
assert.match(html, /theme-color/i, 'index needs theme-color meta');
assert.ok((html + appJs).includes('serviceWorker.register'), 'app must register the service worker');
const swVersionMatch = appJs.match(/const\s+swVersion\s*=\s*['"]([^'"]+)['"]/);
assert.ok(swVersionMatch, 'app must declare the registered service worker version');
assert.equal(swVersionMatch[1], cacheVersion, 'service worker registration version must match the active cache version');
assert.match(appJs, /serviceWorker\.register\(`\.\/sw\.js\?v=\$\{swVersion\}`/, 'service worker registration must use the declared version in its URL');
assert.match(appJs, /updateViaCache\s*:\s*['"]none['"]/i, 'service worker registration must bypass HTTP cache for updates');
assert.match(appJs, /location\.protocol\s*===\s*['"]https:['"]|localhost|127\.0\.0\.1/i, 'service worker registration must be limited to HTTPS or localhost');
assert.match(appJs, /registration\.update\s*\(/, 'service worker registration should explicitly check for updates');

assert.match(html, /entry-v2\.css/i, 'index must load the refined entry visual layer');
assert.ok(fs.existsSync('entry-v2.css'), 'entry-v2.css must exist');
assert.match(html, /META OFICIAL DO MÊS/i, 'entry must show the official monthly target section');
assert.match(html, /DADOS OFICIAIS/i, 'entry must start neutral while official month data loads');
assert.doesNotMatch(html, />400<\/strong>\s*<b>CASAIS<\/b>|R\$ 8,5 MI|Base oficial até 30\/09\/2026/i, 'entry must not expose September fallback values');
assert.match(html, /heroLeaderName/i, 'entry must keep the weekly/top-couples leader highlight');

assert.match(html, /id=["']arenaX["']/i, 'dashboard must provide a dedicated ARENA X slot');
assert.match(appJs, /function\s+renderArenaX\s*\(/, 'dashboard must render ARENA X dynamically');
assert.match(appJs, /203\s*casais|metaCouples\s*-\s*S\.couples/i, 'ARENA X must expose the remaining couple target');
assert.match(appJs, /72\s*vendas|metaSales\s*-\s*S\.sales/i, 'ARENA X must expose the remaining sales target');
assert.doesNotMatch(appJs, /\bcap\.innerHTML\s*=/, 'captain data object must not be mistaken for a DOM element');

console.log('RAIO X PWA audit passed');

assert.match(appJs,/const totalSales=OPERATION_S\.sales\+OPERATION_S\.canceled/,'entry total sales must include active and cancelled contracts');
assert.match(appJs,/goalSalesText\.textContent=.*ativas.*canceladas/s,'entry sales card must split active and cancelled sales');

assert.match(html,/id=["']installRaioX["']/,'entry must expose an Install RAIO X button');
assert.match(html,/data-install-raiox/,'PWA install action must be reusable inside the app');
assert.match(html,/install\.js/i,'index must load the PWA install controller');
const installJs=fs.readFileSync('install.js','utf8');
assert.match(installJs,/beforeinstallprompt/,'install controller must handle beforeinstallprompt');
assert.match(installJs,/appinstalled/,'install controller must detect completed installation');
assert.match(sw,/\.\/install\.js/,'service worker shell must include install.js');
assert.doesNotMatch(html,/id=["']authGate["']/,'operational RAIO X must not block access behind login');
assert.doesNotMatch(html,/phone-access\.js/i,'operational RAIO X must not load the phone approval gate');
assert.match(html,/id=["']raioxAppShell["']/,'operational shell must be available directly');

assert.match(html,/id=["']cin["']/,'HOME oficial deve existir');
assert.match(html,/id=["']backToEntry["']/,'menu deve ter retorno para HOME');
assert.match(app,/location\.hash\s*===\s*['"]#home['"]/,'HOME deve ter rota deterministica');
assert.match(app,/location\.pathname\+location\.search\+['"]#home['"]/,'botao voltar deve abrir HOME oficial');
