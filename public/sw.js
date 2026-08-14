// LEGER_OS Service Worker // High-Precision Transaction & Web Push Sync

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "LEGER_OS // Transaction Alert";
    const options = {
      body: data.body || "New transaction recorded. Tap to review.",
      icon: data.icon || "/icon-512.svg",
      badge: "/icon-512.svg",
      tag: data.tag || `tx-${data.data?.txId || Date.now()}`,
      renotify: true,
      data: {
        url: data.url || (data.data?.txId ? `/?resolveTxId=${data.data.txId}` : "/"),
        txId: data.data?.txId,
        amount: data.data?.amount,
        ...data.data,
      },
      actions: [
        {
          action: "resolve",
          title: "Name Store",
        },
        {
          action: "dismiss",
          title: "Dismiss",
        },
      ],
      vibrate: [100, 50, 100],
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[ServiceWorker] Failed to process push payload:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window open
      for (const client of windowClients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
