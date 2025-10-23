import type {ContentRoute} from "../types/content";
import chokidar from "chokidar";
import { notifyClients } from "./notifyClients";

export function setupFileWatcher(routes: ContentRoute[], contentDir: string) {
  // Create a map of file paths to route paths for quick lookup
  const fileToRouteMap = new Map<string, string>();
  routes.forEach(({ path, filePath }) => {
    fileToRouteMap.set(filePath, path);
  });

  // Watch the content directory for changes
  const watcher = chokidar.watch(contentDir, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true
  });

  watcher
    .on('change', (filePath) => {
      const routePath = fileToRouteMap.get(filePath);
      if (routePath) {
        console.log(`File changed: ${filePath}`);
        notifyClients(filePath, routePath);
      }
    })
    .on('add', async (filePath) => {
      if (filePath.endsWith('.md')) {
        console.log(`New markdown file detected: ${filePath}`);
        console.log('Server restart required to register new routes');
      }
    })
    .on('unlink', (filePath) => {
      const routePath = fileToRouteMap.get(filePath);
      if (routePath) {
        console.log(`File deleted: ${filePath}`);
        console.log('Server restart required to update routes');
      }
    });

  console.log(`\n--> Watching for changes in: ${contentDir}`);

  return watcher;
}