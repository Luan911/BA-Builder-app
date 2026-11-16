// Small Markdown parser for the documents this app generates.
// One parse -> blocks, used by the HTML viewer, the PDF exporter and Read Aloud.

export function parseBlocks(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l);
  const splitRow = (l) => {
    const inner = l.trim().slice(1, -1);
    const cells = [];
    let cur = '';
    for (let k = 0; k < inner.length; k++) {
      const ch = inner[k];
      if (ch === '\\' && inner[k + 1] === '|') { cur += '|'; k++; continue; }
      if (ch === '|') { cells.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const body = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) body.push(lines[i++]);
      i++;
      blocks.push({ type: 'code', lang: fence[1], text: body.join('\n') });
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) { blocks.push({ type: 'h', level: h[1].length, text: h[2].trim() }); i++; continue; }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { blocks.push({ type: 'hr' }); i++; continue; }
    if (isTableRow(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(splitRow(lines[i++]));
      blocks.push({ type: 'table', header, rows });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) body.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({ type: 'quote', text: body.join(' ') });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const t = lines[i++].replace(/^\s*[-*]\s+/, '');
        const c = t.match(/^\[( |x|X)\]\s+(.*)$/);
        items.push(c ? { text: c[2], checked: c[1].toLowerCase() === 'x', task: true } : { text: t });
      }
      blocks.push({ type: 'ul', items });
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push({ text: lines[i++].replace(/^\s*\d+[.)]\s+/, '') });
      blocks.push({ type: 'ol', items });
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|>|\s*[-*]\s|\s*\d+[.)]\s|-{3,})/.test(lines[i]) && !isTableRow(lines[i])) para.push(lines[i++].trim());
    if (para.length) blocks.push({ type: 'p', text: para.join(' ') });
    else i++;
  }
  return blocks;
}

export const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function inlineHtml(text) {
  let s = escapeHtml(text);
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<em>$2</em>');
  return s;
}

export function blocksToHtml(blocks) {
  return blocks
    .map((b, idx) => {
      const id = `blk-${idx}`;
      switch (b.type) {
        case 'h': return `<h${b.level} id="${id}">${inlineHtml(b.text)}</h${b.level}>`;
        case 'p': return `<p>${inlineHtml(b.text)}</p>`;
        case 'hr': return '<hr>';
        case 'quote': return `<blockquote>${inlineHtml(b.text)}</blockquote>`;
        case 'code': return `<pre class="code" data-lang="${escapeHtml(b.lang)}"><code>${escapeHtml(b.text)}</code></pre>`;
        case 'ul':
          return `<ul${b.items.some((x) => x.task) ? ' class="tasks"' : ''}>${b.items
            .map((it) => (it.task ? `<li><span class="tick ${it.checked ? 'on' : ''}" aria-hidden="true"></span>${inlineHtml(it.text)}</li>` : `<li>${inlineHtml(it.text)}</li>`))
            .join('')}</ul>`;
        case 'ol': return `<ol>${b.items.map((it) => `<li>${inlineHtml(it.text)}</li>`).join('')}</ol>`;
        case 'table':
          return `<div class="table-wrap"><table><thead><tr>${b.header.map((c) => `<th>${inlineHtml(c)}</th>`).join('')}</tr></thead><tbody>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td>${inlineHtml(c)}</td>`).join('')}</tr>`)
            .join('')}</tbody></table></div>`;
        default: return '';
      }
    })
    .join('\n');
}

export const markdownToHtml = (md) => blocksToHtml(parseBlocks(md));

export function stripInline(s) {
  return String(s ?? '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1$2');
}

/**
 * Plain text for Read Aloud. Tables are read row by row ("Field: value"),
 * code blocks are read line by line, and symbols are spoken as words.
 */
export function toSpeech(md) {
  const out = [];
  const say = (s) => {
    const t = stripInline(s)
      .replace(/\bFR-0*(\d+)/g, 'F R $1')
      .replace(/\bNFR-0*(\d+)/g, 'N F R $1')
      .replace(/\bBR-0*(\d+)/g, 'B R $1')
      .replace(/→/g, ' then ')
      .replace(/×/g, ' times ')
      .replace(/≥/g, ' at least ')
      .replace(/≤/g, ' at most ')
      .replace(/[<]\s?(\d)/g, 'under $1')
      .replace(/[—–]/g, ', ')
      .replace(/\s+/g, ' ')
      .trim();
    if (t && t !== '-') out.push(/[.!?:]$/.test(t) ? t : `${t}.`);
  };
  for (const b of parseBlocks(md)) {
    if (b.type === 'h' || b.type === 'p' || b.type === 'quote') say(b.text);
    else if (b.type === 'ul' || b.type === 'ol') b.items.forEach((it) => say(it.task ? `${it.checked ? 'Done' : 'To do'}: ${it.text}` : it.text));
    else if (b.type === 'table') {
      for (const row of b.rows) {
        const parts = row.map((c, k) => (c && c !== '-' ? `${b.header[k]}: ${c}` : '')).filter(Boolean);
        if (parts.length) say(parts.join('; '));
      }
    } else if (b.type === 'code') b.text.split('\n').forEach((l) => say(l.trim()));
  }
  return out.join(' ');
}
