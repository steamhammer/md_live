import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { MarkdownParser } from './parsers/markdownParser';
import { MarkdownRenderer } from './renderers/markdownRenderer';
import { ContentHandler, ContentHandlerFactory } from './handlers/contentHandler';
import { setupRoutes } from './utils/routeSetup';
import { setupFileWatcher } from './utils/fileWatcher';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const CONTENT_DIR = process.env.CONTENT_DIR || 'content';
const TEMPLATES_DIR = join(__dirname, 'templates');

// Initialize content handler factory
const handlerFactory = new ContentHandlerFactory();

// Register markdown handler
const markdownParser = new MarkdownParser();
const markdownRenderer = new MarkdownRenderer(TEMPLATES_DIR);
const markdownHandler = new ContentHandler(markdownParser, markdownRenderer);
handlerFactory.register('md', markdownHandler);

async function startServer() {
  try {
    const routes = await setupRoutes({
      app,
      contentDir: CONTENT_DIR,
      templatesDir: TEMPLATES_DIR,
      handlerFactory
    });

    setupFileWatcher(routes, CONTENT_DIR);

    app.listen(PORT, () => {
      console.log(`\nServer is running on http://localhost:${PORT}`);
      console.log(`Content directory: ${CONTENT_DIR}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

void startServer();
