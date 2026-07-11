// Minimal Markdown-to-HTML converter for prose chapters.
// Supports: #/##/### headings, paragraphs, blockquotes, unordered lists,
// fenced code blocks, horizontal rules, and inline bold/italic/code.
// Output is a list of blocks so the reader can track scroll position,
// anchor bookmarks, and search per-block.

export interface Block {
  /** Rendered HTML for this block (safe: source text is escaped first). */
  html: string;
  /** Plain text of the block, used for search and bookmark snippets. */
  text: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function stripInline(s: string): string {
  return s.replace(/[`*]/g, "");
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === "") {
      i++;
      continue;
    }

    // Fenced code block
    if (trimmed.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      const text = code.join("\n");
      blocks.push({ html: `<pre><code>${escapeHtml(text)}</code></pre>`, text });
      continue;
    }

    // Horizontal rule (scene break)
    if (/^(-{3,}|\*{3,})$/.test(trimmed)) {
      blocks.push({ html: "<hr />", text: "" });
      i++;
      continue;
    }

    // Heading
    const heading = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      const content = heading[2];
      blocks.push({
        html: `<h${level}>${inline(escapeHtml(content))}</h${level}>`,
        text: stripInline(content),
      });
      i++;
      continue;
    }

    // Blockquote: consume consecutive "> " lines
    if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      const text = quote.join(" ");
      blocks.push({
        html: `<blockquote><p>${inline(escapeHtml(text))}</p></blockquote>`,
        text: stripInline(text),
      });
      continue;
    }

    // Unordered list: consume consecutive "- " / "* " lines
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      const html = `<ul>${items
        .map((item) => `<li>${inline(escapeHtml(item))}</li>`)
        .join("")}</ul>`;
      blocks.push({ html, text: items.map(stripInline).join(" ") });
      continue;
    }

    // Paragraph: consume until blank line or a line that starts another block
    const para: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        t === "" ||
        t.startsWith(">") ||
        t.startsWith("#") ||
        t.startsWith("```") ||
        /^[-*]\s+/.test(t) ||
        /^(-{3,}|\*{3,})$/.test(t)
      ) {
        break;
      }
      para.push(t);
      i++;
    }
    const text = para.join(" ");
    blocks.push({ html: `<p>${inline(escapeHtml(text))}</p>`, text: stripInline(text) });
  }

  return blocks;
}
