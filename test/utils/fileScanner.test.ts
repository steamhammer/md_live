import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { scanFiles, scanMarkdownFiles, scanContentFiles } from '../../src/utils/fileScanner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fixturesDir = join(__dirname, '..', 'fixtures', 'content');

describe('fileScanner', () => {
  describe('scanMarkdownFiles', () => {
    it('should find all markdown files recursively', async () => {
      const routes = await scanMarkdownFiles(fixturesDir);
      assert.strictEqual(routes.length, 3);
    });

    it('should ignore dotfiles', async () => {
      const routes = await scanMarkdownFiles(fixturesDir);

      const hasHidden = routes.some(r => r.filePath.includes('.hidden'));
      assert.strictEqual(hasHidden, false);
    });

    it('should ignore non-markdown files', async () => {
      const routes = await scanMarkdownFiles(fixturesDir);

      const hasTxt = routes.some(r => r.filePath.includes('.txt'));
      assert.strictEqual(hasTxt, false);
    });

    it('should handle uppercase extensions', async () => {
      const routes = await scanMarkdownFiles(fixturesDir);

      const hasUppercase = routes.some(r => r.filePath.includes('test2.MD'));
      assert.strictEqual(hasUppercase, true);
    });

    it('should generate correct route paths', async () => {
      const routes = await scanMarkdownFiles(fixturesDir);

      const paths = routes.map(r => r.path).sort();

      assert.ok(paths.includes('/test1'));
      assert.ok(paths.includes('/test2'));
      assert.ok(paths.includes('/nested/nested'));
    });

    it('should include full file paths', async () => {
      const routes = await scanMarkdownFiles(fixturesDir);

      routes.forEach(route => {
        assert.ok(route.filePath);
        assert.ok(route.filePath.length > 0);
      });
    });
  });

  describe('scanFiles', () => {
    it('should scan for specific extensions', async () => {
      const routes = await scanFiles(fixturesDir, ['txt']);

      assert.strictEqual(routes.length, 1);
      assert.ok(routes[0].filePath.endsWith('.txt'));
    });

    it('should handle multiple extensions', async () => {
      const routes = await scanFiles(fixturesDir, ['md', 'txt']);

      assert.strictEqual(routes.length, 4);
    });

    it('should handle extensions with or without dots', async () => {
      const routesWithDot = await scanFiles(fixturesDir, ['.md']);
      const routesWithoutDot = await scanFiles(fixturesDir, ['md']);

      assert.strictEqual(routesWithDot.length, routesWithoutDot.length);
    });
  });

  describe('scanContentFiles', () => {
    it('should scan for multiple content types', async () => {
      const routes = await scanContentFiles(fixturesDir, ['md', 'txt']);

      assert.ok(routes.length >= 4);
    });

    it('should apply default ignore patterns', async () => {
      const routes = await scanContentFiles(fixturesDir, ['md']);

      const hasHidden = routes.some(r => r.filePath.includes('.hidden'));
      assert.strictEqual(hasHidden, false);
    });
  });

  describe('route path generation', () => {
    it('should remove file extensions from routes', async () => {
      const routes = await scanMarkdownFiles(fixturesDir);

      routes.forEach(route => {
        assert.ok(!route.path.includes('.md'));
        assert.ok(!route.path.includes('.MD'));
      });
    });

    it('should start routes with slash', async () => {
      const routes = await scanMarkdownFiles(fixturesDir);

      routes.forEach(route => {
        assert.ok(route.path.startsWith('/'));
      });
    });

    it('should preserve directory structure in routes', async () => {
      const routes = await scanMarkdownFiles(fixturesDir);

      const nestedRoute = routes.find(r => r.filePath.includes('nested/nested.md'));
      assert.ok(nestedRoute);
      assert.strictEqual(nestedRoute.path, '/nested/nested');
    });
  });

  describe('error handling', () => {
    it('should handle non-existent directories gracefully', async () => {
      const routes = await scanMarkdownFiles('/non/existent/path');

      assert.strictEqual(routes.length, 0);
    });

    it('should return empty array for invalid paths', async () => {
      const routes = await scanFiles('', ['md']);

      assert.strictEqual(routes.length, 0);
    });
  });
});
