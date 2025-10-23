import { Application, Request, Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import ejs from 'ejs';
import type { ContentRoute } from '../types/content';
import type { ContentHandlerFactory } from '../handlers/contentHandler';
import { scanMarkdownFiles } from './fileScanner';
import { sseClients } from './notifyClients';

export interface RouteSetupOptions {
  app: Application;
  contentDir: string;
  templatesDir: string;
  handlerFactory: ContentHandlerFactory;
}

export const setupRoutes = async (options: RouteSetupOptions): Promise<ContentRoute[]> => {
  const { app, contentDir, templatesDir, handlerFactory } = options;

  // Scan for markdown files
  // TODO: add more supported file extensions
  const routes = await scanMarkdownFiles(contentDir);

  console.log(`Found ${routes.length} markdown file(s):`);

  // Set up content routes
  routes.forEach(({ path, filePath }) => {
    console.log(`  ${path} -> ${filePath}`);

    app.get(path, async (_req: Request, res: Response) => {
      try {
        // TODO: consider limitations by filesize before reading
        const fileContent = await readFile(filePath, 'utf-8');

        // Get handler for markdown files
        // TODO: support more filetypes
        const handler = handlerFactory.get('md');

        if (!handler) {
          throw new Error('No handler registered for markdown files');
        }

        const html = await handler.process(fileContent, {
          liveReload: true,
          lastUpdated: new Date().toISOString(),
          fileList: routes
        });

        res.send(html);
      } catch (error) {
        console.error(`Error serving ${path}:`, error);
        res.status(500).send('Error loading page');
      }
    });
  });

  // Set up root route (index page)
  // TODO: extract to separate module when rich main page is needed
  app.get('/', async (_req: Request, res: Response) => {
    try {
      const templatePath = join(templatesDir, 'index.ejs');
      const html = await ejs.renderFile(templatePath, { routes });
      res.send(html);
    } catch (error) {
      console.error('Error rendering index page:', error);
      res.status(500).send('Error loading page');
    }
  });

  // Set up SSE endpoint for live reload
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
};
