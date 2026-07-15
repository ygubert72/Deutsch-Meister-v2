import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Плагин для копирования папок в dist
function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    writeBundle() {
      const foldersToCopy = ['js', 'css', 'docs', 'icons'];
      
      for (const folder of foldersToCopy) {
        const srcDir = folder;
        const destDir = `dist/${folder}`;
        
        if (!existsSync(srcDir)) continue;
        
        // Создаем папку назначения
        if (!existsSync(destDir)) {
          mkdirSync(destDir, { recursive: true });
        }
        
        // Рекурсивное копирование
        copyDir(srcDir, destDir);
        console.log(`✅ Папка ${folder} скопирована в dist`);
      }
    }
  };
}

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
    copyAssetsPlugin()
  ],
  
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html'
        // admin.html УДАЛЕН — больше не нужен
      }
    }
  }
});
