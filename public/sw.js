/* Service worker do AmaralPro: recebe Web Push e mostra a notificação do aparelho. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

const EMOJI = { aula_cancelada: '❌', aula_remarcada: '🔄', aula_agendada: '✅' }

self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = {} }
  const emoji = EMOJI[d.tipo] || '🔔'
  event.waitUntil(
    self.registration.showNotification(`${emoji} ${d.titulo || 'AmaralPro'}`, {
      body: d.mensagem || '',
      icon: '/icon-192.png',
      badge: '/badge-96.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      timestamp: Date.now(),
      vibrate: [120, 70, 120],
      lang: 'pt-BR',
      actions: [{ action: 'abrir', title: d.acao || 'Abrir' }],
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
