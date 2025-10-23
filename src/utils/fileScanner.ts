import { readdir } from 'fs/promises';
import { join, relative, parse } from 'path';
import type { ContentRoute } from '../types/content.js';

const matchesExtension = (fileName: string, extensions: string[]): boolean => {
  const lowerFileName = fileName.toLowerCase();
  return extensions.some(ext => {
    const normalizedExt = (ext.startsWith('.') ? ext : `.${ext}`).toLowerCase();
    return lowerFileName.endsWith(normalizedExt);
  });
};

const shouldIgnorePath = (path: string, patterns: RegExp[]): boolean => {
  return patterns.some(pattern => pattern.test(path));
};

const createRoute = (fullPath: string, baseDir: string): ContentRoute => {
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
};

const scanDirectory = async (
  dir: string,
  extensions: string[],
  ignorePatterns: RegExp[],
  baseDir: string = dir
): Promise<ContentRoute[]> => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    const routes: ContentRoute[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      // Skip ignored paths
      if (shouldIgnorePath(fullPath, ignorePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subRoutes = await scanDirectory(fullPath, extensions, ignorePatterns, baseDir);
        routes.push(...subRoutes);
      } else if (entry.isFile() && matchesExtension(entry.name, extensions)) {
        routes.push(createRoute(fullPath, baseDir));
      }
    }

    return routes;
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
    return [];
  }
};

export const scanFiles = async (
  dir: string,
  extensions: string[],
  ignorePatterns: RegExp[] = [/(^|[\/\\])\../]
): Promise<ContentRoute[]> => {
  return scanDirectory(dir, extensions, ignorePatterns);
};

export const scanMarkdownFiles = async (dir: string): Promise<ContentRoute[]> => {
  return scanFiles(dir, ['md'], [/(^|[\/\\])\../]);
};

export const scanContentFiles = async (
  dir: string,
  extensions: string[]
): Promise<ContentRoute[]> => {
  return scanFiles(dir, extensions, [/(^|[\/\\])\../]);
};
