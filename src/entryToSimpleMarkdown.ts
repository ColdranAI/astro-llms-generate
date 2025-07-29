import type { Element, RootContent, Root } from 'hast';
import { matches, select, selectAll } from 'hast-util-select';
import rehypeParse from 'rehype-parse';
import rehypeRemark from 'rehype-remark';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { remove } from 'unist-util-remove';

/**
 * Selector to get for minification
 */
const structureSelectors = ['h2','h3','h4','h5','h6','ul','ol','li'];

interface ProcessingData extends Record<string, unknown> {
  ignoreSelectors: string[];
  onlyStructure?: boolean;
}

const htmlToMarkdownPipeline = unified()
	.use(rehypeParse, { fragment: true })

	.use(function removeSomeElements() {
		return (tree: Root, file: any) => {
			remove(tree, (_node) => {
				const node = _node as RootContent;
				const data = file.data as ProcessingData;
				for (const selector of data.ignoreSelectors || []) {
					if (matches(selector, node)) {
						return true;
					}
				}
				return false;
			});
			return tree;
		};
	})

	.use(function keepOnlyStructure() {
		return (tree: Root, file: any) => {
			const data = file.data as ProcessingData;
			if (!data.onlyStructure) return tree;
			remove(tree, (_node) => {
				const node = _node as RootContent;
				return !structureSelectors.some(sel => matches(sel, node));
			});
			return tree;
		};
	})

	.use(function improveExpressiveCodeHandling() {
		return (tree: Root) => {
			const ecInstances = selectAll('.expressive-code', tree);
			for (const instance of ecInstances) {
				// Remove the "Terminal Window" label from Expressive Code terminal frames.
				const figcaption = select('figcaption', instance);
				if (figcaption) {
					const terminalWindowTextIndex = figcaption.children.findIndex((child: any) =>
						matches('span.sr-only', child)
					);
					if (terminalWindowTextIndex > -1) {
						figcaption.children.splice(terminalWindowTextIndex, 1);
					}
				}
				const pre = select('pre', instance) as Element;
				const code = select('code', instance) as Element;
				// Use Expressive Code's `data-language=*` attribute to set a `language-*` class name.
				// This is what `hast-util-to-mdast` checks for code language metadata.
				if (pre?.properties?.dataLanguage && code) {
					if (!Array.isArray(code.properties.className)) code.properties.className = [];

					const diffLines =
						pre.properties.dataLanguage === 'diff'
							? []
							: code.children.filter((child: any) => matches('div.ec-line.ins, div.ec-line.del', child));
					if (diffLines.length === 0) {
						(code.properties.className as string[]).push(`language-${pre.properties.dataLanguage}`);
					} else {
						(code.properties.className as string[]).push('language-diff');
						for (const line of diffLines) {
							if (line.type !== 'element') continue;
							const classes = line.properties?.className;
							if (typeof classes !== 'string' && !Array.isArray(classes)) continue;
							const marker = classes.includes('ins') ? '+' : '-';
							const span = select('span:not(.indent)', line);
							const firstChild = span?.children[0];
							if (firstChild?.type === 'text') {
								(firstChild as any).value = `${marker}${(firstChild as any).value}`;
							}
						}
					}
				}
			}
		};
	})

	.use(function improveTabsHandling() {
		return (tree: Root) => {
			const tabInstances = selectAll('starlight-tabs', tree);
			for (const instance of tabInstances) {
				const tabs = selectAll('[role="tab"]', instance);
				const panels = selectAll('[role="tabpanel"]', instance);
				// Convert parent `<starlight-tabs>` element to empty unordered list.
				if (instance.type === 'element') {
					(instance as Element).tagName = 'ul';
					(instance as Element).properties = {};
					(instance as Element).children = [];
				}
				// Iterate over tabs and panels to build a list with tab label as initial list text.
				for (let i = 0; i < Math.min(tabs.length, panels.length); i++) {
					const tab = tabs[i];
					const panel = panels[i];
					if (!tab || !panel) continue;
					// Filter out extra whitespace and icons from tab contents.
					const tabLabel = tab.children
						.filter((child: any) => child.type === 'text' && child.value.trim())
						.map((child: any) => child.type === 'text' && child.value.trim())
						.join('');
					// Add list entry for this tab and panel.
					if (instance.type === 'element') {
						(instance as Element).children.push({
							type: 'element',
							tagName: 'li',
							properties: {},
							children: [
								{
									type: 'element',
									tagName: 'p',
									children: [{ type: 'text', value: tabLabel }],
									properties: {},
								},
								panel as any,
							],
						});
					}
				}
			}
		};
	})
	.use(function improveFileTreeHandling() {
		return (tree: Root) => {
			const trees = selectAll('starlight-file-tree', tree);
			for (const tree of trees) {
				// Remove "Directory" screen reader labels from <FileTree> entries.
				remove(tree, (_node) => {
					const node = _node as RootContent;
					return matches('.sr-only', node);
				});
			}
		};
	})
	.use(rehypeRemark)
	.use(remarkGfm)
	.use(remarkStringify);

/** Render html content to Markdown to support rendering and simplifying MDX components */
export async function entryToSimpleMarkdown(
	html: string,
 	ignoreSelectors: string[] = [],
	onlyStructure: boolean = false,
) {
	const file = await htmlToMarkdownPipeline.process({
		value: html,
		data: { onlyStructure, ignoreSelectors } as ProcessingData,
	});
	let markdown = String(file).trim();
	//if (onlyStructure) {
	//	markdown = markdown.replace(/\s+/g, ' ');
	//}
	return markdown;
}
