/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GENLAYER_NETWORK?: string
  readonly VITE_CONTRACT_ADDRESS?: string
  readonly VITE_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
