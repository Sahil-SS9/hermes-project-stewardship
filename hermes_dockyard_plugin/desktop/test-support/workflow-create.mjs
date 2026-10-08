// Create a workflow the way a person does since the Workflows builder (Sahil's
// pick, 07/10/2026): New workflow -> This project (asked first since
// 08/10/2026) -> Start blank -> name and first step -> Create workflow. The old side form ("Template / instance", "Phase title",
// "Run key") went with that pick; Start blank makes the same one-step
// workflow it did (id step-1, titled with the first step).
export async function createBlankWorkflow(page, name, firstStep = 'Step 1') {
  await page.locator('[data-action="wfd-new-workflow"]').click()
  await page.locator('[data-wfd-scope="project"]').click()
  await page.locator('[data-wfd-way="blank"]').click()
  await page.locator('[data-wfd-name]').fill(name)
  await page.locator('[data-wfd-first-step]').fill(firstStep)
  await page.locator('[data-action="wfd-create"]').click()
  await page.locator('[data-wfd-new-dialog]').waitFor({ state: 'detached' })
  await page.locator(`[data-workflow-library-item="${name}"]`).waitFor()
  await page.locator(`[data-workflow-canvas="${name}"] g.dy-wf-node`).first().waitFor()
}

// Open a step's details panel on the canvas: one click only selects a step
// since 07/10/2026; a double-click opens it.
export async function openStep(page, workflowName, nodeId) {
  await page.locator(`[data-workflow-canvas="${workflowName}"] g.dy-wf-node[data-node-id="${nodeId}"]`).dblclick()
  await page.locator(`[data-workflow-canvas="${workflowName}"] .dy-wf-passport .dy-wf-pp-head`).waitFor()
}
