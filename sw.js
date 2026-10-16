const VERSION = "74f639799a31f3d7";
const PRECACHE = ["_astro/AstrolabeApp.astro_astro_type_script_index_0_lang.CYJvhtPP.js","_astro/CalendarApp.astro_astro_type_script_index_0_lang.Cs851H1H.js","_astro/DeferentCyclesApp.astro_astro_type_script_index_0_lang.mDDWJjMv.js","_astro/EclipsesApp.astro_astro_type_script_index_0_lang.DGWekybY.js","_astro/InterpreterApp.astro_astro_type_script_index_0_lang.RMftYyIn.js","_astro/ModelsApp.astro_astro_type_script_index_0_lang.CCFExATC.js","_astro/NatalChartApp.astro_astro_type_script_index_0_lang.CEdGM8Ek.js","_astro/chart.CgWjD8wm.js","_astro/chartHandoff.DPSXy-J4.js","_astro/chartSphere.CJ3_isU_.js","_astro/chartStore.DFdLp0RB.js","_astro/chartSync.um7CFBNp.js","_astro/eclipses.17-1gWq3.css","_astro/glyphs.DepdPNZD.js","_astro/hayz.CXb6Kwu2.js","_astro/houses.CC8VI7AM.js","_astro/index.BbuSZPfA.css","_astro/offset.BTFQi8lF.js","_astro/search.eCGIQakJ.js","_astro/sessionState.DeOyECsu.js","_astro/significatorPicker.MtUbUBt0.js","_astro/sphereScene.Di80egoO.js","_astro/time.BMACLpaK.js","_astro/zodiac.C3WpmxJD.js","astrolabe/","calendar/","cycles/","eclipses/","fonts/Astronomicon-OFL-License.txt","fonts/Astronomicon.ttf","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","icons/icon-maskable.svg","icons/icon.svg","./","interpret/","manifest.webmanifest","models/"];
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

// The page asks a waiting (updated) worker to take over once the user accepts the update.
self.addEventListener('message', (event) => {
	if (event.data === 'skipWaiting') self.skipWaiting();
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
