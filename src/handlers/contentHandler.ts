import type { ContentParser, ContentRenderer, RenderOptions } from '../types/content.js';

export class ContentHandler {
  constructor(
    private parser: ContentParser,
    private renderer: ContentRenderer
  ) {}

  async process(fileContent: string, options?: RenderOptions): Promise<string> {
    const parsed = await this.parser.parse(fileContent);
    const rendered = await this.renderer.render(parsed, options);
    return rendered.html;
  }

  getParser(): ContentParser {
    return this.parser;
  }

  getRenderer(): ContentRenderer {
    return this.renderer;
  }
}

export class ContentHandlerFactory {
  private handlers: Map<string, ContentHandler> = new Map();

  register(fileType: string, handler: ContentHandler): void {
    this.handlers.set(fileType, handler);
  }

  get(fileType: string): ContentHandler | undefined {
    return this.handlers.get(fileType);
  }

  has(fileType: string): boolean {
    return this.handlers.has(fileType);
  }

  getSupportedTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
