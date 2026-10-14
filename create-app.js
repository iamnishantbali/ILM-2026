/* ============================================================
   ILM-2026 — Create app (MCP app) drawer
   Plain JavaScript, no dependencies.
   ============================================================ */
(function () {
  "use strict";

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ---------------------------------------------------------------
     Data: tools that can be linked to the app, with their schemas
     --------------------------------------------------------------- */
  const TOOLS = [
    {
      id: "send-email",
      name: "Send email",
      input: [
        { name: "gong_call_id", type: "string", required: true },
        { name: "gong_call_id", type: "number" },
      ],
      output: [
        { name: "currentPageSize", type: "number" },
        {
          name: "records", type: "array",
          children: [
            { name: "currentPageSize", type: "number" },
            { name: "subject", type: "string" },
          ],
        },
      ],
      sample: {
        input: { gong_call_id: "7d3f-2291" },
        output: {
          currentPageSize: 2,
          records: [
            { currentPageSize: 2, subject: "Q3 renewal follow-up" },
            { currentPageSize: 2, subject: "Onboarding kickoff notes" },
          ],
        },
      },
    },
    {
      id: "create-draft",
      name: "Create draft",
      input: [
        { name: "to", type: "string", required: true },
        { name: "subject", type: "string" },
        { name: "body", type: "string" },
      ],
      output: [
        { name: "draftId", type: "string" },
        { name: "createdAt", type: "string" },
      ],
      sample: {
        input: { to: "ops@celigo.com", subject: "Weekly sync", body: "Agenda attached." },
        output: { draftId: "r-4411", createdAt: "2026-10-14T09:30:00Z" },
      },
    },
    {
      id: "search-inbox",
      name: "Search inbox",
      input: [
        { name: "query", type: "string", required: true },
        { name: "maxResults", type: "number" },
      ],
      output: [
        { name: "total", type: "number" },
        {
          name: "messages", type: "array",
          children: [
            { name: "id", type: "string" },
            { name: "from", type: "string" },
            { name: "snippet", type: "string" },
          ],
        },
      ],
      sample: {
        input: { query: "from:finance", maxResults: 10 },
        output: {
          total: 2,
          messages: [
            { id: "m1", from: "finance@celigo.com", snippet: "Invoice #4411 is ready." },
            { id: "m2", from: "finance@celigo.com", snippet: "Budget review on Friday." },
          ],
        },
      },
    },
    {
      id: "list-labels",
      name: "List labels",
      input: [],
      output: [
        { name: "labels", type: "array", children: [{ name: "id", type: "string" }, { name: "name", type: "string" }] },
      ],
      sample: {
        input: {},
        output: { labels: [{ id: "INBOX", name: "Inbox" }, { id: "SENT", name: "Sent" }] },
      },
    },
  ];

  const POPULATE_OPTIONS = [
    { id: "sample", label: "Sample data" },
    { id: "live", label: "Tool output" },
    { id: "empty", label: "Empty values" },
  ];

  const TYPE_ICON = { string: "i-text-t", number: "i-number-block", integer: "i-number-block", object: "i-tree-structure", array: "i-tree-structure" };

  const state = {
    toolId: TOOLS[0].id,
    populate: "sample",
    viewport: "desktop",
    code: "",
    dirty: false,
  };

  const tool = () => TOOLS.find((t) => t.id === state.toolId);

  /* ---------------------------------------------------------------
     Small helpers
     --------------------------------------------------------------- */
  function icon(id, size) {
    const s = size || 16;
    return `<svg width="${s}" height="${s}" aria-hidden="true"><use href="#${id}"/></svg>`;
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
  }

  function debounce(fn, ms) {
    let t;
    return function () { clearTimeout(t); t = setTimeout(() => fn.apply(this, arguments), ms); };
  }

  /* ---------------------------------------------------------------
     Accordions
     --------------------------------------------------------------- */
  $$("[data-accordion]").forEach((acc) => {
    const header = $(".accordion__header", acc);
    header.addEventListener("click", () => {
      const open = acc.classList.toggle("is-open");
      header.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------------------------------------------------------------
     ToggleTips
     --------------------------------------------------------------- */
  $$(".toggletip[data-tip]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const open = btn.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  document.addEventListener("click", () => $$(".toggletip.is-open").forEach((b) => { b.classList.remove("is-open"); b.setAttribute("aria-expanded", "false"); }));

  /* ---------------------------------------------------------------
     Generic popover menu (select + dropdown) with keyboard support
     --------------------------------------------------------------- */
  const openMenus = new Set();

  function closeMenu(menu) {
    if (!menu || menu.hidden) return;
    menu.hidden = true;
    menu._trigger.setAttribute("aria-expanded", "false");
    openMenus.delete(menu);
  }
  function closeAllMenus(except) {
    openMenus.forEach((m) => { if (m !== except) closeMenu(m); });
  }

  function setupMenu(trigger, menu, opts) {
    menu._trigger = trigger;
    const itemSel = opts.itemSelector;

    function items() { return $$(itemSel, menu); }
    function focusItem(i) {
      const list = items();
      if (!list.length) return;
      const idx = (i + list.length) % list.length;
      list.forEach((el, k) => el.classList.toggle("is-focused", k === idx));
      list[idx].focus();
    }
    function open() {
      closeAllMenus(menu);
      opts.render(menu);
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      openMenus.add(menu);
      const current = items().findIndex((el) => el.getAttribute("aria-selected") === "true" || el.getAttribute("aria-checked") === "true");
      focusItem(current >= 0 ? current : 0);
    }
    function toggle() { menu.hidden ? open() : closeMenu(menu); }

    trigger.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    trigger.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); }
    });
    menu.addEventListener("click", (e) => e.stopPropagation());
    menu.addEventListener("keydown", (e) => {
      const list = items();
      const i = list.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); focusItem(i + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); focusItem(i - 1); }
      else if (e.key === "Home") { e.preventDefault(); focusItem(0); }
      else if (e.key === "End") { e.preventDefault(); focusItem(list.length - 1); }
      else if (e.key === "Escape" || e.key === "Tab") { closeMenu(menu); trigger.focus(); }
    });
    menu.addEventListener("click", (e) => {
      const item = e.target.closest(itemSel);
      if (!item) return;
      opts.onSelect(item.dataset.value);
      closeMenu(menu);
      trigger.focus();
    });
  }

  document.addEventListener("click", () => closeAllMenus());
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && openMenus.size) { closeAllMenus(); e.stopPropagation(); } }, true);

  /* ---------------------------------------------------------------
     Tool select
     --------------------------------------------------------------- */
  const toolSelect = $("#tool-select");
  setupMenu($(".select__trigger", toolSelect), $(".select__menu", toolSelect), {
    itemSelector: ".select__option",
    render(menu) {
      menu.innerHTML = TOOLS.map((t) => `
        <li class="select__option" role="option" tabindex="-1" data-value="${t.id}" aria-selected="${t.id === state.toolId}">
          <span>${esc(t.name)}</span>${icon("i-check")}
        </li>`).join("");
    },
    onSelect(id) {
      if (id === state.toolId) return;
      state.toolId = id;
      state.dirty = true;
      $("#tool-select-value").textContent = tool().name;
      renderTree();
      if (state.code) renderPreview();
    },
  });

  $("#view-tool-btn").addEventListener("click", () => toast(`Opening “${tool().name}” tool in a new tab…`));

  /* ---------------------------------------------------------------
     Schema tree
     --------------------------------------------------------------- */
  function renderFieldRows(fields, depth) {
    return fields.map((f) => {
      const isGroup = f.type === "object" || f.type === "array";
      const title = `${esc(f.type)}${f.required ? ", required" : ""}`;
      const badge = `<span class="tree__badge" title="${title}">${icon(TYPE_ICON[f.type] || "i-text-t", 12)}</span>`;
      if (isGroup) {
        return `
          <li class="tree__node" role="treeitem" aria-expanded="true">
            <button class="tree__row tree__row--object" type="button" data-toggle>
              <span class="tree__caret">${icon("i-caret-down")}</span>${badge}
              <span class="tree__label">${esc(f.name)}</span>
            </button>
            <ul class="tree__children" role="group">${renderFieldRows(f.children || [], depth + 1)}</ul>
          </li>`;
      }
      return `
        <li class="tree__node" role="treeitem">
          <div class="tree__row tree__row--field">${badge}<span class="tree__label">${esc(f.name)}</span></div>
        </li>`;
    }).join("");
  }

  function renderRoot(label, iconId, fields) {
    const empty = !fields.length;
    return `
      <li class="tree__node${empty ? " is-leaf" : ""}" role="treeitem" aria-expanded="true">
        <button class="tree__row tree__row--object" type="button" data-toggle ${empty ? "disabled" : ""}>
          <span class="tree__caret">${icon(empty ? "i-caret-right" : "i-caret-down")}</span>
          <span class="tree__badge">${icon(iconId, 12)}</span>
          <span class="tree__label">${label}</span>
        </button>
        ${empty ? "" : `<ul class="tree__children" role="group">${renderFieldRows(fields, 1)}</ul>`}
      </li>`;
  }

  function renderTree() {
    const t = tool();
    $("#schema-tree").innerHTML = renderRoot("Tool Input", "i-tool-input", t.input) + renderRoot("Tool Output", "i-tool-output", t.output);
  }

  $("#schema-tree").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-toggle]");
    if (!btn) return;
    const node = btn.closest(".tree__node");
    const collapsed = node.classList.toggle("is-collapsed");
    node.setAttribute("aria-expanded", String(!collapsed));
  });

  function schemaJson() {
    const t = tool();
    const toSchema = (fields) => fields.reduce((acc, f) => {
      acc[f.name] = f.children ? { type: f.type, items: toSchema(f.children) } : f.type;
      return acc;
    }, {});
    return JSON.stringify({ tool: t.name, input: toSchema(t.input), output: toSchema(t.output) }, null, 2);
  }

  $("#copy-schema-btn").addEventListener("click", async () => {
    const text = schemaJson();
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
    }
    toast("Tool inputs and outputs copied to clipboard");
  });

  /* ---------------------------------------------------------------
     Code editor: "Populate with" dropdowns + editing
     --------------------------------------------------------------- */
  const editor = $("#code-editor");
  const editorEmpty = $("#editor-empty");

  function starterTemplate(t) {
    return `<!-- ${t.name} app — renders the linked tool's input and output.
     window.toolData = { input, output } is injected by the host. -->
<style>
  body { font: 14px/20px Inter, system-ui, sans-serif; color: #09090b; margin: 0; padding: 16px; }
  h1 { font-size: 16px; line-height: 24px; margin: 0 0 12px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e4e4e7; }
  th { font-weight: 500; color: #71717a; }
  code { background: #f4f4f5; border-radius: 4px; padding: 1px 4px; }
</style>
<h1>${esc(t.name)}</h1>
<section id="input"></section>
<section id="output"></section>
<script>
  const { input, output } = window.toolData;

  const render = (el, title, data) => {
    const rows = Object.entries(data || {}).map(([k, v]) => {
      if (Array.isArray(v)) return \`<tr><th>\${k}</th><td>\${table(v)}</td></tr>\`;
      return \`<tr><th>\${k}</th><td><code>\${JSON.stringify(v)}</code></td></tr>\`;
    }).join("");
    el.innerHTML = \`<h1>\${title}</h1><table>\${rows || "<tr><td>No data</td></tr>"}</table>\`;
  };
  const table = (list) => {
    if (!list.length) return "<em>empty</em>";
    const cols = Object.keys(list[0]);
    return \`<table><thead><tr>\${cols.map((c) => \`<th>\${c}</th>\`).join("")}</tr></thead><tbody>\` +
      list.map((r) => \`<tr>\${cols.map((c) => \`<td>\${r[c]}</td>\`).join("")}</tr>\`).join("") + "</tbody></table>";
  };

  render(document.getElementById("input"), "Input", input);
  render(document.getElementById("output"), "Output", output);
<\/script>
`;
  }

  function setPopulateLabel() {
    const label = POPULATE_OPTIONS.find((o) => o.id === state.populate).label;
    $$("[data-populate-label]").forEach((el) => { el.textContent = label; });
  }

  $$("[data-dropdown='populate']").forEach((dd) => {
    setupMenu($("button", dd), $(".dropdown__menu", dd), {
      itemSelector: ".dropdown__item",
      render(menu) {
        menu.innerHTML = POPULATE_OPTIONS.map((o) => `
          <li class="dropdown__item" role="menuitemradio" tabindex="-1" data-value="${o.id}" aria-checked="${o.id === state.populate}">
            <span>${esc(o.label)}</span>${icon("i-check")}
          </li>`).join("");
      },
      onSelect(id) {
        state.populate = id;
        setPopulateLabel();
        if (!state.code) {
          // First population: drop the starter template into the editor.
          state.code = starterTemplate(tool());
          editor.value = state.code;
          editorEmpty.hidden = true;
          editor.hidden = false;
          editor.focus();
          toast("Starter template added to the code editor");
        }
        renderPreview();
      },
    });
  });

  editor.addEventListener("input", debounce(() => {
    state.code = editor.value;
    state.dirty = true;
    renderPreview();
  }, 300));

  // Tab inserts two spaces instead of leaving the editor.
  editor.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const { selectionStart: s, selectionEnd: en, value } = editor;
    editor.value = value.slice(0, s) + "  " + value.slice(en);
    editor.selectionStart = editor.selectionEnd = s + 2;
  });

  /* ---------------------------------------------------------------
     Preview
     --------------------------------------------------------------- */
  const previewEmpty = $("#preview-empty");
  const previewFrame = $("#preview-frame");
  const iframe = $("#preview-iframe");

  function previewData() {
    const t = tool();
    if (state.populate === "empty") {
      const blank = (fields) => fields.reduce((acc, f) => { acc[f.name] = f.children ? [] : (f.type === "number" ? 0 : ""); return acc; }, {});
      return { input: blank(t.input), output: blank(t.output) };
    }
    if (state.populate === "live") {
      // No real tool run in the prototype: stamp the sample so it is visibly "live".
      const live = JSON.parse(JSON.stringify(t.sample));
      live.output._fetchedAt = new Date().toISOString();
      return live;
    }
    return t.sample;
  }

  function renderPreview() {
    if (!state.code.trim()) {
      previewFrame.hidden = true;
      previewEmpty.hidden = false;
      iframe.removeAttribute("srcdoc");
      return;
    }
    const data = JSON.stringify(previewData()).replace(/<\//g, "<\\/");
    iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><script>window.toolData=${data};<\/script></head><body>${state.code}</body></html>`;
    previewEmpty.hidden = true;
    previewFrame.hidden = false;
  }

  $("#preview-refresh").addEventListener("click", () => {
    renderPreview();
    if (state.code.trim()) toast("Preview refreshed");
  });

  const workbench = $("#workbench");
  $("#preview-expand").addEventListener("click", (e) => {
    const expanded = workbench.classList.toggle("is-preview-expanded");
    const btn = e.currentTarget;
    btn.classList.toggle("is-active", expanded);
    btn.setAttribute("aria-label", expanded ? "Collapse preview" : "Expand preview");
    btn.title = expanded ? "Collapse" : "Expand";
    $("use", btn).setAttribute("href", expanded ? "#i-arrows-in-simple" : "#i-arrows-out-simple");
  });

  $("#viewport-control").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-viewport]");
    if (!btn) return;
    state.viewport = btn.dataset.viewport;
    $$("[data-viewport]").forEach((b) => {
      const on = b === btn;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-checked", String(on));
    });
    previewFrame.dataset.viewport = state.viewport;
  });

  /* ---------------------------------------------------------------
     Handlebar: drag to resize editor vs. preview
     --------------------------------------------------------------- */
  const handlebar = $("#handlebar");
  const editorPane = $("#editor-pane");
  const previewPane = $("#preview-pane");

  function applySplit(ratio) {
    const r = Math.min(0.8, Math.max(0.2, ratio));
    editorPane.style.flex = `${r} 1 0`;
    previewPane.style.flex = `${1 - r} 1 0`;
    handlebar.setAttribute("aria-valuenow", Math.round(r * 100));
  }
  applySplit(0.5);

  handlebar.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handlebar.setPointerCapture(e.pointerId);
    handlebar.classList.add("is-dragging");
    document.body.classList.add("is-resizing");
    const rect = workbench.getBoundingClientRect();
    const move = (ev) => applySplit((ev.clientX - rect.left) / rect.width);
    const up = () => {
      handlebar.classList.remove("is-dragging");
      document.body.classList.remove("is-resizing");
      handlebar.removeEventListener("pointermove", move);
      handlebar.removeEventListener("pointerup", up);
      handlebar.removeEventListener("pointercancel", up);
    };
    handlebar.addEventListener("pointermove", move);
    handlebar.addEventListener("pointerup", up);
    handlebar.addEventListener("pointercancel", up);
  });
  handlebar.addEventListener("keydown", (e) => {
    const now = Number(handlebar.getAttribute("aria-valuenow") || 50) / 100;
    if (e.key === "ArrowLeft") { e.preventDefault(); applySplit(now - 0.05); }
    if (e.key === "ArrowRight") { e.preventDefault(); applySplit(now + 0.05); }
  });
  handlebar.addEventListener("dblclick", () => applySplit(0.5));

  /* ---------------------------------------------------------------
     Form: validation, save, close
     --------------------------------------------------------------- */
  const form = $("#create-app-form");
  const nameInput = $("#app-name");
  const nameError = $("#app-name-error");
  const descInput = $("#app-desc");

  function autogrow(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.max(64, ta.scrollHeight + 2) + "px";
  }
  autogrow(descInput);
  descInput.addEventListener("input", () => autogrow(descInput));

  form.addEventListener("input", () => { state.dirty = true; });
  form.addEventListener("submit", (e) => e.preventDefault());

  function validate() {
    const ok = nameInput.value.trim().length > 0;
    nameInput.classList.toggle("is-invalid", !ok);
    nameError.hidden = ok;
    nameInput.setAttribute("aria-invalid", String(!ok));
    if (!ok) {
      const acc = nameInput.closest(".accordion");
      if (!acc.classList.contains("is-open")) $(".accordion__header", acc).click();
      nameInput.focus();
    }
    return ok;
  }
  nameInput.addEventListener("input", () => { if (nameInput.value.trim()) { nameInput.classList.remove("is-invalid"); nameError.hidden = true; } });

  function collect() {
    const data = Object.fromEntries(new FormData(form).entries());
    data.permissions = $$("input[name='permissions']:checked", form).map((c) => c.value);
    data.tool = tool().name;
    data.code = state.code;
    return data;
  }

  /* ---------------------------------------------------------------
     Drawer + modal open/close
     --------------------------------------------------------------- */
  const drawer = $("#create-app-drawer");
  const drawerShroud = $("#drawer-shroud");
  const modal = $("#capabilities-modal");
  const appsBody = $("#apps-table-body");
  const appsEmpty = $("#apps-empty");
  const modalSave = $("#modal-save");

  function openDrawer() {
    drawer.classList.remove("is-hidden", "is-closing");
    drawerShroud.classList.remove("is-hidden", "is-closing");
    nameInput.focus();
    nameInput.select();
  }

  function closeDrawer() {
    closeAllMenus();
    drawer.classList.add("is-closing");
    drawerShroud.classList.add("is-closing");
    const done = () => {
      drawer.classList.add("is-hidden");
      drawerShroud.classList.add("is-hidden");
      drawer.classList.remove("is-closing");
      drawerShroud.classList.remove("is-closing");
      drawer.removeEventListener("transitionend", done);
    };
    drawer.addEventListener("transitionend", done);
    setTimeout(done, 260);
    $("[data-action='open-drawer']", modal).focus();
  }

  function addAppRow(data) {
    appsEmpty.hidden = true;
    const row = document.createElement("div");
    row.className = "table-row";
    row.innerHTML = `
      <div class="table-row__cell">${esc(data.name)}</div>
      <div class="table-row__cell table-row__cell--muted">${esc(data.description || "—")}</div>
      <div class="table-row__cell table-row__cell--muted">Just now</div>
      <div class="table-row__cell table-row__cell--actions"><button class="btn btn--ghost btn--xs" type="button" data-action="open-drawer">Edit</button></div>`;
    appsBody.appendChild(row);
    modalSave.disabled = false;
  }

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    switch (btn.dataset.action) {
      case "open-drawer":
        openDrawer();
        break;
      case "close-drawer":
        closeDrawer();
        break;
      case "save":
        if (!validate()) return;
        state.dirty = false;
        toast(`“${collect().name}” saved`);
        break;
      case "save-close":
        if (!validate()) return;
        addAppRow(collect());
        state.dirty = false;
        closeDrawer();
        toast("App created");
        break;
      case "close-modal":
        modal.hidden = true;
        $(".shroud:not(.shroud--drawer)").hidden = true;
        toast("Capabilities closed — reload the page to start over");
        break;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.classList.contains("is-hidden") && !openMenus.size) closeDrawer();
  });

  $("#learn-more-link").addEventListener("click", (e) => { e.preventDefault(); toast("Opens the MCP apps documentation"); });
  $$(".link", modal).forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); toast("Opens the MCP apps documentation"); }));

  /* ---------------------------------------------------------------
     Init
     --------------------------------------------------------------- */
  renderTree();
  setPopulateLabel();
  renderPreview();
})();
