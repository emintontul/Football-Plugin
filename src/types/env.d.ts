/// <reference types="vite/client" />

interface Window {
  ReactNativeWebView?: { postMessage: (msg: string) => void };
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_DEV_TOKEN: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
