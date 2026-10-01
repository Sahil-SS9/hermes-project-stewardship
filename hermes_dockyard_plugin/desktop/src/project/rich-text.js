// Stage 2 rich text for planning-canvas cards (owner 30/09; own editor,
// replacing TipTap so the bundle passes the host's plugin admission lint).
//
// Same toolbar, look and stored format as the TipTap version: the document is
// TipTap-shaped JSON (`{type: 'doc', content: [...]}`) and the server
// re-checks it against the same allow-list. The editor is the browser's own
// contenteditable; formatting uses its built-in editing commands. After every
// edit the DOM is read back through `domToDoc`, which keeps only what the
// server allows (headings 1-3, bold, italic, underline, strike, three named
// sizes, bullet and numbered lists, alignment, line breaks) and clamps list
// numbers and nesting to the server's limits. Size limits (characters, nodes,
// bytes) are measured on every edit and shown in the editor; the card cannot
// be applied while over them. Undo/redo use the editor's own history of
// documents, as TipTap did, because the browser's native undo stack does not
// see the DOM clean-up done after each edit. Documents are drawn with createElement and
// text nodes only: no innerHTML, no links, images, scripts or inline styles
// other than text alignment.
import { useEffect, useRef, useState, jsx, jsxs } from '../runtime/react.js'
import { Icon } from '../lib/ui.js'

export const RICH_TEXT_SIZES = Object.freeze(['small', 'large', 'huge'])
const ALIGNS = ['left', 'center', 'right', 'justify']
const LIST_TYPES = ['1', 'a', 'A', 'i', 'I']
// Server: MAX_RT_DEPTH = 12, and each list level costs two (list + item), so
// five list levels is the deepest a document can nest and still save.
export const MAX_LIST_LEVELS = 5
const MARK_ORDER = ['bold', 'italic', 'underline', 'strike', 'fontSize']
// Mirrors canvas_service: description <= 20,000 characters (code points),
// <= 3,000 rich text nodes, and the whole card <= 64 KB measured the way the
// server measures it (see serverJsonBytes).
export const RICH_TEXT_LIMITS = Object.freeze({ chars: 20000, nodes: 3000, bytes: 64 * 1024 })
const ZWSP = /\u200B/g

// Plain text in, a simple doc out: old cards only have a plain description.
export const plainToDoc = (text) => ({
  type: 'doc',
  content: String(text ?? '').split('\n').map((line) => (line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' })),
})

// ---- DOM -> allow-listed doc -------------------------------------------

const alignOf = (el) => {
  const raw = String(el.style?.textAlign || el.getAttribute?.('align') || '').toLowerCase()
  const value = raw === 'start' ? 'left' : raw === 'end' ? 'right' : raw
  return ALIGNS.includes(value) && value !== 'left' ? value : null
}

const marksFor = (el, marks) => {
  const tag = el.tagName
  const next = { ...marks }
  if (tag === 'B' || tag === 'STRONG' || Number(el.style?.fontWeight) >= 600 || el.style?.fontWeight === 'bold') next.bold = true
  if (tag === 'I' || tag === 'EM' || el.style?.fontStyle === 'italic') next.italic = true
  const deco = String(el.style?.textDecorationLine || el.style?.textDecoration || '')
  if (tag === 'U' || deco.includes('underline')) next.underline = true
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL' || deco.includes('line-through')) next.strike = true
  const size = el.getAttribute?.('data-size')
  if (size !== null && size !== undefined) next.fontSize = RICH_TEXT_SIZES.includes(size) ? size : null
  return next
}

const markList = (marks) => MARK_ORDER.filter((m) => marks[m]).map((m) => (m === 'fontSize' ? { type: 'fontSize', attrs: { size: marks.fontSize } } : { type: m }))
const sameMarks = (a = [], b = []) => JSON.stringify(a) === JSON.stringify(b)

const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'PRE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TD', 'TH', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER', 'FIGURE', 'DL', 'DT', 'DD'])
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'SVG', 'VIDEO', 'AUDIO', 'CANVAS', 'HEAD', 'TITLE', 'META', 'LINK', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'])

function pushText(inline, text, marks) {
  const clean = text.replace(ZWSP, '').replace(/[\r\n\t\u00A0]+/g, ' ')
  if (!clean) return
  const m = markList(marks)
  const last = inline[inline.length - 1]
  if (last && last.type === 'text' && sameMarks(last.marks, m.length ? m : undefined)) { last.text += clean; return }
  inline.push(m.length ? { type: 'text', text: clean, marks: m } : { type: 'text', text: clean })
}

// Walk children; inline runs become paragraphs (or the given block), block
// children become their own blocks. `ctx.level` is the current list level.
function readBlocks(parent, ctx, makeBlock = () => ({ type: 'paragraph' })) {
  const blocks = []
  let inline = []
  const flush = () => {
    const trimmed = inline
    // A trailing <br> is the browser's placeholder for an empty or
    // line-ending block, not content.
    if (trimmed.length && trimmed[trimmed.length - 1].type === 'hardBreak') trimmed.pop()
    const hasText = trimmed.some((n) => n.type === 'text' && n.text.trim())
    // Whitespace between blocks (pasted HTML) is not a paragraph.
    if (hasText || trimmed.some((n) => n.type === 'hardBreak')) {
      const block = makeBlock()
      block.content = trimmed
      blocks.push(block)
    }
    inline = []
  }
  const readInline = (node, marks) => {
    if (node.nodeType === 3) { pushText(inline, node.nodeValue || '', marks); return }
    if (node.nodeType !== 1 || SKIP_TAGS.has(node.tagName)) return
    if (node.tagName === 'BR') { inline.push({ type: 'hardBreak' }); return }
    if (BLOCK_TAGS.has(node.tagName)) { flush(); blocks.push(...readBlock(node, ctx)); return }
    const next = marksFor(node, marks)
    for (const child of node.childNodes) readInline(child, next)
  }
  for (const child of parent.childNodes) readInline(child, ctx.marks || {})
  flush()
  return blocks
}

function readList(el, ctx) {
  const level = ctx.level + 1
  const items = []
  for (const child of el.childNodes) {
    if (child.nodeType === 1 && child.tagName === 'LI') {
      const kids = readBlocks(child, { ...ctx, level })
      const content = kids.length ? kids : [{ type: 'paragraph' }]
      if (content[0].type !== 'paragraph' && content[0].type !== 'heading') content.unshift({ type: 'paragraph' })
      items.push({ type: 'listItem', content: content.map((b) => (b.type === 'heading' ? { ...b, type: 'paragraph', attrs: b.attrs?.textAlign ? { textAlign: b.attrs.textAlign } : undefined } : b)).map(stripUndefined) })
    } else if (child.nodeType === 1 && (child.tagName === 'UL' || child.tagName === 'OL')) {
      // A list directly inside a list (Chromium's indent) nests under the
      // previous item, or becomes an item of its own when there is none.
      const nested = readList(child, { ...ctx, level })
      if (!nested.length) continue
      if (items.length && level < MAX_LIST_LEVELS) items[items.length - 1].content.push(...nested)
      else items.push(...nested.flatMap((list) => list.content || []))
    } else {
      const loose = readBlocks({ childNodes: [child] }, { ...ctx, level })
      for (const b of loose) {
        if (b.type === 'bulletList' || b.type === 'orderedList') { if (items.length) items[items.length - 1].content.push(b); else items.push(...(b.content || [])) } else items.push({ type: 'listItem', content: [b] })
      }
    }
  }
  if (!items.length) return []
  // Over-deep children (marked __lift by the level below) become siblings
  // here. Done before this level's own check so lifting cascades upwards.
  const lifted = []
  for (const item of items) {
    const keep = []
    const extra = []
    for (const b of item.content) { if (b.type === '__lift') extra.push(...b.content); else keep.push(b) }
    lifted.push({ ...item, content: keep.length ? keep : [{ type: 'paragraph' }] }, ...extra)
  }
  if (level > MAX_LIST_LEVELS) {
    // Too deep for the server: hand these items up to the parent level.
    return [{ type: '__lift', content: lifted }]
  }
  const list = { type: el.tagName === 'OL' ? 'orderedList' : 'bulletList', content: lifted }
  if (el.tagName === 'OL') {
    const attrs = {}
    const start = Number.parseInt(el.getAttribute('start') ?? '1', 10)
    if (Number.isFinite(start) && start !== 1) attrs.start = Math.min(9999, Math.max(1, start))
    if (attrs.start === 1) delete attrs.start
    const kind = el.getAttribute('type')
    if (kind && LIST_TYPES.includes(kind) && kind !== '1') attrs.type = kind
    if (Object.keys(attrs).length) list.attrs = attrs
  }
  return [list]
}

const stripUndefined = (node) => { if (node.attrs === undefined) delete node.attrs; return node }

function readBlock(el, ctx) {
  const tag = el.tagName
  if (tag === 'UL' || tag === 'OL') return readList(el, ctx).map((b) => (b.type === '__lift' && ctx.level === 0 ? { type: el.tagName === 'OL' ? 'orderedList' : 'bulletList', content: b.content } : b))
  const align = alignOf(el)
  if (tag === 'H1' || tag === 'H2' || tag === 'H3') {
    const level = Number(tag[1])
    const inner = readBlocks(el, ctx, () => ({ type: 'heading', attrs: align ? { level, textAlign: align } : { level } }))
    if (!inner.length) return [{ type: 'heading', attrs: align ? { level, textAlign: align } : { level } }]
    return inner
  }
  const inner = readBlocks(el, ctx, () => (align ? { type: 'paragraph', attrs: { textAlign: align } } : { type: 'paragraph' }))
  if (!inner.length && (tag === 'P' || tag === 'DIV')) return [align ? { type: 'paragraph', attrs: { textAlign: align } } : { type: 'paragraph' }]
  return inner
}

const tidy = (node) => {
  if (node.content) {
    node.content = node.content.map(tidy)
    if (!node.content.length) delete node.content
  }
  if (node.attrs && !Object.keys(node.attrs).length) delete node.attrs
  return node
}

// Read an editor (or pasted) DOM subtree into an allow-listed doc.
const hasText = (node) => (node.type === 'text' ? Boolean(node.text.trim()) : (node.content || []).some(hasText))
// Lists whose items are all empty (left behind by select-all + Delete) are
// not content (Quan re-check 2, L3).
const dropEmptyLists = (nodes) => nodes.filter((n) => !((n.type === 'bulletList' || n.type === 'orderedList') && !hasText(n)))
  .map((n) => (n.content && n.type !== 'paragraph' && n.type !== 'heading' ? { ...n, content: dropEmptyLists(n.content) } : n))

export function domToDoc(root) {
  const blocks = readBlocks(root, { level: 0, marks: {} })
  const content = dropEmptyLists(blocks.flatMap((b) => (b.type === '__lift' ? [{ type: 'bulletList', content: b.content }] : [b])))
  return tidy({ type: 'doc', content: content.length ? content : [{ type: 'paragraph' }] })
}

// Plain text for previews and AI: mirrors the server's _rich_text_plain.
export function docToPlain(doc) {
  const lines = []
  const inline = (node) => (node.content || []).map((k) => (k.type === 'text' ? k.text : '\n')).join('')
  const block = (node, prefix = '', indent = 0) => {
    if (node.type === 'paragraph' || node.type === 'heading') lines.push('  '.repeat(indent) + prefix + inline(node))
    else if (node.type === 'bulletList' || node.type === 'orderedList') {
      const start = node.attrs?.start ?? 1
      ;(node.content || []).forEach((item, i) => {
        const marker = node.type === 'bulletList' ? '- ' : `${start + i}. `
        ;(item.content || []).forEach((child, j) => {
          if (child.type === 'bulletList' || child.type === 'orderedList') block(child, '', indent + 1)
          else block(child, j === 0 ? marker : '', indent)
        })
      })
    }
  }
  for (const node of doc?.content || []) block(node)
  return lines.join('\n').trim()
}

// Size check against the server's limits; returns null or a message.
// UTF-8 size of `value` as Python's json.dumps(value, ensure_ascii=False)
// writes it (", " and ": " separators), which is what the server counts.
export function serverJsonBytes(value) {
  const enc = new TextEncoder()
  const size = (v) => {
    if (Array.isArray(v)) return 2 + v.reduce((n, x) => n + size(x), 0) + Math.max(0, v.length - 1) * 2
    if (v && typeof v === 'object') {
      const keys = Object.keys(v).filter((k) => v[k] !== undefined && v[k] !== null && v[k] !== '')
      return 2 + keys.reduce((n, k) => n + enc.encode(JSON.stringify(k)).length + 2 + size(v[k]), 0) + Math.max(0, keys.length - 1) * 2
    }
    return enc.encode(JSON.stringify(v ?? null)).length
  }
  return size(value)
}

// Size check against the server's limits; returns null or a message.
// `rest` is the card's other content, which shares the 64 KB card limit.
export function docProblem(doc, rest = {}) {
  let nodes = 0
  const count = (node) => { for (const child of node.content || []) { nodes += 1; count(child) } }
  count(doc)
  const chars = [...docToPlain(doc)].length
  const counted = { ...rest, description_doc: doc }
  delete counted.description
  const bytes = serverJsonBytes(counted)
  if (chars > RICH_TEXT_LIMITS.chars) return `Too long: ${chars.toLocaleString('en-GB')} of ${RICH_TEXT_LIMITS.chars.toLocaleString('en-GB')} characters. Shorten it before applying.`
  if (nodes > RICH_TEXT_LIMITS.nodes) return `Too much formatting: ${nodes.toLocaleString('en-GB')} of ${RICH_TEXT_LIMITS.nodes.toLocaleString('en-GB')} pieces. Remove some paragraphs or formatting before applying.`
  if (bytes > RICH_TEXT_LIMITS.bytes) return 'This card is too large to save. Remove some text or formatting before applying.'
  return null
}

// ---- doc -> DOM (no innerHTML) --------------------------------------------

function renderInline(parent, nodes) {
  for (const node of nodes || []) {
    if (node.type === 'hardBreak') { parent.appendChild(document.createElement('br')); continue }
    if (node.type !== 'text' || typeof node.text !== 'string') continue
    let el = document.createTextNode(node.text)
    for (const mark of [...(node.marks || [])].reverse()) {
      const tag = { bold: 'strong', italic: 'em', underline: 'u', strike: 's' }[mark.type]
      let wrap = null
      if (tag) wrap = document.createElement(tag)
      else if (mark.type === 'fontSize' && RICH_TEXT_SIZES.includes(mark.attrs?.size)) {
        wrap = document.createElement('span')
        wrap.setAttribute('data-size', mark.attrs.size)
        wrap.className = `dy-rt-${mark.attrs.size}`
      }
      if (wrap) { wrap.appendChild(el); el = wrap }
    }
    parent.appendChild(el)
  }
}

function renderBlock(node) {
  let el
  if (node.type === 'heading') el = document.createElement(`h${[1, 2, 3].includes(node.attrs?.level) ? node.attrs.level : 2}`)
  else if (node.type === 'bulletList' || node.type === 'orderedList') {
    el = document.createElement(node.type === 'bulletList' ? 'ul' : 'ol')
    if (node.type === 'orderedList' && Number.isInteger(node.attrs?.start)) el.setAttribute('start', String(node.attrs.start))
    if (node.type === 'orderedList' && LIST_TYPES.includes(node.attrs?.type)) el.setAttribute('type', node.attrs.type)
    for (const item of node.content || []) {
      const li = document.createElement('li')
      for (const child of item.content || []) li.appendChild(renderBlock(child))
      el.appendChild(li)
    }
    return el
  } else el = document.createElement('p')
  if (ALIGNS.includes(node.attrs?.textAlign) && node.attrs.textAlign !== 'left') el.style.textAlign = node.attrs.textAlign
  renderInline(el, node.content)
  if (!el.childNodes.length) el.appendChild(document.createElement('br'))
  return el
}

export function renderDoc(target, doc) {
  while (target.firstChild) target.removeChild(target.firstChild)
  const blocks = doc && doc.type === 'doc' && Array.isArray(doc.content) && doc.content.length ? doc.content : [{ type: 'paragraph' }]
  for (const node of blocks) target.appendChild(renderBlock(node))
}

// ---- editor -------------------------------------------------------------

const closestIn = (host, node, test) => {
  let el = node && node.nodeType === 3 ? node.parentElement : node
  while (el && el !== host) { if (test(el)) return el; el = el.parentElement }
  return null
}
const blockOf = (host, node) => closestIn(host, node, (el) => /^(P|DIV|H[1-6]|LI)$/.test(el.tagName))
const listDepth = (host, node) => { let n = 0; let el = node && node.nodeType === 3 ? node.parentElement : node; while (el && el !== host) { if (el.tagName === 'UL' || el.tagName === 'OL') n += 1; el = el.parentElement } return n }

const exec = (command, value) => document.execCommand(command, false, value)

// Keep the live editor DOM in the same shape the saved document renders to
// (and the TipTap editor produced): <strong>/<em>/<s> tags, top-level lists,
// no blocks nested inside paragraphs or headings. Nodes are moved, never
// re-created, so the caret stays where it was.
const RENAME = { B: 'strong', I: 'em', STRIKE: 's', DEL: 's' }
const INNER_BLOCKS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'UL', 'OL'])
function normaliseDom(host, { afterDelete = false } = {}) {
  const sel = window.getSelection()
  const keep = sel.rangeCount && host.contains(sel.anchorNode)
    ? [sel.anchorNode, sel.anchorOffset, sel.focusNode, sel.focusOffset] : null
  const swap = (el, tag) => {
    const next = document.createElement(tag)
    for (const attr of el.attributes) if (attr.name === 'style' || attr.name === 'data-size' || attr.name === 'class' || attr.name === 'start' || attr.name === 'type') next.setAttribute(attr.name, attr.value)
    while (el.firstChild) next.appendChild(el.firstChild)
    el.replaceWith(next)
    return next
  }
  let changed = false
  const unwrap = (el) => { el.replaceWith(...el.childNodes); changed = true }
  // Drop the size picker's zero-width placeholder once real text is typed
  // next to it, keeping the caret at the same visible spot.
  const walker = document.createTreeWalker(host, 4)
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    const value = text.nodeValue || ''
    if (!value.includes('\u200B') || value.replace(ZWSP, '') === '') continue
    if (keep) {
      for (const i of [0, 2]) {
        if (keep[i] === text) keep[i + 1] -= (value.slice(0, keep[i + 1]).match(ZWSP) || []).length
      }
    }
    text.nodeValue = value.replace(ZWSP, '')
    changed = true
  }
  for (const el of [...host.querySelectorAll('b, i, strike, del')]) { swap(el, RENAME[el.tagName]); changed = true }
  for (const el of [...host.children]) if (el.tagName === 'DIV') { swap(el, 'p'); changed = true }
  // Chromium copies computed colours/sizes into <font>/<span style> when it
  // converts blocks (e.g. into a list). Those are not formatting we keep.
  for (const el of [...host.querySelectorAll('font, span:not([data-size])')]) unwrap(el)
  for (const el of [...host.querySelectorAll('strong, em, u, s, [data-size]')]) {
    if (el.style && el.style.length) { el.removeAttribute('style'); changed = true }
  }
  for (const el of [...host.querySelectorAll('ul, ol')]) if (!el.querySelector('li')) { el.remove(); changed = true }
  // Select-all + Delete can leave empty bullets behind; an editor with no
  // text whose only leftovers are lists goes back to one empty paragraph
  // (L3). An empty heading chosen from the style menu is kept.
  // Only after a deletion: a list just made from the toolbar on an empty
  // editor is also empty and must stay (Quan re-check 3, H1).
  if (afterDelete && !host.textContent.replace(ZWSP, '').trim() && host.querySelector('ul, ol')) {
    while (host.firstChild) host.removeChild(host.firstChild)
    const p = document.createElement('p')
    p.appendChild(document.createElement('br'))
    host.appendChild(p)
    if (keep) { keep[0] = p; keep[1] = 0; keep[2] = p; keep[3] = 0 }
    changed = true
  }
  // Alignment is not kept inside lists (Quan re-check 2, L2).
  for (const el of [...host.querySelectorAll('li[style], li > p[style], li > h1[style], li > h2[style], li > h3[style]')]) {
    if (el.style.textAlign) { el.style.removeProperty('text-align'); if (!el.getAttribute('style')) el.removeAttribute('style'); changed = true }
  }
  // Lift blocks out of paragraphs/headings, splitting the parent around them.
  for (let guard = 0; guard < 200; guard += 1) {
    const outer = [...host.querySelectorAll('p, h1, h2, h3')].find((el) => [...el.children].some((c) => INNER_BLOCKS.has(c.tagName)))
    if (!outer) break
    let anchor = outer
    let run = null
    for (const child of [...outer.childNodes]) {
      const isBlock = child.nodeType === 1 && INNER_BLOCKS.has(child.tagName)
      if (!isBlock && child === outer.firstChild) continue
      if (isBlock) {
        anchor.after(child)
        anchor = child
        run = null
      } else if (anchor !== outer) {
        if (!run) { run = outer.cloneNode(false); anchor.after(run); anchor = run }
        run.appendChild(child)
      }
    }
    if (!outer.childNodes.length) outer.remove()
    changed = true
  }
  // Only touch the selection when the DOM moved: re-setting it also drops
  // the browser's pending caret formatting (Bold pressed on an empty line).
  if (changed && keep && keep[0].isConnected && keep[2].isConnected) {
    try { sel.setBaseAndExtent(keep[0], keep[1], keep[2], keep[3]) } catch { /* caret node gone */ }
  }
}

const TOOLS = [
  ['bold', 'Bold (Ctrl+B)', 'B', () => exec('bold'), (s) => s.bold],
  ['italic', 'Italic (Ctrl+I)', 'I', () => exec('italic'), (s) => s.italic],
  ['underline', 'Underline (Ctrl+U)', 'U', () => exec('underline'), (s) => s.underline],
  ['strike', 'Strikethrough', 'S', () => exec('strikeThrough'), (s) => s.strike],
  null,
  ['bullets', 'Bullet list', { icon: 'list' }, () => exec('insertUnorderedList'), (s) => s.list === 'UL'],
  ['numbers', 'Numbered list', { icon: 'list-ordered' }, () => exec('insertOrderedList'), (s) => s.list === 'OL'],
  null,
  ['left', 'Align left', { icon: 'align-left' }, () => exec('justifyLeft'), (s) => s.align === 'left'],
  ['center', 'Align centre', { icon: 'align-center' }, () => exec('justifyCenter'), (s) => s.align === 'center'],
  ['right', 'Align right', { icon: 'align-right' }, () => exec('justifyRight'), (s) => s.align === 'right'],
  ['justify', 'Justify', { icon: 'align-justify' }, () => exec('justifyFull'), (s) => s.align === 'justify'],
]

// ---- caret as a number (survives re-rendering from a doc) ----------------
const POS_BLOCKS = new Set(['P', 'H1', 'H2', 'H3', 'LI'])
function measure(host, target, targetOffset) {
  let n = 0
  const go = (el) => {
    if (el.nodeType === 3) {
      if (el === target) return n + Math.min(targetOffset, el.nodeValue.length)
      n += el.nodeValue.length
      return null
    }
    if (el.nodeType !== 1) return null
    if (el !== host && POS_BLOCKS.has(el.tagName) && !(el.tagName === 'P' && el.parentElement?.tagName === 'LI')) n += 1
    if (el.tagName === 'BR') n += 1
    const kids = el.childNodes
    for (let i = 0; i < kids.length; i += 1) {
      if (el === target && i === targetOffset) return n
      const found = go(kids[i])
      if (found !== null) return found
    }
    return el === target ? n : null
  }
  const found = go(host)
  return found === null ? n : found
}
function locate(host, pos) {
  let n = 0
  let last = [host, 0]
  const go = (el) => {
    if (el.nodeType === 3) {
      const len = el.nodeValue.length
      if (pos <= n + len) return [el, pos - n]
      n += len
      last = [el, len]
      return null
    }
    if (el.nodeType !== 1) return null
    if (el !== host && POS_BLOCKS.has(el.tagName) && !(el.tagName === 'P' && el.parentElement?.tagName === 'LI')) { n += 1; if (n >= pos && !el.querySelector('li')) return [el, 0] }
    if (el.tagName === 'BR') { n += 1; if (n >= pos) return [el.parentNode, [...el.parentNode.childNodes].indexOf(el) + 1] }
    for (const child of el.childNodes) { const found = go(child); if (found) return found }
    return null
  }
  return go(host) || last
}

const MARK_TAGS = new Set(['STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'DEL'])
const isMark = (el) => MARK_TAGS.has(el.tagName) || el.hasAttribute?.('data-size')

// Split the text nodes at the selection edges and return the text nodes in
// between (never re-created, so they can be reselected afterwards).
function selectedTexts(host) {
  const sel = window.getSelection()
  if (!sel.rangeCount) return []
  const range = sel.getRangeAt(0)
  if (range.collapsed || !host.contains(range.commonAncestorContainer)) return []
  const { endContainer: ec, endOffset: eo } = range
  if (ec.nodeType === 3 && eo > 0 && eo < ec.nodeValue.length) ec.splitText(eo)
  const { startContainer: sc, startOffset: so } = range
  let first = null
  if (sc.nodeType === 3 && so > 0 && so < sc.nodeValue.length) first = sc.splitText(so)
  const out = []
  const walker = document.createTreeWalker(host, 4)
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (!text.nodeValue || !range.intersectsNode(text)) continue
    if (text === sc && !first && so >= text.nodeValue.length) continue
    if (text === ec && eo === 0 && text !== first) continue
    if (first && text === sc) continue
    out.push(text)
  }
  return out
}
const reselect = (texts) => {
  if (!texts.length) return
  const last = texts[texts.length - 1]
  window.getSelection().setBaseAndExtent(texts[0], 0, last, last.nodeValue.length)
}

// Split `outer` so that it wraps only the path down to `node`; the parts
// before and after become copies of `outer` beside it.
function splitAround(outer, node) {
  const before = document.createRange()
  before.setStart(outer, 0)
  before.setEndBefore(node)
  const head = outer.cloneNode(false)
  head.appendChild(before.extractContents())
  const after = document.createRange()
  after.setStartAfter(node)
  after.setEnd(outer, outer.childNodes.length)
  const tail = outer.cloneNode(false)
  tail.appendChild(after.extractContents())
  if (head.textContent) outer.before(head)
  if (tail.textContent) outer.after(tail)
}
// Move `node` out of every ancestor matching `test` (up to its block).
function liftOut(host, node, test) {
  for (let guard = 0; guard < 20; guard += 1) {
    const outer = closestIn(host, node, test)
    if (!outer || POS_BLOCKS.has(outer.tagName)) return
    splitAround(outer, node)
    outer.replaceWith(...outer.childNodes)
  }
}
const sizeSpan = (size) => {
  const span = document.createElement('span')
  span.setAttribute('data-size', size)
  span.className = `dy-rt-${size}`
  return span
}
const blocksIn = (host) => {
  const sel = window.getSelection()
  if (!sel.rangeCount) return []
  const range = sel.getRangeAt(0)
  const caretBlock = blockOf(host, range.startContainer)
  // A triple-click ends the range at offset 0 of the next block; that block
  // is not selected (Quan re-check 2, L1).
  const endBlock = blockOf(host, range.endContainer)
  let skip = null
  if (endBlock && endBlock !== caretBlock) {
    const head = document.createRange()
    head.setStart(endBlock, 0)
    head.setEnd(range.endContainer, range.endOffset)
    if (head.toString() === '') skip = endBlock
  }
  const all = [...host.querySelectorAll('p, h1, h2, h3, li')].filter((el) => el !== skip && range.intersectsNode(el) && !(skip && skip.contains(el)))
  return all.length ? all : (caretBlock ? [caretBlock] : [])
}

// Paragraph/heading style. Headings cannot live in a list (the server only
// allows paragraphs in list items), so a list item first leaves its list
// (Quan re-check L2).
function setBlockStyle(host, style) {
  const sel = window.getSelection()
  if (style !== 'p' && sel.rangeCount) {
    for (let guard = 0; guard < MAX_LIST_LEVELS + 1; guard += 1) {
      if (!closestIn(host, sel.anchorNode, (el) => el.tagName === 'LI')) break
      exec('outdent')
    }
  }
  exec('formatBlock', style)
}

// Clear formatting (Quan re-check M3): remove every mark from the selected
// text, turn selected headings into paragraphs and drop their alignment.
// Block boundaries and lists (with their numbering) are kept.
function clearFormatting(host) {
  const texts = selectedTexts(host)
  const blocks = blocksIn(host)
  for (const text of texts) liftOut(host, text, isMark)
  for (const block of blocks) {
    block.style.removeProperty('text-align')
    if (!block.getAttribute('style')) block.removeAttribute('style')
    block.removeAttribute('align')
    if (/^H[1-3]$/.test(block.tagName)) {
      const p = document.createElement('p')
      p.append(...block.childNodes)
      block.replaceWith(p)
    }
  }
  reselect(texts)
}

// Formatting state at the caret, read from the DOM around the selection.
function stateAt(host) {
  const empty = { style: 'p', size: 'normal', align: 'left', list: null, bold: false, italic: false, underline: false, strike: false }
  const sel = typeof window !== 'undefined' ? window.getSelection() : null
  if (!host || !sel || !sel.rangeCount || !host.contains(sel.anchorNode)) return empty
  const node = sel.anchorNode
  const heading = closestIn(host, node, (el) => /^H[1-3]$/.test(el.tagName))
  const sized = closestIn(host, node, (el) => el.hasAttribute('data-size'))
  const list = closestIn(host, node, (el) => el.tagName === 'UL' || el.tagName === 'OL')
  const block = blockOf(host, node)
  const align = (!list && block && alignOf(block)) || 'left'
  const q = (c) => { try { return document.queryCommandState(c) } catch { return false } }
  const has = (tags) => Boolean(closestIn(host, node, (el) => tags.includes(el.tagName)))
  // Bold inside a heading comes from the heading's weight, not a mark (L4):
  // only a real <strong> (or a pending caret toggle outside headings) counts.
  return {
    style: heading ? heading.tagName.toLowerCase() : 'p',
    size: sized && RICH_TEXT_SIZES.includes(sized.getAttribute('data-size')) ? sized.getAttribute('data-size') : 'normal',
    align, list: list ? list.tagName : null,
    anyList: Boolean(list) || blocksIn(host).some((b) => closestIn(host, b, (el) => el.tagName === 'UL' || el.tagName === 'OL')),
    bold: has(['STRONG', 'B']) || (!heading && q('bold')), italic: has(['EM', 'I']) || q('italic'),
    underline: has(['U']) || q('underline'), strike: has(['S', 'STRIKE', 'DEL']) || q('strikeThrough'),
  }
}

// Apply a named size to the selection. A collapsed caret gets an empty
// sized span (holding a zero-width space) to type into, or steps out of the
// current size span for "normal".
function applySize(host, size) {
  const sel = window.getSelection()
  if (!sel.rangeCount) return
  const range = sel.getRangeAt(0)
  if (range.collapsed) {
    const current = closestIn(host, range.startContainer, (el) => el.hasAttribute('data-size'))
    const marker = document.createTextNode('\u200B')
    if (size === 'normal') {
      if (!current) return
      current.parentNode.insertBefore(marker, current.nextSibling)
    } else {
      const span = sizeSpan(size)
      span.appendChild(marker)
      if (current) current.parentNode.insertBefore(span, current.nextSibling)
      else range.insertNode(span)
    }
    const caret = document.createRange()
    caret.setStart(marker, 1)
    caret.collapse(true)
    sel.removeAllRanges()
    sel.addRange(caret)
    return
  }
  // A selection (Quan re-check H2): take each selected text node out of any
  // size span, then wrap it in the new size (none for "normal").
  const texts = selectedTexts(host)
  for (const text of texts) {
    liftOut(host, text, (el) => el.hasAttribute('data-size'))
    if (size !== 'normal') { const span = sizeSpan(size); text.before(span); span.appendChild(text) }
  }
  reselect(texts)
}

// Word-style editor: a formatting bar over the text. `value` is a TipTap-
// shaped doc (or null); `onChange(doc, plainText)` fires on every edit.
export function RichTextEditor({ value, fallbackText, onChange, onProblem, rest, readOnly, label = 'Description' }) {
  const host = useRef(null)
  const saved = useRef(null)
  const changeRef = useRef(onChange)
  const problemRef = useRef(onProblem)
  const restRef = useRef(rest)
  restRef.current = rest
  // Own undo history: [{ doc, caret: [anchor, focus], typing, at }], index.
  const history = useRef({ stack: [], index: -1 })
  const dragging = useRef(false)
  const [state, setState] = useState(stateAt(null))
  const [problem, setProblem] = useState(null)
  const restSize = serverJsonBytes(rest ?? {})
  changeRef.current = onChange
  problemRef.current = onProblem

  const refresh = () => {
    const el = host.current
    const sel = window.getSelection()
    if (el && sel.rangeCount && el.contains(sel.anchorNode)) saved.current = sel.getRangeAt(0).cloneRange()
    setState(stateAt(el))
  }
  const caretNow = () => {
    const el = host.current
    const sel = window.getSelection()
    if (!el || !sel.rangeCount || !el.contains(sel.anchorNode)) return [0, 0]
    return [measure(el, sel.anchorNode, sel.anchorOffset), measure(el, sel.focusNode, sel.focusOffset)]
  }
  const report = (doc) => {
    const found = docProblem(doc, restRef.current || {})
    setProblem(found)
    problemRef.current?.(found)
  }
  const record = (doc, typing) => {
    const h = history.current
    const json = JSON.stringify(doc)
    const top = h.stack[h.index]
    if (top && top.json === json) { top.caret = caretNow(); return }
    const entry = { doc, json, caret: caretNow(), typing, at: Date.now() }
    // Consecutive typing within a second is one undo step, as in Word.
    // Never merge into a state that has a redo tail after it: that tail is
    // stale once new text is typed (Quan re-check 2, H1).
    if (typing && top && top.typing === typing && entry.at - top.at < 1000 && h.index > 0 && h.index === h.stack.length - 1) h.stack[h.index] = entry
    else { h.stack = [...h.stack.slice(0, h.index + 1), entry].slice(-200); h.index = h.stack.length - 1 }
  }
  const emit = (typing = false) => {
    const el = host.current
    if (!el) return
    normaliseDom(el, { afterDelete: typing === 'delete' })
    const doc = domToDoc(el)
    record(doc, typing)
    changeRef.current?.(doc, docToPlain(doc))
    report(doc)
    refresh()
  }
  const travel = (step) => {
    const el = host.current
    const h = history.current
    const next = h.index + step
    if (!el || readOnly || next < 0 || next >= h.stack.length) return
    // Undo puts the caret where the undone edit was; redo where it ended.
    const caret = (step < 0 ? h.stack[h.index] : h.stack[next]).caret
    h.index = next
    const { doc } = h.stack[next]
    renderDoc(el, doc)
    el.focus()
    const [a, ao] = locate(el, caret[0])
    const [f, fo] = locate(el, caret[1])
    try { window.getSelection().setBaseAndExtent(a, ao, f, fo) } catch { /* caret outside */ }
    changeRef.current?.(doc, docToPlain(doc))
    report(doc)
    refresh()
  }

  useEffect(() => {
    const el = host.current
    renderDoc(el, value && value.type === 'doc' ? value : plainToDoc(fallbackText))
    try { exec('defaultParagraphSeparator', 'p'); exec('styleWithCSS', false) } catch { /* older engines */ }
    const first = domToDoc(el)
    history.current = { stack: [{ doc: first, json: JSON.stringify(first), caret: [0, 0], typing: false, at: 0 }], index: 0 }
    report(first)
    const onSelection = () => { if (document.activeElement === el) refresh() }
    // Edit-menu / OS undo arrives as beforeinput: route it to our history.
    const onBeforeInput = (event) => {
      if (event.inputType === 'historyUndo' || event.inputType === 'historyRedo') {
        event.preventDefault()
        travel(event.inputType === 'historyUndo' ? -1 : 1)
      }
    }
    document.addEventListener('selectionchange', onSelection)
    el.addEventListener('beforeinput', onBeforeInput)
    return () => { document.removeEventListener('selectionchange', onSelection); el.removeEventListener('beforeinput', onBeforeInput) }
    // Rendered once per card; the drawer remounts the editor per card.
  }, [])

  // Other card fields share the 64 KB limit: re-check when they change (L3).
  useEffect(() => { if (host.current && history.current.stack.length) report(domToDoc(host.current)) }, [restSize])

  const run = (act) => {
    const el = host.current
    if (!el || readOnly) return
    el.focus()
    if (saved.current) { const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(saved.current) }
    act(el)
    emit()
  }

  const onKeyDown = (event) => {
    if (readOnly) return
    const mod = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    if (mod && !event.altKey && (key === 'z' || key === 'y')) {
      event.preventDefault()
      travel(key === 'y' || event.shiftKey ? 1 : -1)
      return
    }
    if (event.key === 'Tab') {
      const sel = window.getSelection()
      const li = sel.rangeCount ? closestIn(host.current, sel.anchorNode, (n) => n.tagName === 'LI') : null
      if (!li) return
      event.preventDefault()
      if (event.shiftKey) exec('outdent')
      else if (listDepth(host.current, li) < MAX_LIST_LEVELS) exec('indent')
      emit()
    }
  }

  // Paste and drop share one path: the data goes through domToDoc (the
  // allow-list) and renderDoc before it reaches the live editor.
  const insertData = (data, range) => {
    const html = data.getData('text/html')
    if (!html && !data.getData('text/plain')) return // a file or image: nothing to insert (L5)
    // DOMParser builds an inert document: nothing in it runs or loads.
    const doc = html ? domToDoc(new DOMParser().parseFromString(html, 'text/html').body) : plainToDoc(data.getData('text/plain'))
    const scratch = document.createElement('div')
    renderDoc(scratch, doc)
    const sel = window.getSelection()
    range.deleteContents()
    const frag = document.createDocumentFragment()
    // A single pasted paragraph goes inline; several blocks stay blocks.
    if (scratch.childNodes.length === 1 && scratch.firstChild.tagName === 'P') frag.append(...scratch.firstChild.childNodes)
    else frag.append(...scratch.childNodes)
    const last = frag.lastChild
    // Blocks pasted into an empty line replace that line instead of leaving
    // a blank paragraph above them.
    const line = blockOf(host.current, range.startContainer)
    const blocks = frag.firstChild && frag.firstChild.nodeType === 1 && /^(P|H[1-3]|UL|OL)$/.test(frag.firstChild.tagName)
    if (blocks && line && line.parentNode === host.current && !line.textContent.replace(ZWSP, '')) line.replaceWith(frag)
    else range.insertNode(frag)
    if (last) { const caret = document.createRange(); caret.setStartAfter(last); caret.collapse(true); sel.removeAllRanges(); sel.addRange(caret) }
    emit()
  }
  const onPaste = (event) => {
    if (readOnly) return
    const data = event.clipboardData
    if (!data) return
    event.preventDefault()
    const sel = window.getSelection()
    if (!sel.rangeCount || !host.current.contains(sel.anchorNode)) return
    insertData(data, sel.getRangeAt(0))
  }
  // Quan re-check M1: content dragged in from outside is sanitised like a
  // paste. A drag that starts inside the editor (moving its own text) is left
  // to the browser; that text is already clean.
  const onDrop = (event) => {
    if (readOnly) { event.preventDefault(); return }
    if (dragging.current) return
    event.preventDefault()
    const data = event.dataTransfer
    if (!data) return
    const at = document.caretRangeFromPoint ? document.caretRangeFromPoint(event.clientX, event.clientY) : null
    const range = at && host.current.contains(at.startContainer) ? at : (() => { const r = document.createRange(); r.selectNodeContents(host.current); r.collapse(false); return r })()
    host.current.focus()
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(range)
    insertData(data, range)
  }

  const button = (tool) => {
    const [id, title, face, act, active] = tool
    const on = Boolean(active(state))
    return jsx('button', {
      type: 'button', className: `dy-rt-btn${on ? ' on' : ''}`, 'data-rt': id, title: ALIGNS.includes(id) && state.anyList ? `${title} (not available in lists)` : title, 'aria-label': title, 'aria-pressed': on ? 'true' : 'false',
      // Alignment is not stored on list items (Quan re-check L1).
      disabled: readOnly || (ALIGNS.includes(id) && Boolean(state.anyList)),
      onMouseDown: (event) => event.preventDefault(), onClick: () => run(act),
      children: typeof face === 'string' ? jsx('span', { className: `dy-rt-face dy-rt-face-${id}`, children: face }) : jsx(Icon, { name: face.icon }),
    }, id)
  }

  return jsxs('div', { className: 'dy-rt', 'data-canvas-rich-editor': true, children: [
    jsx('span', { className: 'dy-pc-field-label', children: label }),
    readOnly ? null : jsxs('div', { className: 'dy-rt-bar', role: 'toolbar', 'aria-label': 'Text formatting', children: [
      jsxs('select', { className: 'dy-rt-select', 'data-rt': 'style', 'aria-label': 'Text style', value: state.style,
        onChange: (event) => { const v = event.target.value; run((el) => setBlockStyle(el, v)) },
        children: [['p', 'Normal text'], ['h1', 'Heading 1'], ['h2', 'Heading 2'], ['h3', 'Heading 3']].map(([v, t]) => jsx('option', { value: v, children: t }, v)) }),
      jsxs('select', { className: 'dy-rt-select', 'data-rt': 'size', 'aria-label': 'Text size', value: state.size,
        onChange: (event) => { const v = event.target.value; run((el) => applySize(el, v)) },
        children: [['small', 'Small'], ['normal', 'Normal size'], ['large', 'Large'], ['huge', 'Huge']].map(([v, t]) => jsx('option', { value: v, children: t }, v)) }),
      ...TOOLS.map((tool, i) => (tool ? button(tool) : jsx('span', { className: 'dy-rt-sep', 'aria-hidden': 'true' }, `sep-${i}`))),
      jsx('button', { type: 'button', className: 'dy-rt-btn', 'data-rt': 'clear', title: 'Clear formatting', 'aria-label': 'Clear formatting', disabled: readOnly,
        onMouseDown: (event) => event.preventDefault(),
        onClick: () => run((el) => clearFormatting(el)), children: jsx(Icon, { name: 'remove-formatting' }) }),
    ] }),
    problem ? jsx('p', { className: 'dy-rt-problem', role: 'alert', 'data-canvas-rich-problem': true, children: problem }) : null,
    jsx('div', { className: `dy-rt-host${readOnly ? ' readonly' : ''}`, children: jsx('div', {
      ref: host, className: 'dy-rt-body', 'data-canvas-rich-text': 'true', role: 'textbox', 'aria-multiline': 'true', 'aria-label': label,
      contentEditable: readOnly ? 'false' : 'true', suppressContentEditableWarning: true, spellCheck: true,
      onInput: (event) => {
        const kind = String(event.nativeEvent?.inputType || '')
        emit(kind.startsWith('insertText') ? 'insert' : kind.startsWith('delete') ? 'delete' : false)
      },
      onKeyDown, onPaste, onDrop, onDragOver: (event) => { if (!dragging.current) event.preventDefault() },
      onDragStart: () => { dragging.current = true }, onDragEnd: () => { dragging.current = false },
      onKeyUp: refresh, onMouseUp: refresh, onFocus: refresh,
    }) }),
  ] })
}
