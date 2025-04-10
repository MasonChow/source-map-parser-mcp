import { defineConfig } from 'vite';
import packageJSON from './package.json';
import module from 'node:module';

export default defineConfig({
  build: {
    target: 'node20',
    lib: {
      entry: ['./src/main.ts'],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
      name: packageJSON.name,
      formats: ['es', 'cjs'],
    },
    minify: false,
    rollupOptions: {
      external: [
        ...module.builtinModules,
        ...module.builtinModules.map((e) => `node:${e}`),
        './external/index.js',
      ],
    },
  },
});
