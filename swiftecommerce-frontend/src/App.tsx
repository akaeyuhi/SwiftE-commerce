import { RouterProvider } from 'react-router-dom';
import { QueryProvider } from './app/providers/QueryProvider';
import { ThemeProvider } from './lib/theme';
import { Toaster } from 'sonner';
import { router } from './app/routes';
import { PWAUpdatePrompt } from '@/shared/components/PWAUpdatePrompt.tsx';

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
        <PWAUpdatePrompt />
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
