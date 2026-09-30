// Stage 2 rich text for planning-canvas cards (owner 30/09, option B: TipTap).
// Uses @tiptap/core directly on a DOM node so the host's React stays the only
// React. Only the formatting the server allows is loaded: headings, bold,
// italic, underline, strike, three named text sizes, bullets, numbering and
// alignment. No links, images, code or raw HTML/CSS can be produced here, and
// the server re-checks every document against the same allow-list.
import { Editor, Mark, mergeAttributes } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Heading from '@tiptap/extension-heading'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import Strike from '@tiptap/extension-strike'
import HardBreak from '@tiptap/extension-hard-break'
import { BulletList, OrderedList, ListItem, ListKeymap } from '@tiptap/extension-list'
import { UndoRedo } from '@tiptap/extensions'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useRef, useState, jsx, jsxs } from '../runtime/react.js'
import { Icon } from '../lib/ui.js'

export const RICH_TEXT_SIZES = Object.freeze(['small', 'large', 'huge'])

const FontSize = Mark.create({
  name: 'fontSize',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (el) => (RICH_TEXT_SIZES.includes(el.getAttribute('data-size')) ? el.getAttribute('data-size') : null),
        renderHTML: (attrs) => (RICH_TEXT_SIZES.includes(attrs.size) ? { 'data-size': attrs.size, class: `dy-rt-${attrs.size}` } : {}),
      },
    }
  },
  parseHTML: () => [{ tag: 'span[data-size]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', mergeAttributes(HTMLAttributes), 0],
})

export const richTextExtensions = () => [
  Document, Paragraph, Text, HardBreak,
  Heading.configure({ levels: [1, 2, 3] }),
  Bold, Italic, Underline, Strike,
  BulletList, OrderedList, ListItem, ListKeymap, UndoRedo,
  TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
  FontSize,
]

// Plain text in, a simple doc out: old cards only have a plain description.
export const plainToDoc = (text) => ({
  type: 'doc',
  content: String(text ?? '').split('\n').map((line) => (line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' })),
})

const TOOLS = [
  ['bold', 'Bold (Ctrl+B)', 'B', (c) => c.toggleBold(), (e) => e.isActive('bold')],
  ['italic', 'Italic (Ctrl+I)', 'I', (c) => c.toggleItalic(), (e) => e.isActive('italic')],
  ['underline', 'Underline (Ctrl+U)', 'U', (c) => c.toggleUnderline(), (e) => e.isActive('underline')],
  ['strike', 'Strikethrough', 'S', (c) => c.toggleStrike(), (e) => e.isActive('strike')],
  null,
  ['bullets', 'Bullet list', { icon: 'list' }, (c) => c.toggleBulletList(), (e) => e.isActive('bulletList')],
  ['numbers', 'Numbered list', { icon: 'list-ordered' }, (c) => c.toggleOrderedList(), (e) => e.isActive('orderedList')],
  null,
  ['left', 'Align left', { icon: 'align-left' }, (c) => c.setTextAlign('left'), (e) => !['center', 'right', 'justify'].some((a) => e.isActive({ textAlign: a }))],
  ['center', 'Align centre', { icon: 'align-center' }, (c) => c.setTextAlign('center'), (e) => e.isActive({ textAlign: 'center' })],
  ['right', 'Align right', { icon: 'align-right' }, (c) => c.setTextAlign('right'), (e) => e.isActive({ textAlign: 'right' })],
  ['justify', 'Justify', { icon: 'align-justify' }, (c) => c.setTextAlign('justify'), (e) => e.isActive({ textAlign: 'justify' })],
]

const styleOf = (editor) => {
  if (!editor) return 'p'
  for (const level of [1, 2, 3]) if (editor.isActive('heading', { level })) return `h${level}`
  return 'p'
}
const sizeOf = (editor) => (editor?.getAttributes('fontSize')?.size) || 'normal'

// Word-style editor: a formatting bar over the text. `value` is a TipTap doc
// (or null); `onChange(doc, plainText)` fires on every edit.
export function RichTextEditor({ value, fallbackText, onChange, readOnly, label = 'Description' }) {
  const host = useRef(null)
  const editorRef = useRef(null)
  const changeRef = useRef(onChange)
  const [, setTick] = useState(0)
  changeRef.current = onChange
  useEffect(() => {
    const editor = new Editor({
      element: host.current,
      extensions: richTextExtensions(),
      content: value && value.type === 'doc' ? value : plainToDoc(fallbackText),
      editable: !readOnly,
      editorProps: { attributes: { 'data-canvas-rich-text': 'true', 'aria-label': label, role: 'textbox', 'aria-multiline': 'true', class: 'dy-rt-body' } },
      onUpdate: ({ editor: e }) => changeRef.current?.(e.getJSON(), e.getText({ blockSeparator: '\n' }).trim()),
      onSelectionUpdate: () => setTick((n) => n + 1),
      onTransaction: () => setTick((n) => n + 1),
    })
    editorRef.current = editor
    return () => { editorRef.current = null; editor.destroy() }
    // The editor is created once per card; the drawer remounts it per card.
  }, [])
  useEffect(() => { editorRef.current?.setEditable(!readOnly) }, [readOnly])
  const editor = editorRef.current
  const run = (fn) => { if (editor && !readOnly) fn(editor.chain().focus()).run() }
  const button = (tool) => {
    const [id, title, face, act, active] = tool
    const on = Boolean(editor && active(editor))
    return jsx('button', {
      type: 'button', className: `dy-rt-btn${on ? ' on' : ''}`, 'data-rt': id, title, 'aria-label': title, 'aria-pressed': on ? 'true' : 'false', disabled: readOnly,
      onMouseDown: (event) => event.preventDefault(), onClick: () => run(act),
      children: typeof face === 'string' ? jsx('span', { className: `dy-rt-face dy-rt-face-${id}`, children: face }) : jsx(Icon, { name: face.icon }),
    }, id)
  }
  return jsxs('div', { className: 'dy-rt', 'data-canvas-rich-editor': true, children: [
    jsx('span', { className: 'dy-pc-field-label', children: label }),
    readOnly ? null : jsxs('div', { className: 'dy-rt-bar', role: 'toolbar', 'aria-label': 'Text formatting', children: [
      jsxs('select', { className: 'dy-rt-select', 'data-rt': 'style', 'aria-label': 'Text style', value: styleOf(editor),
        onChange: (event) => { const v = event.target.value; run((c) => (v === 'p' ? c.setParagraph() : c.setHeading({ level: Number(v.slice(1)) }))) },
        children: [['p', 'Normal text'], ['h1', 'Heading 1'], ['h2', 'Heading 2'], ['h3', 'Heading 3']].map(([v, t]) => jsx('option', { value: v, children: t }, v)) }),
      jsxs('select', { className: 'dy-rt-select', 'data-rt': 'size', 'aria-label': 'Text size', value: sizeOf(editor),
        onChange: (event) => { const v = event.target.value; run((c) => (v === 'normal' ? c.unsetMark('fontSize') : c.setMark('fontSize', { size: v }))) },
        children: [['small', 'Small'], ['normal', 'Normal size'], ['large', 'Large'], ['huge', 'Huge']].map(([v, t]) => jsx('option', { value: v, children: t }, v)) }),
      ...TOOLS.map((tool, i) => (tool ? button(tool) : jsx('span', { className: 'dy-rt-sep', 'aria-hidden': 'true' }, `sep-${i}`))),
      jsx('button', { type: 'button', className: 'dy-rt-btn', 'data-rt': 'clear', title: 'Clear formatting', 'aria-label': 'Clear formatting', disabled: readOnly,
        onMouseDown: (event) => event.preventDefault(), onClick: () => run((c) => c.unsetAllMarks().clearNodes()), children: jsx(Icon, { name: 'remove-formatting' }) }),
    ] }),
    jsx('div', { ref: host, className: `dy-rt-host${readOnly ? ' readonly' : ''}` }),
  ] })
}
