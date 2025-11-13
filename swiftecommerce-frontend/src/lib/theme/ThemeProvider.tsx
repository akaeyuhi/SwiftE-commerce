import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useUI } from '@/app/store';
import { Theme } from '@/app/store/types';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
}: ThemeProviderProps) {
  const { theme, getActualTheme, setTheme } = useUI();

  useEffect(() => {
    setTheme(defaultTheme);
  }, [defaultTheme, setTheme]);

  const value: ThemeContextValue = {
    theme,
    setTheme,
    actualTheme: getActualTheme(),
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
