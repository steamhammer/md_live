import { readdir } from 'fs/promises';
import { join, relative, parse } from 'path';
import type { ContentRoute } from '../types/content.js';

export interface FileScannerOptions {
  extensions: string[];
  recursive?: boolean;
  ignorePatterns?: RegExp[];
}

export class FileScanner {
  private options: Required<FileScannerOptions>;

  constructor(options: FileScannerOptions) {
    this.options = {
      extensions: options.extensions,
      recursive: options.recursive ?? true,
      ignorePatterns: options.ignorePatterns ?? []
    };
  }

  async scan(dir: string, baseDir: string = dir): Promise<ContentRoute[]> {
    const routes: ContentRoute[] = [];

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (this.shouldIgnore(fullPath) ) {
          continue;
        }

        if (entry.isDirectory() && this.options.recursive) {
          const subRoutes = await this.scan(fullPath, baseDir);
          routes.push(...subRoutes);
        } else if (entry.isFile() && this.matchesExtension(entry.name)) {
          const route = this.createRoute(fullPath, baseDir);
          routes.push(route);
        }
      }
    } catch (error) {
      console.error(`Error reding dir ${dir}:`, error);
    }

    return routes;
  }

  private matchesExtension(fileName: string): boolean {
    const lowerFileName = fileName.toLowerCase();
    return this.options.extensions.some(ext => {
      const normalizedExt = (ext.startsWith('.') ? ext : `.${ext}`).toLowerCase();
      return lowerFileName.endsWith(normalizedExt);
    });
  }

  private shouldIgnore(path: string): boolean {
    return this.options.ignorePatterns.some(pattern => pattern.test(path));
  }

  private createRoute(fullPath: string, baseDir: string): ContentRoute {
    const relativePath = relative(baseDir, fullPath);
    const parsedPath = parse(relativePath);

    // Convert file path to route
    // e.g., "react.md" -> "/react"
    // e.g., "tutorials/intro.md" -> "/tutorials/intro"
    const routePath = '/' + join(parsedPath.dir, parsedPath.name).replace(/\\/g, '/');

    return {
      path: routePath,
      filePath: fullPath
    };
  }
}


export async function scanMarkdownFiles(dir: string): Promise<ContentRoute[]> {
  const scanner = new FileScanner({
    extensions: ['md'],
    recursive: true,
    ignorePatterns: [/(^|[\/\\])\../]  // Ignore dotfiles
  });

  return scanner.scan(dir);
}

/**
 * Convenience function to scan for multiple file types
 */
export async function scanContentFiles(
  dir: string,
  extensions: string[]
): Promise<ContentRoute[]> {
  const scanner = new FileScanner({
    extensions,
    recursive: true,
    ignorePatterns: [/(^|[\/\\])\../] // Ignore dotfiles
  });

  return scanner.scan(dir);
}
