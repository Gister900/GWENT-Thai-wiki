/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Put the game version into <title> at build time (same text as the old template).
// localArt: the web build hosts its own images, so the preconnect hints to the image sites are dropped too.
function injectVersion(localArt: boolean): Plugin {
  return {
    name: 'inject-version',
    transformIndexHtml(html) {
      const meta = JSON.parse(readFileSync(new URL('./src/data/meta.json', import.meta.url), 'utf8'))
      html = html.replaceAll('__VER__', meta.ver)
      // favicons (plain shield, no text) as small data URIs → the same in build:single (no files next to it) and build:web
      const uri = (f: string) => 'data:image/png;base64,' + readFileSync(new URL('./src/assets/' + f, import.meta.url)).toString('base64')
      html = html.replace('<!-- icons -->', `<link rel="icon" type="image/png" sizes="32x32" href="${uri('favicon-32.png')}">\n<link rel="icon" type="image/png" sizes="48x48" href="${uri('favicon-48.png')}">\n<link rel="apple-touch-icon" sizes="180x180" href="${uri('apple-touch-180.png')}">`)
      return localArt ? html.replace(/<!-- remote-art -->[\s\S]*?<!-- \/remote-art -->\n?/, '') : html
    },
  }
}

// mode "single" -> dist-single/ one self-contained HTML file (opened via file://)
// default         -> dist/ normal web build; set base with BASE=/sub/path/ · card images from public/art/ (self-hosted)
// __LOCAL_ART__ (self-hosted images) is true only for build:web; dev, tests and build:single use the remote urls.
export default defineConfig(({ command, mode }) => {
  const single = mode === 'single'
  const localArt = command === 'build' && !single && mode !== 'test'
  return {
    base: single ? './' : (process.env.BASE ?? '/'),
    publicDir: single ? false : 'public',   // public/art (self-hosted images) only goes into the web build
    define: { __LOCAL_ART__: JSON.stringify(localArt) },
    plugins: [react(), tailwindcss(), injectVersion(localArt), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',
      emptyOutDir: true,
      chunkSizeWarningLimit: 4000,
    },
    test: {
      include: ['tests/unit/**/*.test.ts'],
      environment: 'node',
    },
  }
})
