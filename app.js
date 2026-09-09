/* ============================================================
   ILM-2026 — Snapshot creation + version history journey
   Screen map (Figma "ILM" section, node 79:20122):
     S1  Account 332 — My integrations grid
     S2  Account 337 — Salesforce Integration › Flows
     S3  Account 330 — Version history dropdown (empty state)
     S4  Account 333 — Version history dropdown (with versions)
     S5  Account 334 — Create snapshot drawer
     S6  Account 335 — Create snapshot drawer (error state)
     S7  Account 344 — Version history panel › View details
     S8  Account 343 — Version history panel › View resources changed
     S9  Account 345 — Version list filters (status/username/type)
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Data ---------- */

  const integrations = [
    { name: "Salesforce Integration", flows: "11 flows", offline: false, link: true },
    { name: "NetSuite Integration", flows: "2 flows", offline: true },
    { name: "Shopify Integration", flows: "2 flows", offline: true },
    { name: "Amazon Seller Central Integration", flows: "2 flows", offline: true },
    { name: "QuickBooks Online Integration", flows: "2 flows", offline: false },
    { name: "Microsoft Dynamics 365 Integration", flows: "2 flows", offline: true },
    { name: "Google Sheets Integration", flows: "2 flows", offline: true },
  ];

  const flowNames = [
    "Customer Account Sync",
    "Contact Data Synchronization",
    "Lead-to-CRM Import",
    "Opportunity Pipeline Sync",
    "Case Management Sync",
    "Product Master Sync",
    "Quote Processing Flow",
    "Sales Order Integration",
    "Invoice Export to ERP",
    "User Provisioning Sync",
    "User Synchronization",
  ];

  const TIMESTAMP = "06/24/2025 4:45:45 AM";

  // Snapshots created through the dropdown journey (screens 3–5)
  const versions = [];

  // Version history panel entries (screens 7–9) — seeded with the
  // pull/auto-snapshot history from the design; user-created snapshots
  // are prepended as they are made.
  const panelVersions = [
    { type: "Snapshot", title: "Auto snapshot before pull", ts: "06/24/2026 4:45:45 AM", by: "System", status: "Completed" },
    {
      type: "Pull", title: "Test pull created", ts: "06/21/2026 4:45:45 AM", by: "Priyanka Kaundal", status: "Completed",
      desc: "Placeholder for the user provided detailed description will be shown here.",
      fromName: "QA - Prod Integrations for Netsuite and Salesforce",
      fromId: "78er7655gh67899cc567dc", env: "QA/UAT", rev: "6shsh88w9whdi8",
    },
    { type: "Snapshot", title: "Auto snapshot before pull", ts: "06/21/2026 4:45:45 AM", by: "System", status: "Completed" },
    { type: "Snapshot", title: "Auto snapshot before pull", ts: "06/20/2026 4:45:45 AM", by: "System", status: "Completed" },
    { type: "Snapshot", title: "Auto snapshot before pull", ts: "06/19/2026 4:45:45 AM", by: "System", status: "Completed" },
    { type: "Revert", title: "Auto snapshot before pull", ts: "06/19/2026 4:45:45 AM", by: "Priyanka Kaundal", status: "Failed" },
    { type: "Snapshot", title: "Auto snapshot before pull", ts: "06/18/2026 4:45:45 AM", by: "System", status: "Completed" },
  ];

  let selectedVersion = panelVersions[1]; // the pull entry, as in the design

  const resourceGroups = [
    {
      name: "Flows", icon: "i-flow-arrow", count: 4, expanded: true,
      items: ["Send errors to slack", "Transfer valid JSON files to Planful", "Salesforce to Netsuite to Slack", "Data cleaner"],
    },
    { name: "APIs", icon: "i-gear-api", count: 2, expanded: false, items: ["Orders lookup API", "Inventory sync API"] },
    { name: "MCPs", icon: "i-server", count: null, expanded: false, items: ["Salesforce MCP server"] },
    { name: "Tools", icon: "i-hammer", count: null, expanded: false, items: ["JSON validator"] },
    { name: "Connections", icon: "i-link", count: null, expanded: false, items: ["Slack connection"] },
  ];

  let selectedResource = "Send errors to slack";

  const codeBefore = [
    "{",
    '  <k>"page_of_records"</k>: [',
    "   {",
    '     <k>"record"</k>: {',
    '        <k>"id"</k>: <s>"1"</s>,',
    '        <k>"name"</k>: <s>"Alice Johnson"</s>,',
    '        <k>"department"</k>: <s>"Engineering"</s>,',
    '        <k>"position"</k>: <s>"Software Engineer"</s>,',
    '        <k>"location"</k>: <s>"San Francisco"</s>,',
    '        <k>"hire_date"</k>: <s>"2020-02-12"</s>,',
    '        <k>"email"</k>: <s>"alice.johnson@example.com"</s>,',
    '        <k>"status"</k>: <s>"Active"</s>,',
    "      }",
    "   }",
    " ]",
    "}",
  ];

  const codeAfter = [
    "{",
    '  <k>"page_of_records"</k>: [',
    "   {",
    '     <k>"record"</k>: {',
    '        <k>"id"</k>: <s>"1"</s>,',
    '        <k>"name"</k>: <s>"Alice Johnson"</s>,',
    '        <k>"department"</k>: <s>"Engineering"</s>,',
    '        <k>"position"</k>: <s>"Senior Software Engineer"</s>,',
    '        <k>"location"</k>: <s>"San Francisco"</s>,',
    '        <k>"hire_date"</k>: <s>"2020-02-12"</s>,',
    '        <k>"email"</k>: <s>"alice.johnson@example.com"</s>,',
    '        <k>"manager"</k>: <s>"Robert Chen"</s>,',
    '        <k>"status"</k>: <s>"Active"</s>,',
    "      }",
    "   }",
    " ]",
    "}",
  ];

  /* ---------- Screen 1: integration cards ---------- */

  function cardTemplate(item) {
    const tag = item.link ? "a" : "div";
    return `
      <${tag} class="int-card${item.link ? " int-card--link" : ""}"${item.link ? ' href="#" data-nav="detail"' : ""}>
        <div class="int-card__head">
          <span class="dot-badge"></span>
          <span class="int-card__status">Success <svg width="12" height="12"><use href="#i-caret-right"/></svg></span>
          <span class="int-card__head-spacer"></span>
          <button class="cell-icon-btn" aria-label="More options" onclick="event.preventDefault(); event.stopPropagation();">
            <svg width="16" height="16"><use href="#i-dots-three"/></svg>
          </button>
        </div>
        <div class="int-card__title">${item.name}</div>
        <div class="int-card__foot">
          <span class="int-card__meta">
            <svg width="16" height="16"><use href="#i-user-gear"/></svg>
            <span class="text-badge">${item.flows}</span>
          </span>
          ${item.offline
            ? `<span class="offline-link"><svg width="12" height="12"><use href="#i-link-break"/></svg> Offline <svg width="10" height="10"><use href="#i-caret-right"/></svg></span>`
            : ""}
        </div>
      </${tag}>`;
  }

  function renderGrid() {
    const grid = document.getElementById("integration-grid");
    const row1 = integrations.slice(0, 4).map(cardTemplate).join("");
    const row2 = integrations.slice(4).map(cardTemplate).join("");
    grid.innerHTML = `<div class="grid-row">${row1}</div><div class="grid-row">${row2}</div>`;
  }

  /* ---------- Screen 2: flows table ---------- */

  function renderTable() {
    const tbody = document.getElementById("flows-tbody");
    tbody.innerHTML = flowNames
      .map(
        (name, i) => `
      <tr>
        <td><span class="cell-name"><span class="cell-link">${name}</span><svg width="16" height="16"><use href="#i-note"/></svg></span></td>
        <td class="center"><span class="cell-status"><span class="dot-badge"></span><span class="cell-link">Success</span></span></td>
        <td>${TIMESTAMP}</td>
        <td>${TIMESTAMP}</td>
        <td class="center"><button class="cell-icon-btn" aria-label="Mapping for ${name}"><svg width="16" height="16"><use href="#i-mapping"/></svg></button></td>
        <td class="center"><button class="cell-icon-btn" aria-label="Schedule for ${name}"><svg width="16" height="16"><use href="#i-calendar"/></svg></button></td>
        <td class="center"><button class="cell-icon-btn" aria-label="Run ${name}"><svg width="16" height="16"><use href="#i-play"/></svg></button></td>
        <td class="center">
          <button class="switch${i % 2 === 0 ? " is-on" : ""}" role="switch" aria-checked="${i % 2 === 0}" aria-label="Toggle ${name}">
            <svg class="switch-check" width="12" height="12"><use href="#i-check"/></svg>
          </button>
        </td>
        <td class="center"><button class="cell-icon-btn" aria-label="Actions for ${name}"><svg width="16" height="16"><use href="#i-dots-three"/></svg></button></td>
      </tr>`
      )
      .join("");

    tbody.querySelectorAll(".switch").forEach((sw) => {
      sw.addEventListener("click", () => {
        sw.classList.toggle("is-on");
        sw.setAttribute("aria-checked", sw.classList.contains("is-on"));
      });
    });
  }

  /* ---------- Navigation ---------- */

  const screens = {
    home: document.getElementById("screen-home"),
    detail: document.getElementById("screen-detail"),
  };

  function navigate(target) {
    Object.values(screens).forEach((s) => s.classList.remove("is-visible"));
    screens[target].classList.add("is-visible");
    document
      .querySelectorAll("[data-crumb='detail']")
      .forEach((el) => (el.hidden = target !== "detail"));
    closeVersionMenu();
  }

  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      e.preventDefault();
      navigate(nav.dataset.nav);
    }
  });

  /* ---------- Version history dropdown (screens 3 & 4) ---------- */

  const trigger = document.getElementById("version-history-trigger");
  const menu = document.getElementById("version-menu");
  const menuEmpty = document.getElementById("version-menu-empty");
  const menuList = document.getElementById("version-menu-list");
  const menuShowAll = document.getElementById("version-menu-showall");

  function renderVersionMenu() {
    const hasVersions = versions.length > 0;
    menuEmpty.hidden = hasVersions;
    menuList.hidden = !hasVersions;
    menuShowAll.hidden = !hasVersions;
    if (hasVersions) {
      menuList.innerHTML = versions
        .map(
          (v) => `
        <button class="menu-item" role="menuitem">
          <span class="menu-item__top">
            <span class="menu-item__title">${v.name}</span>
            <span class="menu-item__badge">${v.type}</span>
          </span>
          <span class="menu-item__desc">${v.timestamp}</span>
        </button>`
        )
        .join("");
    }
  }

  function openVersionMenu() {
    renderVersionMenu();
    menu.classList.add("is-open");
    trigger.setAttribute("aria-expanded", "true");
  }

  function closeVersionMenu() {
    menu.classList.remove("is-open");
    trigger.setAttribute("aria-expanded", "false");
  }

  trigger.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.contains("is-open") ? closeVersionMenu() : openVersionMenu();
  });

  document.addEventListener("click", (e) => {
    if (menu.classList.contains("is-open") && !menu.contains(e.target) && e.target !== trigger) {
      closeVersionMenu();
    }
  });

  /* ---------- Create snapshot drawer (screens 5 & 6) ---------- */

  const shroud = document.getElementById("shroud");
  const drawer = document.getElementById("snapshot-drawer");
  const nameInput = document.getElementById("snapshot-name");
  const descInput = document.getElementById("snapshot-desc");
  const snapshotError = document.getElementById("snapshot-error");
  const snapshotErrorText = document.getElementById("snapshot-error-text");

  function openDrawer() {
    closeVersionMenu();
    shroud.classList.add("is-open");
    drawer.classList.add("is-open");
    nameInput.classList.remove("is-invalid");
    snapshotError.hidden = true;
    setTimeout(() => nameInput.focus(), 250);
  }

  function closeDrawer() {
    shroud.classList.remove("is-open");
    drawer.classList.remove("is-open");
  }

  document.getElementById("menu-create-snapshot").addEventListener("click", openDrawer);
  document.getElementById("drawer-close").addEventListener("click", closeDrawer);
  document.getElementById("drawer-close-x").addEventListener("click", closeDrawer);
  shroud.addEventListener("click", closeDrawer);

  document.getElementById("menu-pull-changes").addEventListener("click", () => {
    showToast("Pull changes is part of the next journey — not in this prototype");
  });

  function formatNow() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    let h = now.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${h}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;
  }

  document.getElementById("drawer-create").addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.classList.add("is-invalid");
      snapshotError.hidden = true;
      nameInput.focus();
      return;
    }
    // Screen 6: creating a snapshot with a duplicate name fails
    const duplicate =
      versions.some((v) => v.name.toLowerCase() === name.toLowerCase()) ||
      panelVersions.some((v) => v.title.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      snapshotErrorText.textContent = `Couldn’t create the snapshot. A version named “${name}” already exists — enter a different name and try again.`;
      snapshotError.hidden = false;
      nameInput.classList.add("is-invalid");
      nameInput.focus();
      return;
    }

    const ts = formatNow();
    const entry = {
      name,
      type: "Snapshot",
      timestamp: ts,
    };
    versions.unshift(entry);
    panelVersions.unshift({
      type: "Snapshot",
      title: name,
      ts,
      by: "Nishant Bali",
      status: "Completed",
      desc: descInput.value.trim(),
      fromName: "Salesforce Integration",
      env: "Production",
    });

    closeDrawer();
    showToast("Snapshot created");

    // Suggest the next version name for repeat runs
    const m = name.match(/^(.*?)(\d+)\s*$/);
    if (m) nameInput.value = `${m[1]}${Number(m[2]) + 1}`;
    descInput.value = "";

    if (panel.classList.contains("is-open")) {
      renderPanelList();
    } else {
      // Reopen the dropdown to show the new version (screen 4 state)
      setTimeout(openVersionMenu, 350);
    }
  });

  /* ---------- Version history panel (screens 7–9) ---------- */

  const panel = document.getElementById("vh-panel");
  const vhList = document.getElementById("vh-list");
  const vhSearch = document.getElementById("vh-search");
  const filterBtn = document.getElementById("vh-filter-btn");
  const filterMenu = document.getElementById("vh-filter-menu");
  const tabDetails = document.getElementById("vh-tab-details");
  const tabResources = document.getElementById("vh-tab-resources");
  const paneDetails = document.getElementById("vh-pane-details");
  const paneResources = document.getElementById("vh-pane-resources");
  const revertCaret = document.getElementById("vh-revert-caret");
  const revertMenu = document.getElementById("vh-revert-menu");
  const revertBtn = document.getElementById("vh-revert-btn");

  function openPanel() {
    closeVersionMenu();
    renderPanelList();
    renderDetail();
    panel.classList.add("is-open");
  }

  function closePanel() {
    panel.classList.remove("is-open");
    filterMenu.classList.remove("is-open");
    revertMenu.classList.remove("is-open");
  }

  document.getElementById("show-all-versions").addEventListener("click", openPanel);
  document.getElementById("vh-close").addEventListener("click", closePanel);
  document.getElementById("vh-close-x").addEventListener("click", closePanel);
  document.getElementById("vh-create-snapshot").addEventListener("click", openDrawer);
  document.getElementById("vh-pull-changes").addEventListener("click", () => {
    showToast("Pull changes is part of the next journey — not in this prototype");
  });

  function activeFilters() {
    const groups = { status: [], type: [], by: [] };
    filterMenu.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      if (cb.checked) groups[cb.dataset.filter].push(cb.value);
    });
    return groups;
  }

  function visiblePanelVersions() {
    const q = vhSearch.value.trim().toLowerCase();
    const f = activeFilters();
    return panelVersions.filter(
      (v) =>
        f.status.includes(v.status) &&
        f.type.includes(v.type) &&
        f.by.includes(v.by) &&
        (!q || v.title.toLowerCase().includes(q))
    );
  }

  function badgeHtml(v) {
    let html = `<span class="badge-outline">${v.type}</span>`;
    if (v.status === "Failed") {
      html += `<span class="badge-outline badge-outline--red"><svg width="11" height="11"><use href="#i-x-circle"/></svg> Failed</span>`;
    }
    return html;
  }

  function renderPanelList() {
    const list = visiblePanelVersions();
    if (!list.includes(selectedVersion)) selectedVersion = list[0] || null;
    vhList.innerHTML = list.length
      ? list
          .map(
            (v, i) => `
      <button class="vh-item${v === selectedVersion ? " is-selected" : ""}" data-vh-index="${panelVersions.indexOf(v)}">
        <span class="vh-item__badges">${badgeHtml(v)}</span>
        <span>
          <span class="vh-item__title">${v.title}</span><br />
          <span class="vh-item__ts">${v.ts}</span>
        </span>
      </button>`
          )
          .join("")
      : `<p class="vh-item__ts" style="padding:12px 16px">No versions match the current filters.</p>`;

    vhList.querySelectorAll(".vh-item").forEach((el) => {
      el.addEventListener("click", () => {
        selectedVersion = panelVersions[Number(el.dataset.vhIndex)];
        renderPanelList();
        renderDetail();
      });
    });
  }

  function detailRow(label, value, copyable) {
    return `
      <div class="vh-details-row">
        <div class="vh-details-row__label">${label}</div>
        <div class="vh-details-row__value">${value}${
      copyable
        ? `<button class="cell-icon-btn" data-copy="${value}" aria-label="Copy ${label}"><svg width="14" height="14"><use href="#i-copy"/></svg></button>`
        : ""
    }</div>
      </div>`;
  }

  function renderDetail() {
    const v = selectedVersion;
    if (!v) return;
    document.getElementById("vh-detail-badge").textContent = v.type;
    document.getElementById("vh-detail-title").textContent = v.title;
    document.getElementById("vh-detail-desc").textContent =
      v.desc || "Placeholder for the user provided detailed description will be shown here.";

    const statusBadge =
      v.status === "Failed"
        ? `<span class="badge-outline badge-outline--red"><svg width="12" height="12"><use href="#i-x-circle"/></svg> Failed</span>`
        : `<span class="badge-outline badge-outline--green"><svg width="12" height="12"><use href="#i-check-circle"/></svg> Completed</span>`;

    const rows = [
      detailRow("Status", statusBadge, false),
      detailRow("Date created", v.ts, false),
      detailRow("Created by", v.by, false),
      detailRow("From integration name", v.fromName || "Salesforce Integration", false),
    ];
    if (v.fromId) rows.push(detailRow("From integration ID", v.fromId, true));
    rows.push(detailRow("From Environment", v.env || "Production", false));
    rows.push(detailRow("Revision ID", v.rev || pseudoId(v), true));
    document.getElementById("vh-details-table").innerHTML = rows.join("");

    document.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          navigator.clipboard.writeText(btn.dataset.copy);
        } catch (_) {
          /* clipboard unavailable in some contexts */
        }
        showToast("Copied to clipboard");
      });
    });
  }

  function pseudoId(v) {
    let h = 0;
    const s = v.title + v.ts;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h.toString(36).padStart(12, "x").slice(0, 14);
  }

  vhSearch.addEventListener("input", renderPanelList);

  /* Filter menu (screen 9) */

  filterBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = filterMenu.classList.toggle("is-open");
    filterBtn.setAttribute("aria-expanded", open);
  });
  filterMenu.addEventListener("click", (e) => e.stopPropagation());
  filterMenu.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", renderPanelList);
  });
  document.addEventListener("click", (e) => {
    if (filterMenu.classList.contains("is-open") && !filterMenu.contains(e.target) && e.target !== filterBtn) {
      filterMenu.classList.remove("is-open");
      filterBtn.setAttribute("aria-expanded", "false");
    }
  });

  /* Tabs (screens 7 ↔ 8) */

  function selectTab(which) {
    const details = which === "details";
    tabDetails.classList.toggle("is-active", details);
    tabResources.classList.toggle("is-active", !details);
    paneDetails.hidden = !details;
    paneResources.hidden = details;
    if (!details) renderResources();
  }
  tabDetails.addEventListener("click", () => selectTab("details"));
  tabResources.addEventListener("click", () => selectTab("resources"));

  /* Revert split button */

  revertCaret.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = revertMenu.classList.toggle("is-open");
    revertCaret.setAttribute("aria-expanded", open);
  });
  revertMenu.querySelectorAll(".vh-revert-option").forEach((opt) => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      revertBtn.textContent = opt.dataset.revert;
      revertMenu.classList.remove("is-open");
      revertCaret.setAttribute("aria-expanded", "false");
    });
  });
  document.addEventListener("click", () => {
    revertMenu.classList.remove("is-open");
    revertCaret.setAttribute("aria-expanded", "false");
  });

  revertBtn.addEventListener("click", () => {
    if (!selectedVersion) return;
    const target = selectedVersion;
    const entry = {
      type: "Revert",
      title: target.title,
      ts: formatNow(),
      by: "Nishant Bali",
      status: "Completed",
      desc: `Reverted to ${revertBtn.textContent.toLowerCase()} of “${target.title}”.`,
      fromName: target.fromName || "Salesforce Integration",
      env: target.env || "Production",
    };
    panelVersions.unshift(entry);
    selectedVersion = entry;
    renderPanelList();
    renderDetail();
    showToast(`Reverted to ${revertBtn.textContent.toLowerCase()} of “${target.title}”`);
  });

  /* Resources tree + code compare (screen 8) */

  function renderResources() {
    const tree = document.getElementById("vh-tree");
    tree.innerHTML = resourceGroups
      .map((g, gi) => {
        const groupBtn = `
        <button class="tree-group${g.expanded ? " is-expanded" : ""}" data-group="${gi}" aria-expanded="${g.expanded}">
          <svg class="tree-caret" width="14" height="14"><use href="#i-caret-right"/></svg>
          <svg width="16" height="16"><use href="#${g.icon}"/></svg>
          <span class="tree-group__label">${g.name}</span>
          ${g.count ? `<span class="number-badge">${g.count}</span>` : ""}
        </button>`;
        const items = g.expanded
          ? g.items
              .map(
                (it) => `
          <button class="tree-item${it === selectedResource ? " is-selected" : ""}" data-resource="${it}">${it}</button>`
              )
              .join("")
          : "";
        return groupBtn + items;
      })
      .join("");

    tree.querySelectorAll(".tree-group").forEach((el) => {
      el.addEventListener("click", () => {
        const g = resourceGroups[Number(el.dataset.group)];
        g.expanded = !g.expanded;
        renderResources();
      });
    });
    tree.querySelectorAll(".tree-item").forEach((el) => {
      el.addEventListener("click", () => {
        selectedResource = el.dataset.resource;
        document.getElementById("vh-compare-title").textContent = selectedResource;
        renderResources();
      });
    });

    renderCode("vh-code-before", codeBefore);
    renderCode("vh-code-after", codeAfter);
  }

  function renderCode(id, lines) {
    const el = document.getElementById(id);
    const numbers = lines.map((_, i) => i + 1).join("\n");
    const code = lines
      .map((l) => l.replace(/<k>/g, '<span class="tk-key">').replace(/<s>/g, '<span class="tk-str">').replace(/<\/[ks]>/g, "</span>"))
      .join("\n");
    el.innerHTML = `<div class="vh-code__lines">${numbers}</div><pre class="vh-code__text">${code}</pre>`;
  }

  /* ---------- Escape handling (topmost layer wins) ---------- */

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (drawer.classList.contains("is-open")) closeDrawer();
    else if (filterMenu.classList.contains("is-open")) filterMenu.classList.remove("is-open");
    else if (revertMenu.classList.contains("is-open")) revertMenu.classList.remove("is-open");
    else if (panel.classList.contains("is-open")) closePanel();
    else closeVersionMenu();
  });

  /* ---------- Toast ---------- */

  const toast = document.getElementById("toast");
  const toastText = document.getElementById("toast-text");
  let toastTimer;

  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2600);
  }

  /* ---------- Init ---------- */

  renderGrid();
  renderTable();
})();
