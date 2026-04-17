self.addEventListener("push", (event) => {
  let payload = {
    title: "Tarot Místico",
    body: "Sua leitura do dia está te esperando.",
    url: "/",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      // Keep default payload when data is invalid.
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/placeholder.svg",
      badge: "/placeholder.svg",
      data: { url: payload.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(targetUrl));
});
