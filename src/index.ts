import type { AstroConfig, AstroIntegration } from "astro";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import { entryToSimpleMarkdown } from "./entryToSimpleMarkdown";

export interface PageData {
  pathname: string;
  title: string;
  description?: string;
  content?: string;
  slug?: string;
  order?: number;
}

export interface LlmsConfig {
  title?: string;
  description?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  customSeparator?: string;
}

/**
 * Enhanced Astro integration to automatically generate AI-friendly documentation files
 */
export default function astroLlmsTxt(userConfig: LlmsConfig = {}): AstroIntegration {
  let astroConfig: AstroConfig;

  return {
    name: "astro-llms-txt",
    hooks: {
      "astro:config:setup": ({ config }) => {
        astroConfig = config;
      },
      "astro:build:done": async ({ dir, pages }) => {
        const distDir = fileURLToPath(dir);
        
        // Auto-generate configuration with smart defaults
        const config = await generateSmartDefaults(astroConfig, userConfig, distDir);
        
        // Discover and process all pages
        const pageData = await discoverAndProcessPages(pages, distDir, astroConfig);
        
        // Generate all three output files in parallel
        await Promise.all([
          generateLlmsTxt(pageData, config, distDir),
          generateLlmsSmallTxt(pageData, config, distDir),
          generateLlmsFullTxt(pageData, config, distDir)
        ]);

        console.log("✅ Generated llms.txt, llms-small.txt, and llms-full.txt");
      },
    },
  };
}

/**
 * Generate smart defaults from Astro config and package.json
 */
async function generateSmartDefaults(
  astroConfig: AstroConfig,
  userConfig: LlmsConfig,
  distDir: string
): Promise<Required<LlmsConfig>> {
  // Try to find package.json for description
  let packageDescription = "";
  try {
    const packagePath = path.join(process.cwd(), "package.json");
    const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"));
    packageDescription = packageJson.description || "";
  } catch {
    // Ignore package.json errors
  }

  // Generate title from site URL or fallback to domain
  let autoTitle = "Documentation";
  if (astroConfig.site) {
    try {
      const url = new URL(astroConfig.site);
      autoTitle = url.hostname.replace(/^www\./, "");
    } catch {
      autoTitle = astroConfig.site;
    }
  }

  return {
    title: userConfig.title || autoTitle,
    description: userConfig.description || packageDescription || `AI-friendly documentation for ${autoTitle}`,
    includePatterns: userConfig.includePatterns || ["**/*"],
    excludePatterns: userConfig.excludePatterns || ["**/404*", "**/500*", "**/api/**"],
    customSeparator: userConfig.customSeparator || "\n\n---\n\n"
  };
}

/**
 * Discover and process all pages with metadata extraction
 */
async function discoverAndProcessPages(
  pages: { pathname: string }[],
  distDir: string,
  astroConfig: AstroConfig
): Promise<PageData[]> {
  const processedPages: PageData[] = [];
  
  // Process pages in parallel for better performance
  const pagePromises = pages.map(async (page) => {
    try {
      const htmlPath = getHtmlPath(page.pathname, distDir);
      await fs.access(htmlPath);
      
      const pageData = await extractPageData(htmlPath, page.pathname, astroConfig);
      return pageData;
    } catch (error) {
      console.warn(`⚠️ Could not process page: ${page.pathname}`);
      return null;
    }
  });

  const results = await Promise.all(pagePromises);
  processedPages.push(...results.filter((page): page is PageData => page !== null));

  // Sort pages by pathname for consistent output
  return processedPages.sort((a, b) => a.pathname.localeCompare(b.pathname));
}

/**
 * Extract comprehensive page data from HTML file
 */
async function extractPageData(
  htmlPath: string, 
  pathname: string, 
  astroConfig: AstroConfig
): Promise<PageData> {
  const html = await fs.readFile(htmlPath, "utf-8");
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // Extract title from multiple sources
  const h1 = doc.querySelector("h1");
  const titleTag = doc.querySelector("title");
  const title = h1?.textContent?.trim() || 
                titleTag?.textContent?.trim() || 
                pathname.split("/").filter(Boolean).pop() || "Untitled";

  // Extract description from meta tag
  const metaDesc = doc
    .querySelector('meta[name="description"]')
    ?.getAttribute("content")
    ?.trim();

  // Extract main content
  const main = doc.querySelector("main") || doc.querySelector("body");
  let content = "";
  
  if (main) {
    // Remove title from content to avoid duplication
    if (h1) h1.remove();
    
    content = await entryToSimpleMarkdown(
      main.innerHTML.trim(),
      ['header', 'footer', 'nav', '.no-llms'],
      false
    );
  }

  return {
    pathname,
    title,
    description: metaDesc,
    content: content.trim(),
    slug: pathname
  };
}

/**
 * Generate the main llms.txt index file
 */
async function generateLlmsTxt(
  pages: PageData[],
  config: Required<LlmsConfig>,
  distDir: string
): Promise<void> {
  const lines: string[] = [
    `# ${config.title}`,
    `> ${config.description}`,
    "",
    "## Pages",
    ""
  ];

  // Group pages by directory for better organization
  const groupedPages = groupPagesByDirectory(pages);
  
  for (const [directory, dirPages] of Object.entries(groupedPages)) {
    if (directory !== "/") {
      lines.push(`### ${directory}`);
      lines.push("");
    }
    
    for (const page of dirPages) {
      const url = page.pathname;
      const description = page.description ? ` - ${page.description}` : "";
      lines.push(`- [${page.title}](${url})${description}`);
    }
    lines.push("");
  }

  lines.push("", `*Auto-generated documentation index*`);

  const content = lines.join("\n").trim();
  await fs.writeFile(path.join(distDir, "llms.txt"), content, "utf-8");
}

/**
 * Generate the structure-only llms-small.txt file
 */
async function generateLlmsSmallTxt(
  pages: PageData[],
  config: Required<LlmsConfig>,
  distDir: string
): Promise<void> {
  const lines: string[] = [
    `# ${config.title}`,
    `> Structure-only documentation`,
    ""
  ];

  // Simple list of titles and URLs
  for (const page of pages) {
    lines.push(`- [${page.title}](${page.pathname})`);
  }

  const content = lines.join("\n").trim();
  await fs.writeFile(path.join(distDir, "llms-small.txt"), content, "utf-8");
}

/**
 * Generate the full content llms-full.txt file
 */
async function generateLlmsFullTxt(
  pages: PageData[],
  config: Required<LlmsConfig>,
  distDir: string
): Promise<void> {
  const lines: string[] = [
    `# ${config.title}`,
    `> ${config.description}`,
    "",
    "*Complete documentation content below*",
    ""
  ];

  const pageContents = pages
    .filter(page => page.content && page.content.length > 0)
    .map(page => {
      const parts = [`# ${page.title}`];
      if (page.description) {
        parts.push(`> ${page.description}`);
      }
      parts.push("", page.content!);
      return parts.join("\n");
    });

  lines.push(pageContents.join(config.customSeparator));

  const content = lines.join("\n").trim();
  await fs.writeFile(path.join(distDir, "llms-full.txt"), content, "utf-8");
}

/**
 * Group pages by their directory for better organization
 */
function groupPagesByDirectory(pages: PageData[]): Record<string, PageData[]> {
  const groups: Record<string, PageData[]> = {};
  
  for (const page of pages) {
    const dir = path.dirname(page.pathname);
    const dirName = dir === "/" || dir === "." ? "/" : dir.split("/").filter(Boolean).pop() || "/";
    
    if (!groups[dirName]) {
      groups[dirName] = [];
    }
    groups[dirName].push(page);
  }
  
  return groups;
}

/**
 * Get the HTML file path for a given pathname
 */
function getHtmlPath(pathname: string, distDir: string): string {
  if (pathname.endsWith("/")) {
    return path.join(distDir, pathname, "index.html");
  }
  
  // Handle both /page and /page.html cases
  const htmlPath = path.join(distDir, pathname + ".html");
  const indexPath = path.join(distDir, pathname, "index.html");
  
  // Return the index.html path for directory-style routes
  return pathname.includes(".") ? htmlPath : indexPath;
}