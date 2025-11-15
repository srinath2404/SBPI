// Simple service worker registration for Create React App

export function register() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL || ''}/service-worker.js`;

      navigator.serviceWorker
        .register(swUrl)
        .then((registration) => {
          // eslint-disable-next-line no-console
          console.log('Service worker registered:', registration);

          if ('sync' in registration) {
            registration.sync
              .register('sync-pending-pipes')
              .catch((err) => {
                // eslint-disable-next-line no-console
                console.error('Background sync registration failed', err);
              });
          }
        })
        .catch((error) => {
          // eslint-disable-next-line no-console
          console.error('Service worker registration failed:', error);
        });
    });
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch(() => {});
  }
}
