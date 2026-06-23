/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API do backend (Gabriel). Ausente => usa mock de checkout. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
