import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Deutsch-Meister-v2/',
  
  plugins: [
    {
      name: 'html-transform',
      transformIndexHtml(html) {
        const env = process.env;
        return html.replace(/%VITE_([A-Z_]+)%/g, (match, name) => {
          const key = `VITE_${name}`;
          return env[key] || match;
        });
      }
    }
  ],
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html'
      }
    }
  }
});
