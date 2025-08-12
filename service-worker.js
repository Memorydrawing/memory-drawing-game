const CACHE_NAME = 'mdg-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/practice.html',
  '/angles.html',
  '/inch_warmup.html',
  '/point_drill_01.html',
  '/point_drill_05.html',
  '/point_drill_025.html',
  '/scenarios.html',
  '/scenario_play.html',
  '/style.css',
  '/app.js',
  '/angles.js',
  '/inch_warmup.js',
  '/point_drill_01.js',
  '/point_drill_05.js',
  '/point_drill_025.js',
  '/scenario.js',
  '/scenarios.js',
  '/icon.svg',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
