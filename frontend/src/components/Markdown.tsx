import { Fragment, createElement, type ReactNode } from 'react';

function sanitizeUrl(url: string): string | undefined {
  const trimmed = (url || '').trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return undefined;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<strong key={key++}>{m[2]}</strong>);
    else if (m[4] !== undefined) nodes.push(<em key={key++}>{m[4]}</em>);
    else if (m[6] !== undefined) nodes.push(<code key={key++} className="md-code">{m[6]}</code>);
    else if (m[8] !== undefined) {
      const safe = sanitizeUrl(m[9]);
      if (safe) {
        nodes.push(
          <a key={key++} href={safe} target="_blank" rel="noopener noreferrer">
            {m[8]}
          </a>
        );
      } else {
        nodes.push(m[8]);
      }
    }
    last = regex.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function splitRow(row: string): string[] {
  let r = row.trim();
  if (r.startsWith('|')) r = r.slice(1);
  if (r.endsWith('|')) r = r.slice(0, -1);
  return r.split('|').map((c) => c.trim());
}

function isTableSeparator(line: string): boolean {
  const t = line.trim();
  if (!t.includes('-')) return false;
  return /^\|?[\s:|-]+\|?$/.test(t);
}

function renderMarkdown(content: string): ReactNode[] {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  const blockStart = (s: string): boolean =>
    /^(#{1,6}\s|>|\s*[-*]\s|\s*\d+\.\s|\s*(---|\*\*\*|___)\s*$)/.test(s) ||
    (s.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1]));

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="md-hr" />);
      i++;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = Math.min(heading[1].length, 4) as 1 | 2 | 3 | 4;
      const Tag = (`h${level}` as 'h1' | 'h2' | 'h3' | 'h4');
      blocks.push(
        <Tag key={key++} className={`md-h md-h${level}`}>
          {renderInline(heading[2])}
        </Tag>
      );
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="md-quote">
          {quote.map((q, idx) => (
            <div key={idx}>{renderInline(q)}</div>
          ))}
        </blockquote>
      );
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|') && lines[i].trim() !== '') {
        rows.push(splitRow(lines[i]));
        i++;
      }
      blocks.push(
        <div key={key++} className="md-table-wrap">
          <table className="md-table">
            <thead>
              <tr>
                {header.map((c, ci) => (
                  <th key={ci}>{renderInline(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) => (
                    <td key={ci}>{renderInline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={key++} className="md-ul">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={key++} className="md-ol">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it)}</li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && !blockStart(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    if (para.length === 0) continue;

    const joined = para.join(' ').replace(/\s+/g, ' ').trim();
    const titleMatch = /^\*\*(.+)\*\*$/.exec(joined);
    if (para.length === 1 && titleMatch) {
      blocks.push(
        <h2 key={key++} className="md-h md-title">
          {renderInline(titleMatch[1])}
        </h2>
      );
    } else {
      blocks.push(
        <p key={key++} className="md-p">
          {para.map((p, pi) => (
            <span key={pi}>
              {renderInline(p)}
              {pi < para.length - 1 && <br />}
            </span>
          ))}
        </p>
      );
    }
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// Render seguro de um subconjunto de HTML (quando a IA responde em HTML)
// ---------------------------------------------------------------------------

const DROP_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'noscript',
  'form',
  'input',
  'button',
]);

const HTML_TAG_MAP: Record<string, string> = {
  p: 'p',
  div: 'div',
  strong: 'strong',
  b: 'strong',
  em: 'em',
  i: 'em',
  code: 'code',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  blockquote: 'blockquote',
  span: 'span',
  thead: 'thead',
  tbody: 'tbody',
  tr: 'tr',
  th: 'th',
  td: 'td',
};

const HTML_CLASS: Record<string, string> = {
  ul: 'md-ul',
  ol: 'md-ol',
  p: 'md-p',
  div: 'md-p',
  blockquote: 'md-quote',
  code: 'md-code',
  h1: 'md-h md-h1',
  h2: 'md-h md-h2',
  h3: 'md-h md-h3',
  h4: 'md-h md-h4',
};

function renderHtmlNode(node: Node, key: number): ReactNode {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
  if (node.nodeType !== Node.ELEMENT_NODE) return null;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const children = Array.from(el.childNodes).map((c, i) => renderHtmlNode(c, i));

  if (DROP_TAGS.has(tag)) return null;

  if (tag === 'br') return <br key={key} />;
  if (tag === 'hr') return <hr key={key} className="md-hr" />;
  if (tag === 'table') {
    return (
      <div key={key} className="md-table-wrap">
        <table className="md-table">{children}</table>
      </div>
    );
  }
  if (tag === 'a') {
    const safe = sanitizeUrl(el.getAttribute('href') || '');
    return (
      <a key={key} href={safe} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  const mapped = HTML_TAG_MAP[tag];
  if (!mapped) return <Fragment key={key}>{children}</Fragment>;

  const cls = HTML_CLASS[tag] || '';
  return createElement(mapped, { key, className: cls || undefined }, children);
}

function looksLikeHtml(content: string): boolean {
  return /<(ul|ol|li|table|thead|tbody|tr|th|td|blockquote|h[1-6]|p|div|a|b|strong|em|i|code|br|hr)\b/i.test(
    content
  );
}

export default function Markdown({ content }: { content: string }) {
  if (typeof window !== 'undefined' && looksLikeHtml(content)) {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    return (
      <div className="md">
        {Array.from(doc.body.childNodes).map((n, i) => renderHtmlNode(n, i))}
      </div>
    );
  }
  return <div className="md">{renderMarkdown(content)}</div>;
}
