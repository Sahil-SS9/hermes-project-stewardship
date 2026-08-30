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
      label2.className = "dy-tasklabel";
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
  var NODE_W = 190;
  var NODE_H = 64;
  var COL_GAP = 95;
  var ROW_GAP = 26;
  var PAD = 60;
  var ZOOM_MIN = 0.45;
  var ZOOM_MAX = 1.8;
  var LOD_FULL = 1.4;
  var ZOOM_IN = 1.1;
  var ZOOM_OUT = 0.9;
  var statusColor = (s) => s === "done" ? "#3fb950" : s === "working" ? "#d29922" : s === "blocked" ? "#f85149" : "#6e7681";
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
  function buildLayout(nodes) {
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
    return {
      positions,
      width: PAD * 2 + (maxDepth + 1) * (NODE_W + COL_GAP) - COL_GAP,
      height: PAD * 2 + rows * (NODE_H + ROW_GAP) - ROW_GAP
    };
  }
  function mountWorkflowCanvas(host, projectId, runName, fetchRuns, handlers, pollMs = 8e3) {
    host.replaceChildren();
    host.className = "dy-wf";
    const wrap = elu("div", "dy-wf-wrap");
    const svg = sEl("svg", { class: "dy-wf-svg" });
    svg.setAttribute("data-lod", "read");
    const viewport = sEl("g", { class: "dy-wf-viewport" });
    svg.appendChild(viewport);
    const minimap = sEl("svg", { class: "dy-wf-minimap", width: 170, height: 104 });
    const miniViewport = sEl("rect", { class: "dy-wf-mini-view" });
    minimap.appendChild(miniViewport);
    const passport = elu("div", "dy-wf-passport");
    passport.setAttribute("aria-live", "polite");
    const feed = elu("div", "dy-wf-feed");
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
    wrap.append(svg, feed, minimap, passport);
    host.appendChild(wrap);
    let panX = 0;
    let panY = 0;
    let zoom = 1;
    let fullW = 0;
    let fullH = 0;
    let currentNodes = [];
    let disposers = [];
    const apply = () => {
      viewport.setAttribute("transform", `translate(${panX} ${panY}) scale(${zoom})`);
      svg.setAttribute("data-lod", zoom > LOD_FULL ? "full" : zoom < 0.75 ? "map" : "read");
    };
    const defs = sEl("defs", {});
    const mkMarker = (id, fill) => {
      const m = sEl("marker", {
        id,
        viewBox: "0 0 10 10",
        refX: "9",
        refY: "5",
        markerWidth: "7",
        markerHeight: "7",
        orient: "auto-start-reverse"
      });
      m.appendChild(sEl("path", { d: "M 0 0 L 10 5 L 0 10 z", fill }));
      return m;
    };
    defs.appendChild(mkMarker("dyArrowActive", "#58a6ff"));
    defs.appendChild(mkMarker("dyArrowDim", "#3d4657"));
    svg.appendChild(defs);
    const render = (run) => {
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
      const { positions, width, height } = buildLayout(run.nodes);
      fullW = width;
      fullH = height;
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      for (const n of run.nodes) {
        const from = positions[n.node_id];
        for (const dep of n.depends_on) {
          const to = positions[dep];
          if (!from || !to) continue;
          const path = sEl("path", {
            class: `dy-wf-edge`,
            d: `M ${to.x + NODE_W} ${to.y + NODE_H / 2} C ${to.x + NODE_W + COL_GAP / 2} ${to.y + NODE_H / 2}, ${from.x - COL_GAP / 2} ${from.y + NODE_H / 2}, ${from.x - 6} ${from.y + NODE_H / 2}`,
            "marker-end": "url(#dyArrowDim)"
          });
          path.dataset.from = dep;
          path.dataset.to = n.node_id;
          viewport.appendChild(path);
          const dot = sEl("circle", { class: "dy-wf-flowdot", r: 3.2, opacity: 0 });
          viewport.appendChild(dot);
        }
      }
      for (const n of run.nodes) {
        const p = positions[n.node_id];
        const g = sEl("g", {
          class: `dy-wf-node ${n.status ?? "pending"}`,
          transform: `translate(${p.x} ${p.y})`
        });
        g.setAttribute("tabindex", "0");
        g.setAttribute("role", "button");
        g.setAttribute(
          "aria-label",
          `${n.kind === "gate" ? "Gate" : "Task"}: ${n.title} (${n.status ?? "pending"})`
        );
        const rect = sEl("rect", { width: NODE_W, height: NODE_H, rx: 9, class: "dy-wf-rect" });
        const label2 = sEl("text", { x: 12, y: 25, class: "dy-wf-label" });
        label2.textContent = n.title.slice(0, 24);
        const sub = sEl("text", { x: 12, y: 44, class: "dy-wf-sub" });
        sub.textContent = (n.kind === "gate" ? "GATE \xB7 " : "") + (n.status ?? "pending") + (n.assignee ? " \xB7 " + n.assignee : "");
        let timer2 = null;
        if (n.status === "working") {
          timer2 = sEl("text", {
            x: NODE_W - 12,
            y: 25,
            "text-anchor": "end",
            class: "dy-wf-timer full"
          });
          timer2.textContent = "00:00";
          timer2.dataset.for = n.node_id;
        }
        if (timer2) g.append(rect, label2, sub, timer2);
        else g.append(rect, label2, sub);
        const dash = () => rect.setAttribute("stroke-dasharray", "4 3");
        const undash = () => rect.removeAttribute("stroke-dasharray");
        g.addEventListener("pointerenter", dash);
        g.addEventListener("pointerleave", () => {
          if (!g.classList.contains("dy-wf-selected")) undash();
        });
        const open = () => openPassport(n, g);
        g.addEventListener("click", open);
        g.addEventListener("keydown", (e) => {
          if (e.key === "Enter") open();
        });
        viewport.appendChild(g);
      }
      apply();
      updateMinimap();
    };
    const updateMinimap = () => {
      minimap.replaceChildren(miniViewport);
      if (fullW <= 0) return;
      const s = Math.min(170 / fullW, 104 / fullH);
      const vx = (0 - panX) / zoom;
      const vy = (0 - panY) / zoom;
      const vw = (svg.clientWidth || 1300) / zoom;
      const vh = (svg.clientHeight || 760) / zoom;
      miniViewport.setAttribute("x", String(vx * s));
      miniViewport.setAttribute("y", String(vy * s));
      miniViewport.setAttribute("width", String(Math.max(10, vw * s)));
      miniViewport.setAttribute("height", String(Math.max(7, vh * s)));
      for (const n of currentNodes) {
        const { positions } = buildLayout(currentNodes);
        const p = positions[n.node_id];
        const dot = sEl("rect", {
          x: p.x * s,
          y: p.y * s,
          width: Math.max(3, NODE_W * s),
          height: Math.max(2, NODE_H * s),
          fill: statusColor(n.status),
          opacity: 0.8
        });
        minimap.appendChild(dot);
      }
    };
    minimap.addEventListener("click", (e) => {
      const ev = e;
      const r = minimap.getBoundingClientRect();
      const fx = (ev.clientX - r.left) / 170;
      const fy = (ev.clientY - r.top) / 104;
      if (fullW <= 0) return;
      const s = Math.min(170 / fullW, 104 / fullH);
      panX = 650 - fx * 170 / s * zoom;
      panY = 380 - fy * 104 / s * zoom;
      apply();
      updateMinimap();
    });
    let lastFrames = [];
    let selectedEl = null;
    const openPassport = (n, g) => {
      if (selectedEl) selectedEl.classList.remove("dy-wf-selected");
      selectedEl = g ?? null;
      if (selectedEl) selectedEl.classList.add("dy-wf-selected");
      passport.replaceChildren();
      passport.appendChild(elu("h3", "", n.title));
      passport.appendChild(elu("span", `badge ${n.status ?? "pending"}`, n.status ?? "pending"));
      if (n.assignee) passport.appendChild(elu("p", "dy-dim", `assignee: ${n.assignee}`));
      if (n.evidence_refs.length) {
        const p = elu("p", "dy-dim", "evidence: " + n.evidence_refs.join(", "));
        passport.appendChild(p);
      }
      if (n.task_ref) {
        passport.appendChild(elu("p", "dy-dim", `deep link: ${n.task_ref}`));
        if (n.kind === "gate" && n.status !== "done" && n.status !== "blocked") {
          const row = elu("div", "dy-wf-actions");
          const approve = elu("button", "dy-btn primary", "Approve");
          const reject = elu("button", "dy-btn", "Reject");
          approve.addEventListener("click", async () => {
            approve.disabled = true;
            reject.disabled = true;
            approve.textContent = "Approved \u2713";
            await handlers.onApprove(n.task_ref);
          });
          reject.addEventListener("click", async () => {
            reject.disabled = true;
            approve.disabled = true;
            reject.textContent = "Rejected \u2715";
            await handlers.onReject(n.task_ref);
          });
          row.append(approve, reject);
          passport.appendChild(row);
        }
        if (handlers.onExpand) {
          const sec = elu("div", "dy-wf-expand");
          const head = elu("button", "dy-wf-expand-head", "\u25B8 Live detail");
          head.setAttribute("aria-expanded", "false");
          const body = elu("div", "dy-wf-expand-body");
          body.style.display = "none";
          body.appendChild(elu("p", "dy-dim", "Loading live detail\u2026"));
          head.addEventListener("click", () => {
            const isOpen = head.getAttribute("aria-expanded") === "true";
            head.setAttribute("aria-expanded", String(!isOpen));
            head.textContent = isOpen ? "\u25B8 Live detail" : "\u25BE Live detail";
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
          sec.append(head, body);
          passport.appendChild(sec);
        }
      } else {
        passport.appendChild(elu("p", "dy-dim", "No canonical work bound to this node yet."));
      }
    };
    const buildThread = (items) => buildActivityThread(items, { decay: true });
    const buildTasks = (tasks, onOpen) => buildTaskListMini(tasks, onOpen);
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    svg.addEventListener("pointerdown", (e) => {
      dragging = true;
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
      const ev = e;
      panX += ev.clientX - lastX;
      panY += ev.clientY - lastY;
      lastX = ev.clientX;
      lastY = ev.clientY;
      apply();
      updateMinimap();
    });
    svg.addEventListener("pointerup", (e) => {
      dragging = false;
      try {
        svg.releasePointerCapture(e.pointerId);
      } catch {
      }
    });
    svg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const ev = e;
      const rect = svg.getBoundingClientRect();
      const cx = ev.clientX - rect.left;
      const cy = ev.clientY - rect.top;
      const factor = ev.deltaY < 0 ? ZOOM_IN : ZOOM_OUT;
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
      const k = next / zoom;
      panX = cx - (cx - panX) * k;
      panY = cy - (cy - panY) * k;
      zoom = next;
      apply();
      updateMinimap();
    }, { passive: false });
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        passport.replaceChildren();
        if (selectedEl) selectedEl.classList.remove("dy-wf-selected");
        selectedEl = null;
      }
    };
    document.addEventListener("keydown", onKeyDown);
    let flowT = 0;
    const flowTimer = setInterval(() => {
      flowT = (flowT + 0.03) % 1;
      viewport.querySelectorAll("text.dy-wf-timer").forEach((t) => {
        const cur = t.textContent ?? "00:00";
        const [m, s] = cur.split(":").map((v) => parseInt(v, 10) || 0);
        const total = m * 60 + s + 1;
        t.textContent = String(Math.floor(total / 60)).padStart(2, "0") + ":" + String(total % 60).padStart(2, "0");
      });
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
        p.classList.toggle("active", !!to && to.status !== "pending" && fromDone);
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
    const pollOnce = () => {
      fetchRuns().then((runs) => {
        const latest = runs && runs.length ? runs[0] : null;
        const sig = JSON.stringify(latest?.nodes.map((n) => [n.node_id, n.status]) ?? []);
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
          render(latest);
        }
      }).catch(() => {
      });
    };
    pollOnce();
    if (pollMs > 0) timer = setInterval(pollOnce, pollMs);
    disposers.push(() => {
      if (timer) clearInterval(timer);
      if (flowTimer) clearInterval(flowTimer);
      document.removeEventListener("keydown", onKeyDown);
      host.replaceChildren();
    });
    return () => {
      disposers.forEach((d) => d());
      disposers = [];
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
          textEl("div", "dy-error", `Dockyard backend unreachable: ${String(err)}`)
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
        textEl("td", "", String(p.phase ?? "")),
        textEl("td", "num", String(w.backlog ?? 0)),
        textEl("td", "num", String(w.active ?? 0)),
        textEl("td", w.blocked ? "num warn" : "num", String(w.blocked ?? 0)),
        textEl("td", "num", String(w.done ?? 0)),
        textEl("td", "", String(p.health ?? "Unknown"))
      );
      tbody.appendChild(tr);
    }
    if (isStale()) return;
    const section = document.createElement("section");
    section.className = "dy-card";
    section.appendChild(textEl("h2", "", "Fleet overview"));
    const table = document.createElement("table");
    table.className = "dy-table";
    const thead = document.createElement("thead");
    const hr = document.createElement("tr");
    for (const h of ["Project", "Phase", "Backlog", "Active", "Blocked", "Done", "Health"]) {
      hr.appendChild(textEl("th", "", h));
    }
    thead.appendChild(hr);
    table.append(thead, tbody);
    const dim = textEl(
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
    const items = workResponse.work_items ?? [];
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
          ["done", "Done"]
        ].forEach(([status, label2]) => {
          const column = document.createElement("section");
          column.className = "dy-board-column";
          const matching = items.filter((item) => item.status === status);
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
        textEl("span", "dy-dim", `${it.project_id} \xB7 ${it.ref}`)
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
    section.appendChild(textEl("h2", "", "Onboard a project"));
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
      select.appendChild(textEl("option", "", profile, profile));
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
          onApprove: (ref) => s.api.approve(ref),
          onReject: (ref) => s.api.reject(ref),
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
          }
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
