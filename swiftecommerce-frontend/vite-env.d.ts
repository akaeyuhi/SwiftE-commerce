/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_ENV: 'development' | 'staging' | 'production'
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_GA_TRACKING_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
