/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PASSCODE_SHA256?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
