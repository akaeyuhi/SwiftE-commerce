/**
 * Theme Configuration
 * Design tokens and theme settings for the application
 */

// Color types - allows both string colors and color objects
export interface ColorScale {
  50?: string;
  100?: string;
  200?: string;
  300?: string;
  400?: string;
  500?: string;
  600?: string;
  700?: string;
  800?: string;
  900?: string;
  DEFAULT: string;
  foreground?: string;
  light?: string;
}

export type ColorValue = string | ColorScale;

export interface ThemeColors {
  primary: ColorScale;
  secondary: ColorScale;
  success: ColorScale;
  warning: ColorScale;
  error: ColorScale;
  info: ColorScale;
  background: string;
  foreground: string;
  card: ColorScale;
  popover: ColorScale;
  muted: ColorScale;
  accent: ColorScale;
  border: string;
  input: string;
  ring: string;
}

export const theme = {
  /**
   * Color palette
   */
  colors: {
    // Brand colors
    primary: {
      50: 'hsl(222, 47%, 95%)',
      100: 'hsl(222, 47%, 90%)',
      200: 'hsl(222, 47%, 80%)',
      300: 'hsl(222, 47%, 70%)',
      400: 'hsl(222, 47%, 60%)',
      500: 'hsl(222, 47%, 50%)',
      600: 'hsl(222, 47%, 40%)',
      700: 'hsl(222, 47%, 30%)',
      800: 'hsl(222, 47%, 20%)',
      900: 'hsl(222, 47%, 11.2%)',
      DEFAULT: 'hsl(222, 47%, 11.2%)',
      foreground: 'hsl(210, 40%, 98%)',
    },

    secondary: {
      DEFAULT: 'hsl(210, 40%, 96.1%)',
      foreground: 'hsl(222.2, 47.4%, 11.2%)',
    },

    // Semantic colors
    success: {
      DEFAULT: 'hsl(142, 76%, 36%)',
      foreground: 'hsl(355, 100%, 100%)',
      light: 'hsl(142, 76%, 90%)',
    },
    warning: {
      DEFAULT: 'hsl(38, 92%, 50%)',
      foreground: 'hsl(355, 100%, 100%)',
      light: 'hsl(38, 92%, 90%)',
    },
    error: {
      DEFAULT: 'hsl(0, 84%, 60%)',
      foreground: 'hsl(210, 40%, 98%)',
      light: 'hsl(0, 84%, 90%)',
    },
    info: {
      DEFAULT: 'hsl(199, 89%, 48%)',
      foreground: 'hsl(355, 100%, 100%)',
      light: 'hsl(199, 89%, 90%)',
    },

    // Neutral colors
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(222.2, 84%, 4.9%)',

    card: {
      DEFAULT: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(222.2, 84%, 4.9%)',
    },

    popover: {
      DEFAULT: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(222.2, 84%, 4.9%)',
    },

    muted: {
      DEFAULT: 'hsl(210, 40%, 96.1%)',
      foreground: 'hsl(215.4, 16.3%, 46.9%)',
    },

    accent: {
      DEFAULT: 'hsl(210, 40%, 96.1%)',
      foreground: 'hsl(222.2, 47.4%, 11.2%)',
    },

    border: 'hsl(214.3, 31.8%, 91.4%)',
    input: 'hsl(214.3, 31.8%, 91.4%)',
    ring: 'hsl(222.2, 84%, 4.9%)',
  } satisfies ThemeColors,

  /**
   * Typography
   */
  typography: {
    fontFamily: {
      sans: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(', '),
      mono: ['"Fira Code"', '"Courier New"', 'monospace'].join(', '),
    },

    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      '5xl': ['3rem', { lineHeight: '1' }],
      '6xl': ['3.75rem', { lineHeight: '1' }],
    },

    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  /**
   * Spacing scale
   */
  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
    36: '9rem',
    40: '10rem',
    44: '11rem',
    48: '12rem',
    52: '13rem',
    56: '14rem',
    60: '15rem',
    64: '16rem',
    72: '18rem',
    80: '20rem',
    96: '24rem',
  },

  /**
   * Border radius
   */
  borderRadius: {
    none: '0',
    sm: 'calc(var(--radius) - 4px)',
    md: 'calc(var(--radius) - 2px)',
    lg: 'var(--radius)',
    xl: 'calc(var(--radius) + 4px)',
    '2xl': 'calc(var(--radius) + 8px)',
    '3xl': 'calc(var(--radius) + 12px)',
    full: '9999px',
    DEFAULT: 'var(--radius)',
  },

  /**
   * Shadows
   */
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    none: 'none',
  },

  /**
   * Z-index layers
   */
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },

  /**
   * Transitions
   */
  transitions: {
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    timing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      linear: 'linear',
    },
  },

  /**
   * Breakpoints
   */
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

export type Theme = typeof theme;

/**
 * Dark theme overrides
 */
export const darkTheme = {
  colors: {
    background: 'hsl(222.2, 84%, 4.9%)',
    foreground: 'hsl(210, 40%, 98%)',

    card: {
      DEFAULT: 'hsl(222.2, 84%, 4.9%)',
      foreground: 'hsl(210, 40%, 98%)',
    },

    popover: {
      DEFAULT: 'hsl(222.2, 84%, 4.9%)',
      foreground: 'hsl(210, 40%, 98%)',
    },

    primary: {
      DEFAULT: 'hsl(210, 40%, 98%)',
      foreground: 'hsl(222.2, 47.4%, 11.2%)',
    },

    muted: {
      DEFAULT: 'hsl(217.2, 32.6%, 17.5%)',
      foreground: 'hsl(215, 20.2%, 65.1%)',
    },

    accent: {
      DEFAULT: 'hsl(217.2, 32.6%, 17.5%)',
      foreground: 'hsl(210, 40%, 98%)',
    },

    border: 'hsl(217.2, 32.6%, 17.5%)',
    input: 'hsl(217.2, 32.6%, 17.5%)',
    ring: 'hsl(212.7, 26.8%, 83.9%)',
  },
} as const;
