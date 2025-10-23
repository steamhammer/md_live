import Markdoc from '@markdoc/markdoc';
import ejs from 'ejs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { ContentRenderer, ParsedContent, RenderedContent, RenderOptions } from '../types/content.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class MarkdownRenderer implements ContentRenderer {
  private templatesDir: string;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir || join(__dirname, '..', 'templates');
  }

  async render(parsed: ParsedContent, options: RenderOptions = {}): Promise<RenderedContent> {
    const ast = Markdoc.parse(parsed.content);
    const content = Markdoc.transform(ast);
    const html = Markdoc.renderers.html(content);

    const title = parsed.frontmatter.title || 'Document';
    const templatePath = join(this.templatesDir, 'document.ejs');

    const renderedHtml = await ejs.renderFile(templatePath, {
      title,
      content: html,
      liveReload: options.liveReload || false,
      lastUpdated: options.lastUpdated || new Date().toISOString()
    });

    return {
      html: renderedHtml,
      contentType: 'text/html'
    };
  }
}
