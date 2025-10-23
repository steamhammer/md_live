export interface ParsedContent {
  frontmatter: Record<string, any>;
  content: string;
  metadata?: Record<string, any>;
}

export interface RenderedContent {
  html: string;
  contentType?: string;
}

export interface ContentParser {
  parse(fileContent: string): Promise<ParsedContent> | ParsedContent;
}

export interface ContentRenderer {
  render(parsed: ParsedContent, options?: RenderOptions): Promise<RenderedContent> | RenderedContent;
}

export interface RenderOptions {
  liveReload?: boolean;
  lastUpdated?: string;
  [key: string]: any;
}

export interface ContentRoute {
  path: string;
  filePath: string;
}
