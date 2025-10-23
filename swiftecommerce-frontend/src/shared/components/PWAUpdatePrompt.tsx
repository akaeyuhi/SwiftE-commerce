import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { X } from 'lucide-react';

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      console.log('SW Registered:', registration);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const [show, setShow] = useState(false);

  useEffect(() => {
    if (needRefresh) {
      setShow(true);
    }
  }, [needRefresh]);

  if (!show) return null;

  const handleUpdate = async () => {
    await updateServiceWorker(true);
    setShow(false);
    setNeedRefresh(false);
  };

  const handleDismiss = () => {
    setShow(false);
    setNeedRefresh(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Update Available</h3>
            <p className="text-sm text-muted-foreground mt-1">
              A new version of the app is available. Update now to get the
              latest features and improvements.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="ml-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleUpdate}
            className="flex-1 bg-primary text-primary-foreground
            px-3 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
          >
            Update Now
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-2 rounded-md text-sm
            font-medium border border-border hover:bg-accent"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
