import { ThemeProvider } from '@/lib/theme';
import { QueryProvider } from './app/providers/QueryProvider';
import { Toaster } from 'sonner';

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="swiftecommerce-theme">
      <QueryProvider>
        <div className="min-h-screen bg-background">
          <h1 className="text-4xl font-bold">SwiftE-commerce</h1>
        </div>
        <Toaster position="top-right" richColors />
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
