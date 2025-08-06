# Minimal LLMs TXT Generator for Astro Sites

```bash
npm i astro-llms-generate
```

<img width="1200" alt="image" src="https://github.com/user-attachments/assets/196df21e-d091-4a3a-8017-95436b898585" />


Watch [Tutorial Video](https://www.youtube.com/watch?v=dtFMS7W2K9k).

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
import astroLLMsGenerator from 'astro-llms-generate';

export default defineConfig({
  site: 'https://example.com', // Required for full URLs in output files
  integrations: [
    astroLLMsGenerator(), // No configuration needed!
  ],
});
```

### Advanced Configuration (Optional)

```javascript
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroLLMsGenerator({
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

Since files are generated in the build output, they're available at `/llms.txt`, `/llms-small.txt`, and `/llms-full.txt` in your deployed site. To include them in your sitemap:

```javascript
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroLLMsGenerator(),
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

Files are automatically generated in the **build output directory** during `astro build`:
- Available at `/llms.txt`, `/llms-small.txt`, `/llms-full.txt` in your final deployment
- Generated only when running `astro build` (not during development)

## Performance Features

- **Build-time Generation**: Runs during `astro:build:done` for final deployment
- **Memory Efficient**: Uses smaller batch processing to prevent memory issues
- **Parallel Processing**: Generates all three files simultaneously
- **Smart Cleanup**: Properly disposes of JSDOM instances and triggers garbage collection

*ps: forked from [@4hse/astro-llms-txt](https://github.com/4hse/astro-llms-txt) for personal usage*

## 🤝 Contributing

Found a bug or want to contribute? [Open an issue](https://github.com/nermalcat69/astro-llms/issues) or submit a PR!
