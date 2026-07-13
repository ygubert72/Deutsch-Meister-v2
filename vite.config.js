import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

// Плагин для копирования папки docs в dist
function copyDocsPlugin() {
  return {
    name: 'copy-docs',
    writeBundle() {
      const srcDir = 'docs';
      const destDir = 'dist/docs';
      
      if (!existsSync(srcDir)) return;
      
      // Создаем папку назначения
      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }
      
      // Рекурсивное копирование
      function copyDir(src, dest) {
        const entries = readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = join(src, entry.name);
          const destPath = join(dest, entry.name);
          if (entry.isDirectory()) {
            if (!existsSync(destPath)) {
              mkdirSync(destPath, { recursive: true });
            }
            copyDir(srcPath, destPath);
          } else {
            copyFileSync(srcPath, destPath);
          }
        }
      }
      
      copyDir(srcDir, destDir);
      console.log('✅ Папка docs скопирована в dist');
    }
  };
}

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
    },
    copyDocsPlugin()
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
