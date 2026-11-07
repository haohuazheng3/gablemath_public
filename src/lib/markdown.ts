import { Marked } from "marked";

// Shared Markdown → HTML for tool pages and blog posts.
// - h2/h3 get stable ids and are collected into a table of contents
// - images become <figure> with fixed dimensions, lazy loading, a small srcset for Pexels
//   photos and a credit line; write them as ![alt](url "Photographer|https://www.pexels.com/photo/…")
// - tables are wrapped so they scroll sideways on phones instead of widening the page

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;|&#\d+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function pexelsVariant(url: string, w: number, h: number) {
  const u = new URL(url);
  u.searchParams.set("w", String(w));
  u.searchParams.set("h", String(h));
  return u.toString();
}

function figure(href: string, alt: string, title: string | null | undefined) {
  let w = 1200;
  let h = 627;
  let srcset = "";
  try {
    const u = new URL(href);
    const qw = Number(u.searchParams.get("w"));
    const qh = Number(u.searchParams.get("h"));
    if (qw > 0 && qh > 0) {
      w = qw;
      h = qh;
    }
    if (u.hostname === "images.pexels.com") {
      const small = Math.round((h * 640) / w);
      srcset = ` srcset="${esc(pexelsVariant(href, 640, small))} 640w, ${esc(pexelsVariant(href, w, h))} ${w}w" sizes="(min-width: 1024px) 720px, 100vw"`;
    }
  } catch {
    /* relative or malformed URL — fall back to the default box */
  }
  const [who, page] = (title ?? "").split("|").map((s) => s.trim());
  const credit = who
    ? `<figcaption>${esc(alt)} <span class="credit">Photo: ${page ? `<a href="${esc(page)}" rel="nofollow noopener" target="_blank">${esc(who)} / Pexels</a>` : esc(who)}</span></figcaption>`
    : alt
      ? `<figcaption>${esc(alt)}</figcaption>`
      : "";
  return `<figure><img src="${esc(href)}"${srcset} alt="${esc(alt)}" width="${w}" height="${h}" loading="lazy" decoding="async">${credit}</figure>`;
}

export function renderMarkdown(src: string): { html: string; toc: TocItem[]; words: number } {
  const toc: TocItem[] = [];
  const seen = new Map<string, number>();
  const md = new Marked({
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        let id = slugify(text);
        const n = seen.get(id) ?? 0;
        seen.set(id, n + 1);
        if (n) id = `${id}-${n + 1}`;
        if (depth === 2 || depth === 3) toc.push({ id, text: text.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'"), level: depth });
        return `<h${depth} id="${id}">${text}</h${depth}>\n`;
      },
      image({ href, title, text }) {
        return figure(href, text, title);
      },
      paragraph({ tokens }) {
        // a paragraph that is only an image renders as a bare <figure>, not <p><figure>
        if (tokens.length === 1 && tokens[0].type === "image") return this.parser.parseInline(tokens);
        return `<p>${this.parser.parseInline(tokens)}</p>\n`;
      },
      table(token) {
        const head = token.header.map((c) => `<th${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</th>`).join("");
        const body = token.rows
          .map((r) => `<tr>${r.map((c) => `<td${c.align ? ` style="text-align:${c.align}"` : ""}>${this.parser.parseInline(c.tokens)}</td>`).join("")}</tr>`)
          .join("\n");
        return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>\n`;
      },
    },
  });
  const html = md.parse(src) as string;
  const words = src
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/[#*|`>-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return { html, toc, words };
}
