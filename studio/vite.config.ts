import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      // content/ and voices/ live outside studio/, so Vite would not notice new renders there.
      // Watching them lets import.meta.glob pick up new voiceovers, samples and face tracks without a restart.
      name: 'mrrpop-watch-content',
      configureServer(server) {
        const packs = `${root}packages/character/packs`;
        server.watcher.add([`${root}content/stories`, `${root}voices/custom`, packs]);
        // character parts / manifests are read through eager globs: reload open tabs when a pack changes
        const reload = (f: string) => f.startsWith(packs) && /\.(svg|json)$/.test(f) && server.ws.send({ type: 'full-reload' });
        server.watcher.on('add', reload).on('change', reload).on('unlink', reload);
      },
    },
  ],
  server: { port: Number(process.env.PORT) || 3010, strictPort: true, open: false, fs: { allow: [root] } },
  resolve: { alias: { '@root': root } },
});
