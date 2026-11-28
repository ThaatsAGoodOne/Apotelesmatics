const VERSION = "27053edf1444a188";
const APP_VERSION = "1.0.91";
const PRECACHE = ["CNAME","_astro/AppSettings.astro_astro_type_script_index_0_lang.DkAqZQho.js","_astro/AppUpdates.CD6OBEKb.css","_astro/AppUpdates.astro_astro_type_script_index_0_lang.Cph-8tTa.js","_astro/AstrolabeApp.astro_astro_type_script_index_0_lang.C9LU1jag.js","_astro/CalendarApp.astro_astro_type_script_index_0_lang.BcqxSsS1.js","_astro/DeferentCyclesApp.astro_astro_type_script_index_0_lang.CRbiieT2.js","_astro/EclipsesApp.astro_astro_type_script_index_0_lang.DVMi-954.js","_astro/InterpreterApp.astro_astro_type_script_index_0_lang.Bxj_gPwp.js","_astro/ModelsApp.astro_astro_type_script_index_0_lang.B4OzUfKA.js","_astro/NatalChartApp.astro_astro_type_script_index_0_lang.DdFG8o9q.js","_astro/SiteHeader.astro_astro_type_script_index_0_lang.Cd1IFCp_.js","_astro/app.DMpACGDE.js","_astro/calendar.CK_TkRJC.css","_astro/calendarSolarReturn.NpZwzkyu.js","_astro/chart.BTGnh8D7.js","_astro/chartHandoff.DTcVWZbQ.js","_astro/chartSphere.BDMUl017.js","_astro/chartStore.DG5hGxFc.js","_astro/chartSync.um7CFBNp.js","_astro/crescent.Cnm3tcK-.js","_astro/cycles.B5xcaE4E.css","_astro/eclipses.6yMkhaIF.css","_astro/glyphs.DepdPNZD.js","_astro/hayz.mmpfgPdX.js","_astro/houses.DVbTfqeB.js","_astro/index.DujDGLw1.css","_astro/interpret.Cy7Zyv8K.css","_astro/offset.CJHfhvX_.js","_astro/search.zzvEhtEu.js","_astro/sessionState.CXXGPHHN.js","_astro/sphereScene.C_XTUnb8.js","_astro/theme.ZD7u2acO.js","_astro/time.BMACLpaK.js","_astro/worker-DDZ6USfN.js","_astro/zodiac.DvR7K9TZ.js","about/","astrolabe/","calendar/","cycles/","eclipses/","fonts/Astronomicon-OFL-License.txt","fonts/Astronomicon.ttf","fonts/LibreBaskerville-OFL-License.txt","fonts/LibreBaskerville-Regular-latin.woff2","fonts/NunitoSans-OFL-License.txt","fonts/NunitoSans-latin-ext.woff2","fonts/NunitoSans-latin.woff2","fonts/SourceCodePro-OFL-License.txt","fonts/SourceCodePro-latin-ext.woff2","fonts/SourceCodePro-latin.woff2","fonts/SourceSans3-OFL-License.txt","fonts/SourceSans3-greek.woff2","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/icon-maskable.svg","icons/icon.svg","./","interpret/","manifest.webmanifest","models/","places.tsv"];
// Offline service worker. VERSION and PRECACHE are prepended at build time by
// integrations/offline.mjs: PRECACHE lists every built file (paths relative to this worker's own
// scope), and VERSION is a hash of all their contents, so any rebuilt file changes this script's
// bytes -- which is what makes the browser install the new version as an update.
/* global VERSION, APP_VERSION, PRECACHE */
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
	else if (event.data === 'version') event.ports[0]?.postMessage(APP_VERSION);
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
