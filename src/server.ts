import express, { Request, Response } from 'express';
import { readdir, readFile } from 'fs/promises';
import { join, relative, parse, dirname } from 'path';
import { fileURLToPath } from 'url';
import Markdoc from '@markdoc/markdoc';
import matter from 'gray-matter';
import dotenv from 'dotenv';
import chokidar from 'chokidar';
import ejs from 'ejs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const CONTENT_DIR = process.env.CONTENT_DIR || 'content';
const TEMPLATES_DIR = join(__dirname, 'templates');

// Store SSE clients
const sseClients = new Set<Response>();

interface MarkdownRoute {
  path: string;
  filePath: string;
}

async function getAllMarkdownFiles(dir: string, baseDir: string = dir): Promise<MarkdownRoute[]> {
  const routes: MarkdownRoute[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subRoutes = await getAllMarkdownFiles(fullPath, baseDir);
        routes.push(...subRoutes);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relativePath = relative(baseDir, fullPath);
        const parsedPath = parse(relativePath);

        // Convert file path to route
        // e.g., "react.md" -> "/react"
        // e.g., "tutorials/intro.md" -> "/tutorials/intro"
        const routePath = '/' + join(parsedPath.dir, parsedPath.name).replace(/\\/g, '/');

        routes.push({
          path: routePath,
          filePath: fullPath
        });
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return routes;
}

async function convertMarkdownToHtml(markdown: string, frontmatter: any, includeLiveReload = false): Promise<string> {
  const ast = Markdoc.parse(markdown);
  const content = Markdoc.transform(ast);
  const html = Markdoc.renderers.html(content);

  const title = frontmatter.title || 'Document';

  const templatePath = join(TEMPLATES_DIR, 'document.ejs');
  return ejs.renderFile(templatePath, {
    title,
    content: html,
    liveReload: includeLiveReload,
    lastUpdated: new Date().toISOString()
  });
}

async function setupRoutes() {
  const routes = await getAllMarkdownFiles(CONTENT_DIR);

  console.log(`Found ${routes.length} markdown file(s):`);

  routes.forEach(({ path, filePath }) => {
    console.log(`  ${path} -> ${filePath}`);

    app.get(path, async (_req: Request, res: Response) => {
      try {
        const fileContent = await readFile(filePath, 'utf-8');
        const parsed = matter(fileContent);
        const { data: frontmatter, content: markdown } = parsed;
        const html = await convertMarkdownToHtml(markdown, frontmatter, true);
        res.send(html);
      } catch (error) {
        console.error(`Error serving ${path}:`, error);
        res.status(500).send('Error loading page');
      }
    });
  });

  // Root route listing all available routes
  app.get('/', async (_req: Request, res: Response) => {
    try {
      const templatePath = join(TEMPLATES_DIR, 'index.ejs');
      const html = await ejs.renderFile(templatePath, { routes });
      res.send(html);
    } catch (error) {
      console.error('Error rendering index page:', error);
      res.status(500).send('Error loading page');
    }
  });

  // SSE endpoint for live reload
  app.get('/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Add client to the set
    sseClients.add(res);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Remove client on close
    req.on('close', () => {
      sseClients.delete(res);
    });
  });

  return routes;
}

function notifyClients(filePath: string, routePath: string) {
  const message = JSON.stringify({
    type: 'file-changed',
    path: routePath,
    filePath
  });

  sseClients.forEach((client) => {
    client.write(`data: ${message}\n\n`);
  });

  console.log(`Notified ${sseClients.size} client(s) about change: ${routePath}`);
}

function setupFileWatcher(routes: MarkdownRoute[]) {
  // Create a map of file paths to route paths for quick lookup
  const fileToRouteMap = new Map<string, string>();
  routes.forEach(({ path, filePath }) => {
    fileToRouteMap.set(filePath, path);
  });

  // Watch the content directory for changes
  const watcher = chokidar.watch(CONTENT_DIR, {
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

  console.log(`\nWatching for changes in: ${CONTENT_DIR}`);

  return watcher;
}

async function startServer() {
  try {
    const routes = await setupRoutes();
    setupFileWatcher(routes);

    app.listen(PORT, () => {
      console.log(`\nServer is running on http://localhost:${PORT}`);
      console.log(`Content directory: ${CONTENT_DIR}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
