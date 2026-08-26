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
