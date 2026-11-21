const VERSION = "f141c637ad080830";
const PRECACHE = ["_astro/AppSettings.astro_astro_type_script_index_0_lang.HNJGSYK6.js","_astro/AppUpdates.astro_astro_type_script_index_0_lang.C-rNjxys.js","_astro/AstrolabeApp.astro_astro_type_script_index_0_lang.Cxljkody.js","_astro/CalendarApp.astro_astro_type_script_index_0_lang.BUSwANwI.js","_astro/DeferentCyclesApp.astro_astro_type_script_index_0_lang.CRbiieT2.js","_astro/EclipsesApp.astro_astro_type_script_index_0_lang.CzbyxsdW.js","_astro/InterpreterApp.astro_astro_type_script_index_0_lang.V8wXFC8h.js","_astro/ModelsApp.astro_astro_type_script_index_0_lang.TEstTIUq.js","_astro/NatalChartApp.astro_astro_type_script_index_0_lang.Q85nWf8K.js","_astro/app.DVi6LK5l.js","_astro/calendar.cFao49Fh.css","_astro/chart.Ckze4X5I.js","_astro/chartHandoff.DPSXy-J4.js","_astro/chartSphere.BDMUl017.js","_astro/chartStore.4SYGexFp.js","_astro/chartSync.um7CFBNp.js","_astro/eclipses.UqxJUr7N.css","_astro/glyphs.DepdPNZD.js","_astro/houses.DVbTfqeB.js","_astro/index.SbBUPLM8.css","_astro/interpret.C13yDPqE.css","_astro/offset.CJHfhvX_.js","_astro/rectification.Dzpu_QnJ.js","_astro/search.zzvEhtEu.js","_astro/sessionState.COj3r4iA.js","_astro/significatorPicker.o0ZzwzIc.js","_astro/sphereScene.FpXuwWMw.js","_astro/time.BMACLpaK.js","_astro/transits.H3WHjkA0.js","_astro/worker-2q9yhvc_.js","_astro/zodiac.DvR7K9TZ.js","astrolabe/","calendar/","cycles/","eclipses/","fonts/Astronomicon-OFL-License.txt","fonts/Astronomicon.ttf","fonts/LibreBaskerville-OFL-License.txt","fonts/LibreBaskerville-Regular-latin.woff2","fonts/NunitoSans-OFL-License.txt","fonts/NunitoSans-latin-ext.woff2","fonts/NunitoSans-latin.woff2","fonts/SourceCodePro-OFL-License.txt","fonts/SourceCodePro-latin-ext.woff2","fonts/SourceCodePro-latin.woff2","fonts/SourceSans3-OFL-License.txt","fonts/SourceSans3-greek.woff2","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/icon-maskable.svg","icons/icon.svg","./","interpret/","manifest.webmanifest","models/","places.tsv"];
// Offline service worker. VERSION and PRECACHE are prepended at build time by
// integrations/offline.mjs: PRECACHE lists every built file (paths relative to this worker's own
// scope), and VERSION is a hash of all their contents, so any rebuilt file changes this script's
// bytes -- which is what makes the browser install the new version as an update.
/* global VERSION, PRECACHE */
const CACHE_PREFIX = 'apotelesmatics-';
const CACHE = CACHE_PREFIX + VERSION;
const scopeUrl = (path) => new URL(path, self.registration.scope).href;
const MATCH = { ignoreSearch: true, ignoreVary: true };

self.addEventListener('install', (event) => {
	// `cache: 'reload'` skips the HTTP cache so a new version never precaches a stale file.
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE.map((path) => new Request(scopeUrl(path), { cache: 'reload' })))));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith(CACHE_PREFIX) && key !== CACHE) await caches.delete(key);
			}
			await self.clients.claim();
		})(),
	);
});

// The page asks a waiting (updated) worker to take over once the user accepts the update, and
// asks for the running version (Settings > App) over a MessageChannel.
self.addEventListener('message', (event) => {
	if (event.data === 'skipWaiting') self.skipWaiting();
	else if (event.data === 'version') event.ports[0]?.postMessage(VERSION);
});

// Cache-first for this app's own files, so it runs identically with or without a connection;
// anything not precached (and every cross-origin request, e.g. the location search API) goes
// straight to the network untouched.
self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			// ignoreVary: servers send e.g. `Vary: Origin`, and a page's module-script requests carry an
			// Origin header the precache requests didn't -- without this every script misses offline.
			const cached = (await cache.match(request, MATCH)) ?? (request.mode === 'navigate' ? await matchPage(cache, request.url) : undefined);
			if (cached) return cached;
			try {
				return await fetch(request);
			} catch (err) {
				// Offline and not precached: fall back to the main page for navigations.
				if (request.mode === 'navigate') {
					const home = await cache.match(scopeUrl('./'), MATCH);
					if (home) return home;
				}
				throw err;
			}
		})(),
	);
});

// Pages are precached by directory URL ("cycles/"), but may be requested as "cycles" or
// "cycles/index.html".
async function matchPage(cache, url) {
	const u = new URL(url);
	u.search = '';
	const path = u.pathname;
	const candidates = path.endsWith('/index.html') ? [path.slice(0, -'index.html'.length)] : path.endsWith('/') ? [] : [path + '/'];
	for (const candidate of candidates) {
		u.pathname = candidate;
		const hit = await cache.match(u.href, MATCH);
		if (hit) return hit;
	}
	return undefined;
}
