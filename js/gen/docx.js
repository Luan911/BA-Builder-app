// Real Word documents (.docx, Office Open XML) from the generated Markdown.
// Pure functions: no browser APIs, so the same code runs in the tests. Diagram and logo images are
// passed in as PNG/JPEG bytes. Wide diagrams and wide tables get their own landscape pages.

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
// A4 in twentieths of a point; margins 2 cm (portrait) and 1.4 cm (landscape)
const A4 = { w: 11906, h: 16838 };
const MARGIN = { portrait: 1134, landscape: 800 };
const TEXT_W = { portrait: A4.w - 2 * MARGIN.portrait, landscape: A4.h - 2 * MARGIN.landscape };
const EMU_PER_PX = 9525;
const WIDE_TABLE_COLS = 8;

export const DEFAULT_BRAND = { colour: '#0f4f4a', footer: '', cover: true, toc: true };

/** Escape text for XML and drop characters XML does not allow. */
export const xmlEsc = (s) => String(s ?? '')
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const hex = (c, d = '0F4F4A') => (/^#?[0-9a-f]{6}$/i.test(String(c || '')) ? String(c).replace('#', '').toUpperCase() : d);
/** Mix a colour with white (t = 0 … 1 of white). */
export function tint(c, t) {
  const h = hex(c);
  return [0, 2, 4].map((i) => Math.round(parseInt(h.slice(i, i + 2), 16) + (255 - parseInt(h.slice(i, i + 2), 16)) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ---------- Markdown → blocks (same rules as js/markdown.js) ----------
const cells = (line) => line.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
const LIST = /^\s*([-*]|\d+\.)\s+/;

export function mdBlocks(md) {
  const lines = String(md ?? '').replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const lang = l.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(lang === 'mermaid' ? { t: 'mermaid', code: buf.join('\n') } : { t: 'code', text: buf.join('\n') });
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) { out.push({ t: 'h', level: h[1].length, text: h[2].trim() }); i++; continue; }
    if (/^\|/.test(l) && /^\|?\s*:?-{3,}/.test(lines[i + 1] || '')) {
      const head = cells(l);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push({ t: 'table', head, rows });
      continue;
    }
    if (LIST.test(l)) {
      const ordered = /^\s*\d+\./.test(l);
      const items = [];
      while (i < lines.length && LIST.test(lines[i])) items.push(lines[i++].replace(LIST, ''));
      out.push({ t: ordered ? 'ol' : 'ul', items });
      continue;
    }
    if (/^---+$/.test(l.trim())) { out.push({ t: 'hr' }); i++; continue; }
    if (!l.trim()) { i++; continue; }
    const para = [lines[i++]];
    while (i < lines.length && lines[i].trim() && !/^(#|\||```|\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++]);
    const text = para.join(' ');
    out.push(/^>\s?/.test(text) ? { t: 'quote', text: text.replace(/^>\s?/, '').replace(/\s>\s/g, ' ') } : { t: 'p', text });
  }
  return out;
}

/** The mermaid sources in document order (the caller renders each to an image). */
export const mermaidBlocks = (md) => mdBlocks(md).filter((b) => b.t === 'mermaid').map((b) => b.code);

// ---------- runs ----------
const INLINE = /`([^`]+)`|\*\*([^*]+)\*\*|(^|[\s(])_([^_]+)_(?=[\s).,;:]|$)/g;
/** Split Markdown inline text into [{ text, b, i, code }]. */
export function inlineRuns(text) {
  const s = String(text ?? '');
  const out = [];
  let last = 0;
  for (const m of s.matchAll(INLINE)) {
    let start = m.index;
    if (m[3] !== undefined) start += m[3].length; // keep the space before _italic_
    if (start > last) out.push({ text: s.slice(last, start) });
    if (m[1] !== undefined) out.push({ text: m[1], code: true });
    else if (m[2] !== undefined) out.push({ text: m[2], b: true });
    else out.push({ text: m[4], i: true });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out.filter((r) => r.text !== '');
}

const t = (s) => `<w:t xml:space="preserve">${xmlEsc(s)}</w:t>`;
function run(r, extra = '') {
  // the run style must come first inside w:rPr
  const pr = `${r.code ? '<w:rStyle w:val="CodeChar"/>' : ''}${r.b && !extra.includes('<w:b/>') ? '<w:b/>' : ''}${r.i ? '<w:i/>' : ''}${extra}`;
  return `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}${t(r.text)}</w:r>`;
}
const runs = (text, extra) => inlineRuns(text).map((r) => run(r, extra)).join('');
const plainRun = (s, rpr = '') => `<w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}${t(s)}</w:r>`;
const para = (body, ppr = '') => `<w:p>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${body}</w:p>`;
const style = (s) => `<w:pStyle w:val="${s}"/>`;
const plain = (s) => inlineRuns(s).map((r) => r.text).join('');

// ---------- building blocks ----------
function imageXml(rid, id, wPx, hPx, name) {
  const cx = Math.round(wPx * EMU_PER_PX), cy = Math.round(hPx * EMU_PER_PX);
  return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${id}" name="${xmlEsc(name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="${xmlEsc(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;
}

/** Column widths (twips) that follow the content, within a total width. */
export function columnWidths(head, rows, total) {
  const n = head.length || 1;
  const len = (s) => plain(s).length;
  const weight = head.map((h, c) => {
    const longest = Math.max(len(h), ...rows.map((r) => len(r[c] ?? '')));
    return Math.min(45, Math.max(5, Math.sqrt(longest) * 4));
  });
  const sum = weight.reduce((a, b) => a + b, 0) || n;
  const w = weight.map((x) => Math.max(500, Math.floor((x / sum) * total)));
  w[w.indexOf(Math.max(...w))] -= w.reduce((a, b) => a + b, 0) - total; // keep the total exact
  return w;
}

function tableXml(b, totalW, headFill) {
  const n = b.head.length;
  const rows = b.rows.map((r) => Array.from({ length: n }, (_, c) => (c === n - 1 && r.length > n ? r.slice(c).join(' | ') : r[c] ?? '')));
  const widths = columnWidths(b.head, rows, totalW);
  const cell = (txt, w, head) => `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${head ? `<w:shd w:val="clear" w:color="auto" w:fill="${headFill}"/>` : ''}</w:tcPr>${para(head ? runs(txt, '<w:b/>') : runs(txt), style('TableText'))}</w:tc>`;
  return `<w:tbl><w:tblPr><w:tblStyle w:val="BABTable"/><w:tblW w:w="${totalW}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>`
    + `<w:tblGrid>${widths.map((w) => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`
    + `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${b.head.map((h, c) => cell(h, widths[c], true)).join('')}</w:tr>`
    + rows.map((r) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((x, c) => cell(x, widths[c], false)).join('')}</w:tr>`).join('')
    + '</w:tbl>' + para('', style('AfterTable'));
}

function sectPr(orient, { first = false, last = false } = {}) {
  const land = orient === 'landscape';
  const m = MARGIN[orient];
  return `<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader"/><w:footerReference w:type="default" r:id="rIdFooter"/>${last ? '' : '<w:type w:val="nextPage"/>'}`
    + `<w:pgSz w:w="${land ? A4.h : A4.w}" w:h="${land ? A4.w : A4.h}"${land ? ' w:orient="landscape"' : ''}/>`
    + `<w:pgMar w:top="${m}" w:right="${m}" w:bottom="${m}" w:left="${m}" w:header="567" w:footer="567" w:gutter="0"/>${first ? '<w:titlePg/>' : ''}</w:sectPr>`;
}

/**
 * Build every part of a .docx. Returns { files: { path: string | Uint8Array }, stats }.
 * opts: { title, markdown, meta, brand, images: [{ data, w, h, wide } | null], logo: { data, type, w, h } | null, author, date }
 */
export function docxFiles(opts) {
  const { title = 'Document', markdown = '', meta = {}, images = [], logo = null, author = '', date = new Date().toISOString() } = opts;
  const brand = { ...DEFAULT_BRAND, ...(opts.brand || {}) };
  const colour = hex(brand.colour);
  const headFill = tint(colour, 0.85);
  const blocks = mdBlocks(markdown);
  const rels = [];
  const media = {};
  let docPr = 1, bm = 0, numId = 2, imgN = 0, mermaidN = 0;
  const nums = []; // ordered lists each restart at 1
  const toc = [];

  const addMedia = (bytes, ext) => {
    const name = `media/image${++imgN}.${ext}`;
    media[`word/${name}`] = bytes;
    const rid = `rIdImg${imgN}`;
    rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${name}"/>`);
    return rid;
  };
  const logoExt = logo && (logo.type === 'jpeg' || logo.type === 'jpg' ? 'jpeg' : 'png');
  const logoRid = logo?.data ? addMedia(logo.data, logoExt) : null;
  const logoSized = (maxH, maxW) => { const s = Math.min(maxH / logo.h, maxW / logo.w, 1); return [Math.round(logo.w * s), Math.round(logo.h * s)]; };

  // split the front matter (title, subtitle, summary table) from the body at the first level-2 heading
  const firstH2 = blocks.findIndex((b) => b.t === 'h' && b.level === 2);
  const front = brand.cover && firstH2 > 0 ? blocks.slice(0, firstH2) : [];
  const body = brand.cover && firstH2 > 0 ? blocks.slice(firstH2) : blocks;

  const blockXml = (b, orient) => {
    const W = TEXT_W[orient];
    switch (b.t) {
      case 'h': {
        const s = b.level === 1 ? 'Title' : `Heading${b.level - 1}`;
        if (b.level === 1) return para(runs(b.text), style(s));
        const id = ++bm;
        if (b.level <= 3) toc.push({ level: b.level - 1, text: plain(b.text), anchor: `_Toc${id}` });
        return para(`<w:bookmarkStart w:id="${id}" w:name="_Toc${id}"/>${runs(b.text)}<w:bookmarkEnd w:id="${id}"/>`, style(s));
      }
      case 'p': return para(runs(b.text));
      case 'quote': return para(runs(b.text), style('Note'));
      case 'hr': return para('', style('Rule'));
      case 'code': return para(b.text.split('\n').map((ln, k) => `${k ? '<w:r><w:br/></w:r>' : ''}${plainRun(ln)}`).join(''), style('Code'));
      case 'ul': return b.items.map((x) => para(runs(x), `${style('ListParagraph')}<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>`)).join('');
      case 'ol': { const id = numId++; nums.push(id); return b.items.map((x) => para(runs(x), `${style('ListParagraph')}<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${id}"/></w:numPr>`)).join(''); }
      case 'table': return tableXml(b, W, headFill);
      case 'mermaid': {
        const img = images[mermaidN++];
        if (!img?.data) return para(plainRun('Diagram could not be drawn — its source is shown below.', '<w:color w:val="B91C1C"/>')) + blockXml({ t: 'code', text: b.code }, orient);
        const maxW = W / 15; // twips → px
        let w = Math.min(img.w, maxW), h = img.h * (w / img.w);
        const maxH = orient === 'landscape' ? 600 : 860;
        if (h > maxH) (w = w * (maxH / h)), (h = maxH);
        const rid = addMedia(img.data, 'png');
        const id = docPr++;
        return para(imageXml(rid, id, w, h, `Diagram ${mermaidN}`), '<w:keepNext/><w:spacing w:before="120" w:after="120"/><w:jc w:val="center"/>');
      }
      default: return '';
    }
  };

  // group body blocks into portrait and landscape sections
  const isWide = (b, k) => (b.t === 'mermaid' && images[k]?.data && images[k].wide) || (b.t === 'table' && b.head.length >= WIDE_TABLE_COLS);
  const sections = [];
  let cur = { orient: 'portrait', items: [] };
  let mk = front.filter((b) => b.t === 'mermaid').length; // mermaid index at the start of the body
  for (const b of body) {
    const wide = isWide(b, mk);
    if (b.t === 'mermaid') mk++;
    const want = wide ? 'landscape' : 'portrait';
    if (want !== cur.orient) {
      let carry = [];
      // keep the heading(s) directly above a wide item with it
      const n = cur.items.length;
      // a short description between the heading and the diagram moves too
      if (want === 'landscape' && n >= 2 && cur.items[n - 1].t === 'p' && cur.items[n - 2].t === 'h') carry.unshift(cur.items.pop());
      while (want === 'landscape' && cur.items.length && cur.items[cur.items.length - 1].t === 'h') carry.unshift(cur.items.pop());
      if (cur.items.length) sections.push(cur);
      cur = { orient: want, items: carry };
    }
    cur.items.push(b);
  }
  if (cur.items.length || !sections.length) sections.push(cur);
  const wantsToc = brand.toc && body.filter((b) => b.t === 'h' && (b.level === 2 || b.level === 3)).length >= 3;
  // the cover and contents always sit on portrait pages
  if ((front.length || wantsToc) && sections[0].orient === 'landscape') sections.unshift({ orient: 'portrait', items: [] });

  // front matter: cover page and contents
  let xml = '';
  if (front.length) {
    xml += para('', '<w:spacing w:before="1800"/>');
    if (logoRid) { const [w, h] = logoSized(90, 260); xml += para(imageXml(logoRid, docPr++, w, h, 'Logo'), '<w:spacing w:after="360"/>'); }
    if (opts.org) xml += para(plainRun(opts.org, `<w:color w:val="${colour}"/><w:sz w:val="28"/>`), '<w:spacing w:after="240"/>');
    xml += front.map((b) => blockXml(b, 'portrait')).join('');
    if (brand.footer) xml += para(plainRun(brand.footer, '<w:b/>'), '<w:spacing w:before="480"/>');
  }
  // body first so the contents list knows the headings; then put the contents after the cover
  const parts = sections.map((sec) => sec.items.map((b) => blockXml(b, sec.orient)).join(''));
  let tocXml = '';
  if (wantsToc) {
    tocXml += para(plainRun('Contents'), style('TOCHeading'));
    tocXml += toc.map((e, k) => para(
      `${k === 0 ? '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> TOC \\o "1-2" \\h \\z \\u</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>' : ''}<w:hyperlink w:anchor="${e.anchor}" w:history="1">${plainRun(e.text)}</w:hyperlink>${k === toc.length - 1 ? '<w:r><w:fldChar w:fldCharType="end"/></w:r>' : ''}`,
      style(`TOC${e.level}`))).join('');
  }
  const pageBreak = para('<w:r><w:br w:type="page"/></w:r>');
  // a page break only where more content follows on the same section (a section break starts a new page anyway)
  if (front.length && (tocXml || parts[0])) xml += pageBreak;
  if (tocXml) xml += tocXml + (parts[0] ? pageBreak : '');
  sections.forEach((sec, k) => {
    xml += parts[k];
    const last = k === sections.length - 1;
    const pr = sectPr(sec.orient, { first: k === 0 && front.length > 0, last });
    xml += last ? pr : para('', `<w:spacing w:before="0" w:after="0"/>${pr}`);
  });

  const document = `${XML}<w:document ${NS}><w:body>${xml}</w:body></w:document>`;

  // header and footer
  const sub = [opts.org, meta.name].filter(Boolean).join(' · ');
  const headerRels = [];
  let headerLogo = '';
  if (logoRid) {
    headerRels.push(`<Relationship Id="rIdLogo" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.${logoExt}"/>`);
    const [w, h] = logoSized(28, 160);
    headerLogo = imageXml('rIdLogo', 9000, w, h, 'Logo');
  }
  const header = `${XML}<w:hdr ${NS}>${para(`${headerLogo}<w:r><w:ptab w:relativeTo="margin" w:alignment="right" w:leader="none"/></w:r>${plainRun(sub || title)}`, style('Header'))}</w:hdr>`;
  const left = [brand.footer, title, meta.version ? `v${meta.version}` : ''].filter(Boolean).join(' · ');
  const field = (instr, val) => `<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> ${instr} </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>${plainRun(val)}<w:r><w:fldChar w:fldCharType="end"/></w:r>`;
  const footer = `${XML}<w:ftr ${NS}>${para(`${plainRun(left)}<w:r><w:ptab w:relativeTo="margin" w:alignment="right" w:leader="none"/></w:r>${plainRun('Page ')}${field('PAGE', '1')}${plainRun(' of ')}${field('NUMPAGES', '1')}`, style('Footer'))}</w:ftr>`;

  const numbering = `${XML}<w:numbering ${NS}>`
    + `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr><w:rPr><w:color w:val="${colour}"/></w:rPr></w:lvl></w:abstractNum>`
    + `<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="hybridMultilevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="360" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>`
    + '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>'
    + nums.map((n) => `<w:num w:numId="${n}"><w:abstractNumId w:val="1"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="1"/></w:lvlOverride></w:num>`).join('')
    + '</w:numbering>';

  const st = (id, name, ppr, rpr, extra = '') => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/>${extra}<w:qFormat/>${ppr ? `<w:pPr>${ppr}</w:pPr>` : ''}${rpr ? `<w:rPr>${rpr}</w:rPr>` : ''}</w:style>`;
  const styles = `${XML}<w:styles ${NS}>`
    + '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-GB"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="264" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>'
    + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:rPr><w:color w:val="1F2328"/></w:rPr></w:style>'
    + st('Title', 'Title', '<w:spacing w:after="120"/>', `<w:b/><w:color w:val="${colour}"/><w:sz w:val="48"/><w:szCs w:val="48"/>`)
    + st('Heading1', 'heading 1', `<w:keepNext/><w:keepLines/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="${tint(colour, 0.7)}"/></w:pBdr><w:spacing w:before="360" w:after="120"/><w:outlineLvl w:val="0"/>`, `<w:b/><w:color w:val="${colour}"/><w:sz w:val="30"/><w:szCs w:val="30"/>`)
    + st('Heading2', 'heading 2', '<w:keepNext/><w:keepLines/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/>', `<w:b/><w:color w:val="${colour}"/><w:sz w:val="25"/><w:szCs w:val="25"/>`)
    + st('Heading3', 'heading 3', '<w:keepNext/><w:keepLines/><w:spacing w:before="200" w:after="60"/><w:outlineLvl w:val="2"/>', '<w:b/><w:sz w:val="22"/>')
    + st('TableText', 'Table Text', '<w:spacing w:before="20" w:after="20" w:line="240" w:lineRule="auto"/>', '<w:sz w:val="18"/><w:szCs w:val="18"/>')
    + st('AfterTable', 'After Table', '<w:spacing w:before="0" w:after="60" w:line="240" w:lineRule="auto"/>', '<w:sz w:val="12"/>')
    + st('ListParagraph', 'List Paragraph', '<w:spacing w:after="60"/><w:ind w:left="360"/><w:contextualSpacing/>', '')
    + st('Code', 'Code', '<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/><w:spacing w:after="120" w:line="240" w:lineRule="auto"/>', '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="17"/><w:szCs w:val="17"/>')
    + st('Note', 'Note', `<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="${colour}"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="${tint(colour, 0.92)}"/><w:ind w:left="180"/>`, '')
    + st('Rule', 'Rule', `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="${tint(colour, 0.6)}"/></w:pBdr>`, '')
    + st('TOCHeading', 'TOC Heading', '<w:spacing w:before="0" w:after="200"/>', `<w:b/><w:color w:val="${colour}"/><w:sz w:val="30"/>`)
    + st('TOC1', 'toc 1', '<w:spacing w:before="80" w:after="40"/>', '<w:b/>')
    + st('TOC2', 'toc 2', '<w:spacing w:after="30"/><w:ind w:left="360"/>', '')
    + st('Header', 'header', `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="4" w:color="${colour}"/></w:pBdr><w:spacing w:after="0"/>`, '<w:color w:val="555555"/><w:sz w:val="17"/>')
    + st('Footer', 'footer', '<w:spacing w:after="0"/>', '<w:color w:val="666666"/><w:sz w:val="16"/>')
    + '<w:style w:type="character" w:styleId="CodeChar"><w:name w:val="Code Char"/><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="19"/><w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/></w:rPr></w:style>'
    + '<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="0563C1"/><w:u w:val="single"/></w:rPr></w:style>'
    + '<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
    + '<w:style w:type="table" w:styleId="BABTable"><w:name w:val="BA Table"/><w:basedOn w:val="TableNormal"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="C9D3D8"/><w:left w:val="single" w:sz="4" w:space="0" w:color="C9D3D8"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="C9D3D8"/><w:right w:val="single" w:sz="4" w:space="0" w:color="C9D3D8"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="C9D3D8"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="C9D3D8"/></w:tblBorders><w:tblCellMar><w:top w:w="40" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>'
    + '</w:styles>';

  const settings = `${XML}<w:settings ${NS}><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`;

  const docRels = `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
    + '<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '<Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
    + '<Relationship Id="rIdSettings" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'
    + '<Relationship Id="rIdHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
    + '<Relationship Id="rIdFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
    + rels.join('') + '</Relationships>';

  const core = `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEsc(title)}</dc:title><dc:subject>${xmlEsc(meta.name || '')}</dc:subject><dc:creator>${xmlEsc(author || 'BA Builder')}</dc:creator><cp:lastModifiedBy>${xmlEsc(author || 'BA Builder')}</cp:lastModifiedBy><cp:version>${xmlEsc(meta.version || '')}</cp:version><dcterms:created xsi:type="dcterms:W3CDTF">${date.slice(0, 19)}Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${date.slice(0, 19)}Z</dcterms:modified></cp:coreProperties>`;

  const types = `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>`
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
    + '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
    + '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
    + '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
    + '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>';

  const files = {
    '[Content_Types].xml': types,
    '_rels/.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
    'docProps/core.xml': core,
    'word/document.xml': document,
    'word/styles.xml': styles,
    'word/numbering.xml': numbering,
    'word/settings.xml': settings,
    'word/header1.xml': header,
    'word/footer1.xml': footer,
    'word/_rels/document.xml.rels': docRels,
    ...(headerRels.length ? { 'word/_rels/header1.xml.rels': `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${headerRels.join('')}</Relationships>` } : {}),
    ...media,
  };
  return { files, stats: { sections: sections.length, landscape: sections.filter((s) => s.orient === 'landscape').length, images: imgN, toc: toc.length, cover: front.length > 0 } };
}

/** Light XML well-formedness check (balanced tags), used by the tests. Returns '' or the first problem. */
export function xmlProblem(xml) {
  const stack = [];
  const re = /<(\/?)([A-Za-z_][\w:.-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>|<\?[^>]*\?>|<!\[CDATA\[[\s\S]*?\]\]>/g;
  let m, last = 0;
  while ((m = re.exec(xml))) {
    const between = xml.slice(last, m.index);
    if (/[<>]/.test(between)) return `stray angle bracket near: ${between.slice(0, 60)}`;
    if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(between)) return `bad entity near: ${between.slice(0, 60)}`;
    last = re.lastIndex;
    if (!m[2]) continue;
    if (m[4]) continue;
    if (m[1]) { const open = stack.pop(); if (open !== m[2]) return `</${m[2]}> closes <${open}>`; } else stack.push(m[2]);
  }
  if (/[<>]/.test(xml.slice(last))) return 'stray angle bracket at the end';
  return stack.length ? `unclosed <${stack[stack.length - 1]}>` : '';
}
