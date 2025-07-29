import type { Element, RootContent, Root } from 'hast';
import { matches, select, selectAll } from 'hast-util-select';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { remove } from 'unist-util-remove';

/**
 * Selectors for structure-only extraction
 */
const structureSelectors = ['h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'];

/**
 * Selectors for elements to remove for LLMs.txt compatibility
 */
const llmsExcludedSelectors = [
  'img',           // Remove all images
  'picture',       // Remove picture elements
  'figure',        // Remove figure elements (often contain images)
  'svg',           // Remove SVG graphics
  'canvas',        // Remove canvas elements
  'video',         // Remove video elements
  'audio',         // Remove audio elements
  'iframe',        // Remove embedded content
  'object',        // Remove object embeds
  'embed',         // Remove embed elements
  '.image',        // Remove elements with image class
  '.photo',        // Remove photo containers
  '.gallery',      // Remove gallery containers
  '.media',        // Remove media containers
];

interface ProcessingData extends Record<string, unknown> {
  ignoreSelectors: string[];
  onlyStructure?: boolean;
}

const htmlToMarkdownPipeline = unified()
  .use(rehypeParse, { fragment: true })

  // Remove images and media elements for LLMs.txt compatibility
  .use(function removeLlmsIncompatibleElements() {
    return (tree: Root) => {
      for (const selector of llmsExcludedSelectors) {
        remove(tree, (node) => {
          const element = node as RootContent;
          return matches(selector, element);
        });
      }
      return tree;
    };
  })

  // Remove user-specified elements
  .use(function removeUserSpecifiedElements() {
    return (tree: Root, file: any) => {
      const data = file.data as ProcessingData;
      remove(tree, (node) => {
        const element = node as RootContent;
        for (const selector of data.ignoreSelectors || []) {
          if (matches(selector, element)) {
            return true;
          }
        }
        return false;
      });
      return tree;
    };
  })

  // Keep only structure elements if requested
  .use(function keepOnlyStructure() {
    return (tree: Root, file: any) => {
      const data = file.data as ProcessingData;
      if (!data.onlyStructure) return tree;
      
      remove(tree, (node) => {
        const element = node as RootContent;
        return !structureSelectors.some(sel => matches(sel, element));
      });
      return tree;
    };
  })

  // Improve code block handling
  .use(function improveCodeBlockHandling() {
    return (tree: Root) => {
      const preElements = selectAll('pre', tree);
      for (const pre of preElements) {
        if (pre.type === 'element') {
          const codeElement = select('code', pre);
          if (codeElement && codeElement.type === 'element') {
            // Preserve language information
            if (pre.properties?.dataLanguage) {
              if (!Array.isArray(codeElement.properties.className)) {
                codeElement.properties.className = [];
              }
              (codeElement.properties.className as string[]).push(
                `language-${pre.properties.dataLanguage}`
              );
            }
          }
        }
      }
      return tree;
    };
  })

  // Convert images to alt text for context (simplified approach)
  .use(function convertImageAltToText() {
    return (tree: Root) => {
      // This is handled by the removal function above
      // Images will be removed and alt text can be preserved in cleanup
      return tree;
    };
  })

  // Improve list handling
  .use(function improveListHandling() {
    return (tree: Root) => {
      const lists = selectAll('ul, ol', tree);
      for (const list of lists) {
        if (list.type === 'element') {
          // Remove empty list items
          remove(list, (node) => {
            const element = node as Element;
            return element.type === 'element' && 
                   element.tagName === 'li' && 
                   (!element.children || element.children.length === 0);
          });
        }
      }
      return tree;
    };
  })

  // Clean up table handling for text-only output
  .use(function improveTableHandling() {
    return (tree: Root) => {
      const tables = selectAll('table', tree);
      for (const table of tables) {
        if (table.type === 'element') {
          // Convert tables to simple text format for LLMs
          const rows = selectAll('tr', table);
          const textRows: string[] = [];
          
          for (const row of rows) {
            const cells = selectAll('td, th', row);
            const cellTexts: string[] = [];
            
            for (const cell of cells) {
              const cellText = extractTextFromElement(cell);
              if (cellText.trim()) {
                cellTexts.push(cellText.trim());
              }
            }
            
            if (cellTexts.length > 0) {
              textRows.push(cellTexts.join(' | '));
            }
          }
          
          if (textRows.length > 0 && table.type === 'element') {
            // Replace table with text content
            const tableElement = table as Element;
            tableElement.tagName = 'div';
            tableElement.children = [{
              type: 'text',
              value: textRows.join('\n')
            }];
            tableElement.properties = {};
          }
        }
      }
      return tree;
    };
  })

  .use(rehypeRemark)
  .use(remarkGfm)
  .use(remarkStringify, {
    bullet: '-',
    fence: '`',
    fences: true,
    incrementListMarker: false,
    listItemIndent: 'one',
    rule: '-',
    ruleSpaces: false,
    setext: false,
    strong: '*',
    emphasis: '_'
  });

/**
 * Extract text content from a hast element
 */
function extractTextFromElement(element: any): string {
  if (!element) return '';
  
  if (element.type === 'text') {
    return element.value || '';
  }
  
  if (element.type === 'element' && element.children) {
    return element.children
      .map((child: any) => extractTextFromElement(child))
      .join(' ');
  }
  
  return '';
}

/**
 * Convert HTML content to clean, LLMs.txt-compatible Markdown
 * 
 * @param html - The HTML content to convert
 * @param ignoreSelectors - CSS selectors for elements to ignore
 * @param onlyStructure - If true, only keep structural elements (headings, lists)
 * @returns Clean Markdown text optimized for LLMs
 */
export async function SimpleMarkdown(
  html: string,
  ignoreSelectors: string[] = [],
  onlyStructure: boolean = false,
): Promise<string> {
  const file = await htmlToMarkdownPipeline.process({
    value: html,
    data: { onlyStructure, ignoreSelectors } as ProcessingData,
  });
  
  let markdown = String(file).trim();
  
  // Post-process to ensure LLMs.txt compatibility
  markdown = cleanupMarkdownForLlms(markdown);
  
  return markdown;
}

/**
 * Clean up markdown content for optimal LLMs.txt compatibility
 */
function cleanupMarkdownForLlms(markdown: string): string {
  return markdown
    // Remove image markdown syntax that might have leaked through
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[$1]')
    // Remove standalone image references
    .replace(/^\s*!\[[^\]]*\]\([^)]+\)\s*$/gm, '')
    // Clean up excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    // Remove empty links
    .replace(/\[\]\([^)]*\)/g, '')
    // Clean up malformed links
    .replace(/\[([^\]]+)\]\(\s*\)/g, '$1')
    // Remove HTML comments that might remain
    .replace(/<!--[\s\S]*?-->/g, '')
    // Clean up extra spaces
    .replace(/[ \t]+$/gm, '')
    // Ensure consistent line endings
    .replace(/\r\n/g, '\n')
    .trim();
}

/**
 * Extract only the text content for maximum LLMs compatibility
 */
export async function extractTextOnly(html: string): Promise<string> {
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Remove all non-text elements
  const elementsToRemove = document.querySelectorAll(
    llmsExcludedSelectors.join(', ')
  );
  
  elementsToRemove.forEach(element => element.remove());
  
  // Get clean text content
  const textContent = document.body?.textContent || document.textContent || '';
  
  return textContent
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}
