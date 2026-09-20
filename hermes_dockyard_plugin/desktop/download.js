/**
 * Desktop download helpers for report exports.
 *
 * Kept dependency-free and DOM-optional so the jsdom harness and the
 * esbuild browser bundle can both import it. Filenames are sanitised to
 * a safe ASCII subset: report titles may contain Unicode, slashes or
 * reserved characters that do not belong in a downloaded file name.
 */

const MAX_SEGMENT = 60

export function safeFilenameSegment(value, fallback = '') {
  const cleaned = String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]+/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-._]+/, '')
    .replace(/[-._]+$/, '')
  return cleaned.slice(0, MAX_SEGMENT) || fallback
}

export function reportDownloadFilename(projectId, report) {
  const reportId = safeFilenameSegment(report?.report_id, '')
  const title = safeFilenameSegment(report?.title, '')
  const project = safeFilenameSegment(projectId, 'project')
  const parts = [project, title, reportId].filter(Boolean)
  if (parts.length === 0) parts.push('report')
  return `${parts.join('-')}.md`
}

export function downloadTextFile(content, filename, mediaType = 'text/markdown;charset=utf-8') {
  const doc = typeof globalThis !== 'undefined' ? globalThis.document : null
  if (!doc || !doc.body) return false
  const blob = new Blob([String(content ?? '')], { type: mediaType })
  const url = URL.createObjectURL(blob)
  const anchor = doc.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  doc.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  const revoke = () => URL.revokeObjectURL(url)
  if (typeof setTimeout === 'function') setTimeout(revoke, 4000)
  else revoke()
  return true
}
