// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.

// Normalise the two accepted bulk-import paste formats to the CSV contract
// consumed by POST /projects/:id/backlog/import. This is deliberately pure:
// the Backlog view owns all React state and API effects.
export function normaliseBulkImportText(text, mode) {
  let csvText = text
  if (mode === 'json') {
    let rowsJson
    try {
      rowsJson = JSON.parse(text)
      if (!Array.isArray(rowsJson)) throw new Error('JSON must be an array')
      if (rowsJson.some((row) => row?.initiative_ref)) throw new Error('initiative_ref is not supported by bulk import; link the item after import')
      const supported = new Set(['row_key', 'type', 'title', 'parent', 'parent_key', 'labels', 'estimate_days', 'due'])
      const unknown = rowsJson.flatMap((row) => Object.keys(row ?? {}).filter((key) => !supported.has(key)))
      if (unknown.length) throw new Error(`Unsupported import fields: ${[...new Set(unknown)].join(', ')}`)
    } catch (bad) {
      return { error: `Could not read that: ${bad?.message || bad}` }
    }
    const header = 'row_key,type,title,parent_key,labels,estimate_days,due'
    const toCsvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
    csvText = [header].concat(rowsJson.map((row, idx) => [
      toCsvCell(row.row_key ?? `json-${idx + 1}`),
      toCsvCell(row.type ?? 'task'),
      toCsvCell(row.title),
      toCsvCell(row.parent ?? row.parent_key ?? ''),
      toCsvCell(row.labels ?? ''),
      toCsvCell(row.estimate_days ?? ''),
      toCsvCell(row.due ?? ''),
    ].join(','))).join('\n')
  }
  return { csvText }
}
