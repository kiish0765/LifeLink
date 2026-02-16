/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_FRONTEND_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
