import { registerSW } from 'virtual:pwa-register';

/**
 * Register service worker with update prompt
 */
export function registerServiceWorker() {
  const updateSW = registerSW({
    immediate: true,

    onNeedRefresh() {
      // Show update prompt
      if (window.confirm('New version available! Reload to update?')) {
        updateSW(true);
      }
    },

    onOfflineReady() {
      console.log('App is ready to work offline');
      // Optional: Show notification that app works offline
    },

    onRegistered(registration) {
      console.log('Service worker registered:', registration);

      // Check for updates every hour
      if (registration) {
        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        ); // 1 hour
      }
    },

    onRegisterError(error) {
      console.error('Service worker registration failed:', error);
    },
  });

  return updateSW;
}
