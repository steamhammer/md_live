import matter from 'gray-matter';
import Markdoc from '@markdoc/markdoc';
import type { ContentParser, ParsedContent } from '../types/content.js';

export class MarkdownParser implements ContentParser {
  parse(fileContent: string): ParsedContent {
    const { data: frontmatter, content: markdown } = matter(fileContent);

    // Parse markdown with Markdoc
    const ast = Markdoc.parse(markdown);
    const transformedContent = Markdoc.transform(ast);

    return {
      frontmatter,
      content: markdown,
      metadata: {
        ast,
        transformed: transformedContent
      }
    };
  }
}
