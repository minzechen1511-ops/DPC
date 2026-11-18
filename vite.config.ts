import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function stripInternalPublicSpecs(): Plugin {
  return {
    name: 'strip-internal-aistudio-specs',
    closeBundle() {
      const target = path.resolve(import.meta.dirname, 'dist/assets/aistudio');
      if (fs.existsSync(target)) {
        fs.rmSync(target, { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), stripInternalPublicSpecs()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // Allow Cloud Run / AI Studio reverse-proxy hosts (e.g. *.run.app) in Vite middleware mode.
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
