import { Marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';

const marked = new Marked();

// Custom renderer for code highlighting
marked.use({
  renderer: {
    code({ text, lang }: { text: string; lang?: string }) {
      if (lang && hljs.getLanguage(lang)) {
        const highlighted = hljs.highlight(text, { language: lang }).value;
        return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>`;
      }
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<pre><code>${escaped}</code></pre>`;
    },
  },
});

// KaTeX extension for $...$ (inline) and $$...$$ (block)
function renderKatex(content: string): string {
  // Block math: $$...$$
  content = content.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `$$${tex}$$`;
    }
  });

  // Inline math: $...$
  content = content.replace(/\$([^\$\n]+?)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `$${tex}$`;
    }
  });

  return content;
}

export function renderMarkdown(content: string): string {
  // First render KaTeX
  const withKatex = renderKatex(content);
  // Then render Markdown
  const html = marked.parse(withKatex) as string;
  return html;
}
