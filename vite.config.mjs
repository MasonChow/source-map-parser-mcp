import { defineConfig } from 'vite';
import packageJSON from './package.json';
import module from 'node:module';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  build: {
    target: 'node20',
    lib: {
      entry: {
        'index': './src/index.ts',
        'main': './src/main.ts'
      },
      fileName: (format, entryName) => `${entryName}.${format}.js`,
      name: packageJSON.name,
      formats: ['es', 'cjs'],
    },
    minify: false,
    rollupOptions: {
      external: [
        ...module.builtinModules,
        ...module.builtinModules.map((e) => `node:${e}`),
        ...Object.keys(packageJSON.dependencies || {}),
        ...Object.keys(packageJSON.peerDependencies || {}),
      ],
    },
  },
  test: {
    include: ['./tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      enabled: true,
      all: true,
      include: ['src/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/main.ts'],
    },
  },
});
