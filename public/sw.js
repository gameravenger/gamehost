// Service Worker for PWA functionality

const CACHE_NAME = 'gameblast-mobile-v1';
const urlsToCache = [
  '/',
  '/css/style.css',
  '/css/auth.css',
  '/css/games.css',
  '/css/game-details.css',
  '/js/app.js',
  '/js/auth.js',
  '/js/games.js',
  '/js/game-details.js',
  '/images/default-game.jpg',
  '/images/favicon.ico'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});