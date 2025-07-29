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
      customSeparator: '\n\n---\n\n' // Custom separator for full content
    }),
  ],
});
```

### 🗺️ Adding to Sitemap (Optional)

Since files are generated in the `public/` directory, they're automatically available at `/llms.txt`, `/llms-small.txt`, and `/llms-full.txt`. To include them in your sitemap:

```javascript
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroLlmsGenerator(),
    sitemap({
      customPages: [
        'https://example.com/llms.txt',
        'https://example.com/llms-small.txt', 
        'https://example.com/llms-full.txt'
      ],
    }),
  ],
});
```

### Output Location

Files are automatically generated in two locations:
- **`public/` directory** - Served statically by your web server at `/llms.txt`, `/llms-small.txt`, `/llms-full.txt`
- **Build output directory** - Available in the final build for deployment

## Performance Features

- **Early Generation**: Runs during `astro:build:setup` for fast availability
- **Memory Efficient**: Uses smaller batch processing to prevent memory issues
- **Parallel Processing**: Generates all three files simultaneously
- **Smart Cleanup**: Properly disposes of JSDOM instances and triggers garbage collection

*ps: forked from [@4hse/astro-llms-txt](https://github.com/4hse/astro-llms-txt) for personal usage*

## 🤝 Contributing

Found a bug or want to contribute? [Open an issue](https://github.com/nermalcat69/astro-llms/issues) or submit a PR!
