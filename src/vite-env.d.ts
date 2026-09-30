/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATS_URL?: string;
  readonly VITE_POSTMAN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
