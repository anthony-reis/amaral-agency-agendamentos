/* Service worker do AmaralPro: recebe Web Push e mostra a notificação do aparelho. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = {} }
  event.waitUntil(
    self.registration.showNotification(d.titulo || 'AmaralPro', {
      body: d.mensagem || '',
      icon: '/logo.png',
      badge: '/logo.png',
      tag: d.tag || undefined,
      data: { url: d.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
      for (const c of lista) {
        if ('focus' in c) { c.navigate(url).catch(() => {}); return c.focus() }
      }
      return self.clients.openWindow(url)
    })
  )
})
