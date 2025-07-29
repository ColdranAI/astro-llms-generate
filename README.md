# astro-llms-generate

**Minimal LLMs TXT Generator for Astro Sites**

Automatically discovers and processes all your Astro pages to generate three optimized documentation files:

- **`/llms.txt`** – Smart index with titles, descriptions, and organized links grouped by directory
- **`/llms-small.txt`** – Ultra-compact structure-only version (titles + URLs)  
- **`/llms-full.txt`** – Complete Markdown content dump with full page content

---

## Installation

```bash
pnpm i astro-llms-generate

npm i astro-llms-generate

yarn add astro-llms-generate
```

Or install directly with Astro:

```bash
pnpm astro add astro-llms-generate
```

## Usage

### Basic Setup (Zero Config)

```javascript
import { defineConfig } from 'astro/config';
import astroLlmsGenerator from 'astro-llms-generate';

export default defineConfig({
  site: 'https://example.com', // Required for full URLs in output files
  integrations: [
    astroLlmsGenerator(), // No configuration needed!
  ],
});
```

### Advanced Configuration (Optional)

```javascript
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroLlmsGenerator({
      title: 'My Documentation',
      description: 'Custom description for AI systems',
      includePatterns: ['**/*'], // Pages to include
      excludePatterns: ['**/404*', '**/api/**'], // Pages to exclude
      customSeparator: '\n\n---\n\n', // Custom separator for full content
      outputDir: 'public' // Output directory (default: project root)
    }),
  ],
});
```

### Output Location
By default, files are generated in your project root. Set `outputDir: 'public'` to output to the `public` directory so they're automatically served by your web server.

## Performance & Integration Order

**Important**: This integration runs early in the build process (`astro:build:setup`) so the generated files are available for sitemap generation and other integrations.

```javascript
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroLlmsGenerator(), // Runs FIRST - generates LLMs files early
    sitemap(), // Runs AFTER - can include LLMs files in sitemap
  ],
});
```

*ps: forked from [@4hse/astro-llms-txt](https://github.com/4hse/astro-llms-txt) for personal usage*

## 🤝 Contributing

Found a bug or want to contribute? [Open an issue](https://github.com/nermalcat69/astro-llms/issues) or submit a PR!
