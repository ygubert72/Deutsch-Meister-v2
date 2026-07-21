// sw.js — Service Worker для PWA с автоматическим версионированием

// Версия приложения (меняется автоматически при сборке)
const APP_VERSION = '2.0.0';
const CACHE_NAME = `deutsch-meister-${APP_VERSION}`;
const STATIC_CACHE = `static-${APP_VERSION}`;

// Файлы, которые кешируем при установке
const STATIC_ASSETS = [
  '/Deutsch-Meister-v2/',
  '/Deutsch-Meister-v2/index.html',
  '/Deutsch-Meister-v2/manifest.json',
  '/Deutsch-Meister-v2/sw.js',
  '/Deutsch-Meister-v2/css/style.css',
  '/Deutsch-Meister-v2/js/config.js',
  '/Deutsch-Meister-v2/js/utils.js',
  '/Deutsch-Meister-v2/js/logger.js',
  '/Deutsch-Meister-v2/js/containerManager.js',
  '/Deutsch-Meister-v2/js/grammarMode.js',
  '/Deutsch-Meister-v2/js/app.js',
  '/Deutsch-Meister-v2/js/auth.js',
  '/Deutsch-Meister-v2/js/activityTracker.js',
  '/Deutsch-Meister-v2/js/adminModal.js',
  '/Deutsch-Meister-v2/js/dictationMode.js',
  '/Deutsch-Meister-v2/js/donateModal.js',
  '/Deutsch-Meister-v2/js/instruction.js',
  '/Deutsch-Meister-v2/js/listeningMode.js',
  '/Deutsch-Meister-v2/js/practiceMode.js',
  '/Deutsch-Meister-v2/js/quizMode.js',
  '/Deutsch-Meister-v2/js/shareModal.js',
  '/Deutsch-Meister-v2/js/speak.js',
  '/Deutsch-Meister-v2/js/trainerMode.js',
  '/Deutsch-Meister-v2/js/welcome.js',
  '/Deutsch-Meister-v2/js/levelTrainerMode.js',
  '/Deutsch-Meister-v2/icons/icon.svg',
  '/Deutsch-Meister-v2/icons/icon-192x192.png',
  '/Deutsch-Meister-v2/icons/icon-512x512.png'
];

// ========== УСТАНОВКА ==========
self.addEventListener('install', function(event) {
  console.log(`[SW v${APP_VERSION}] Установка...`);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        console.log(`[SW v${APP_VERSION}] Кешируем статические файлы`);
        return cache.addAll(STATIC_ASSETS);
      })
      .then(function() {
        console.log(`[SW v${APP_VERSION}] Кеширование завершено`);
        return self.skipWaiting();
      })
      .catch(function(err) {
        console.error(`[SW v${APP_VERSION}] Ошибка кеширования:`, err);
      })
  );
});

// ========== АКТИВАЦИЯ ==========
self.addEventListener('activate', function(event) {
  console.log(`[SW v${APP_VERSION}] Активация...`);
  
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames
            .filter(function(name) {
              return name !== STATIC_CACHE && name !== CACHE_NAME;
            })
            .map(function(name) {
              console.log(`[SW v${APP_VERSION}] Удаляем старый кеш:`, name);
              return caches.delete(name);
            })
        );
      })
      .then(function() {
        console.log(`[SW v${APP_VERSION}] Service Worker активирован`);
        return self.clients.claim();
      })
  );
});

// ========== ПЕРЕХВАТ ЗАПРОСОВ ==========
self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);
  
  // Игнорируем запросы к расширениям Chrome
  if (url.protocol === 'chrome-extension:') {
    event.respondWith(fetch(request));
    return;
  }
  
  // Пропускаем запросы к Firebase
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Пропускаем запросы к API геолокации
  if (url.hostname.includes('ipapi.co')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // ===== НЕ КЕШИРУЕМ ДАННЫЕ (слова, фразы, грамматика) =====
  if (url.pathname.includes('/docs/')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // ===== НЕ КЕШИРУЕМ JSON ФАЙЛЫ =====
  if (url.pathname.endsWith('.json')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // ===== НЕ КЕШИРУЕМ SERVICE WORKER (всегда свежий) =====
  if (url.pathname.includes('/sw.js')) {
    event.respondWith(fetch(request));
    return;
  }
  
  // Стратегия: сначала сеть, потом кеш (для HTML)
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(function(networkResponse) {
          if (networkResponse && networkResponse.status === 200) {
            var responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE)
              .then(function(cache) {
                cache.put(request, responseClone);
              });
          }
          return networkResponse;
        })
        .catch(function() {
          return caches.match(request);
        })
    );
    return;
  }
  
  // Для всех остальных файлов: сначала кеш, потом сеть
  event.respondWith(
    caches.match(request)
      .then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then(function(networkResponse) {
            if (request.method === 'GET' && networkResponse && networkResponse.status === 200) {
              var responseClone = networkResponse.clone();
              caches.open(STATIC_CACHE)
                .then(function(cache) {
                  cache.put(request, responseClone);
                })
                .catch(function(err) {
                  console.log('[SW] Пропускаем кеширование:', request.url);
                });
            }
            return networkResponse;
          })
          .catch(function() {
            if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
              return new Response(`
                <!DOCTYPE html>
                <html lang="ru">
                <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Нет соединения</title>
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                      font-family: 'Segoe UI', sans-serif;
                      background: #F8F8F8;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                      height: 100vh;
                      text-align: center;
                      padding: 20px;
                    }
                    .icon { font-size: 64px; margin-bottom: 20px; }
                    h1 { font-size: 24px; color: #333; margin-bottom: 10px; }
                    p { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
                    .btn {
                      display: inline-block;
                      padding: 12px 30px;
                      background: #3B6FE0;
                      color: white;
                      border: none;
                      border-radius: 12px;
                      font-size: 16px;
                      font-weight: bold;
                      cursor: pointer;
                      text-decoration: none;
                    }
                    .btn:hover { background: #2B5BC7; }
                    .retry-btn { margin-top: 10px; background: #4CAF50; }
                    .retry-btn:hover { background: #388E3C; }
                  </style>
                </head>
                <body>
                  <div>
                    <div class="icon">📡</div>
                    <h1>Нет соединения</h1>
                    <p>Проверьте подключение к интернету<br>и попробуйте снова.</p>
                    <button class="btn retry-btn" onclick="location.reload()">🔄 Попробовать снова</button>
                    <br><br>
                    <a href="/Deutsch-Meister-v2/" class="btn" style="background:#666;">🏠 На главную</a>
                  </div>
                </body>
                </html>
              `, {
                headers: { 'Content-Type': 'text/html' }
              });
            }
            return new Response('Нет соединения', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
      })
  );
});
