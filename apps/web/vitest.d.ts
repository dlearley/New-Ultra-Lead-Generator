declare module 'vitest/config' {
  import { UserConfig } from 'vite';
  export function defineConfig(config: UserConfig & { test?: any }): UserConfig;
}

declare module '@vitejs/plugin-react' {
  import { Plugin } from 'vite';
  export default function react(): Plugin;
}
