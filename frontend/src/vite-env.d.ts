/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API do backend (Gabriel). Ausente => usa mock de checkout. */
  readonly VITE_API_BASE_URL?: string;
  /** Publishable key da Stripe (pk_...). Pública; usada no client da Stripe. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
