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
      dashboard: () => get("/dashboard"),
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
      approve: (ref) => post(`/initiatives/${encodeURIComponent(ref)}/approve`, {}),
      reject: (ref) => post(`/initiatives/${encodeURIComponent(ref)}/reject`, {}),
      workflowRuns: (projectId, name) => get(`/projects/${encodeURIComponent(projectId)}/workflows/${encodeURIComponent(name)}/runs`),
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

  // src/workflow-canvas.ts
  var NODE_W = 180;
  var NODE_H = 64;
  var COL_GAP = 80;
  var ROW_GAP = 28;
  var PAD = 40;
  var ZOOM_MIN = 0.45;
  var ZOOM_MAX = 1.8;
  function buildLayout(nodes) {
    const byId = new Map(nodes.map((n) => [n.node_id, n]));
    const depth = /* @__PURE__ */ new Map();
    const visiting = /* @__PURE__ */ new Set();
    const computeDepth = (id) => {
      if (depth.has(id)) return depth.get(id);
      if (visiting.has(id)) return 0;
      visiting.add(id);
      const n = byId.get(id);
      let d = 0;
      for (const dep of n?.depends_on ?? []) {
        d = Math.max(d, computeDepth(dep) + 1);
      }
      visiting.delete(id);
      depth.set(id, d);
      return d;
    };
    for (const n of nodes) computeDepth(n.node_id);
    const maxDepth = Math.max(0, ...[...depth.values()]);
    const perDepth = {};
    const positions = {};
    for (const n of nodes) {
      const d = depth.get(n.node_id) ?? 0;
      const row = perDepth[d] ?? 0;
      perDepth[d] = row + 1;
      positions[n.node_id] = {
        x: PAD + d * (NODE_W + COL_GAP),
        y: PAD + row * (NODE_H + ROW_GAP),
        depth: d
      };
    }
    const width = PAD * 2 + (maxDepth + 1) * (NODE_W + COL_GAP) - COL_GAP;
    const rows = Math.max(1, ...Object.values(perDepth));
    const height = PAD * 2 + rows * (NODE_H + ROW_GAP) - ROW_GAP;
    return { positions, width, height };
  }
  var STATUS_CLASS = {
    done: "dy-wf-done",
    working: "dy-wf-working",
    blocked: "dy-wf-blocked",
    pending: "dy-wf-pending"
  };
  function statusClass(n) {
    return STATUS_CLASS[n.status ?? "pending"] ?? "dy-wf-pending";
  }
  function svgEl(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
  }
  function textEl(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    el.textContent = text;
    return el;
  }
  function mountWorkflowCanvas(host, projectId, runName, fetchRuns, handlers, pollMs = 8e3) {
    host.replaceChildren();
    host.className = "dy-wf";
    const wrap = document.createElement("div");
    wrap.className = "dy-wf-wrap";
    const svg = svgEl("svg", { class: "dy-wf-svg" });
    const viewport = svgEl("g", { class: "dy-wf-viewport" });
    svg.appendChild(viewport);
    const minimap = svgEl("svg", {
      class: "dy-wf-minimap",
      width: 160,
      height: 100
    });
    const miniViewport = svgEl("rect", {
      class: "dy-wf-mini-view"
    });
    minimap.appendChild(miniViewport);
    const passport = document.createElement("aside");
    passport.className = "dy-wf-passport";
    passport.setAttribute("aria-live", "polite");
    wrap.append(svg, minimap, passport);
    host.appendChild(wrap);
    let panX = 0;
    let panY = 0;
    let zoom = 1;
    let fullW = 0;
    let fullH = 0;
    let currentNodes = [];
    const applyTransform = () => {
      viewport.setAttribute(
        "transform",
        `translate(${panX} ${panY}) scale(${zoom})`
      );
    };
    const render = (run) => {
      viewport.replaceChildren();
      if (!run || run.nodes.length === 0) {
        viewport.appendChild(
          svgEl("text", { x: 20, y: 40, class: "dy-wf-empty" })
        );
        viewport.lastChild.textContent = "No workflow nodes.";
        return;
      }
      currentNodes = run.nodes;
      const { positions, width, height } = buildLayout(run.nodes);
      fullW = width;
      fullH = height;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      for (const n of run.nodes) {
        const from = positions[n.node_id];
        for (const dep of n.depends_on) {
          const to = positions[dep];
          if (!from || !to) continue;
          const path = svgEl("path", {
            class: "dy-wf-edge",
            d: `M ${to.x + NODE_W} ${to.y + NODE_H / 2} L ${from.x} ${from.y + NODE_H / 2}`
          });
          viewport.appendChild(path);
        }
      }
      for (const n of run.nodes) {
        const p = positions[n.node_id];
        const g = svgEl("g", {
          class: `dy-wf-node ${statusClass(n)}`,
          transform: `translate(${p.x} ${p.y})`
        });
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute(
          "aria-label",
          `${n.kind === "gate" ? "Gate" : "Task"}: ${n.title} (${n.status ?? "pending"})`
        );
        const rect = svgEl("rect", {
          width: NODE_W,
          height: NODE_H,
          rx: 8,
          class: "dy-wf-rect"
        });
        const label2 = svgEl("text", {
          x: 12,
          y: 26,
          class: "dy-wf-label"
        });
        label2.textContent = n.title.slice(0, 22);
        const sub = svgEl("text", {
          x: 12,
          y: 46,
          class: "dy-wf-sub"
        });
        sub.textContent = (n.kind === "gate" ? "GATE \xB7 " : "") + String(n.status ?? "pending");
        g.append(rect, label2, sub);
        const open = () => openPassport(n);
        g.addEventListener("click", open);
        g.addEventListener("keydown", (e) => {
          if (e.key === "Enter") open();
        });
        viewport.appendChild(g);
      }
      applyTransform();
    };
    const openPassport = (n) => {
      passport.replaceChildren();
      passport.appendChild(textEl("h3", "", n.title));
      passport.appendChild(
        textEl("p", "dy-dim", `${n.kind === "gate" ? "Gate" : "Task"} \xB7 ${n.status ?? "pending"}`)
      );
      if (n.assignee) passport.appendChild(textEl("p", "", `Assignee: ${n.assignee}`));
      if (n.evidence_refs.length) {
        passport.appendChild(textEl("p", "dy-dim", "Evidence:"));
        const ul = document.createElement("ul");
        for (const e of n.evidence_refs) ul.appendChild(textEl("li", "", e));
        passport.appendChild(ul);
      }
      if (n.task_ref) {
        passport.appendChild(
          textEl("p", "dy-dim", `Deep link: ${n.task_ref}`)
        );
        if (n.kind === "gate" && n.status !== "done") {
          const row = document.createElement("div");
          row.className = "dy-wf-actions";
          const approve = document.createElement("button");
          approve.className = "dy-btn primary";
          approve.textContent = "Approve";
          approve.addEventListener("click", async () => {
            approve.disabled = true;
            try {
              await handlers.onApprove(n.task_ref);
              approve.textContent = "Approved";
            } catch (e) {
              approve.disabled = false;
              approve.textContent = `Failed: ${String(e).slice(0, 40)}`;
            }
          });
          const reject = document.createElement("button");
          reject.className = "dy-btn";
          reject.textContent = "Reject";
          reject.addEventListener("click", async () => {
            reject.disabled = true;
            try {
              await handlers.onReject(n.task_ref);
              reject.textContent = "Rejected";
            } catch (e) {
              reject.disabled = false;
              reject.textContent = `Failed: ${String(e).slice(0, 40)}`;
            }
          });
          row.append(approve, reject);
          passport.appendChild(row);
        }
      }
    };
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    svg.addEventListener("pointerdown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      svg.setPointerCapture(e.pointerId);
    });
    svg.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const ev = e;
      panX += ev.clientX - lastX;
      panY += ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      applyTransform();
      updateMinimap();
    });
    svg.addEventListener("pointerup", (e) => {
      dragging = false;
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {
      }
    });
    const zoomAt = (factor, cx, cy) => {
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
      const k = next / zoom;
      panX = cx - (cx - panX) * k;
      panY = cy - (cy - panY) * k;
      zoom = next;
      applyTransform();
      updateMinimap();
    };
    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const ev = e;
      const rect = svg.getBoundingClientRect();
      const cx = ev.clientX - rect.left;
      const cy = ev.clientY - rect.top;
      zoomAt(ev.deltaY < 0 ? 1.1 : 0.9, cx, cy);
    }, { passive: false });
    const updateMinimap = () => {
      minimap.replaceChildren(miniViewport);
      const sx = 160 / Math.max(1, fullW);
      const sy = 100 / Math.max(1, fullH);
      const s = Math.min(sx, sy);
      miniViewport.setAttribute("x", String(-panX * s));
      miniViewport.setAttribute("y", String(-panY * s));
      miniViewport.setAttribute("width", String(svg.clientWidth * s * zoom));
      miniViewport.setAttribute("height", String(svg.clientHeight * s * zoom));
      for (const n of currentNodes) {
        const { positions } = buildLayout(currentNodes);
        const p = positions[n.node_id];
        const dot = svgEl("rect", {
          x: p.x * s,
          y: p.y * s,
          width: NODE_W * s,
          height: NODE_H * s,
          class: `dy-wf-mini ${statusClass(n)}`
        });
        minimap.appendChild(dot);
      }
    };
    minimap.addEventListener("click", (e) => {
      const ev = e;
      const rect = minimap.getBoundingClientRect();
      const fx = (ev.clientX - rect.left) / 160;
      const fy = (ev.clientY - rect.top) / 100;
      const targetX = fx * fullW;
      const targetY = fy * fullH;
      panX = svg.clientWidth / 2 - targetX * zoom;
      panY = svg.clientHeight / 2 - targetY * zoom;
      applyTransform();
      updateMinimap();
    });
    let timer = null;
    const poll = () => {
      fetchRuns().then((runs) => {
        const latest = runs && runs.length ? runs[0] : null;
        render(latest);
        updateMinimap();
      }).catch(() => {
      });
    };
    poll();
    if (pollMs > 0) timer = setInterval(poll, pollMs);
    return () => {
      if (timer) clearInterval(timer);
      host.replaceChildren();
    };
  }

  // src/app.ts
  function initApp(sdk, root) {
    const state = {
      api: createApi(sdk),
      tab: "dashboard",
      workLayout: "board"
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
          textEl2("div", "dy-error", `Dockyard backend unreachable: ${String(err)}`)
        );
      }
    };
    root.replaceChildren();
    root.className = "dy-root";
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
      { id: "delivery", label: "Delivery" },
      { id: "inbox", label: "Approval Inbox" },
      { id: "workflow", label: "Workflow" },
      { id: "notifications", label: "Notifications" },
      { id: "onboard", label: "Onboard Project" }
    ];
    for (const t of TABS) {
      const b = document.createElement("button");
      b.dataset.tab = t.id;
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
    void render(main, state);
    return () => {
      disposed = true;
      root.replaceChildren();
    };
  }
  async function renderDashboard(main, s, isStale) {
    const view = await s.api.dashboard();
    const projects = view.projects ?? [];
    if (projects.length === 0) {
      const empty = textEl2("div", "dy-empty", "");
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
    const totals = view.totals ?? {};
    const tbody = document.createElement("tbody");
    for (const p of projects) {
      const w = p.work ?? {};
      const tr = document.createElement("tr");
      const tdId = document.createElement("td");
      const strong = document.createElement("strong");
      strong.textContent = String(p.id);
      tdId.appendChild(strong);
      tr.append(
        tdId,
        textEl2("td", "", String(p.phase ?? "")),
        textEl2("td", "num", String(w.backlog ?? 0)),
        textEl2("td", "num", String(w.active ?? 0)),
        textEl2("td", w.blocked ? "num warn" : "num", String(w.blocked ?? 0)),
        textEl2("td", "num", String(w.done ?? 0)),
        textEl2("td", "", String(p.health ?? "Unknown"))
      );
      tbody.appendChild(tr);
    }
    if (isStale()) return;
    const section = document.createElement("section");
    section.className = "dy-card";
    section.appendChild(textEl2("h2", "", "Fleet overview"));
    const table = document.createElement("table");
    table.className = "dy-table";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    for (const h of ["Project", "Phase", "Backlog", "Active", "Blocked", "Done", "Health"]) {
      hr.appendChild(textEl2("th", "", h));
    }
    thead.appendChild(hr);
    table.append(thead, tbody);
    const dim = textEl2(
      "p",
      "dy-dim",
      `Stuck bots: ${totals.stuck_bots ?? 0} \xB7 Unacked notifications: ${totals.unacked_notifications ?? 0}`
    );
    section.append(table, dim);
    main.replaceChildren(section);
  }
  async function renderWork(main, s, isStale) {
    const dashboard = await s.api.dashboard();
    const projects = dashboard.projects ?? [];
    if (projects.length === 0) {
      main.replaceChildren(textEl2("div", "dy-empty", "Onboard a project to view work."));
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
    const items = workResponse.work_items ?? [];
    const ranks = new Map(
      (backlogResponse.backlog ?? []).map((row) => [row.item_ref, row])
    );
    const toolbar = document.createElement("div");
    toolbar.className = "dy-work-toolbar";
    const projectSelect = document.createElement("select");
    projectSelect.setAttribute("aria-label", "Project");
    projects.forEach((project) => {
      const option = textEl2("option", "", project.id, project.id);
      option.selected = project.id === projectId;
      projectSelect.appendChild(option);
    });
    const boardButton = workLayoutButton("Board", s.workLayout === "board");
    const tableButton = workLayoutButton("Backlog table", s.workLayout === "table");
    const savedViews = document.createElement("select");
    savedViews.setAttribute("aria-label", "Saved view");
    savedViews.appendChild(textEl2("option", "", "Saved views", ""));
    (viewsResponse.views ?? []).forEach((view) => {
      savedViews.appendChild(textEl2("option", "", view.name, view.name));
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
    detail.appendChild(textEl2("p", "dy-dim", "Select a work item to inspect it."));
    const openDetail = (item) => {
      detail.replaceChildren(loadingEl());
      void s.api.workDetail(projectId, item.ref).then((result) => {
        if (isStale()) return;
        const current = result.work_item;
        const history = result.history.length ? textEl2("pre", "dy-history", JSON.stringify(result.history, null, 2)) : textEl2("p", "dy-dim", "No canonical history is available.");
        const editor = document.createElement("div");
        editor.className = "dy-work-editor";
        const titleInput = workInput("Title", current.title);
        const typeSelect = document.createElement("select");
        typeSelect.setAttribute("aria-label", "Type");
        ["task", "bug", "spike", "subtask", "gate"].forEach((kind) => {
          const option = textEl2("option", "", kind, kind);
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
        const feedback = textEl2("p", "dy-dim", "");
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
        dependencyEditor.appendChild(textEl2("h3", "", "Dependencies"));
        result.dependencies.forEach((dependency) => {
          const row = document.createElement("div");
          row.className = "dy-dependency-row";
          row.appendChild(textEl2("span", "", `${dependency.ref}: ${dependency.title}`));
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
          textEl2("h2", "", current.title),
          textEl2("p", "dy-dim", `${current.ref} \xB7 ${current.kind ?? "task"} \xB7 ${current.status}`),
          textEl2("p", "dy-work-body", current.body || "No body supplied."),
          textEl2("p", "", `Assignee: ${current.assignee || "Unassigned"}`),
          current.status === "blocked" ? textEl2("p", "dy-warning", current.blocked_reason || "Blocked; no reason supplied.") : textEl2("span", "", ""),
          textEl2("p", "", `Parent: ${result.parent?.ref ?? "None"} \xB7 Children: ${result.children.length}`),
          editor,
          dependencyEditor,
          textEl2("h3", "", "History"),
          history
        );
      }).catch(() => {
        detail.replaceChildren(textEl2("p", "dy-error", "Work-item detail is unavailable."));
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
          ["done", "Done"]
        ].forEach(([status, label2]) => {
          const column = document.createElement("section");
          column.className = "dy-board-column";
          const matching = items.filter((item) => item.status === status);
          column.appendChild(textEl2("h3", "", `${label2} (${matching.length})`));
          matching.forEach((item) => column.appendChild(workCard(item, openDetail)));
          content.appendChild(column);
        });
      } else {
        content.className = "dy-card";
        const table = document.createElement("table");
        table.className = "dy-table";
        const head = document.createElement("tr");
        ["Rank", "Item", "Status", "Assignee", "Reason"].forEach((label2) => head.appendChild(textEl2("th", "", label2)));
        const thead = document.createElement("thead");
        thead.appendChild(head);
        const tbody = document.createElement("tbody");
        [...items].sort((a, b) => (ranks.get(a.ref)?.rank ?? 999999) - (ranks.get(b.ref)?.rank ?? 999999)).forEach((item) => {
          const rank = ranks.get(item.ref);
          const row = document.createElement("tr");
          const itemCell = document.createElement("td");
          itemCell.appendChild(workLink(item, openDetail));
          row.append(
            textEl2("td", "num", rank ? String(rank.rank) : "Unranked"),
            itemCell,
            textEl2("td", "", item.status),
            textEl2("td", "", item.assignee || "Unassigned"),
            textEl2("td", "", rank?.priority_reason || "")
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
        draw();
      }
    });
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
    const split = document.createElement("div");
    split.className = "dy-work-split";
    split.append(content, detail);
    const section = document.createElement("section");
    section.append(toolbar, split);
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
      main.replaceChildren(textEl2("div", "dy-empty", "Onboard a project to manage delivery."));
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
      const option = textEl2("option", "", project.id, project.id);
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
        textEl2("h2", "", initiative.title),
        textEl2("p", "dy-dim", `${initiative.ref} \xB7 ${initiative.status}`),
        textEl2("p", "", initiative.expected_outcome || "No expected outcome supplied."),
        textEl2("p", "", `Execution board: ${initiative.board_slug || "Not bound"}`)
      );
      const linked = work.filter((item) => item.initiative_ref === initiative.ref);
      const links = document.createElement("div");
      links.className = "dy-delivery-work";
      links.appendChild(textEl2("h3", "", `Bound work (${linked.length})`));
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
      card.appendChild(textEl2(
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
        approve.addEventListener("click", () => void run(approve, () => s.api.approve(initiative.ref)));
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
      list.appendChild(textEl2("div", "dy-empty", "No initiatives for this project."));
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
      textEl2("span", "dy-dim", `${item.ref} \xB7 ${item.assignee || "Unassigned"}`)
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
      empty.appendChild(textEl2("p", "", "Inbox zero. Nothing is waiting on you."));
      main.replaceChildren(empty);
      return;
    }
    const list = document.createElement("section");
    list.className = "dy-card";
    list.appendChild(textEl2("h2", "", "Waiting on you"));
    items.forEach((it) => {
      const row = document.createElement("div");
      row.className = "dy-inbox-item";
      const body = document.createElement("div");
      body.className = "dy-inbox-main";
      body.append(
        textEl2("span", "dy-pill", String(it.kind)),
        textEl2("strong", "", String(it.title)),
        textEl2("span", "dy-dim", `${it.project_id} \xB7 ${it.ref}`)
      );
      row.appendChild(body);
      if (it.kind === "approval") {
        const btn = document.createElement("button");
        btn.className = "dy-btn primary";
        btn.textContent = "Approve";
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          try {
            await s.api.approve(it.ref);
            row.remove();
            if (!list.querySelector(".dy-inbox-item")) {
              list.appendChild(textEl2("p", "dy-dim", "Inbox zero."));
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
      empty.appendChild(textEl2("p", "", "No notifications."));
      main.replaceChildren(empty);
      return;
    }
    const list = document.createElement("section");
    list.className = "dy-card";
    list.appendChild(textEl2("h2", "", "Notifications"));
    notes.forEach((n) => {
      const row = document.createElement("div");
      row.className = "dy-note";
      row.appendChild(textEl2("span", "", String(n.summary ?? n.title ?? "")));
      if (!n.acked_at && n.id != null) {
        const btn = document.createElement("button");
        btn.className = "dy-btn";
        btn.textContent = "Acknowledge";
        btn.addEventListener("click", async () => {
          btn.disabled = true;
          try {
            await s.api.ack(Number(n.id));
            row.classList.add("acked");
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
    section.appendChild(textEl2("h2", "", "Onboard a project"));
    const idLabel = label("Project ID");
    idLabel.appendChild(inputEl("dy-ob-id", "e.g. hermes-core"));
    const repoLabel = label("Repo path");
    repoLabel.appendChild(inputEl("dy-ob-repo", "/home/kensei/repos/\u2026"));
    const missionLabel = label("Mission");
    missionLabel.appendChild(inputEl("dy-ob-mission", "What is this project for?"));
    const leadLabel = label("Lead profile");
    const select = document.createElement("select");
    select.id = "dy-ob-lead";
    for (const profile of ["octacon", "remii", "wesker", "ceecee", "gojo", "quan"]) {
      select.appendChild(textEl2("option", "", profile, profile));
    }
    leadLabel.appendChild(select);
    const go = document.createElement("button");
    go.className = "dy-btn primary";
    go.id = "dy-ob-go";
    go.textContent = "Enable project";
    const result = document.createElement("p");
    result.id = "dy-ob-result";
    result.className = "dy-dim";
    go.addEventListener("click", async () => {
      const body = {
        project_id: main.querySelector("#dy-ob-id").value.trim(),
        repo_path: main.querySelector("#dy-ob-repo").value.trim(),
        mission: main.querySelector("#dy-ob-mission").value.trim(),
        lead_profile: main.querySelector("#dy-ob-lead").value
      };
      if (!body.project_id || !body.repo_path || !body.mission) {
        result.textContent = "All fields are required.";
        return;
      }
      try {
        await s.api.onboard(body);
        result.textContent = `Project "${body.project_id}" enabled.`;
      } catch (e) {
        result.textContent = `Onboarding failed: ${String(e).slice(0, 120)}`;
      }
    });
    section.append(idLabel, repoLabel, missionLabel, leadLabel, go, result);
    main.replaceChildren(section);
  }
  function textEl2(tag, className, text, value) {
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
        textEl2("div", "dy-empty", "Onboard a project to view workflows.")
      );
      return;
    }
    const controls = document.createElement("div");
    controls.className = "dy-wf-controls";
    const projectSel = document.createElement("select");
    projectSel.className = "dy-select";
    for (const p of projects) {
      const opt = textEl2(
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
      textEl2("span", "dy-dim", "Project"),
      projectSel,
      textEl2("span", "dy-dim", "Workflow"),
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
          onApprove: (ref) => s.api.approve(ref),
          onReject: (ref) => s.api.reject(ref)
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
