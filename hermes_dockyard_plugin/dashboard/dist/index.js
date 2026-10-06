"use strict";
(() => {
  // src/api.ts
  var BASE = "/api/plugins/hermes-dockyard";
  function createApi(sdk) {
    const get = (path) => sdk.fetchJSON(`${BASE}${path}`);
    const post = (path, body) => sdk.fetchJSON(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {})
    });
    const put = (path, body) => sdk.fetchJSON(`${BASE}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {})
    });
    const patch = (path, body) => sdk.fetchJSON(`${BASE}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {})
    });
    return {
      health: () => get("/health"),
      objectives: (project) => get(`/projects/${encodeURIComponent(project)}/objectives`),
      recordAssessment: (project, id, body) => post(`/projects/${encodeURIComponent(project)}/objectives/${id}/assessment`, body),
      features: (projectId) => get(
        `/projects/${encodeURIComponent(projectId)}/features`
      ),
      updateFeatures: (projectId, features) => patch(
        `/projects/${encodeURIComponent(projectId)}/features`,
        { features }
      ),
      dashboard: () => get("/dashboard"),
      portfolio: () => get("/portfolio"),
      inbox: () => get("/inbox"),
      notifications: () => get("/notifications"),
      workItems: (projectId) => get(
        `/projects/${encodeURIComponent(projectId)}/work-items`
      ),
      backlog: (projectId) => get(
        `/projects/${encodeURIComponent(projectId)}/backlog`
      ),
      workDetail: (projectId, ref) => get(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}`
      ),
      // P8.4: canonical recovery transition (re-queue blocked -> backlog) —
      // same route/authority the work drawer uses.
      transitionWorkItem: (projectId, ref, status) => post(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}/transition`,
        { status }
      ),
      updateWork: (projectId, ref, changes) => patch(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}`,
        changes
      ),
      assignWork: (projectId, ref, assigneeId) => post(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}/assign`,
        { assignee_id: assigneeId }
      ),
      addDependency: (projectId, ref, dependencyRef) => post(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}/dependencies`,
        { dependency_ref: dependencyRef }
      ),
      removeDependency: (projectId, ref, dependencyRef) => post(
        `/projects/${encodeURIComponent(projectId)}/work-items/${encodeURIComponent(ref)}/dependencies/${encodeURIComponent(dependencyRef)}/remove`,
        {}
      ),
      milestones: (projectId) => get(
        `/projects/${encodeURIComponent(projectId)}/milestones`
      ),
      // P9.2: milestone detail with scope/WIP/risks/forecast, plus the same
      // edit actions the Desktop planning panel exposes.
      milestoneDetail: (projectId, name) => get(
        `/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(name)}`
      ),
      milestoneRename: (projectId, name, newName) => post(
        `/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(name)}/rename`,
        { new_name: newName }
      ),
      milestoneDetach: (projectId, name, ref) => post(
        `/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(name)}/detach`,
        { ref }
      ),
      milestoneSetClosed: (projectId, name, closed) => patch(
        `/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(name)}`,
        { closed }
      ),
      createMilestone: (projectId, name, due) => post(
        `/projects/${encodeURIComponent(projectId)}/milestones`,
        { name, due }
      ),
      updateMilestone: (projectId, name, changes) => patch(
        `/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(name)}`,
        { ...changes }
      ),
      attachMilestone: (projectId, name, ref) => post(
        `/projects/${encodeURIComponent(projectId)}/milestones/${encodeURIComponent(name)}/attach`,
        { ref }
      ),
      views: (projectId) => get(
        `/projects/${encodeURIComponent(projectId)}/views`
      ),
      saveView: (projectId, name, layout) => put(`/projects/${encodeURIComponent(projectId)}/views`, {
        name,
        layout,
        filters: {},
        shared: false
      }),
      onboard: (b) => post("/onboard", b),
      // P7.1/P7.2: host-driven discovery + host-validated preflight.
      discover: () => get("/onboard/discover"),
      preflight: (b) => post("/onboard/preflight", b),
      addObjective: (projectId, body) => post(`/projects/${encodeURIComponent(projectId)}/objectives`, body),
      // P7.6: onboarding completion action — the first read-only assessment.
      firstAssessment: (projectId) => post(`/projects/${encodeURIComponent(projectId)}/first-assessment`, {}),
      decision: (ref) => get(`/initiatives/${encodeURIComponent(ref)}/decision`),
      decisionReceipts: (ref) => get(
        `/initiatives/${encodeURIComponent(ref)}/decision/receipts`
      ),
      approve: (ref, payload) => post(`/initiatives/${encodeURIComponent(ref)}/approve`, payload),
      reject: (ref, payload) => post(`/initiatives/${encodeURIComponent(ref)}/reject`, payload),
      workflowRuns: (projectId, name) => get(`/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(name)}/runs`),
      workflowTimeline: (projectId, name, runKey) => get(
        `/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(name)}/runs/${encodeURIComponent(runKey)}/timeline`
      ),
      workflowScopedTimeline: (projectId, scope, name, runKey) => get(
        `/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(scope)}/${encodeURIComponent(name)}/runs/${encodeURIComponent(runKey)}/timeline`
      ),
      initiatives: (projectId) => get(
        `/projects/${encodeURIComponent(projectId)}/initiatives`
      ),
      observations: (projectId) => get(
        `/projects/${encodeURIComponent(projectId)}/observations`
      ),
      completeInitiative: (ref, regressed) => post(`/initiatives/${encodeURIComponent(ref)}/complete`, {
        verified: !regressed,
        regressed
      }),
      runObservation: (ref) => post(`/observations/${encodeURIComponent(ref)}/run`, {}),
      ack: (id) => post(`/notifications/${id}/ack`, {})
    };
  }
  function getSDK() {
    const sdk = window.__HERMES_PLUGIN_SDK__;
    if (!sdk || typeof sdk.fetchJSON !== "function") return null;
    return sdk;
  }

  // src/objective-evidence.ts
  async function renderObjectiveEvidence(root, api, project) {
    const text = (tag, value) => {
      const node = document.createElement(tag);
      node.textContent = value;
      return node;
    };
    root.dataset.objectiveEvidencePanel = project;
    root.replaceChildren(text("p", "Loading objective evidence\u2026"));
    try {
      const response = await api.objectives(project);
      root.replaceChildren(text("h3", `Objectives \u2014 ${project}`));
      if (!response.objectives.length) root.append(text("p", "No objectives configured."));
      for (const objective of response.objectives) {
        const evidence = objective.evidence;
        const state = objective.enabled === false ? "not_applicable" : evidence?.state || "unknown";
        const details = document.createElement("details");
        details.append(text("summary", `${objective.name} \u2014 ${state} \u2014 Evidence/history`));
        details.append(text("p", evidence?.detail || "Insufficient data: no recorded evidence."));
        details.append(text("p", `Target ${objective.target} \xB7 Window ${objective.window} \xB7 Evidence age ${evidence?.evidence_age_seconds == null ? "unavailable" : Math.floor(evidence.evidence_age_seconds) + " seconds"} \xB7 Samples ${evidence?.sample_count || 0} \xB7 Pass rate ${evidence?.pass_rate == null ? "insufficient data" : Math.round(evidence.pass_rate * 100) + "%"}`));
        const list = document.createElement("ul");
        for (const sample of evidence?.history || []) {
          list.append(text("li", `${sample.recorded_at} \xB7 ${sample.state} \xB7 ${sample.verified_actor || "objective evaluator"} \xB7 ${sample.detail || ""} \xB7 ${JSON.stringify(sample.evidence || sample.source_evidence || {})}`));
        }
        details.append(list);
        if (objective.evaluator_type === "manual" && objective.enabled !== false) {
          if (!objective.can_record_assessment) details.append(text("p", "Read-only: a dedicated authenticated human principal is required to record assessments."));
          else {
            const form = document.createElement("form");
            const select = document.createElement("select");
            for (const state2 of ["passed", "failed"]) {
              const option = document.createElement("option");
              option.value = state2;
              option.textContent = state2;
              select.append(option);
            }
            const resultLabel = text("label", "Result ");
            resultLabel.append(select);
            const reference = document.createElement("input");
            reference.required = true;
            reference.maxLength = 500;
            const label2 = text("label", "Evidence reference ");
            label2.append(reference);
            const note = document.createElement("input");
            note.maxLength = 2e3;
            const noteLabel = text("label", "Assessment note ");
            noteLabel.append(note);
            const expiry = document.createElement("input");
            expiry.type = "datetime-local";
            const expiryLabel = text("label", "Expires at (local time) ");
            expiryLabel.append(expiry);
            const submit = document.createElement("button");
            submit.type = "submit";
            submit.textContent = "Record human assessment";
            const status = text("p", "");
            status.setAttribute("role", "status");
            form.append(resultLabel, label2, noteLabel, expiryLabel, submit, status);
            form.addEventListener("submit", async (event) => {
              event.preventDefault();
              if (submit.disabled) return;
              submit.disabled = true;
              try {
                await api.recordAssessment(project, objective.id, { passed: select.value === "passed", evidence: [reference.value], detail: note.value, expires_at: expiry.value ? new Date(expiry.value).toISOString() : null });
                await renderObjectiveEvidence(root, api, project);
              } catch {
                status.textContent = "Assessment not confirmed. Refresh evidence before retrying; check human authority.";
                submit.disabled = false;
              }
            });
            details.append(form);
          }
        }
        root.append(details);
      }
    } catch {
      root.replaceChildren(text("p", "Objective evidence unavailable."));
      const retry = document.createElement("button");
      retry.textContent = "Retry evidence";
      retry.addEventListener("click", () => {
        void renderObjectiveEvidence(root, api, project);
      });
      root.append(retry);
    }
  }

  // src/components/live-detail.ts
  function buildActivityThread(items, opts = {}) {
    const max = opts.max ?? 8;
    const wrap = document.createElement("div");
    wrap.className = "dy-activity-thread";
    const list = items.slice(0, max);
    const rows = [];
    list.forEach((it) => {
      const row = document.createElement("div");
      row.className = "dy-activity-item";
      row.style.opacity = opts.decay ? "1" : "";
      if (it.ts) {
        const t = document.createElement("span");
        t.className = "dy-activity-time";
        const d = new Date(it.ts);
        t.textContent = isNaN(d.getTime()) ? String(it.ts) : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        row.appendChild(t);
      }
      const body = document.createElement("span");
      body.textContent = it.text;
      row.appendChild(body);
      wrap.appendChild(row);
      rows.push(row);
    });
    if (list.length === 0) {
      const empty = document.createElement("p");
      empty.className = "dy-dim";
      empty.textContent = "No recent activity.";
      wrap.appendChild(empty);
    }
    if (opts.decay && rows.length) {
      const t0 = Date.now();
      const iv = setInterval(() => {
        const p = Math.min(1, (Date.now() - t0) / 8e3);
        let done = true;
        rows.forEach((row, i) => {
          const target = Math.max(0.3, 1 - i * 0.14);
          row.style.opacity = String(1 - (1 - target) * p);
          if (p < 1) done = false;
        });
        if (done) clearInterval(iv);
      }, 300);
    }
    return wrap;
  }
  function buildTaskListMini(tasks, onOpen) {
    const wrap = document.createElement("div");
    wrap.className = "dy-tasklist";
    if (tasks.length === 0) {
      const empty = document.createElement("p");
      empty.className = "dy-dim";
      empty.textContent = "No sub-tasks.";
      wrap.appendChild(empty);
      return wrap;
    }
    const ul = document.createElement("ul");
    for (const t of tasks) {
      const li = document.createElement("li");
      li.className = "dy-taskitem";
      const mark = document.createElement("span");
      mark.className = "dy-taskmark " + (t.status ?? "pending");
      mark.textContent = t.status === "done" ? "\u2713" : t.status === "working" ? "\u25D0" : t.status === "blocked" ? "\u2715" : "\u25CB";
      const label2 = document.createElement("span");
      label2.className = "dy-tasklabel" + (t.status === "done" ? " dy-tasklabel-done" : "");
      label2.textContent = t.title;
      li.append(mark, label2);
      if (t.assignee) {
        const who = document.createElement("span");
        who.className = "dy-taskassignee";
        who.textContent = t.assignee;
        li.appendChild(who);
      }
      if (onOpen) {
        li.style.cursor = "pointer";
        li.addEventListener("click", () => onOpen(t.ref));
      }
      ul.appendChild(li);
    }
    wrap.appendChild(ul);
    return wrap;
  }

  // src/workflow-canvas.ts
  function validateConnection(nodes, from, to) {
    if (!from || !to) return "Both source and target are required";
    if (from === to) return "A node cannot depend on itself";
    const ids = new Set(nodes.map((n) => n.node_id));
    if (!ids.has(from) || !ids.has(to)) return "Unknown node";
    const deps = new Map(nodes.map((n) => [n.node_id, [...n.depends_on]]));
    const seen = /* @__PURE__ */ new Set();
    const visit = (id) => {
      if (id === to) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return (deps.get(id) ?? []).some(visit);
    };
    return visit(from) ? "Connection would create a cycle" : null;
  }
  var NOT_IN_LATEST_PLAN = "This step is not in the latest version of the workflow, so it cannot be changed here.";
  function deletePlan(nodes, id) {
    const target = nodes.find((n) => n.node_id === id);
    if (!target) return NOT_IN_LATEST_PLAN;
    const names = (list) => list.map((n) => `"${n.title}"`).join(", ");
    const checks = nodes.filter((n) => n.node_id !== id && n.when?.node === id);
    if (checks.length) {
      return checks.length === 1 ? `Can't delete "${target.title}": ${names(checks)} has a condition that checks it. Change or remove that condition first.` : `Can't delete "${target.title}": ${names(checks)} have conditions that check it. Change or remove those conditions first.`;
    }
    const next = nodes.filter((n) => n.node_id !== id).map((n) => n.depends_on.includes(id) ? { ...n, depends_on: [...new Set(n.depends_on.flatMap((dep) => dep === id ? target.depends_on : [dep]))].filter((dep) => dep !== n.node_id) } : n);
    const stranded = next.filter((n) => n.loop && n.depends_on.length === 0 && (nodes.find((m) => m.node_id === n.node_id)?.depends_on.length ?? 0) > 0);
    if (stranded.length) {
      return `Can't delete "${target.title}": ${names(stranded)} ${stranded.length === 1 ? "repeats" : "repeat"}, and a repeating step needs a step before it.`;
    }
    return next;
  }
  var NODE_W = 208;
  var NODE_H = 72;
  var COL_GAP = 116;
  var ROW_GAP = 30;
  var PAD = 64;
  var LANE_PAD = 30;
  var LOD_FULL = 1.4;
  var ZOOM_IN = 1.1;
  var ZOOM_OUT = 0.9;
  function statusToken(status) {
    return status === "done" || status === "working" || status === "blocked" ? status : "pending";
  }
  var STATUS_TOKENS = {
    done: "--dy-wf-status-done",
    working: "--dy-wf-status-working",
    blocked: "--dy-wf-status-blocked",
    pending: "--dy-wf-status-pending"
  };
  var PURPOSE_VISUALS = {
    task: { label: "Task" },
    gate: { label: "Human gate" },
    branch: { label: "Conditional branch" },
    loop: { label: "Bounded loop" }
  };
  function nodePurpose(n) {
    if (n.human_gate || n.kind === "gate") return "gate";
    if (n.loop) return "loop";
    if (n.when) return "branch";
    return "task";
  }
  function isAwaitingDecision(n) {
    return nodePurpose(n) === "gate" && statusToken(n.status) === "pending";
  }
  var CARD_RADIUS = 12;
  var EDGE_MEANINGS = {
    depends_on: {
      meaning: "depends_on",
      color: "--dy-edge-dep",
      activeColor: "--dy-edge-dep-active",
      marker: "dyArrowDep",
      activeMarker: "dyArrowDepActive",
      label: "depends on",
      rendered: true
    },
    supports: {
      meaning: "supports",
      color: "--dy-edge-plan-supports",
      activeColor: "--dy-edge-plan-supports-active",
      marker: "dyArrowPlanSupports",
      activeMarker: "dyArrowPlanSupportsActive",
      label: "supports",
      rendered: false
    },
    contradicts: {
      meaning: "contradicts",
      color: "--dy-edge-plan-contradicts",
      activeColor: "--dy-edge-plan-contradicts-active",
      marker: "dyArrowPlanContradicts",
      activeMarker: "dyArrowPlanContradictsActive",
      label: "contradicts",
      rendered: false
    },
    derived_from: {
      meaning: "derived_from",
      color: "--dy-edge-plan-derived_from",
      activeColor: "--dy-edge-plan-derived_from-active",
      marker: "dyArrowPlanDerivedFrom",
      activeMarker: "dyArrowPlanDerivedFromActive",
      label: "derived from",
      rendered: false
    },
    clarifies: {
      meaning: "clarifies",
      color: "--dy-edge-plan-clarifies",
      activeColor: "--dy-edge-plan-clarifies-active",
      marker: "dyArrowPlanClarifies",
      activeMarker: "dyArrowPlanClarifiesActive",
      label: "clarifies",
      rendered: false
    },
    implements: {
      meaning: "implements",
      color: "--dy-edge-plan-implements",
      activeColor: "--dy-edge-plan-implements-active",
      marker: "dyArrowPlanImplements",
      activeMarker: "dyArrowPlanImplementsActive",
      label: "implements",
      rendered: false
    },
    raises_question: {
      meaning: "raises_question",
      color: "--dy-edge-plan-raises_question",
      activeColor: "--dy-edge-plan-raises_question-active",
      marker: "dyArrowPlanRaisesQuestion",
      activeMarker: "dyArrowPlanRaisesQuestionActive",
      label: "raises question",
      rendered: false
    }
  };
  var DEFAULT_EDGE_MEANING = "depends_on";
  function elapsedLabel(updatedAt) {
    if (!updatedAt) return "unavailable";
    const base = Date.parse(updatedAt);
    if (!isFinite(base)) return "unavailable";
    const secs = Math.max(0, Math.floor((Date.now() - base) / 1e3));
    return String(Math.floor(secs / 60)).padStart(2, "0") + ":" + String(secs % 60).padStart(2, "0");
  }
  var prefersReducedMotion = () => {
    try {
      const m = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
      return Boolean(m && m.matches);
    } catch {
      return false;
    }
  };
  function elu(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== void 0) el.textContent = text;
    return el;
  }
  function sEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  }
  function laneKeyOf(n) {
    return (n.team ?? n.phase_team ?? "").trim() || "unassigned";
  }
  function laneLabelOf(key) {
    if (key === "unassigned") return "Unassigned";
    if (key === "main-path") return "Main path";
    if (key === EXCEPTION_LANE_KEY) return "Exception path";
    return key;
  }
  var EXCEPTION_LANE_KEY = "exception-path";
  function isExceptionNode(n) {
    const purpose = nodePurpose(n);
    return purpose === "branch" || purpose === "loop" || n.status === "blocked";
  }
  function buildLayout(nodes, opts) {
    const byId = new Map(nodes.map((n) => [n.node_id, n]));
    const depthCache = /* @__PURE__ */ new Map();
    const computeDepth = (id) => {
      if (depthCache.has(id)) return depthCache.get(id);
      const n = byId.get(id);
      if (!n) return 0;
      let d = 0;
      for (const dep of n.depends_on) d = Math.max(d, computeDepth(dep) + 1);
      depthCache.set(id, d);
      return d;
    };
    nodes.forEach((n) => computeDepth(n.node_id));
    const perDepth = {};
    const positions = {};
    if (opts?.mobile) {
      nodes.forEach((n, index) => {
        positions[n.node_id] = { x: PAD, y: PAD + index * (NODE_H + ROW_GAP + 24), depth: index };
      });
      return { positions, lanes: [], width: PAD * 2 + NODE_W, height: PAD * 2 + nodes.length * (NODE_H + ROW_GAP + 24) };
    }
    nodes.forEach((n) => {
      const d = depthCache.get(n.node_id) ?? 0;
      const row = perDepth[d] ?? 0;
      perDepth[d] = row + 1;
      positions[n.node_id] = {
        x: PAD + d * (NODE_W + COL_GAP),
        y: PAD + row * (NODE_H + ROW_GAP),
        depth: d
      };
    });
    const maxDepth = Math.max(0, ...nodes.map((n) => depthCache.get(n.node_id) ?? 0));
    const rows = Math.max(1, ...Object.values(perDepth));
    const grid = {
      positions,
      lanes: [],
      width: PAD * 2 + (maxDepth + 1) * (NODE_W + COL_GAP) - COL_GAP,
      height: PAD * 2 + rows * (NODE_H + ROW_GAP) - ROW_GAP
    };
    const laneOf = opts?.laneOf;
    if (!laneOf) return grid;
    const order = [];
    const members = /* @__PURE__ */ new Map();
    for (const n of nodes) {
      const key = laneOf(n);
      if (!members.has(key)) {
        members.set(key, []);
        order.push(key);
      }
      members.get(key).push(n);
    }
    const laneH = LANE_PAD * 2 + NODE_H;
    const positionsLane = {};
    const lanes = [];
    let widest = 0;
    order.forEach((key, li) => {
      const band = members.get(key);
      const sorted = [...band].sort((a, b) => {
        const da = depthCache.get(a.node_id) ?? 0;
        const db = depthCache.get(b.node_id) ?? 0;
        return da - db || nodes.indexOf(a) - nodes.indexOf(b);
      });
      const y = PAD + li * laneH;
      sorted.forEach((n, i) => {
        positionsLane[n.node_id] = { x: PAD + i * (NODE_W + COL_GAP), y: y + LANE_PAD, depth: i };
      });
      widest = Math.max(widest, sorted.length);
      lanes.push({
        key,
        label: laneLabelOf(key),
        y,
        height: laneH,
        exception: band.some((n) => {
          const purpose = nodePurpose(n);
          return purpose === "branch" || purpose === "loop" || n.status === "blocked";
        })
      });
    });
    return {
      positions: positionsLane,
      lanes,
      width: PAD * 2 + Math.max(1, widest) * (NODE_W + COL_GAP) - COL_GAP,
      height: PAD * 2 + Math.max(1, lanes.length) * laneH - (LANE_PAD - PAD > 0 ? 0 : 0) - PAD + PAD
    };
  }
  function mountWorkflowCanvas(host, projectId, runName, fetchRuns, handlers, pollMs = 8e3) {
    host.replaceChildren();
    host.className = "dy-wf dy-wf-scope";
    const canvasWindow = host.ownerDocument?.defaultView ?? globalThis.window;
    const wrap = elu("div", "dy-wf-wrap");
    const svg = sEl("svg", { class: "dy-wf-svg" });
    svg.setAttribute("data-lod", "read");
    const viewport = sEl("g", { class: "dy-wf-viewport" });
    svg.appendChild(viewport);
    const minimap = sEl("svg", { class: "dy-wf-minimap dy-wf-glass", width: 170, height: 104 });
    minimap.setAttribute("aria-label", "Canvas overview: click to move the view");
    const miniViewport = sEl("rect", { class: "dy-wf-mini-view" });
    minimap.appendChild(miniViewport);
    const passport = elu("div", "dy-wf-passport dy-wf-glass");
    passport.setAttribute("aria-live", "polite");
    const zoomBar = elu("div", "dy-wf-zoombar dy-wf-glass");
    zoomBar.setAttribute("role", "group");
    zoomBar.setAttribute("aria-label", "Zoom controls");
    const zoomButton = (action, label2, title) => {
      const b = elu("button", "dy-wf-zoombtn", label2);
      b.dataset.wfAction = action;
      b.type = "button";
      b.setAttribute("aria-label", title);
      return b;
    };
    const zoomInBtn = zoomButton("zoom-in", "+", "Zoom in");
    const zoomOutBtn = zoomButton("zoom-out", "\u2212", "Zoom out");
    const zoomFitBtn = zoomButton("zoom-fit", "Fit", "Fit graph to view");
    const zoomResetBtn = zoomButton("zoom-reset", "Reset", "Reset zoom to 100%");
    zoomBar.append(zoomInBtn, zoomOutBtn, zoomFitBtn, zoomResetBtn);
    const feed = elu("div", "dy-wf-feed dy-wf-glass");
    feed.setAttribute("aria-live", "polite");
    const feedHead = elu("button", "dy-wf-feed-head", "\u25BE Activity");
    const feedBody = elu("div", "dy-wf-feed-body");
    feedHead.addEventListener("click", () => {
      const open = feedHead.getAttribute("aria-expanded") === "true";
      feedHead.setAttribute("aria-expanded", String(!open));
      feedHead.textContent = open ? "\u25B8 Activity" : "\u25BE Activity";
      feedBody.style.display = open ? "none" : "block";
    });
    feedHead.setAttribute("aria-expanded", "true");
    feed.append(feedHead, feedBody);
    const feedMsgs = [];
    const feedLog = (text) => {
      const item = elu("div", "dy-wf-feed-item");
      const t = elu("span", "dy-wf-feed-time");
      t.textContent = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const b = elu("span", "", " " + text);
      item.append(t, b);
      feedBody.prepend(item);
      feedMsgs.unshift({ ts: Date.now(), text, el: item });
      while (feedMsgs.length > 6) {
        const old = feedMsgs.pop();
        if (old) old.el.remove();
      }
      feedMsgs.forEach((m, i) => {
        m.el.style.opacity = String(Math.max(0.25, 1 - i * 0.15));
      });
    };
    const listView = elu("div", "dy-wf-list dy-wf-glass");
    listView.dataset.wfList = "";
    const listHead = elu("button", "dy-wf-zoombtn dy-wf-list-head", "\u25B8 List view");
    listHead.type = "button";
    listHead.setAttribute("aria-expanded", "false");
    const listBody = elu("div", "dy-wf-list-body");
    listBody.setAttribute("role", "table");
    listBody.setAttribute("aria-label", "Workflow run as list");
    listBody.style.display = "none";
    listView.hidden = true;
    listHead.addEventListener("click", () => {
      const open = listHead.getAttribute("aria-expanded") === "true";
      listHead.setAttribute("aria-expanded", String(!open));
      listHead.textContent = open ? "\u25B8 List view" : "\u25BE List view";
      listBody.style.display = open ? "none" : "block";
      listView.hidden = open;
    });
    zoomBar.appendChild(listHead);
    listView.append(listBody);
    let playbackBar = null;
    let playbackSlider = null;
    let playbackLabel = null;
    let playbackButton = null;
    playbackBar = elu("div", "dy-wf-playback dy-wf-glass");
    playbackBar.setAttribute("role", "group");
    playbackBar.setAttribute("aria-label", "Workflow playback");
    playbackButton = elu("button", "dy-wf-playback-btn", "\u25B6 Play");
    playbackButton.type = "button";
    playbackButton.disabled = true;
    playbackSlider = elu("input", "dy-wf-playback-slider");
    playbackSlider.type = "range";
    playbackSlider.min = "0";
    playbackSlider.value = "0";
    playbackSlider.step = "1";
    playbackSlider.disabled = true;
    playbackSlider.setAttribute("aria-label", "Workflow playback");
    playbackLabel = elu("span", "dy-wf-playback-label", "Live");
    const motionButton = elu("button", "dy-wf-motion-btn", "Motion on");
    motionButton.type = "button";
    motionButton.setAttribute("aria-label", "Toggle workflow canvas motion");
    motionButton.setAttribute("aria-pressed", "true");
    motionButton.addEventListener("click", () => {
      const on = motionButton.getAttribute("aria-pressed") === "true";
      motionButton.setAttribute("aria-pressed", String(!on));
      motionButton.textContent = on ? "Motion off" : "Motion on";
      host.classList.toggle("dy-wf-still", on);
    });
    playbackBar.append(playbackButton, playbackSlider, playbackLabel, motionButton);
    wrap.append(svg, feed, minimap, passport, zoomBar, listView, playbackBar);
    playbackBar.style.overflowX = "auto";
    host.appendChild(wrap);
    let panX = 0;
    let panY = 0;
    let zoom = 1;
    let fullW = 0;
    let fullH = 0;
    let originX = 0;
    let originY = 0;
    let currentNodes = [];
    let nodePositions = {};
    const pendingPositions = /* @__PURE__ */ new Map();
    let layoutW = 0;
    let layoutH = 0;
    let cameraSet = false;
    let renderedIds = /* @__PURE__ */ new Set();
    let selectedId = null;
    let previousMobileLayout = null;
    let dragNode = null;
    let dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
    let connectFrom = null;
    let disposers = [];
    let dragSession = null;
    const matrixNumbers = (transform) => (transform ?? "").match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/g)?.map(Number) ?? [];
    const readNodeTransform = (g) => {
      const nums = matrixNumbers(g.getAttribute("transform"));
      if (nums.length < 2 || !isFinite(nums[0]) || !isFinite(nums[1])) return null;
      return { x: nums[0], y: nums[1] };
    };
    const screenScale = () => {
      try {
        const ctm = svg.getScreenCTM();
        if (ctm && isFinite(ctm.a) && ctm.a > 0 && isFinite(ctm.d) && ctm.d > 0 && isFinite(ctm.e) && isFinite(ctm.f)) {
          return { sx: ctm.a, sy: ctm.d, ox: ctm.e, oy: ctm.f };
        }
      } catch {
      }
      return { sx: 1, sy: 1, ox: 0, oy: 0 };
    };
    const worldPoint = (clientX, clientY) => {
      const { sx, sy, ox, oy } = screenScale();
      return { x: ((clientX - ox) / sx - panX) / zoom, y: ((clientY - oy) / sy - panY) / zoom };
    };
    const writeNodePosition = (nodeId, g, x, y) => {
      nodePositions[nodeId] = { x, y, depth: nodePositions[nodeId]?.depth ?? 0 };
      g.setAttribute("transform", `translate(${x} ${y})`);
    };
    const startDrag = (nodeId, g, e, depth) => {
      if (connectFrom) return;
      const current = nodePositions[nodeId] ?? { x: 0, y: 0, depth };
      const world = worldPoint(e.clientX, e.clientY);
      dragNode = nodeId;
      dragSession = {
        nodeId,
        pointerId: e.pointerId,
        offsetX: world.x - current.x,
        offsetY: world.y - current.y,
        moved: false
      };
      dragStart = { x: e.clientX, y: e.clientY, ox: current.x, oy: current.y };
      try {
        g.setPointerCapture(e.pointerId);
      } catch {
      }
    };
    const dragMove = (e) => {
      const session = dragSession;
      if (!session || e.pointerId !== session.pointerId) return;
      const g = viewport.querySelector(`[data-node-id="${session.nodeId}"]`);
      if (!g) return;
      const movedBy = Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y);
      if (movedBy > 3) session.moved = true;
      if (!session.moved) return;
      const world = worldPoint(e.clientX, e.clientY);
      writeNodePosition(session.nodeId, g, world.x - session.offsetX, world.y - session.offsetY);
    };
    let editQueue = Promise.resolve();
    let optimisticBase = null;
    const editBase = () => handlers.editNodes?.() ?? optimisticBase ?? currentNodes;
    const NOT_IN_PLAN = NOT_IN_LATEST_PLAN;
    const runEdit = (build) => {
      const next = editQueue.then(async () => {
        const result = build(editBase());
        if (typeof result === "string") throw new Error(result);
        await handlers.onEdit(result);
        if (!handlers.editNodes) optimisticBase = result;
      });
      editQueue = next.catch(() => void 0);
      return next;
    };
    const errorText = (error) => String(error?.message ?? error ?? "unknown error").replace(/^\d{3}:\s*/, "") || "unknown error";
    const commitNodePosition = (nodeId) => {
      const committed = nodePositions[nodeId];
      if (!committed || !handlers.onEdit) return;
      const position = { x: committed.x, y: committed.y };
      pendingPositions.set(nodeId, position);
      void runEdit((base) => base.some((item) => item.node_id === nodeId) ? base.map((item) => item.node_id === nodeId ? { ...item, canvas_position: position } : item) : NOT_IN_PLAN).catch((error) => {
        pendingPositions.delete(nodeId);
        feedLog(`Couldn't save the move: ${errorText(error)}`);
        if (lastRun) render(lastRun);
      });
    };
    const endDragSession = (e, commit) => {
      const session = dragSession;
      if (!session) return;
      const g = viewport.querySelector(`[data-node-id="${session.nodeId}"]`);
      if (g) {
        try {
          g.releasePointerCapture(session.pointerId);
        } catch {
        }
      }
      dragSession = null;
      dragNode = null;
      dragStart = { x: 0, y: 0, ox: 0, oy: 0 };
      if (commit && session.moved) void commitNodePosition(session.nodeId);
    };
    const startConnect = (nodeId, g) => {
      if (connectFrom && connectFrom !== nodeId) {
        const previous = viewport.querySelector(`[data-node-id="${connectFrom}"]`);
        previous?.classList.remove("dy-wf-connecting");
      }
      if (dragNode) endDragSession({ pointerId: -1 }, false);
      connectFrom = nodeId;
      g.classList.add("dy-wf-connecting");
    };
    const cancelConnect = () => {
      if (connectFrom) {
        const g = viewport.querySelector(`[data-node-id="${connectFrom}"]`);
        g?.classList.remove("dy-wf-connecting");
      }
      connectFrom = null;
    };
    const endConnectGesture = (to) => {
      const from = connectFrom;
      if (!from) return;
      connectFrom = null;
      for (const g of viewport.querySelectorAll(".dy-wf-node.dy-wf-connecting")) {
        g.classList.remove("dy-wf-connecting");
      }
      if (!to) return;
      const error = validateConnection(editBase(), from, to);
      if (error) {
        feedLog(error);
        return;
      }
      void runEdit((base) => {
        if (!base.some((item) => item.node_id === from) || !base.some((item) => item.node_id === to)) return NOT_IN_PLAN;
        return validateConnection(base, from, to) ?? base.map((item) => item.node_id === to ? { ...item, depends_on: [.../* @__PURE__ */ new Set([...item.depends_on, from])] } : item);
      }).catch((failure) => feedLog(`Couldn't save the connection: ${errorText(failure)}`));
    };
    const apply = () => {
      viewport.setAttribute("transform", `translate(${panX} ${panY}) scale(${zoom})`);
      viewport.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
      svg.setAttribute("data-lod", zoom > LOD_FULL ? "full" : zoom < 0.75 ? "map" : "read");
    };
    const ZOOM_STEP = 1.25;
    const ZOOM_MIN = 0.45;
    const ZOOM_MAX = 2.4;
    const FIT_MIN = 0.2;
    const viewSize = () => ({ w: svg.clientWidth || 1300, h: svg.clientHeight || 760 });
    const measureWorld = () => {
      let maxX = layoutW;
      let maxY = layoutH;
      let minX = 0;
      let minY = 0;
      for (const p of Object.values(nodePositions)) {
        maxX = Math.max(maxX, p.x + NODE_W + PAD);
        maxY = Math.max(maxY, p.y + NODE_H + PAD);
        minX = Math.min(minX, p.x - PAD);
        minY = Math.min(minY, p.y - PAD);
      }
      originX = minX;
      originY = minY;
      fullW = maxX - minX;
      fullH = maxY - minY;
    };
    const centreAt = (z) => {
      const { w, h } = viewSize();
      zoom = z;
      panX = (w - fullW * z) / 2 - originX * z;
      panY = (h - fullH * z) / 2 - originY * z;
    };
    const fitView = () => {
      measureWorld();
      if (!fullW || !fullH) return;
      const { w, h } = viewSize();
      centreAt(Math.max(FIT_MIN, Math.min(w / fullW, h / fullH, 1)));
      apply();
      updateMinimap();
    };
    const resetView = () => {
      measureWorld();
      const { w, h } = viewSize();
      centreAt(1);
      if (fullW > w) panX = -originX;
      if (fullH > h) panY = -originY;
      apply();
      updateMinimap();
    };
    const setZoom = (next) => {
      const target = Math.min(ZOOM_MAX, Math.max(Math.min(ZOOM_MIN, zoom), next));
      const { w, h } = viewSize();
      const k = target / zoom;
      panX = w / 2 - (w / 2 - panX) * k;
      panY = h / 2 - (h / 2 - panY) * k;
      zoom = target;
      cameraSet = true;
      apply();
      updateMinimap();
    };
    zoomInBtn.addEventListener("click", () => setZoom(zoom * ZOOM_STEP));
    zoomOutBtn.addEventListener("click", () => setZoom(zoom / ZOOM_STEP));
    zoomResetBtn.addEventListener("click", () => {
      cameraSet = true;
      resetView();
    });
    zoomFitBtn.addEventListener("click", () => {
      cameraSet = true;
      fitView();
    });
    const defs = sEl("defs", {});
    const mkMarker = (id, fillToken, fallback) => {
      const m = sEl("marker", {
        id,
        viewBox: "0 0 10 10",
        refX: "9",
        refY: "5",
        // Larger than the 1.5px stroke and in userSpaceOnUse so the head keeps a
        // constant, legible size instead of thinning with the stroke width.
        markerWidth: "6",
        markerHeight: "6",
        markerUnits: "userSpaceOnUse",
        orient: "auto-start-reverse"
      });
      const head = sEl("path", {
        d: "M 0 0 L 10 5 L 0 10 z",
        class: "dy-wf-arrow",
        fill: `var(${fillToken}, ${fallback})`
      });
      m.appendChild(head);
      return m;
    };
    for (const meaning of Object.values(EDGE_MEANINGS)) {
      if (!meaning.rendered) continue;
      defs.appendChild(mkMarker(meaning.marker, meaning.color, "#8fa3c8"));
      defs.appendChild(mkMarker(meaning.activeMarker, meaning.activeColor, "#9cc4ff"));
    }
    const sheenGrad = sEl("linearGradient", { id: "dyWfCardSheen", x1: "0", y1: "0", x2: "0", y2: "1" });
    sheenGrad.append(
      sEl("stop", { offset: "0%", "stop-color": "#ffffff", "stop-opacity": "0.09" }),
      sEl("stop", { offset: "100%", "stop-color": "#ffffff", "stop-opacity": "0" })
    );
    defs.appendChild(sheenGrad);
    svg.appendChild(defs);
    const timelineFor = (run) => run?.timeline ?? [];
    const clearRoute = () => {
      viewport.querySelectorAll(".dy-wf-route-dim, .dy-wf-route-edge").forEach((el) => el.classList.remove("dy-wf-route-dim", "dy-wf-route-edge"));
    };
    const renderPlaybackState = (run, index) => {
      if (!run || index === null || !run.timeline?.length) return;
      const state = /* @__PURE__ */ new Map();
      for (const event of run.timeline.slice(0, index + 1)) state.set(event.node_id, event.to_status);
      viewport.querySelectorAll("[data-node-id]").forEach((g) => {
        const id = g.getAttribute("data-node-id") ?? "";
        const status = state.get(id);
        if (status) g.dataset.wfPlaybackStatus = status;
        g.classList.toggle("dy-wf-playback-active", state.has(id));
      });
      if (playbackLabel) playbackLabel.textContent = `Event ${index + 1}/${run.timeline.length}`;
    };
    const setPlayback = (run, index) => {
      const timeline = timelineFor(run);
      playbackIndex = index;
      const enabled = timeline.length > 1;
      if (playbackSlider) {
        playbackSlider.disabled = !enabled;
        playbackSlider.max = String(Math.max(0, timeline.length - 1));
        playbackSlider.value = String(Math.max(0, index ?? timeline.length - 1));
      }
      if (playbackButton) playbackButton.disabled = !enabled;
      render(run);
      if (index !== null) renderPlaybackState(run, index);
    };
    playbackSlider?.addEventListener("input", () => {
      if (lastRun) setPlayback(lastRun, Number(playbackSlider?.value ?? 0));
    });
    playbackButton?.addEventListener("click", () => {
      if (!lastRun?.timeline?.length) return;
      const next = playbackIndex === null ? 0 : playbackIndex + 1;
      if (next >= lastRun.timeline.length) {
        setPlayback(lastRun, null);
        if (playbackButton) playbackButton.textContent = "\u25B6 Play";
        return;
      }
      if (playbackButton) playbackButton.textContent = "\u23F8 Pause";
      setPlayback(lastRun, next);
    });
    let lastRun = null;
    const renderList = (run) => {
      listBody.replaceChildren();
      if (!run || run.nodes.length === 0) {
        listBody.appendChild(elu("p", "dy-dim", "No workflow runs yet."));
        return;
      }
      const titleOf = new Map(run.nodes.map((n) => [n.node_id, n.title]));
      for (const n of run.nodes) {
        const row = elu("div", "dy-wf-list-row");
        row.dataset.wfListRow = n.node_id;
        row.setAttribute("role", "row");
        const name = elu("span", "dy-wf-list-title", n.title);
        const kindText = nodePurpose(n);
        const kind = elu(
          "span",
          `dy-wf-list-kind ${kindText}`,
          PURPOSE_VISUALS[kindText].label
        );
        const deps = elu(
          "span",
          "dy-wf-list-deps",
          n.depends_on.length ? `depends on: ${n.depends_on.map((d) => titleOf.get(d) ?? d).join(", ")}` : "no dependencies"
        );
        const status = elu(
          `span`,
          `dy-wf-list-status ${n.status ?? "pending"}`,
          n.status ?? "pending"
        );
        const open = () => openPassport(n, null);
        const activate = elu("button", "dy-wf-list-open", "Open");
        activate.type = "button";
        activate.setAttribute("aria-label", `Open ${n.title} details`);
        activate.addEventListener("click", open);
        row.append(name, kind, deps, status, activate);
        listBody.appendChild(row);
      }
    };
    const buildNode = (n, p, run, editable) => {
      const purpose = nodePurpose(n);
      const status = statusToken(n.status);
      const visuals = PURPOSE_VISUALS[purpose];
      const awaiting = isAwaitingDecision(n);
      const g = sEl("g", {
        class: `dy-wf-node ${purpose} ${status}${awaiting ? " awaiting" : ""}`,
        transform: `translate(${p.x} ${p.y})`
      });
      g.dataset.wfPurpose = purpose;
      g.dataset.wfStatus = status;
      if (awaiting) g.dataset.wfAwaiting = "true";
      if (playbackIndex !== null) g.dataset.wfPlaybackStatus = n.status ?? "pending";
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("data-node-id", n.node_id);
      g.setAttribute("aria-label", `${visuals.label}: ${n.title} (${n.status ?? "pending"})`);
      g.dataset.wfEditable = String(editable);
      g.setAttribute("aria-describedby", `wf-help-${n.node_id}`);
      const shape = sEl("rect", {
        width: NODE_W,
        height: NODE_H,
        rx: CARD_RADIUS,
        class: "dy-wf-shape dy-wf-card"
      });
      shape.setAttribute("fill", "#101c30");
      const sheen = sEl("rect", {
        x: 1,
        y: 1,
        width: NODE_W - 2,
        height: NODE_H / 2,
        rx: CARD_RADIUS - 1,
        class: "dy-wf-card-sheen"
      });
      const dot = sEl("circle", { cx: 18, cy: 22, r: 4.5, class: `dy-wf-statusdot ${status}` });
      const label2 = sEl("text", { x: 30, y: 26, class: "dy-wf-label" });
      label2.textContent = n.title.length > 22 ? n.title.slice(0, 21) + "\u2026" : n.title;
      const sub = sEl("text", { x: 14, y: 46, class: "dy-wf-sub" });
      sub.textContent = visuals.label;
      const statusText = sEl("text", {
        x: NODE_W - 14,
        y: 46,
        "text-anchor": "end",
        class: `dy-wf-statustext ${status}`
      });
      statusText.textContent = awaiting ? "awaiting decision" : n.status ?? "pending";
      g.append(shape, sheen, dot, label2, sub, statusText);
      if (n.status === "working") {
        const timer2 = sEl("text", {
          x: 14,
          y: 62,
          class: "dy-wf-timer full"
        });
        timer2.textContent = `Workflow: ${elapsedLabel(run.started_at)}`;
        timer2.dataset.for = n.node_id;
        g.appendChild(timer2);
      }
      if (n.assignee) {
        const who = sEl("text", {
          x: NODE_W - 14,
          y: 62,
          "text-anchor": "end",
          class: "dy-wf-assignee"
        });
        who.textContent = n.assignee;
        g.appendChild(who);
      }
      const port = sEl("circle", { cx: NODE_W, cy: NODE_H / 2, r: 7, class: "dy-wf-port" });
      const portHit = sEl("circle", { cx: NODE_W, cy: NODE_H / 2, r: 12, class: "dy-wf-port-hit" });
      portHit.setAttribute("aria-hidden", "true");
      port.setAttribute("data-connect-from", n.node_id);
      port.setAttribute("tabindex", "0");
      port.setAttribute("aria-label", `Connect from ${n.title}`);
      g.append(portHit, port);
      const dash = () => shape.setAttribute("stroke-dasharray", "4 3");
      const undash = () => shape.removeAttribute("stroke-dasharray");
      for (const target of [port, portHit]) {
        target.addEventListener("pointerdown", (ev) => {
          const e = ev;
          if (e.button !== 0 || !editable) return;
          e.stopPropagation();
          startConnect(n.node_id, g);
        });
      }
      g.addEventListener("pointerdown", (ev) => {
        const e = ev;
        if (e.button !== 0 || !editable) return;
        e.stopPropagation();
        if (e.shiftKey) {
          startConnect(n.node_id, g);
          return;
        }
        startDrag(n.node_id, g, e, p.depth ?? 0);
      });
      g.addEventListener("pointermove", (ev) => dragMove(ev));
      g.addEventListener("pointerup", (ev) => {
        const e = ev;
        if (dragSession && dragSession.nodeId === n.node_id) {
          e.stopPropagation();
          endDragSession(e, true);
          return;
        }
        if (connectFrom) {
          e.stopPropagation();
          endConnectGesture(n.node_id);
        }
      });
      g.addEventListener("pointercancel", (ev) => {
        const e = ev;
        if (dragSession && dragSession.nodeId === n.node_id) {
          e.stopPropagation();
          endDragSession(e, false);
        }
      });
      g.addEventListener("keydown", (ev) => {
        const e = ev;
        if (!editable) return;
        if (e.key === " " || e.key === "c") {
          e.preventDefault();
          if (connectFrom === n.node_id) cancelConnect();
          else startConnect(n.node_id, g);
        } else if (e.key === "Enter" && connectFrom && connectFrom !== n.node_id) {
          e.preventDefault();
          endConnectGesture(n.node_id);
        } else if (e.key === "Delete" || e.key === "Backspace") {
          e.preventDefault();
          openPassport(n, g);
          passport.querySelector("[data-wf-delete-step]")?.click();
        }
      });
      g.addEventListener("pointerenter", dash);
      g.addEventListener("pointerleave", () => {
        if (!g.classList.contains("dy-wf-selected")) undash();
      });
      const open = () => openPassport(n, g);
      g.addEventListener("click", open);
      g.addEventListener("keydown", (e) => {
        const ev = e;
        if (ev.key === "Enter") {
          open();
          return;
        }
        if (ev.key === "ArrowRight" || ev.key === "ArrowDown" || ev.key === "ArrowLeft" || ev.key === "ArrowUp") {
          ev.preventDefault();
          const all = [...viewport.querySelectorAll(".dy-wf-node")];
          const idx = all.indexOf(g);
          if (idx === -1) return;
          const step = ev.key === "ArrowRight" || ev.key === "ArrowDown" ? 1 : -1;
          const next = all[(idx + step + all.length) % all.length];
          if (next) next.focus();
        }
      });
      return g;
    };
    const render = (run) => {
      lastRun = run;
      const timeline = timelineFor(run);
      if (playbackSlider) {
        playbackSlider.disabled = timeline.length < 2;
        playbackSlider.max = String(Math.max(0, timeline.length - 1));
        playbackSlider.value = String(Math.max(0, playbackIndex ?? timeline.length - 1));
      }
      if (playbackButton) {
        playbackButton.disabled = timeline.length < 2;
        playbackButton.textContent = playbackIndex === null ? "\u25B6 Play" : "\u23F8 Pause";
      }
      if (playbackLabel) playbackLabel.textContent = playbackIndex === null ? timeline.length ? `Live \xB7 ${timeline.length} events` : "Live" : `Event ${playbackIndex + 1}/${timeline.length}`;
      renderList(run);
      const active = host.ownerDocument?.activeElement ?? null;
      const focusedId = active && viewport.contains(active) ? active.closest(".dy-wf-node")?.getAttribute("data-node-id") ?? null : null;
      viewport.replaceChildren();
      viewport.appendChild(defs);
      if (!run || run.nodes.length === 0) {
        const t = sEl("text", { x: 20, y: 40, class: "dy-wf-empty" });
        t.textContent = "No workflow runs yet.";
        viewport.appendChild(t);
        updateMinimap();
        return;
      }
      currentNodes = run.nodes;
      if (timeline.length > 1 && playbackIndex !== null) {
        const states = /* @__PURE__ */ new Map();
        for (const event of timeline.slice(0, playbackIndex + 1)) states.set(event.node_id, event.to_status);
        currentNodes = currentNodes.map((node) => states.has(node.node_id) ? { ...node, status: states.get(node.node_id) ?? node.status } : { ...node, status: "pending" });
      }
      const assignments = currentNodes.some((n) => (n.team ?? n.phase_team ?? "").trim());
      const laneOf = assignments ? laneKeyOf : (n) => isExceptionNode(n) ? EXCEPTION_LANE_KEY : "main-path";
      const mobileLayout = canvasWindow.innerWidth <= 640;
      svg.dataset.mobileLayout = String(mobileLayout);
      previousMobileLayout = mobileLayout;
      let layout = buildLayout(run.nodes, { laneOf, mobile: mobileLayout });
      if (!mobileLayout && layout.lanes.length < 2) layout = buildLayout(run.nodes);
      const positions = { ...layout.positions };
      for (const item of run.nodes) {
        if (item.canvas_position) positions[item.node_id] = { ...layout.positions[item.node_id], ...item.canvas_position };
        const pending = pendingPositions.get(item.node_id);
        if (!pending) continue;
        const saved = item.canvas_position;
        if (saved && Math.abs(saved.x - pending.x) < 0.5 && Math.abs(saved.y - pending.y) < 0.5) pendingPositions.delete(item.node_id);
        else positions[item.node_id] = { ...positions[item.node_id], ...pending };
      }
      nodePositions = positions;
      layoutW = layout.width;
      layoutH = layout.height;
      measureWorld();
      const minX = originX;
      const worldW = fullW;
      for (const lane of layout.lanes) {
        const band = sEl("rect", {
          x: minX,
          y: lane.y,
          width: worldW,
          height: lane.height,
          class: lane.exception ? "dy-wf-lane exception" : "dy-wf-lane"
        });
        band.setAttribute("data-lane", lane.key);
        const lbl = sEl("text", { x: minX + 14, y: lane.y + 16, class: "dy-wf-lane-label" });
        lbl.textContent = lane.label;
        viewport.append(band, lbl);
      }
      const depMeaning = EDGE_MEANINGS[DEFAULT_EDGE_MEANING];
      for (const n of currentNodes) {
        const from = positions[n.node_id];
        for (const dep of n.depends_on) {
          const to = positions[dep];
          if (!from || !to) continue;
          const path = sEl("path", {
            class: "dy-wf-edge",
            "data-meaning": depMeaning.meaning,
            // Curved connector. Same-band edges bow gently so the curve is
            // visible; cross-band edges take a wider S-curve between the two
            // lane anchors, so a dependency that crosses lanes reads as one
            // flow instead of a ruler line.
            d: (() => {
              if (mobileLayout) {
                const x12 = to.x + NODE_W / 2, y12 = to.y + NODE_H;
                const x22 = from.x + NODE_W / 2, y22 = from.y;
                const dy = Math.max(ROW_GAP / 2, Math.abs(y22 - y12) * 0.45);
                return `M ${x12} ${y12} C ${x12} ${y12 + dy}, ${x22} ${y22 - dy}, ${x22} ${y22}`;
              }
              const x1 = to.x + NODE_W, y1 = to.y + NODE_H / 2;
              const x2 = from.x, y2 = from.y + NODE_H / 2;
              const sameBand = Math.abs(y1 - y2) < NODE_H / 2;
              const dx = Math.max(COL_GAP / 2, Math.abs(x2 - x1) * 0.55);
              if (sameBand) {
                const bow = Math.min(46, Math.max(18, dx * 0.35));
                return `M ${x1} ${y1} C ${x1 + dx} ${y1 - bow}, ${x2 - dx} ${y2 - bow}, ${x2} ${y2}`;
              }
              return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
            })(),
            // Terminate at the dependent node's left boundary. The arrowhead
            // is part of the connector, so the line remains visibly attached.
            "marker-end": `url(#${depMeaning.marker})`
          });
          path.dataset.from = dep;
          path.dataset.to = n.node_id;
          path.dataset.sourcePort = mobileLayout ? "bottom" : "right";
          path.dataset.targetPort = mobileLayout ? "top" : "left";
          viewport.appendChild(path);
          const dot = sEl("circle", { class: "dy-wf-flowdot", r: 3.2, opacity: 0 });
          viewport.appendChild(dot);
        }
      }
      for (const n of currentNodes) {
        const p = positions[n.node_id];
        viewport.appendChild(buildNode(n, p, run, Boolean(handlers.onEdit)));
      }
      if (selectedId) {
        const g = nodeEl(selectedId);
        if (g) {
          selectedEl = g;
          g.classList.add("dy-wf-selected");
          highlightRoute(selectedId);
        } else closePassport();
      }
      if (focusedId) nodeEl(focusedId)?.focus();
      const ids = currentNodes.map((n) => n.node_id);
      const added = renderedIds.size ? ids.filter((id) => !renderedIds.has(id)) : [];
      renderedIds = new Set(ids);
      const { w, h } = viewSize();
      const outOfView = (p) => Boolean(p) && (panX + p.x * zoom < 0 || panY + p.y * zoom < 0 || panX + (p.x + NODE_W) * zoom > w || panY + (p.y + NODE_H) * zoom > h);
      if (!cameraSet) {
        fitView();
        cameraSet = svg.clientWidth > 0;
      } else if (added.some((id) => outOfView(positions[id]))) {
        fitView();
      } else {
        apply();
        updateMinimap();
      }
    };
    const updateMinimap = () => {
      minimap.replaceChildren(miniViewport);
      if (fullW <= 0) return;
      const s = Math.min(170 / fullW, 104 / fullH);
      const { w: viewW, h: viewH } = viewSize();
      const vx = (0 - panX) / zoom - originX;
      const vy = (0 - panY) / zoom - originY;
      const vw = viewW / zoom;
      const vh = viewH / zoom;
      miniViewport.setAttribute("x", String(vx * s));
      miniViewport.setAttribute("y", String(vy * s));
      miniViewport.setAttribute("width", String(Math.max(10, vw * s)));
      miniViewport.setAttribute("height", String(Math.max(7, vh * s)));
      for (const n of currentNodes) {
        const p = nodePositions[n.node_id];
        if (!p) continue;
        const dot = sEl("rect", {
          x: (p.x - originX) * s,
          y: (p.y - originY) * s,
          width: Math.max(3, NODE_W * s),
          height: Math.max(2, NODE_H * s),
          fill: `var(${STATUS_TOKENS[statusToken(n.status)]}, #6e7681)`,
          opacity: 0.8
        });
        minimap.appendChild(dot);
      }
    };
    minimap.addEventListener("click", (e) => {
      const ev = e;
      const r = minimap.getBoundingClientRect();
      if (fullW <= 0) return;
      const s = Math.min(170 / fullW, 104 / fullH);
      const wx = originX + (ev.clientX - r.left) / s;
      const wy = originY + (ev.clientY - r.top) / s;
      const { w, h } = viewSize();
      panX = w / 2 - wx * zoom;
      panY = h / 2 - wy * zoom;
      cameraSet = true;
      apply();
      updateMinimap();
    });
    let lastFrames = [];
    let selectedEl = null;
    let playbackIndex = null;
    const nodeEl = (id) => [...viewport.querySelectorAll(".dy-wf-node")].find((g) => g.getAttribute("data-node-id") === id) ?? null;
    const highlightRoute = (id) => {
      const related = /* @__PURE__ */ new Set([id]);
      const byId = new Map(currentNodes.map((node) => [node.node_id, node]));
      const walkUp = (nid) => {
        for (const dep of byId.get(nid)?.depends_on ?? []) if (!related.has(dep)) {
          related.add(dep);
          walkUp(dep);
        }
      };
      const walkDown = (nid) => {
        for (const node of currentNodes) if (node.depends_on.includes(nid) && !related.has(node.node_id)) {
          related.add(node.node_id);
          walkDown(node.node_id);
        }
      };
      walkUp(id);
      walkDown(id);
      viewport.querySelectorAll(".dy-wf-node").forEach((node) => node.classList.toggle("dy-wf-route-dim", !related.has(node.getAttribute("data-node-id") ?? "")));
      viewport.querySelectorAll(".dy-wf-edge").forEach((edge) => edge.classList.toggle("dy-wf-route-edge", related.has(edge.dataset.from ?? "") && related.has(edge.dataset.to ?? "")));
    };
    const openPassport = (n, g) => {
      if (selectedEl) selectedEl.classList.remove("dy-wf-selected");
      selectedEl = g ?? null;
      if (selectedEl) selectedEl.classList.add("dy-wf-selected");
      selectedId = n.node_id;
      handlers.onSelect?.(n.node_id);
      highlightRoute(n.node_id);
      passport.replaceChildren();
      const status = n.status ?? "pending";
      const head = elu("div", "dy-wf-pp-head");
      const meta = elu("div", "dy-wf-pp-meta");
      meta.append(elu("span", "dy-wf-passport-kind", PURPOSE_VISUALS[nodePurpose(n)].label), elu("span", `badge ${status}`, status));
      const close = elu("button", "dy-wf-passport-close", "\xD7");
      close.type = "button";
      close.setAttribute("aria-label", "Close step details");
      close.addEventListener("click", () => closePassport());
      head.append(meta, elu("h3", "", n.title), close);
      passport.appendChild(head);
      const facts = elu("dl", "dy-wf-pp-facts");
      const fact = (k, v, cls = "") => {
        const row = elu("div", `dy-wf-pp-fact ${cls}`.trim());
        row.append(elu("dt", "", k), elu("dd", "", v));
        facts.appendChild(row);
        return row;
      };
      const updated = lastRun?.updated_at ?? null;
      const lastConfirmed = fact("Last confirmed update", updated && isFinite(Date.parse(updated)) ? updated.replace("T", " ").slice(0, 16) + " UTC" : "unknown", "dy-wf-last-confirmed");
      lastConfirmed.setAttribute("data-last-confirmed", updated ?? "unknown");
      if (n.depends_on.length) fact("Depends on", n.depends_on.join(", "));
      if (n.assignee) fact("Assignee", n.assignee);
      if (n.evidence_refs.length) fact("Evidence", n.evidence_refs.join(", "));
      if (n.task_ref) fact("Work item", n.task_ref);
      passport.appendChild(facts);
      const nodeEvents = (lastRun?.timeline ?? []).filter((event) => event.node_id === n.node_id);
      if (nodeEvents.length) {
        passport.appendChild(elu("h4", "", "Status history"));
        const history = elu("ol", "dy-wf-node-history");
        for (const event of nodeEvents.slice(-6)) history.appendChild(elu("li", "", `${event.from_status ?? "\u2014"} \u2192 ${event.to_status}`));
        passport.appendChild(history);
      }
      const appendEditor = () => {
        if (!handlers.onEdit) return;
        const edit = elu("div", "dy-wf-edit");
        edit.appendChild(elu("h4", "", "Edit step"));
        const planned = editBase().find((item) => item.node_id === n.node_id);
        if (!planned) {
          edit.appendChild(elu("p", "dy-wf-pp-note", "This step is not in the latest version of the workflow, so it cannot be edited here."));
          passport.appendChild(edit);
          return;
        }
        const problem = elu("p", "dy-wf-pp-error");
        problem.setAttribute("role", "alert");
        problem.hidden = true;
        const say = (text) => {
          problem.textContent = text ?? "";
          problem.hidden = !text;
        };
        const field = (label2, input) => {
          const f = elu("label", "dy-wf-field");
          f.append(elu("span", "", label2), input);
          edit.appendChild(f);
        };
        const title = elu("input", "dy-wf-edit-title");
        title.value = planned.title;
        title.setAttribute("aria-label", "Node title");
        const deps = elu("input", "dy-wf-edit-deps");
        deps.value = planned.depends_on.join(", ");
        deps.placeholder = "e.g. build, tests";
        deps.setAttribute("aria-label", "Dependencies");
        const team = elu("input", "dy-wf-edit-team");
        team.value = planned.phase_team ?? "";
        team.placeholder = "phase team override";
        team.setAttribute("aria-label", "Phase team override");
        field("Title", title);
        field("Depends on (step IDs)", deps);
        field("Phase team", team);
        const save = elu("button", "dy-btn primary", "Save graph version");
        save.type = "button";
        save.addEventListener("click", async () => {
          const ids = new Set(deps.value.split(",").map((v) => v.trim()).filter(Boolean));
          ids.delete(n.node_id);
          save.disabled = true;
          save.textContent = "Saving\u2026";
          say(null);
          try {
            await runEdit((base) => base.some((item) => item.node_id === n.node_id) ? base.map((item) => item.node_id === n.node_id ? { ...item, title: title.value.trim() || item.title, depends_on: [...ids], phase_team: team.value.trim() || null } : item) : NOT_IN_PLAN);
            save.textContent = "Saved \u2713";
          } catch (error) {
            save.disabled = false;
            save.textContent = "Save failed \u2014 retry";
            say(`Couldn't save: ${errorText(error)}`);
          }
        });
        const remove = elu("button", "dy-btn danger", "Delete step");
        remove.type = "button";
        remove.dataset.wfDeleteStep = n.node_id;
        const confirmRow = elu("div", "dy-wf-delete-confirm");
        confirmRow.hidden = true;
        remove.addEventListener("click", () => {
          say(null);
          const verdict = deletePlan(editBase(), n.node_id);
          if (typeof verdict === "string") {
            confirmRow.hidden = true;
            say(verdict);
            return;
          }
          const base = editBase();
          const titleOf = (id) => `"${base.find((item) => item.node_id === id)?.title ?? id}"`;
          const target = base.find((item) => item.node_id === n.node_id);
          const followers = base.some((item) => item.depends_on.includes(n.node_id));
          const effect = !followers ? "" : target.depends_on.length ? ` The steps after it will follow ${target.depends_on.map(titleOf).join(" and ")} instead.` : " The steps after it will no longer wait for it.";
          const yes = elu("button", "dy-btn danger", "Delete");
          yes.type = "button";
          yes.dataset.wfDeleteConfirm = n.node_id;
          const no = elu("button", "dy-btn", "Cancel");
          no.type = "button";
          confirmRow.replaceChildren(elu("p", "", `Delete "${target.title}"?${effect}`), yes, no);
          confirmRow.hidden = false;
          no.addEventListener("click", () => {
            confirmRow.hidden = true;
            remove.focus();
          });
          yes.addEventListener("click", async () => {
            yes.disabled = true;
            no.disabled = true;
            try {
              await runEdit((latest) => deletePlan(latest, n.node_id));
              closePassport();
            } catch (error) {
              yes.disabled = false;
              no.disabled = false;
              say(`Couldn't delete: ${errorText(error)}`);
            }
          });
          yes.focus();
        });
        const actions = elu("div", "dy-wf-edit-actions");
        actions.append(save, remove);
        edit.append(actions, confirmRow, problem);
        passport.appendChild(edit);
      };
      if (n.task_ref) {
        const decisionState = n.kind === "gate" && n.status !== "done" && n.status !== "blocked" ? elu("span", "dy-wf-decision-state", "Awaiting decision") : null;
        if (decisionState) {
          decisionState.setAttribute("data-decision-state", "awaiting_decision");
          passport.appendChild(decisionState);
        }
        if (n.kind === "gate" && n.status !== "done" && n.status !== "blocked") {
          const row = elu("div", "dy-wf-actions");
          const approve = elu("button", "dy-btn primary", "Approve");
          const reject = elu("button", "dy-btn", "Reject");
          let inFlight = false;
          const setDecisionState = (state, text) => {
            if (!decisionState) return;
            decisionState.setAttribute("data-decision-state", state);
            decisionState.textContent = text;
          };
          const runAction = async (act, okLabel, pendingLabel, failPrefix, okState, pendingState) => {
            if (inFlight) return;
            inFlight = true;
            approve.disabled = true;
            reject.disabled = true;
            approve.textContent = pendingLabel;
            reject.textContent = pendingLabel;
            setDecisionState(pendingState, pendingLabel.replace(/…$/, "") + " in progress");
            try {
              await act(n.task_ref);
              approve.textContent = okLabel;
              reject.textContent = "Reject";
              approve.disabled = true;
              reject.disabled = true;
              setDecisionState(okState, okLabel);
            } catch {
              reject.textContent = "Reject";
              approve.textContent = failPrefix + " failed \u2014 retry";
              approve.disabled = false;
              reject.disabled = false;
              setDecisionState("failed", failPrefix + " failed \u2014 retry");
            } finally {
              inFlight = false;
            }
          };
          approve.addEventListener("click", () => {
            void runAction(handlers.onApprove, "Approved \u2713", "Approving\u2026", "Approve", "approved", "approved_pending");
          });
          reject.addEventListener("click", () => {
            void runAction(handlers.onReject, "Rejected \u2715", "Rejecting\u2026", "Reject", "rejected", "rejected_pending");
          });
          row.append(approve, reject);
          passport.appendChild(row);
        }
        if (n.kind !== "gate" && (n.status === "blocked" || n.status === "working") && handlers.onRetry) {
          const recovery = elu("div", "dy-wf-recovery");
          if (n.status === "blocked") {
            const retry = elu("button", "dy-btn", "Re-queue (retry)");
            retry.type = "button";
            retry.setAttribute("aria-label", `Re-queue ${n.title} through the canonical transition`);
            retry.addEventListener("click", () => {
              retry.disabled = true;
              try {
                handlers.onRetry(n.task_ref);
                retry.textContent = "Re-queued \u2713";
              } catch {
                retry.textContent = "Re-queue failed \u2014 retry";
                retry.disabled = false;
              }
            });
            recovery.appendChild(retry);
          }
          const unsupported = elu(
            "p",
            "dy-wf-unsupported dy-wf-pp-note",
            "Pause and cancel are not supported by the native execution contract \u2014 a running worker cannot be stopped from here."
          );
          unsupported.setAttribute("data-unsupported-controls", "pause,cancel");
          recovery.appendChild(unsupported);
          passport.appendChild(recovery);
        }
        if (handlers.onExpand) {
          const sec = elu("div", "dy-wf-expand");
          const head2 = elu("button", "dy-wf-expand-head", "\u25B8 Live detail");
          head2.setAttribute("aria-expanded", "false");
          const body = elu("div", "dy-wf-expand-body");
          body.style.display = "none";
          body.appendChild(elu("p", "dy-dim", "Loading live detail\u2026"));
          head2.addEventListener("click", () => {
            const isOpen = head2.getAttribute("aria-expanded") === "true";
            head2.setAttribute("aria-expanded", String(!isOpen));
            head2.textContent = isOpen ? "\u25B8 Live detail" : "\u25BE Live detail";
            body.style.display = isOpen ? "none" : "block";
            if (!isOpen && !body.dataset.loaded) {
              body.dataset.loaded = "1";
              handlers.onExpand(n.task_ref).then((data) => {
                body.replaceChildren();
                if (!data) {
                  body.appendChild(elu("p", "dy-dim", "Detail unavailable."));
                  return;
                }
                const kids = data.children;
                const doneCount = kids.filter((c) => (c.status ?? "") === "done").length;
                const total = kids.length;
                body.appendChild(elu("h4", "", "Progress"));
                const barWrap = elu("div", "dy-wf-progress");
                const barFill = elu("div", "dy-wf-progress-fill");
                const pct = total > 0 ? Math.round(doneCount / total * 100) : 0;
                barFill.style.width = pct + "%";
                barWrap.appendChild(barFill);
                body.appendChild(barWrap);
                body.appendChild(
                  elu("p", "dy-wf-progress-label", `${doneCount} of ${total} sub-tasks done (${pct}%)`)
                );
                body.appendChild(elu("h4", "", "Sub-tasks"));
                body.appendChild(
                  buildTasks(
                    kids.map((c) => ({
                      ref: c.ref,
                      title: c.title,
                      status: c.status,
                      assignee: c.assignee ?? null
                    })),
                    (ref) => passport.dispatchEvent(new CustomEvent("openwork", { detail: ref }))
                  )
                );
                body.appendChild(elu("h4", "", "Activity"));
                body.appendChild(
                  buildThread(data.history.map((h) => ({ ts: h.ts, text: h.text })))
                );
              }).catch(() => {
                body.replaceChildren(elu("p", "dy-dim", "Detail unavailable."));
              });
            }
          });
          sec.append(head2, body);
          passport.appendChild(sec);
        }
      } else {
        passport.appendChild(elu("p", "dy-wf-pp-note", "No canonical work bound to this step yet."));
      }
      appendEditor();
    };
    const buildThread = (items) => buildActivityThread(items, { decay: true });
    const buildTasks = (tasks, onOpen) => buildTaskListMini(tasks, onOpen);
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    svg.addEventListener("pointerdown", (e) => {
      if (e.target?.closest?.(".dy-wf-node")) return;
      dragging = true;
      host.classList.add("dy-wf-panning");
      lastX = e.clientX;
      lastY = e.clientY;
      const target = e.target;
      const captureEl = target && target.closest && target.closest("g.dy-wf-node");
      const cap = captureEl ?? svg;
      try {
        cap.setPointerCapture(e.pointerId);
      } catch {
      }
    });
    svg.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      if (dragSession) return;
      const ev = e;
      const { sx, sy } = screenScale();
      panX += (ev.clientX - lastX) / sx;
      panY += (ev.clientY - lastY) / sy;
      lastX = ev.clientX;
      lastY = ev.clientY;
      cameraSet = true;
      apply();
      updateMinimap();
    });
    svg.addEventListener("pointerup", (e) => {
      if (dragSession) {
        endDragSession(e, true);
        dragging = false;
        host.classList.remove("dy-wf-panning");
        return;
      }
      if (connectFrom) {
        const target = e.target?.closest?.("[data-node-id]");
        endConnectGesture(target?.getAttribute("data-node-id") ?? null);
      }
      dragging = false;
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {
      }
    });
    svg.addEventListener("pointercancel", (e) => {
      if (dragSession) endDragSession(e, false);
      cancelConnect();
      dragging = false;
      host.classList.remove("dy-wf-panning");
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {
      }
    });
    let wheelSettle = null;
    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const ev = e;
      const rect = svg.getBoundingClientRect();
      const { sx, sy } = screenScale();
      const cx = (ev.clientX - rect.left) / sx;
      const cy = (ev.clientY - rect.top) / sy;
      cameraSet = true;
      host.classList.add("dy-wf-panning");
      if (wheelSettle) clearTimeout(wheelSettle);
      wheelSettle = setTimeout(() => host.classList.remove("dy-wf-panning"), 160);
      const factor = ev.deltaY < 0 ? ZOOM_IN : ZOOM_OUT;
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
      const k = next / zoom;
      panX = cx - (cx - panX) * k;
      panY = cy - (cy - panY) * k;
      zoom = next;
      apply();
      updateMinimap();
    }, { passive: false });
    const closePassport = () => {
      passport.replaceChildren();
      if (selectedEl) selectedEl.classList.remove("dy-wf-selected");
      selectedEl = null;
      if (selectedId !== null) {
        selectedId = null;
        handlers.onSelect?.(null);
      }
      clearRoute();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") closePassport();
    };
    document.addEventListener("keydown", onKeyDown);
    let flowT = 0;
    let flowStopped = false;
    const flowTimer = setInterval(() => {
      if (flowStopped) return;
      if (document.hidden || prefersReducedMotion()) {
        flowStopped = true;
        viewport.querySelectorAll(".dy-wf-flowdot").forEach((d) => {
          d.setAttribute("opacity", "0");
        });
        return;
      }
      flowT = (flowT + 0.03) % 1;
      const edgeMap = /* @__PURE__ */ new Map();
      viewport.querySelectorAll("path.dy-wf-edge").forEach((p) => {
        const key = (p.dataset.from ?? "") + ">" + (p.dataset.to ?? "");
        const dot = p.nextElementSibling;
        if (dot && dot.classList.contains("dy-wf-flowdot")) edgeMap.set(key, { path: p, dot });
      });
      const doneIds = new Set(
        currentNodes.filter((n) => n.status === "done").map((n) => n.node_id)
      );
      viewport.querySelectorAll("path.dy-wf-edge").forEach((p) => {
        const to = currentNodes.find((n) => n.node_id === p.dataset.to);
        const fromDone = doneIds.has(p.dataset.from ?? "");
        const meaning = EDGE_MEANINGS[p.dataset.meaning ?? DEFAULT_EDGE_MEANING];
        const active = !!to && to.status !== "pending" && fromDone;
        p.classList.toggle("active", active);
        if (meaning) {
          p.setAttribute("marker-end", `url(#${active ? meaning.activeMarker : meaning.marker})`);
        }
      });
      edgeMap.forEach(({ path, dot }) => {
        if (!path.classList.contains("active")) {
          dot.setAttribute("opacity", "0");
          return;
        }
        let pt = null;
        try {
          const L = path.getTotalLength();
          if (L > 0) pt = path.getPointAtLength(L * flowT);
        } catch {
          pt = null;
        }
        if (!pt || !isFinite(pt.x) || !isFinite(pt.y)) {
          const nums = (path.getAttribute("d") || "").match(/-?\d+(\.\d+)?/g) ?? [];
          if (nums.length >= 4 && nums[0] !== void 0 && nums[1] !== void 0) {
            const ax = +(nums[0] ?? 0), ay = +(nums[1] ?? 0);
            const mx = +(nums[2] ?? ax), my = +(nums[3] ?? ay);
            const bx = +(nums[nums.length - 2] ?? ax), by = +(nums[nums.length - 1] ?? ay);
            pt = flowT < 0.5 ? { x: ax + (mx - ax) * flowT * 2, y: ay + (my - ay) * flowT * 2 } : { x: mx + (bx - mx) * (flowT - 0.5) * 2, y: my + (by - my) * (flowT - 0.5) * 2 };
          }
        }
        if (pt && isFinite(pt.x) && isFinite(pt.y)) {
          dot.setAttribute("cx", String(pt.x));
          dot.setAttribute("cy", String(pt.y));
          dot.setAttribute("opacity", "0.9");
        } else dot.setAttribute("opacity", "0");
      });
    }, 40);
    let timer = null;
    let lastSig = "";
    let lastTimelineCount = 0;
    let pollTicket = 0;
    let appliedTicket = 0;
    let disposed = false;
    const tickTimers = () => {
      viewport.querySelectorAll("text.dy-wf-timer").forEach((t) => {
        const node = currentNodes.find((n) => n.node_id === t.dataset.for);
        if (!node || node.status !== "working") return;
        t.textContent = `Workflow: ${elapsedLabel(currentStartedAt)}`;
      });
    };
    let currentStartedAt = null;
    const clockTimer = setInterval(tickTimers, 1e3);
    const onVisibility = () => {
      if (!document.hidden) flowStopped = false;
    };
    document.addEventListener("visibilitychange", onVisibility);
    const pollOnce = () => {
      const ticket = ++pollTicket;
      fetchRuns().then(async (runs) => {
        if (disposed || ticket < appliedTicket) return;
        appliedTicket = ticket;
        const latest = runs && runs.length ? runs[0] : null;
        if (latest?.run_key && latest.status !== "definition" && handlers.fetchTimeline) {
          try {
            const history = await handlers.fetchTimeline(projectId, runName, latest.run_key);
            latest.timeline = (history.events ?? []).map((event) => ({
              seq: Number(event.seq ?? 0),
              node_id: String(event.node_id),
              from_status: event.from_status == null ? null : String(event.from_status),
              to_status: String(event.to_status ?? "pending"),
              ts: event.ts == null ? void 0 : String(event.ts)
            }));
          } catch {
          }
        }
        const sig = JSON.stringify(latest?.nodes.map((n) => [n.node_id, n.status]) ?? []);
        if (latest?.timeline?.length && latest.timeline.length > lastTimelineCount) {
          feedLog(`Run timeline: ${latest.timeline.length} observed events`);
          lastTimelineCount = latest.timeline.length;
        }
        if (sig !== lastSig) {
          if (lastSig !== "") {
            const prev = /* @__PURE__ */ new Map();
            try {
              JSON.parse(lastSig).forEach(([id, st]) => prev.set(id, st));
            } catch {
            }
            (latest?.nodes ?? []).forEach((n) => {
              const old = prev.get(n.node_id);
              if (old !== void 0 && old !== n.status) {
                feedLog(`${n.title}: ${old ?? "pending"} \u2192 ${n.status ?? "pending"}`);
              }
            });
          }
          lastSig = sig;
        }
        const frameSig = JSON.stringify(latest ?? null);
        if (frameSig !== lastFrameSig) {
          playbackIndex = null;
          optimisticBase = null;
          render(latest);
          lastFrameSig = frameSig;
        }
        currentStartedAt = latest?.started_at ?? null;
        tickTimers();
        setStale(false);
      }).catch(() => {
        if (disposed || ticket < appliedTicket) return;
        appliedTicket = ticket;
        setStale(true);
      });
    };
    let lastFrameSig = "";
    const setStale = (on) => {
      const existing = wrap.querySelector(".dy-wf-stale");
      if (on && !existing) {
        const badge = elu("div", "dy-wf-stale", "stale \u2014 last refresh failed, showing last known state");
        wrap.insertBefore(badge, wrap.firstChild);
      } else if (!on && existing) existing.remove();
    };
    pollOnce();
    if (pollMs > 0) timer = setInterval(pollOnce, pollMs);
    const onResize = () => {
      if (disposed || !lastRun) return;
      if (canvasWindow.innerWidth <= 640 !== previousMobileLayout) {
        cameraSet = false;
        render(lastRun);
      } else if (!cameraSet) {
        fitView();
        cameraSet = svg.clientWidth > 0;
      } else updateMinimap();
    };
    canvasWindow.addEventListener("resize", onResize);
    let lastHostWidth = host.clientWidth;
    let resizeFrame = 0;
    const RO = canvasWindow.ResizeObserver;
    const hostObserver = RO ? new RO(() => {
      const w = host.clientWidth;
      if (w === lastHostWidth) return;
      lastHostWidth = w;
      if (resizeFrame) canvasWindow.cancelAnimationFrame(resizeFrame);
      resizeFrame = canvasWindow.requestAnimationFrame(() => {
        resizeFrame = 0;
        onResize();
      });
    }) : null;
    hostObserver?.observe(host);
    disposers.push(() => {
      disposed = true;
      if (timer) clearInterval(timer);
      if (flowTimer) clearInterval(flowTimer);
      clearInterval(clockTimer);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibility);
      canvasWindow.removeEventListener("resize", onResize);
      hostObserver?.disconnect();
      if (resizeFrame) canvasWindow.cancelAnimationFrame(resizeFrame);
      host.replaceChildren();
    });
    const dispose = () => {
      disposers.forEach((d) => d());
      disposers = [];
    };
    return Object.assign(dispose, { refresh: () => {
      if (!disposed) pollOnce();
    } });
  }

  // src/app.ts
  function applyFleetDeepLink({ link, s, tabs, go }) {
    const sep = link.indexOf(":");
    if (sep <= 0) return;
    const screen = link.slice(0, sep);
    const rest = link.slice(sep + 1);
    const slash = rest.indexOf("/");
    const objectKind = slash >= 0 ? rest.slice(0, slash) : "";
    const objectId = slash >= 0 ? rest.slice(slash + 1) : rest;
    const select = (tab) => {
      s.tab = tab;
      for (const t of tabs) {
        const active = t.dataset.tab === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
      }
      go();
    };
    if (screen === "s4") {
      select("inbox");
      return;
    }
    if (screen === "s6" && objectKind === "initiative") {
      select("inbox");
      return;
    }
    if (screen === "s2") {
      if (objectKind === "work" && objectId) {
        s.selectedWorkRef = objectId;
        select("work");
        return;
      }
      if (objectKind === "project" && objectId) {
        s.projectId = objectId;
        select("work");
        return;
      }
      select("work");
      return;
    }
    if (screen === "s1") {
      if (objectKind === "project" && objectId) s.projectId = objectId;
      select("dashboard");
      return;
    }
    if (screen === "s5") {
      select("workflow");
      return;
    }
    select("dashboard");
  }
  function initApp(sdk, root) {
    let deepLinkView = null;
    const hash = typeof window !== "undefined" && window.location ? window.location.hash : "";
    const deepMatch = /^#\/work\/(.+)$/.exec(hash || "");
    if (deepMatch) {
      try {
        deepLinkView = decodeURIComponent(deepMatch[1]);
      } catch {
        deepLinkView = deepMatch[1];
      }
    }
    const state = {
      api: createApi(sdk),
      tab: deepLinkView ? "work" : "dashboard",
      workLayout: "board",
      pendingView: deepLinkView
    };
    let renderSeq = 0;
    let disposed = false;
    const render = async (main2, s) => {
      const gen = ++renderSeq;
      main2.replaceChildren(loadingEl());
      try {
        if (disposed || gen !== renderSeq) return;
        const stale = () => disposed || gen !== renderSeq || !main2.isConnected;
        if (s.tab === "dashboard") await renderDashboard(main2, s, stale);
        else if (s.tab === "work") await renderWork(main2, s, stale);
        else if (s.tab === "delivery") await renderDelivery(main2, s, stale);
        else if (s.tab === "inbox") await renderInbox(main2, s, stale);
        else if (s.tab === "workflow") await renderWorkflow(main2, s, stale);
        else if (s.tab === "notifications")
          await renderNotifications(main2, s, stale);
        else renderOnboard(main2, s);
      } catch (err) {
        if (disposed || gen !== renderSeq || !main2.isConnected) return;
        main2.replaceChildren(
          textEl("div", "dy-error", `Dockyard backend unreachable: ${String(err)}`)
        );
      }
    };
    root.replaceChildren();
    root.className = "dy-root dy-wf-scope";
    const header = document.createElement("header");
    header.className = "dy-header";
    const brand = document.createElement("div");
    brand.className = "dy-brand";
    const mark = document.createElement("span");
    mark.className = "dy-mark";
    mark.setAttribute("aria-hidden", "true");
    const h1 = document.createElement("h1");
    h1.textContent = "Hermes Dockyard";
    brand.append(mark, h1);
    const nav = document.createElement("nav");
    nav.className = "dy-tabs";
    nav.setAttribute("role", "tablist");
    const TABS = [
      { id: "dashboard", label: "Dashboard" },
      { id: "work", label: "Work" },
      { id: "delivery", label: "Delivery", feature: "initiatives" },
      { id: "inbox", label: "Approval Inbox", feature: "inbox" },
      { id: "workflow", label: "Workflow", feature: "workflow_canvas" },
      { id: "notifications", label: "Notifications", feature: "notifications" },
      { id: "onboard", label: "Onboard Project" }
    ];
    let featureMap = null;
    const featureOn = (name) => !name || !featureMap || featureMap[name] !== false;
    const hideDisabledTabs = () => {
      for (const t of TABS) {
        const btn = nav.querySelector(`button[data-tab="${t.id}"]`);
        if (btn) btn.hidden = !featureOn(t.feature);
      }
    };
    for (const t of TABS) {
      const b = document.createElement("button");
      b.dataset.tab = t.id;
      if (t.feature) b.dataset.feature = t.feature;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(t.id === "dashboard"));
      b.textContent = t.label;
      if (t.id === "dashboard") b.classList.add("active");
      nav.appendChild(b);
    }
    header.append(brand, nav);
    root.appendChild(header);
    const main = document.createElement("main");
    main.className = "dy-main";
    root.appendChild(main);
    const tabs = Array.from(header.querySelectorAll("button[data-tab]"));
    tabs.forEach(
      (b) => b.addEventListener("click", () => {
        state.tab = b.dataset.tab;
        tabs.forEach((x) => {
          x.classList.toggle("active", x === b);
          x.setAttribute("aria-selected", String(x === b));
        });
        void render(main, state);
      })
    );
    const navigateDeepLink = (link) => {
      applyFleetDeepLink({
        link,
        s: state,
        tabs,
        go: () => void render(main, state)
      });
    };
    state.openFleetLink = navigateDeepLink;
    void render(main, state);
    const activeTab = state.tab;
    void (async () => {
      try {
        const dash = await state.api.dashboard();
        const first = (dash.projects ?? [])[0]?.id;
        if (!first) return;
        const res = await state.api.features(first);
        featureMap = res.features ?? {};
        hideDisabledTabs();
        if (!featureOn(TABS.find((t) => t.id === activeTab)?.feature)) {
          state.tab = "dashboard";
          const dashBtn = nav.querySelector('button[data-tab="dashboard"]');
          if (dashBtn) {
            nav.querySelectorAll("button").forEach((x) => {
              x.classList.toggle("active", x === dashBtn);
              x.setAttribute("aria-selected", String(x === dashBtn));
            });
          }
          void render(main, state);
        }
      } catch {
      }
    })();
    return () => {
      disposed = true;
      root.replaceChildren();
    };
  }
  async function renderDashboard(main, s, isStale) {
    const view = await s.api.portfolio();
    const projects = view.projects ?? [];
    if (projects.length === 0) {
      const empty = textEl("div", "dy-empty", "");
      const p = document.createElement("p");
      p.textContent = "No projects yet.";
      const btn = document.createElement("button");
      btn.className = "dy-btn";
      btn.id = "dy-go-onboard";
      btn.textContent = "Onboard your first project";
      btn.addEventListener("click", () => {
        document.querySelector('[data-tab="onboard"]')?.click();
      });
      empty.append(p, btn);
      main.replaceChildren(empty);
      return;
    }
    if (isStale()) return;
    const wrap = document.createElement("div");
    wrap.className = "dy-portfolio";
    const atRisk = projects.filter((p) => p.status === "at_risk").map((p) => p.project_id);
    const stalled = projects.filter((p) => p.status === "stalled").map((p) => p.project_id);
    const at = view.attention ?? { overdue_items: 0, blocked_items: 0, overdue_milestones: 0 };
    const hasAttention = atRisk.length > 0 || stalled.length > 0 || (at.blocked_items ?? 0) > 0 || (at.overdue_items ?? 0) > 0 || (at.overdue_milestones ?? 0) > 0;
    if (hasAttention) {
      const strip = document.createElement("section");
      strip.className = "dy-card dy-attention";
      strip.appendChild(textEl("h2", "", "Needs attention"));
      const lines = document.createElement("ul");
      lines.className = "dy-attention-list";
      const addLine = (cls, text) => {
        const li = document.createElement("li");
        li.className = cls;
        li.textContent = text;
        lines.appendChild(li);
      };
      if (atRisk.length > 0) addLine("bad", `At risk: ${atRisk.join(", ")}`);
      if (stalled.length > 0) addLine("warn", `Stalled: ${stalled.join(", ")}`);
      if ((at.blocked_items ?? 0) > 0) addLine("warn", `Blocked items: ${at.blocked_items}`);
      if ((at.overdue_items ?? 0) > 0) addLine("bad", `Overdue items: ${at.overdue_items}`);
      if ((at.overdue_milestones ?? 0) > 0) addLine("bad", `Overdue milestones: ${at.overdue_milestones}`);
      strip.appendChild(lines);
      wrap.appendChild(strip);
    }
    const groups = view.groups;
    if (groups) {
      const groupDefs = [
        { key: "decisions", label: "Decisions waiting on you", cls: "dy-group-decisions" },
        { key: "interventions", label: "Interventions", cls: "dy-group-interventions" },
        { key: "informational", label: "Informational", cls: "dy-group-informational" }
      ];
      for (const g of groupDefs) {
        const rows = groups[g.key] ?? [];
        if (rows.length === 0) continue;
        const card = document.createElement("section");
        card.className = `dy-card dy-fleet-group ${g.cls}`;
        card.appendChild(textEl("h2", "", `${g.label} (${rows.length})`));
        const list = document.createElement("ul");
        list.className = "dy-fleet-group-list";
        for (const item of rows) {
          const li = document.createElement("li");
          const title = textEl(
            "span",
            "dy-fleet-item-title",
            `${item.project} \xB7 ${item.title}`
          );
          li.appendChild(title);
          const bits = [];
          if (item.cause) bits.push(item.cause);
          if (item.detail) bits.push(item.detail);
          if (item.risk) bits.push(`risk: ${item.risk}`);
          if (item.owner) bits.push(`owner: ${item.owner}`);
          if (typeof item.age_days === "number") bits.push(`age: ${item.age_days}d`);
          if (item.severity) bits.push(`sev: ${item.severity}`);
          if (bits.length > 0) li.appendChild(textEl("span", "dy-dim", ` \u2014 ${bits.join(" \xB7 ")}`));
          if (item.next_action) li.appendChild(textEl("div", "dy-dim", item.next_action));
          const link = item.deep_link;
          if (link) {
            const open = document.createElement("button");
            open.className = "dy-btn dy-fleet-open";
            open.textContent = "Open";
            open.dataset.deepLink = link;
            open.addEventListener("click", () => {
              s.openFleetLink?.(link);
            });
            li.appendChild(open);
          }
          list.appendChild(li);
        }
        card.appendChild(list);
        wrap.appendChild(card);
      }
    }
    const section = document.createElement("section");
    section.className = "dy-card";
    section.appendChild(textEl("h2", "", "Projects"));
    const table = document.createElement("table");
    table.className = "dy-table";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    for (const h of ["Project", "Status", "Done", "Open", "Blocked", "Next milestone", "Last activity"]) {
      hr.appendChild(textEl("th", "", h));
    }
    thead.appendChild(hr);
    const tbody = document.createElement("tbody");
    for (const p of projects) {
      const tr = document.createElement("tr");
      const tdId = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = String(p.project_id);
      tdId.appendChild(strong);
      const evidenceButton = document.createElement("button");
      evidenceButton.textContent = "Objective evidence";
      evidenceButton.dataset.objectivesProject = p.project_id;
      const evidencePanel = document.createElement("section");
      evidencePanel.className = "dy-card";
      evidencePanel.hidden = true;
      evidenceButton.addEventListener("click", () => {
        evidencePanel.hidden = !evidencePanel.hidden;
        if (!evidencePanel.hidden) void renderObjectiveEvidence(evidencePanel, s.api, p.project_id);
      });
      tdId.appendChild(evidenceButton);
      wrap.appendChild(evidencePanel);
      const items = p.items ?? { total: 0, done: 0, blocked: 0, overdue: 0 };
      const ms = p.next_milestone;
      let msText = "\u2014";
      if (ms) msText = ms.overdue ? `${ms.name} (overdue)` : ms.name;
      const act = p.last_activity ? p.last_activity.slice(0, 10) : "\u2014";
      const open = (items.total ?? 0) - (items.done ?? 0);
      const blocked = items.blocked ?? 0;
      tr.append(
        tdId,
        textEl("td", `dy-status dy-status-${p.status}`, STATUS_LABEL[p.status] ?? p.status),
        textEl("td", "num", String(items.done ?? 0)),
        textEl("td", "num", String(open)),
        textEl("td", blocked > 0 ? "num warn" : "num", String(blocked)),
        textEl("td", ms?.overdue ? "bad" : "", msText),
        textEl("td", "dy-dim", act)
      );
      tbody.appendChild(tr);
    }
    table.append(thead, tbody);
    const mix = view.mix ?? { todo: 0, in_progress: 0, blocked: 0, done: 0 };
    const dim = textEl(
      "p",
      "dy-dim",
      `${projects.length} projects \xB7 ${mix.done} done \xB7 ${mix.in_progress} in progress \xB7 ${mix.todo} backlog \xB7 ${mix.blocked} blocked`
    );
    section.append(table, dim);
    main.replaceChildren(wrap);
    wrap.appendChild(section);
    section.appendChild(await buildFeaturesPanel(
      s,
      projects.map((p) => ({ id: p.project_id })),
      () => void renderDashboard(main, s, isStale)
    ));
  }
  var STATUS_LABEL = {
    on_track: "On track",
    at_risk: "At risk",
    stalled: "Stalled",
    idle: "Idle"
  };
  var FEATURE_LABELS = {
    workflow_canvas: "Workflow canvas",
    milestones: "Milestones",
    initiatives: "Initiatives & delivery",
    inbox: "Approval inbox",
    notifications: "Notifications",
    saved_views: "Saved views"
  };
  async function buildFeaturesPanel(s, projects, rerender) {
    const box = document.createElement("details");
    box.className = "dy-features";
    box.appendChild(textEl("summary", "", "Features"));
    const body = textEl("div", "dy-features-body", "Loading features...");
    box.appendChild(body);
    const refreshTabVisibility = () => {
      document.querySelectorAll(".dy-tabs button[data-tab]").forEach((btn) => {
        const feature = btn.dataset.feature;
        if (!feature) return;
        btn.hidden = (s.featureMap ?? {})[feature] === false;
      });
    };
    try {
      const projectId = projects[0]?.id;
      if (!projectId) return box;
      if (!s.featureMap) {
        const res = await s.api.features(projectId);
        s.featureMap = res.features ?? {};
      }
      const list = document.createElement("div");
      list.className = "dy-feature-list";
      for (const [name, on] of Object.entries(s.featureMap)) {
        const row = document.createElement("div");
        row.className = "dy-feature-row";
        const label2 = textEl("span", "dy-feature-name", FEATURE_LABELS[name] ?? name);
        const stateTxt = textEl("span", "dy-dim", on ? "On" : "Off");
        const btn = workLayoutButton(on ? "Disable" : "Enable", false);
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          const nowOn = (s.featureMap ?? {})[name] !== false;
          try {
            const updated = await s.api.updateFeatures(projectId, { [name]: !nowOn });
            s.featureMap = updated.features ?? {};
            stateTxt.textContent = !nowOn ? "On" : "Off";
            btn.textContent = !nowOn ? "Disable" : "Enable";
            btn.disabled = false;
            refreshTabVisibility();
          } catch {
            btn.textContent = "Failed";
            btn.disabled = false;
          }
        });
        row.append(label2, stateTxt, btn);
        list.appendChild(row);
      }
      body.replaceChildren(list);
      const note = textEl(
        "p",
        "dy-dim",
        "Turning a feature off hides it and blocks its API. No data is ever deleted; re-enabling restores everything."
      );
      body.appendChild(note);
    } catch {
      body.textContent = "Feature settings are unavailable.";
    }
    return box;
  }
  async function renderWork(main, s, isStale) {
    const dashboard = await s.api.dashboard();
    const projects = dashboard.projects ?? [];
    if (projects.length === 0) {
      main.replaceChildren(textEl("div", "dy-empty", "Onboard a project to view work."));
      return;
    }
    const projectId = s.projectId && projects.some((p) => p.id === s.projectId) ? s.projectId : projects[0].id;
    s.projectId = projectId;
    const [workResponse, backlogResponse, viewsResponse] = await Promise.all([
      s.api.workItems(projectId),
      s.api.backlog(projectId),
      s.api.views(projectId)
    ]);
    if (isStale()) return;
    const items = (workResponse.work_items ?? []).filter((item) => item.status !== "archived");
    const ranks = new Map(
      (backlogResponse.backlog ?? []).map((row) => [row.item_ref, row])
    );
    const toolbar = document.createElement("div");
    toolbar.className = "dy-work-toolbar";
    const projectSelect = document.createElement("select");
    projectSelect.setAttribute("aria-label", "Project");
    projects.forEach((project) => {
      const option = textEl("option", "", project.id, project.id);
      option.selected = project.id === projectId;
      projectSelect.appendChild(option);
    });
    const boardButton = workLayoutButton("Board", s.workLayout === "board");
    const tableButton = workLayoutButton("Backlog table", s.workLayout === "table");
    const savedViews = document.createElement("select");
    savedViews.setAttribute("aria-label", "Saved view");
    savedViews.appendChild(textEl("option", "", "Saved views", ""));
    (viewsResponse.views ?? []).forEach((view) => {
      savedViews.appendChild(textEl("option", "", view.name, view.name));
    });
    const timelineButton = workLayoutButton("Timeline unavailable", false);
    timelineButton.disabled = true;
    timelineButton.title = "Timeline requires canonical scheduling data.";
    const saveButton = workLayoutButton("Save view", false);
    toolbar.append(
      projectSelect,
      savedViews,
      boardButton,
      tableButton,
      timelineButton,
      saveButton
    );
    const content = document.createElement("div");
    const detail = document.createElement("aside");
    detail.className = "dy-work-detail";
    detail.appendChild(textEl("p", "dy-dim", "Select a work item to inspect it."));
    const openDetail = (item) => {
      detail.replaceChildren(loadingEl());
      void s.api.workDetail(projectId, item.ref).then((result) => {
        if (isStale()) return;
        const current = result.work_item;
        const history = result.history.length ? textEl("pre", "dy-history", JSON.stringify(result.history, null, 2)) : textEl("p", "dy-dim", "No canonical history is available.");
        const editor = document.createElement("div");
        editor.className = "dy-work-editor";
        const titleInput = workInput("Title", current.title);
        const typeSelect = document.createElement("select");
        typeSelect.setAttribute("aria-label", "Type");
        ["task", "bug", "spike", "subtask", "gate"].forEach((kind) => {
          const option = textEl("option", "", kind, kind);
          option.selected = kind === (current.kind ?? "task");
          typeSelect.appendChild(option);
        });
        const bodyInput = document.createElement("textarea");
        bodyInput.setAttribute("aria-label", "Body");
        bodyInput.value = current.body ?? "";
        const assigneeInput = workInput("Assignee", current.assignee ?? "");
        const labelsInput = workInput("Labels, comma separated", (current.labels ?? []).join(", "));
        const estimateInput = workInput(
          "Estimate days",
          current.estimate_days == null ? "" : String(current.estimate_days)
        );
        estimateInput.type = "number";
        estimateInput.min = "0";
        estimateInput.step = "0.5";
        const dueInput = workInput("Due date", current.due ?? "");
        dueInput.type = "date";
        const save = workLayoutButton("Save changes", false);
        const feedback = textEl("p", "dy-dim", "");
        save.addEventListener("click", async () => {
          save.disabled = true;
          feedback.textContent = "Saving...";
          try {
            const updated = await s.api.updateWork(projectId, current.ref, {
              title: titleInput.value,
              type: typeSelect.value,
              body: bodyInput.value || null,
              labels: labelsInput.value.split(",").map((v) => v.trim()).filter(Boolean),
              estimate_days: estimateInput.value ? Number(estimateInput.value) : null,
              due: dueInput.value || null
            });
            if ((current.assignee ?? "") !== assigneeInput.value.trim()) {
              await s.api.assignWork(
                projectId,
                current.ref,
                assigneeInput.value.trim() || null
              );
            }
            feedback.textContent = "Saved.";
            openDetail(updated);
          } catch {
            feedback.textContent = "Save failed.";
            save.disabled = false;
          }
        });
        editor.append(
          titleInput,
          typeSelect,
          bodyInput,
          assigneeInput,
          labelsInput,
          estimateInput,
          dueInput,
          save,
          feedback
        );
        const dependencyEditor = document.createElement("div");
        dependencyEditor.className = "dy-dependency-editor";
        dependencyEditor.appendChild(textEl("h3", "", "Dependencies"));
        result.dependencies.forEach((dependency) => {
          const row = document.createElement("div");
          row.className = "dy-dependency-row";
          row.appendChild(textEl("span", "", `${dependency.ref}: ${dependency.title}`));
          const remove = workLayoutButton("Remove", false);
          remove.addEventListener("click", async () => {
            remove.disabled = true;
            try {
              await s.api.removeDependency(projectId, current.ref, dependency.ref);
              openDetail(current);
            } catch {
              remove.textContent = "Failed";
              remove.disabled = false;
            }
          });
          row.appendChild(remove);
          dependencyEditor.appendChild(row);
        });
        const dependencyInput = workInput("Dependency task ref", "");
        const addDependency = workLayoutButton("Add dependency", false);
        addDependency.addEventListener("click", async () => {
          const dependencyRef = dependencyInput.value.trim();
          if (!dependencyRef) return;
          addDependency.disabled = true;
          try {
            await s.api.addDependency(projectId, current.ref, dependencyRef);
            openDetail(current);
          } catch {
            addDependency.textContent = "Add failed";
            addDependency.disabled = false;
          }
        });
        dependencyEditor.append(dependencyInput, addDependency);
        detail.replaceChildren(
          textEl("h2", "", current.title),
          textEl("p", "dy-dim", `${current.ref} \xB7 ${current.kind ?? "task"} \xB7 ${current.status}`),
          textEl("p", "dy-work-body", current.body || "No body supplied."),
          textEl("p", "", `Assignee: ${current.assignee || "Unassigned"}`),
          current.status === "blocked" ? textEl("p", "dy-warning", current.blocked_reason || "Blocked; no reason supplied.") : textEl("span", "", ""),
          textEl("p", "", `Parent: ${result.parent?.ref ?? "None"} \xB7 Children: ${result.children.length}`),
          editor,
          dependencyEditor,
          textEl("h3", "", "History"),
          history
        );
      }).catch(() => {
        detail.replaceChildren(textEl("p", "dy-error", "Work-item detail is unavailable."));
      });
    };
    const draw = () => {
      content.replaceChildren();
      if (s.workLayout === "board") {
        content.className = "dy-board";
        [
          ["backlog", "Backlog"],
          ["in_progress", "In progress"],
          ["in_review", "Review"],
          ["blocked", "Blocked"],
          ["done", "Done"],
          ["unknown", "Unknown status"]
        ].forEach(([status, label2]) => {
          const column = document.createElement("section");
          column.className = "dy-board-column";
          const matching = items.filter((item) => {
            const known = ["backlog", "in_progress", "in_review", "blocked", "done"];
            return known.includes(item.status) ? item.status === status : status === "unknown";
          });
          column.appendChild(textEl("h3", "", `${label2} (${matching.length})`));
          matching.forEach((item) => column.appendChild(workCard(item, openDetail)));
          content.appendChild(column);
        });
      } else {
        content.className = "dy-card";
        const table = document.createElement("table");
        table.className = "dy-table";
        const head = document.createElement("tr");
        ["Rank", "Item", "Status", "Assignee", "Reason"].forEach((label2) => head.appendChild(textEl("th", "", label2)));
        const thead = document.createElement("thead");
        thead.appendChild(head);
        const tbody = document.createElement("tbody");
        [...items].sort((a, b) => (ranks.get(a.ref)?.rank ?? 999999) - (ranks.get(b.ref)?.rank ?? 999999)).forEach((item) => {
          const rank = ranks.get(item.ref);
          const row = document.createElement("tr");
          const itemCell = document.createElement("td");
          itemCell.appendChild(workLink(item, openDetail));
          row.append(
            textEl("td", "num", rank ? String(rank.rank) : "Unranked"),
            itemCell,
            textEl("td", "", item.status),
            textEl("td", "", item.assignee || "Unassigned"),
            textEl("td", "", rank?.priority_reason || "")
          );
          tbody.appendChild(row);
        });
        table.append(thead, tbody);
        content.appendChild(table);
      }
      boardButton.classList.toggle("active", s.workLayout === "board");
      tableButton.classList.toggle("active", s.workLayout === "table");
    };
    projectSelect.addEventListener("change", () => {
      s.projectId = projectSelect.value;
      void renderWork(main, s, isStale);
    });
    boardButton.addEventListener("click", () => {
      s.workLayout = "board";
      draw();
    });
    tableButton.addEventListener("click", () => {
      s.workLayout = "table";
      draw();
    });
    savedViews.addEventListener("change", () => {
      const view = (viewsResponse.views ?? []).find((row) => row.name === savedViews.value);
      if (view?.layout === "board" || view?.layout === "table") {
        s.workLayout = view.layout;
        s.pendingView = view.name;
        draw();
      }
    });
    if (s.pendingView) {
      const view = (viewsResponse.views ?? []).find(
        (row) => row.name === s.pendingView
      );
      if (view) {
        if (view.layout === "board" || view.layout === "table") {
          s.workLayout = view.layout;
        }
        savedViews.value = view.name;
      }
      s.pendingView = null;
    }
    saveButton.addEventListener("click", async () => {
      saveButton.disabled = true;
      try {
        await s.api.saveView(projectId, `${projectId} ${s.workLayout}`, s.workLayout);
        saveButton.textContent = "Saved";
      } catch {
        saveButton.textContent = "Save failed";
      } finally {
        saveButton.disabled = false;
      }
    });
    draw();
    const milestonesSection = buildMilestonesPanel(s, projectId, items, () => renderWork(main, s, isStale));
    const split = document.createElement("div");
    split.className = "dy-work-split";
    split.append(content, detail);
    const section = document.createElement("section");
    section.append(toolbar, milestonesSection, split);
    main.replaceChildren(section);
    if (s.selectedWorkRef) {
      const selected = items.find((item) => item.ref === s.selectedWorkRef);
      s.selectedWorkRef = void 0;
      if (selected) openDetail(selected);
    }
  }
  async function renderDelivery(main, s, isStale) {
    const dashboard = await s.api.dashboard();
    const projects = dashboard.projects ?? [];
    if (projects.length === 0) {
      main.replaceChildren(textEl("div", "dy-empty", "Onboard a project to manage delivery."));
      return;
    }
    const projectId = s.projectId && projects.some((p) => p.id === s.projectId) ? s.projectId : projects[0].id;
    s.projectId = projectId;
    const [initiativeResponse, workResponse, observationResponse] = await Promise.all([
      s.api.initiatives(projectId),
      s.api.workItems(projectId),
      s.api.observations(projectId)
    ]);
    if (isStale()) return;
    const initiatives = initiativeResponse.initiatives ?? [];
    const work = workResponse.work_items ?? [];
    const observations = new Map(
      (observationResponse.observations ?? []).map((row) => [row.initiative_ref, row])
    );
    const toolbar = document.createElement("div");
    toolbar.className = "dy-work-toolbar";
    const projectSelect = document.createElement("select");
    projectSelect.setAttribute("aria-label", "Delivery project");
    projects.forEach((project) => {
      const option = textEl("option", "", project.id, project.id);
      option.selected = project.id === projectId;
      projectSelect.appendChild(option);
    });
    projectSelect.addEventListener("change", () => {
      s.projectId = projectSelect.value;
      void renderDelivery(main, s, isStale);
    });
    toolbar.append(projectSelect);
    const list = document.createElement("div");
    list.className = "dy-delivery-list";
    initiatives.forEach((initiative) => {
      const card = document.createElement("article");
      card.className = "dy-card dy-delivery-card";
      card.append(
        textEl("h2", "", initiative.title),
        textEl("p", "dy-dim", `${initiative.ref} \xB7 ${initiative.status}`),
        textEl("p", "", initiative.expected_outcome || "No expected outcome supplied."),
        textEl("p", "", `Execution board: ${initiative.board_slug || "Not bound"}`)
      );
      const linked = work.filter((item) => item.initiative_ref === initiative.ref);
      const links = document.createElement("div");
      links.className = "dy-delivery-work";
      links.appendChild(textEl("h3", "", `Bound work (${linked.length})`));
      linked.forEach((item) => {
        const button = workLayoutButton(`${item.ref}: ${item.title}`, false);
        button.addEventListener("click", () => {
          s.projectId = projectId;
          s.selectedWorkRef = item.ref;
          document.querySelector('[data-tab="work"]')?.click();
        });
        links.appendChild(button);
      });
      card.appendChild(links);
      const observation = observations.get(initiative.ref);
      card.appendChild(textEl(
        "p",
        "dy-dim",
        observation ? `Observation: ${observation.status}${observation.cycle_id ? ` \xB7 cycle ${observation.cycle_id}` : ""}` : "Observation: not scheduled"
      ));
      const actions = document.createElement("div");
      actions.className = "dy-delivery-actions";
      const run = async (button, operation) => {
        button.disabled = true;
        try {
          await operation();
          await renderDelivery(main, s, isStale);
        } catch {
          button.textContent = "Action failed";
          button.disabled = false;
        }
      };
      if (initiative.status === "pending_approval") {
        const approve = workLayoutButton("Approve and start execution", false);
        approve.addEventListener("click", () => void run(approve, async () => {
          const decision = await s.api.decision(initiative.ref);
          const note = window.prompt(
            "Decision note (optional). Review scope before approving:",
            ""
          );
          if (note === null) throw new Error("approval cancelled");
          await s.api.approve(initiative.ref, {
            expected_fingerprint: decision.fingerprint,
            note: note || ""
          });
        }));
        actions.appendChild(approve);
      }
      if (initiative.status === "executing") {
        const complete = workLayoutButton("Complete with verified outcome", false);
        complete.addEventListener("click", () => void run(complete, () => s.api.completeInitiative(initiative.ref, false)));
        const regress = workLayoutButton("Record regression", false);
        regress.addEventListener("click", () => void run(regress, () => s.api.completeInitiative(initiative.ref, true)));
        actions.append(complete, regress);
      }
      if (observation?.status === "pending") {
        const observe = workLayoutButton("Run observation cycle", false);
        observe.addEventListener("click", () => void run(observe, () => s.api.runObservation(initiative.ref)));
        actions.appendChild(observe);
      }
      card.appendChild(actions);
      list.appendChild(card);
    });
    if (initiatives.length === 0) {
      list.appendChild(textEl("div", "dy-empty", "No initiatives for this project."));
    }
    const section = document.createElement("section");
    section.append(toolbar, list);
    main.replaceChildren(section);
  }
  function workLayoutButton(labelText, active) {
    const button = document.createElement("button");
    button.className = `dy-btn${active ? " active" : ""}`;
    button.textContent = labelText;
    return button;
  }
  var milestoneApiRef = null;
  var detailProjectId = "";
  function renderMilestonePlan(container, detail, onChanged, items) {
    container.replaceChildren();
    const apiRef = milestoneApiRef;
    if (!apiRef) {
      container.appendChild(textEl("p", "dy-dim", "Planning details unavailable."));
      return;
    }
    const projectId = detailProjectId;
    const scope = textEl(
      "p",
      "dy-dim",
      `Scope: ${detail.committed ?? detail.total} committed, ${detail.done} done, ${detail.blocked ?? 0} blocked (${detail.units ?? "items"} \u2014 not hours).`
    );
    container.appendChild(scope);
    const wip = detail.assignee_wip ?? {};
    const wipPairs = Object.entries(wip);
    container.appendChild(textEl(
      "p",
      "dy-dim",
      wipPairs.length ? `Assignee WIP: ${wipPairs.map(([who, n]) => `${who}: ${n}`).join(", ")} (item counts).` : "No in-progress assignments."
    ));
    const risks = detail.risks ?? [];
    if (risks.length) {
      const riskList = document.createElement("ul");
      riskList.className = "dy-milestone-risks";
      for (const risk of risks) {
        const li = document.createElement("li");
        li.dataset.riskKind = risk.kind;
        if (risk.kind === "dependency_blocker" && risk.item) {
          li.textContent = `${risk.item} blocked by ${(risk.blockers ?? []).join(", ")} \u2014 owner ${risk.owner ?? "unassigned"}`;
        } else if (risk.kind === "overdue_item" && risk.item) {
          li.textContent = `${risk.item} overdue \u2014 owner ${risk.owner ?? "unassigned"}`;
        } else if (risk.kind === "milestone_overdue") {
          li.textContent = `Milestone past its due date with ${risk.remaining} item(s) remaining.`;
        } else {
          li.textContent = risk.kind;
        }
        riskList.appendChild(li);
      }
      container.appendChild(riskList);
    } else {
      container.appendChild(textEl("p", "dy-dim", "No blocking risks recorded."));
    }
    const fc = detail.forecast;
    const fcLine = textEl("p", "dy-milestone-forecast", "");
    if (!fc) {
      fcLine.textContent = "Forecast unavailable.";
    } else if (fc.state === "complete") {
      fcLine.textContent = "Forecast: complete.";
    } else if (fc.state === "insufficient_history") {
      fcLine.textContent = `Forecast: insufficient history (${fc.sample_size ?? 0} completions in the last ${fc.assumptions?.window_weeks ?? 4} complete weeks; needs ${fc.assumptions?.min_sample ?? 8}).`;
    } else if (fc.state === "not_comparable") {
      fcLine.textContent = "Forecast: work history is not comparable.";
    } else {
      const range = fc.range_weeks;
      const upper = range?.upper_open_ended ? "open-ended (a zero-throughput week was observed)" : `${range?.upper} weeks`;
      fcLine.textContent = `Forecast: ~${fc.central_weeks} weeks central (range ${range?.lower}\u2013${upper}); based on ${fc.sample_size} completions. A count-based scenario, not a delivery promise.`;
    }
    container.appendChild(fcLine);
    const actions = document.createElement("div");
    actions.className = "dy-milestone-plan-actions";
    const renameInput = workInput("New name", detail.name);
    renameInput.style.maxWidth = "160px";
    const renameBtn = workLayoutButton("Rename", false);
    renameBtn.addEventListener("click", async () => {
      const newName = renameInput.value.trim();
      if (!newName || newName === detail.name) return;
      renameBtn.disabled = true;
      try {
        await apiRef.milestoneRename(projectId, detail.name, newName);
        onChanged();
      } catch {
        renameBtn.textContent = "Failed";
        renameBtn.disabled = false;
      }
    });
    const detachSelect = document.createElement("select");
    detachSelect.setAttribute("aria-label", `Detach a task from ${detail.name}`);
    detachSelect.appendChild(textEl("option", "", "Detach a task...", ""));
    items.filter((item) => (detail.blockers ?? {})[item.ref] !== void 0 || item.status !== "done").forEach((item) => {
      detachSelect.appendChild(
        textEl("option", "", `${item.ref}: ${item.title}`, item.ref)
      );
    });
    const detachBtn = workLayoutButton("Detach", false);
    detachBtn.addEventListener("click", async () => {
      const ref = detachSelect.value;
      if (!ref) return;
      detachBtn.disabled = true;
      try {
        await apiRef.milestoneDetach(projectId, detail.name, ref);
        onChanged();
      } catch {
        detachBtn.textContent = "Failed";
        detachBtn.disabled = false;
      }
    });
    actions.append(renameInput, renameBtn, detachSelect, detachBtn);
    container.appendChild(actions);
  }
  function buildMilestonesPanel(s, projectId, items, rerender) {
    const api = s.api;
    milestoneApiRef = api;
    detailProjectId = projectId;
    const box = document.createElement("details");
    box.className = "dy-milestones";
    const summary = textEl("summary", "", "Milestones");
    box.appendChild(summary);
    const body = textEl("div", "dy-milestones-body", "Loading milestones...");
    box.appendChild(body);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const overdueClass = (m) => !m.closed && m.due && m.due < today ? " dy-milestone-overdue" : "";
    const drawRows = (rows) => {
      if (rows.length === 0) {
        body.replaceChildren(textEl("p", "dy-dim", "No milestones yet. Create one below."));
        body.appendChild(creator);
        return;
      }
      const list = document.createElement("div");
      list.className = "dy-milestone-list";
      for (const m of rows) {
        const row = document.createElement("div");
        row.className = "dy-milestone-row" + overdueClass(m);
        row.dataset.milestone = m.name;
        const nameCell = textEl("span", "dy-milestone-name", m.closed ? `${m.name} (closed)` : m.name);
        const pct = m.total > 0 ? Math.round(m.done / m.total * 100) : 0;
        const bar = document.createElement("div");
        bar.className = "dy-wf-progress";
        const fill = document.createElement("div");
        fill.className = "dy-wf-progress-fill";
        fill.style.width = `${Math.min(100, pct)}%`;
        bar.appendChild(fill);
        const counts = textEl(
          "span",
          "dy-dim",
          `${m.done} of ${m.total} done (${pct}%)`
        );
        const dueLabel = textEl("span", "dy-dim", m.due ? `Due ${m.due}` : "No due date");
        const planBtn = workLayoutButton("Plan", false);
        planBtn.setAttribute("aria-expanded", "false");
        planBtn.setAttribute("aria-label", `Toggle planning summary for ${m.name}`);
        const planBody = document.createElement("div");
        planBody.className = "dy-milestone-plan";
        planBody.hidden = true;
        planBtn.addEventListener("click", async () => {
          planBtn.disabled = true;
          try {
            if (planBody.hidden && !planBody.dataset.loaded) {
              const detail = await api.milestoneDetail(projectId, m.name);
              renderMilestonePlan(planBody, detail, () => {
                planBody.dataset.loaded = "";
                planBody.hidden = true;
                rerender();
              }, items);
              planBody.dataset.loaded = "1";
            }
            planBody.hidden = !planBody.hidden;
            planBtn.setAttribute("aria-expanded", String(!planBody.hidden));
          } catch {
            planBody.replaceChildren(textEl("p", "dy-dim", "Planning details unavailable."));
            planBody.hidden = false;
          } finally {
            planBtn.disabled = false;
          }
        });
        const attachSelect = document.createElement("select");
        attachSelect.setAttribute("aria-label", `Attach a task to ${m.name}`);
        attachSelect.appendChild(textEl("option", "", "Attach a task...", ""));
        items.filter((item) => item.status !== "done").forEach((item) => {
          attachSelect.appendChild(
            textEl("option", "", `${item.ref}: ${item.title}`, item.ref)
          );
        });
        const attachBtn = workLayoutButton("Attach", false);
        attachBtn.addEventListener("click", async () => {
          const ref = attachSelect.value;
          if (!ref) return;
          attachBtn.disabled = true;
          try {
            await api.attachMilestone(projectId, m.name, ref);
            rerender();
          } catch {
            attachBtn.textContent = "Failed";
            attachBtn.disabled = false;
          }
        });
        const closeBtn = workLayoutButton(m.closed ? "Reopen" : "Close", false);
        closeBtn.addEventListener("click", async () => {
          closeBtn.disabled = true;
          try {
            await api.updateMilestone(projectId, m.name, { closed: !m.closed });
            rerender();
          } catch {
            closeBtn.textContent = "Failed";
            closeBtn.disabled = false;
          }
        });
        row.append(nameCell, bar, counts, dueLabel, planBtn, planBody, attachSelect, attachBtn, closeBtn);
        list.appendChild(row);
      }
      body.replaceChildren(list);
    };
    void api.milestones(projectId).then((response) => {
      drawRows(response.milestones ?? []);
      body.appendChild(creator);
    }).catch(() => {
      body.textContent = "Milestones are unavailable.";
    });
    const nameInput = workInput("New milestone name", "");
    const dueInput = workInput("Due date", "");
    dueInput.type = "date";
    const createBtn = workLayoutButton("Create milestone", false);
    const feedback = textEl("p", "dy-dim", "");
    createBtn.addEventListener("click", async () => {
      const nameVal = nameInput.value.trim();
      if (!nameVal) {
        feedback.textContent = "Enter a milestone name first.";
        return;
      }
      createBtn.disabled = true;
      feedback.textContent = "Creating...";
      try {
        await api.createMilestone(projectId, nameVal, dueInput.value || null);
        feedback.textContent = "Created.";
        rerender();
      } catch {
        feedback.textContent = "Create failed (name may already exist).";
        createBtn.disabled = false;
      }
    });
    const creator = document.createElement("div");
    creator.className = "dy-milestone-create";
    creator.append(nameInput, dueInput, createBtn, feedback);
    return box;
  }
  function workInput(labelText, value) {
    const input = document.createElement("input");
    input.setAttribute("aria-label", labelText);
    input.value = value;
    return input;
  }
  function workLink(item, open) {
    const button = document.createElement("button");
    button.className = "dy-work-link";
    button.textContent = item.title;
    button.addEventListener("click", () => open(item));
    return button;
  }
  function workCard(item, open) {
    const card = document.createElement("article");
    card.className = `dy-work-card${item.status === "blocked" ? " blocked" : ""}`;
    card.append(
      workLink(item, open),
      textEl("span", "dy-dim", `${item.ref} \xB7 ${item.assignee || "Unassigned"}`)
    );
    return card;
  }
  async function renderInbox(main, s, isStale) {
    const view = await s.api.inbox();
    const items = view.items ?? [];
    if (isStale()) return;
    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "dy-empty";
      empty.appendChild(textEl("p", "", "Inbox zero. Nothing is waiting on you."));
      main.replaceChildren(empty);
      return;
    }
    const list = document.createElement("section");
    list.className = "dy-card";
    list.appendChild(textEl("h2", "", "Waiting on you"));
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "dy-inbox-item";
      const body = document.createElement("div");
      body.className = "dy-inbox-main";
      body.append(
        textEl("span", "dy-pill", String(it.kind)),
        textEl("strong", "", String(it.title)),
        textEl("span", "dy-dim", `${it.project} \xB7 ${it.ref}`)
      );
      row.appendChild(body);
      if (it.kind === "initiative_approval") {
        const decisionHolder = { fingerprint: null };
        s.api.decision(it.ref).then((decision) => {
          decisionHolder.fingerprint = decision.fingerprint;
          const evidence = document.createElement("div");
          evidence.className = "dy-inbox-decision";
          evidence.setAttribute("data-decision-evidence", "true");
          evidence.append(
            textEl("p", "", String(decision.title ?? "")),
            textEl(
              "p",
              "dy-dim",
              `risk ${decision.risk ?? "unknown"} \xB7 outcome ${decision.expected_outcome ?? "unknown"} \xB7 fingerprint ${decision.fingerprint}`
            )
          );
          row.appendChild(evidence);
        }).catch(() => {
          row.appendChild(textEl(
            "p",
            "dy-error",
            "Decision evidence unavailable; refresh before deciding."
          ));
        });
        const btn = document.createElement("button");
        btn.className = "dy-btn primary";
        btn.textContent = "Approve";
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          try {
            if (!decisionHolder.fingerprint) {
              throw new Error("Decision evidence not reviewed yet; refresh before deciding.");
            }
            const note = window.prompt(
              "Decision note (optional). Review the displayed decision before approving:",
              ""
            );
            if (note === null) {
              btn.disabled = false;
              return;
            }
            await s.api.approve(it.ref, {
              expected_fingerprint: decisionHolder.fingerprint,
              note: note || ""
            });
            row.remove();
            if (!list.querySelector(".dy-inbox-item")) {
              list.appendChild(textEl("p", "dy-dim", "Inbox zero."));
            }
          } catch (e) {
            btn.disabled = false;
            btn.textContent = `Failed: ${String(e).slice(0, 60)}`;
          }
        });
        row.appendChild(btn);
      }
      list.appendChild(row);
    });
    main.replaceChildren(list);
  }
  async function renderNotifications(main, s, isStale) {
    const view = await s.api.notifications();
    const notes = view.notifications ?? [];
    if (isStale()) return;
    if (notes.length === 0) {
      const empty = document.createElement("div");
      empty.className = "dy-empty";
      empty.appendChild(textEl("p", "", "No notifications."));
      main.replaceChildren(empty);
      return;
    }
    const list = document.createElement("section");
    list.className = "dy-card";
    list.appendChild(textEl("h2", "", "Notifications"));
    notes.forEach((n) => {
      const row = document.createElement("div");
      row.className = "dy-note";
      row.appendChild(textEl("span", "", String(n.summary ?? n.title ?? "")));
      if (n.deep_link) {
        const open = document.createElement("button");
        open.className = "dy-btn dy-note-open";
        open.textContent = "Open";
        open.dataset.deepLink = n.deep_link;
        open.addEventListener("click", () => {
          s.openFleetLink?.(n.deep_link);
        });
        row.appendChild(open);
      }
      if (!n.acked && !n.acked_at && n.id != null) {
        const btn = document.createElement("button");
        btn.className = "dy-btn";
        btn.textContent = "Acknowledge";
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          try {
            await s.api.ack(Number(n.id));
            row.classList.add("acked");
            const ackLabel = textEl("span", "dy-dim", "Acknowledged");
            row.appendChild(ackLabel);
          } catch (e) {
            btn.disabled = false;
            btn.textContent = `Failed: ${String(e).slice(0, 60)}`;
          }
        });
        row.appendChild(btn);
      }
      list.appendChild(row);
    });
    main.replaceChildren(list);
  }
  function renderOnboard(main, s) {
    const section = document.createElement("section");
    section.className = "dy-card dy-form";
    section.appendChild(textEl("h2", "", "Onboard a project"));
    const discoverBox = document.createElement("div");
    discoverBox.className = "dy-ob-discover";
    discoverBox.appendChild(textEl("p", "dy-dim", "Loading host discovery\u2026"));
    const idLabel = label("Project ID");
    idLabel.appendChild(inputEl("dy-ob-id", "e.g. hermes-core"));
    const repoLabel = label("Repo path");
    repoLabel.appendChild(inputEl("dy-ob-repo", "/path/to/repos/\u2026"));
    const missionLabel = label("Mission");
    missionLabel.appendChild(inputEl("dy-ob-mission", "What is this project for?"));
    const leadLabel = label("Lead profile");
    const select = document.createElement("select");
    select.id = "dy-ob-lead";
    leadLabel.appendChild(select);
    const connectBox = document.createElement("div");
    connectBox.className = "dy-ob-connect";
    connectBox.hidden = true;
    const preflight = document.createElement("p");
    preflight.className = "dy-dim";
    preflight.id = "dy-ob-preflight";
    const preflightBtn = document.createElement("button");
    preflightBtn.className = "dy-btn";
    preflightBtn.id = "dy-ob-preflight-go";
    preflightBtn.textContent = "Validate before commit";
    const preview = document.createElement("pre");
    preview.className = "dy-ob-preview";
    preview.id = "dy-ob-preview";
    preview.hidden = true;
    const suggestionsBox = document.createElement("div");
    suggestionsBox.className = "dy-ob-suggestions";
    suggestionsBox.hidden = true;
    const go = document.createElement("button");
    go.className = "dy-btn primary";
    go.id = "dy-ob-go";
    go.textContent = "Enable project";
    go.disabled = true;
    const result = document.createElement("p");
    result.id = "dy-ob-result";
    result.className = "dy-dim";
    const assess = document.createElement("button");
    assess.className = "dy-btn";
    assess.id = "dy-ob-assess";
    assess.hidden = true;
    assess.textContent = "Run first read-only assessment";
    const assessment = document.createElement("pre");
    assessment.id = "dy-ob-assessment";
    assessment.hidden = true;
    let preflightOk = false;
    let preflightFields = "";
    const currentFields = () => {
      const v = readInputs();
      return v ? `${v.project_id}|${v.repo_path}|${v.mission}|${v.lead_profile}` : "";
    };
    const invalidatePreflight = () => {
      if (!preflightOk) return;
      preflightOk = false;
      preflightFields = "";
      go.disabled = true;
      preview.hidden = true;
      preflight.className = "dy-dim";
      preflight.textContent = "Details changed since validation \u2014 run preflight again.";
    };
    for (const el of main.querySelectorAll(".dy-form input, .dy-form select")) {
      el.addEventListener("input", invalidatePreflight);
    }
    const readInputs = () => {
      const body = {
        project_id: main.querySelector("#dy-ob-id").value.trim(),
        repo_path: main.querySelector("#dy-ob-repo").value.trim(),
        mission: main.querySelector("#dy-ob-mission").value.trim(),
        lead_profile: main.querySelector("#dy-ob-lead").value
      };
      if (!body.project_id || !body.repo_path || !body.mission || !body.lead_profile) {
        result.textContent = "All fields are required.";
        return null;
      }
      return body;
    };
    preflightBtn.addEventListener("click", async () => {
      const body = readInputs();
      if (!body) return;
      preflightBtn.disabled = true;
      preflight.textContent = "Validating via host\u2026";
      try {
        const pre = await s.api.preflight(body);
        const mode = pre.mode === "connect_existing" ? "Host already owns this project \u2014 it will be connected, not recreated." : "Host validated the details; nothing exists yet \u2014 create-new.";
        preflight.textContent = mode;
        preflight.className = "dy-ok";
        preflightOk = true;
        preflightFields = `${body.project_id}|${body.repo_path}|${body.mission}|${body.lead_profile}`;
        go.disabled = false;
        const pv = pre.preview ?? {};
        preview.textContent = JSON.stringify(pv, null, 2);
        preview.hidden = false;
        const suggestions = pre.suggestions ?? [];
        suggestionsBox.replaceChildren();
        suggestionsBox.hidden = suggestions.length === 0;
        for (const sug of suggestions) {
          const row = document.createElement("div");
          row.className = "dy-ob-suggestion";
          row.appendChild(textEl(
            "span",
            "dy-dim",
            `${sug.name} \u2014 ${sug.description} (manual objective; nothing runs automatically)`
          ));
          const accept = document.createElement("button");
          accept.className = "dy-btn";
          accept.textContent = "Add objective";
          accept.disabled = !preflightOk;
          accept.addEventListener("click", async () => {
            accept.disabled = true;
            try {
              await s.api.addObjective(body.project_id, {
                name: sug.name,
                evaluator_type: "manual",
                target: sug.target,
                severity: sug.severity,
                description: sug.description
              });
              accept.textContent = "Added";
            } catch (err) {
              accept.disabled = false;
              result.textContent = `Suggestion rejected: ${String(err).slice(0, 140)}`;
            }
          });
          row.appendChild(accept);
          suggestionsBox.appendChild(row);
        }
      } catch (e) {
        preflightOk = false;
        preflightFields = "";
        go.disabled = true;
        preview.hidden = true;
        preflight.className = "dy-error";
        preflight.textContent = `Preflight conflict: ${String(e).slice(0, 160)}`;
      } finally {
        preflightBtn.disabled = false;
      }
    });
    go.addEventListener("click", async () => {
      const body = readInputs();
      if (!body) return;
      if (!preflightOk || preflightFields !== `${body.project_id}|${body.repo_path}|${body.mission}|${body.lead_profile}`) {
        result.textContent = "Validate the current details before enabling.";
        return;
      }
      go.disabled = true;
      try {
        await s.api.onboard(body);
        result.textContent = `Project "${body.project_id}" enabled.`;
        assess.hidden = false;
      } catch (e) {
        result.textContent = `Onboarding failed: ${String(e).slice(0, 120)}`;
        go.disabled = false;
      }
    });
    assess.addEventListener("click", async () => {
      const body = readInputs();
      if (!body) return;
      assess.disabled = true;
      assessment.hidden = false;
      assessment.textContent = "Running read-only assessment\u2026";
      try {
        const out = await s.api.firstAssessment(body.project_id);
        const lines = [
          `Verification ok: ${out.assessment.verification_ok ?? "unknown"}`,
          `Health state: ${out.assessment.health_state ?? "unknown"}`,
          `Initiatives created: ${out.assessment.initiatives_created}`,
          `Schedules enabled: ${out.schedules_enabled === false ? "no (automation off)" : String(out.schedules_enabled)}`,
          `Next: ${out.next ?? "n/a"}`
        ];
        assessment.textContent = lines.join("\n");
      } catch (e) {
        assessment.textContent = `Assessment failed: ${String(e).slice(0, 140)}`;
        assess.disabled = false;
      }
    });
    section.append(
      discoverBox,
      connectBox,
      idLabel,
      repoLabel,
      missionLabel,
      leadLabel,
      preflightBtn,
      preflight,
      preview,
      suggestionsBox,
      go,
      assess,
      assessment,
      result
    );
    main.replaceChildren(section);
    void (async () => {
      try {
        const d = await s.api.discover();
        discoverBox.replaceChildren();
        const existing = d.projects ?? [];
        const head = textEl(
          "p",
          "dy-dim",
          existing.length > 0 ? `Existing host projects: ${existing.map((p) => p.slug).join(", ")}.` : "No existing host projects; create-new below."
        );
        discoverBox.appendChild(head);
        const profiles = (d.profiles ?? []).map((p) => p.name);
        select.replaceChildren();
        for (const name of profiles) {
          select.appendChild(textEl("option", "", name, name));
        }
        if (existing.length > 0) {
          connectBox.hidden = false;
          connectBox.replaceChildren(textEl("p", "dy-dim", "Connect an existing host project:"));
          for (const p of existing) {
            const btn = document.createElement("button");
            btn.className = "dy-btn";
            btn.dataset.existingSlug = p.slug;
            btn.textContent = `Connect ${p.slug}`;
            btn.addEventListener("click", () => {
              const idInput = main.querySelector("#dy-ob-id");
              const repoInput = main.querySelector("#dy-ob-repo");
              idInput.value = p.slug;
              repoInput.value = p.repo_path;
              invalidatePreflight();
            });
            connectBox.appendChild(btn);
          }
        }
      } catch {
        preflightOk = false;
        go.disabled = true;
        select.replaceChildren();
        discoverBox.replaceChildren(
          textEl("p", "dy-error", "Host discovery unavailable. Retry before onboarding \u2014 no fallback choices are offered.")
        );
        const retry = document.createElement("button");
        retry.className = "dy-btn";
        retry.textContent = "Retry discovery";
        retry.addEventListener("click", () => {
          retry.disabled = true;
          void renderOnboard(main, s);
        });
        discoverBox.appendChild(retry);
      }
    })();
  }
  function textEl(tag, className, text, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    el.textContent = text;
    if (value !== void 0 && el instanceof HTMLOptionElement) el.value = value;
    return el;
  }
  function loadingEl() {
    const el = document.createElement("div");
    el.className = "dy-loading";
    el.textContent = "Loading\u2026";
    return el;
  }
  async function renderWorkflow(main, s, isStale) {
    const view = await s.api.dashboard();
    const projects = view.projects ?? [];
    if (isStale()) return;
    if (projects.length === 0) {
      main.replaceChildren(
        textEl("div", "dy-empty", "Onboard a project to view workflows.")
      );
      return;
    }
    const controls = document.createElement("div");
    controls.className = "dy-wf-controls";
    const projectSel = document.createElement("select");
    projectSel.className = "dy-select";
    for (const p of projects) {
      const opt = textEl(
        "option",
        "",
        `${p.id} \xB7 ${p.health ?? "unknown"}`,
        p.id
      );
      projectSel.appendChild(opt);
    }
    const nameInput = document.createElement("input");
    nameInput.className = "dy-input";
    nameInput.placeholder = "workflow name";
    nameInput.value = "main";
    const go = document.createElement("button");
    go.className = "dy-btn primary";
    go.textContent = "Render";
    const canvasHost = document.createElement("div");
    canvasHost.className = "dy-wf-host";
    controls.append(
      textEl("span", "dy-dim", "Project"),
      projectSel,
      textEl("span", "dy-dim", "Workflow"),
      nameInput,
      go
    );
    main.replaceChildren(controls, canvasHost);
    let dispose = null;
    const load = () => {
      if (dispose) dispose();
      const pid = projectSel.value;
      const wname = nameInput.value.trim() || "main";
      dispose = mountWorkflowCanvas(
        canvasHost,
        pid,
        wname,
        () => s.api.workflowRuns(pid, wname).then((r) => r.runs),
        {
          onApprove: async (ref) => {
            const decision = await s.api.decision(ref);
            await s.api.approve(ref, { expected_fingerprint: decision.fingerprint });
          },
          onReject: async (ref) => {
            const decision = await s.api.decision(ref);
            await s.api.reject(ref, {
              expected_fingerprint: decision.fingerprint,
              reason: "Rejected from workflow gate review"
            });
          },
          // P8.4: supported recovery — same canonical transition authority as
          // the work drawer (re-queue a blocked task to the backlog).
          onRetry: async (ref) => {
            await s.api.transitionWorkItem(pid, ref, "backlog");
          },
          // agenttrail expansion: children -> task list, history -> activity thread
          onExpand: async (ref) => {
            const d = await s.api.workDetail(pid, ref);
            return {
              children: (d.children ?? []).map((c) => ({
                ref: c.ref,
                title: c.title,
                status: c.status,
                assignee: c.assignee ?? null
              })),
              history: (d.history ?? []).map((h) => {
                const rec = h;
                return {
                  ts: rec.at ?? rec.ts ?? rec.created_at ?? null,
                  text: String(rec.summary ?? rec.text ?? rec.message ?? rec.action ?? "event")
                };
              })
            };
          },
          fetchTimeline: (timelineProjectId, timelineName, timelineRunKey) => s.api.workflowTimeline(timelineProjectId, timelineName, timelineRunKey)
        }
      );
      canvasHost.dyDispose = dispose;
    };
    go.addEventListener("click", load);
    load();
  }
  function label(text) {
    const el = document.createElement("label");
    el.textContent = text;
    return el;
  }
  function inputEl(id, placeholder) {
    const el = document.createElement("input");
    el.id = id;
    el.placeholder = placeholder;
    return el;
  }

  // src/index.ts
  function whenReady() {
    if (document.readyState !== "loading") return Promise.resolve();
    return new Promise(
      (resolve) => document.addEventListener("DOMContentLoaded", () => resolve(), { once: true })
    );
  }
  function registerPlugin(sdk) {
    const registry = window.__HERMES_PLUGINS__;
    const React = sdk.React;
    if (!registry || typeof registry.register !== "function" || !React) {
      const root = document.getElementById("root");
      if (root) initApp(sdk, root);
      return;
    }
    const { useEffect, useRef } = sdk.hooks;
    const DockyardTab = () => {
      const ref = useRef(null);
      useEffect(() => {
        if (!ref.current) return void 0;
        ref.current.replaceChildren();
        const dispose = initApp(sdk, ref.current);
        return dispose;
      }, []);
      return React.createElement("div", { ref, className: "dy-host" });
    };
    registry.register("hermes-dockyard", DockyardTab);
  }
  void whenReady().then(() => {
    const sdk = getSDK();
    if (!sdk) {
      console.error("[hermes-dockyard] Hermes plugin SDK not present");
      return;
    }
    registerPlugin(sdk);
  });
})();
