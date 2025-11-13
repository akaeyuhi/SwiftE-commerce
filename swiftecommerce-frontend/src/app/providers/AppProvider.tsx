import type { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { Toaster } from 'sonner';

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  return (
    <QueryProvider>
      {children}
      <Toaster position="top-right" richColors />
    </QueryProvider>
  );
}
