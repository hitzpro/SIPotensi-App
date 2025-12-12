// public/sw.js

self.addEventListener('install', (event) => {
    self.skipWaiting();
  });
  
  self.addEventListener('activate', (event) => {
    console.log('[SW] Activated');
  });
  
  self.addEventListener('push', (event) => {
    console.log('[SW] Push Received');
    
    let data = {};
    
    if (event.data) {
      try {
        // 1. Coba parse sebagai JSON
        data = event.data.json();
      } catch (e) {
        // 2. Jika gagal (berarti dikirim text biasa), jadikan body
        console.log('[SW] Push data is text, not JSON');
        data = {
          title: 'SIPotensi',
          body: event.data.text()
        };
      }
    }
  
    // Fallback default jika data kosong
    const title = data.title || 'SIPotensi Notification';
    const options = {
      body: data.body || 'Ada info baru nih!',
      icon: '/icons/icon-192x192.png', // Pastikan icon ada
      badge: '/icons/badge-72x72.png',   // Pastikan badge ada
      data: { url: data.url || '/' }
    };
  
    event.waitUntil(self.registration.showNotification(title, options));
  });
  
  self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Cek url tujuan
        const urlToOpen = event.notification.data.url || '/';
  
        for (const client of clientList) {
          // Jika tab sudah terbuka, fokus ke sana
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  });