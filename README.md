# @nermalcat69/astro-llms

**Minimal LLMs TXT Generator for Astro Sites**

Automatically discovers and processes all your Astro pages to generate three optimized documentation files:

- **`/llms.txt`** – Smart index with titles, descriptions, and organized links grouped by directory
- **`/llms-small.txt`** – Ultra-compact structure-only version (titles + URLs)  
- **`/llms-full.txt`** – Complete Markdown content dump with full page content

---

## Installation

```bash
pnpm i @nermalcat69/astro-llms

npm i @nermalcat69/astro-llms

yarn add @nermalcat69/astro-llms
```

Or install directly with Astro:

```bash
pnpm astro add @nermalcat69/astro-llms
```

## Usage

### Basic Setup (Zero Config)

```javascript
import { defineConfig } from 'astro/config';
import astroLlmsTxt from '@nermalcat69/astro-llms';

export default defineConfig({
  site: 'https://example.com', // Auto-generates title from domain
  integrations: [
    astroLlmsTxt(), // No configuration needed!
  ],
});
```

### Advanced Configuration (Optional)

```javascript
export default defineConfig({
  site: 'https://example.com',
  integrations: [
    astroLlmsTxt({
      title: 'My Documentation',
      description: 'Custom description for AI systems',
      includePatterns: ['**/*'], // Pages to include
      excludePatterns: ['**/404*', '**/api/**'], // Pages to exclude
      customSeparator: '\n\n---\n\n' // Custom separator for full content
    }),
  ],
});
```

## 🤝 Contributing

Found a bug or want to contribute? [Open an issue](https://github.com/nermalcat69/astro-llms/issues) or submit a PR!
