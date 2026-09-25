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
          (v, i) => `
        <button class="menu-item" role="menuitem" data-version-index="${i}">
          <span class="menu-item__top">
            <span class="menu-item__title">${v.name}</span>
            <span class="menu-item__badge">${v.type}</span>
          </span>
          <span class="menu-item__desc">${v.timestamp}</span>
        </button>`
        )
        .join("");
      // Clicking a version opens the Version history panel with it selected
      menuList.querySelectorAll("[data-version-index]").forEach((el) => {
        el.addEventListener("click", () => {
          const v = versions[Number(el.dataset.versionIndex)];
          const match = panelVersions.find((p) => p.title === v.name && p.ts === v.timestamp);
          if (match) selectedVersion = match;
          closeVersionMenu();
          openPanel();
        });
      });
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

  /* ---------- More actions menu (page header) ---------- */

  const moreBtn = document.getElementById("more-actions-btn");
  const moreMenu = document.getElementById("more-actions-menu");

  function closeMoreMenu() {
    moreMenu.classList.remove("is-open");
    moreBtn.setAttribute("aria-expanded", "false");
  }

  moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeVersionMenu();
    const open = moreMenu.classList.toggle("is-open");
    moreBtn.setAttribute("aria-expanded", open);
  });
  document.addEventListener("click", (e) => {
    if (moreMenu.classList.contains("is-open") && !moreMenu.contains(e.target)) closeMoreMenu();
  });
  document.getElementById("action-clone").addEventListener("click", () => {
    closeMoreMenu();
    showToast("Cloning \u201CSalesforce Integration\u201D\u2026");
  });
  document.getElementById("action-delete").addEventListener("click", () => {
    closeMoreMenu();
    showToast("Delete integration is not part of this prototype");
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
    openPullModal();
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
    openPullModal();
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
    // Snapshots capture state without changing anything, so they only
    // offer "View details" — no "View resources changed" tab.
    const isSnapshot = v.type === "Snapshot";
    tabResources.hidden = isSnapshot;
    if (isSnapshot && !paneResources.hidden) selectTab("details");
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

    vhDiffView.render();
  }

  /* ==========================================================
     Pull journey (Figma "Create pull" section, node 232:41802)
       Step 1  Select assets  (empty → populated states)
       Step 2  Review changes (before/after diff, read-only)
       Step 3  Merge          (Resolve conflict per resource)
       + Ignore fields drawer, Resolve conflicts dialog
     ========================================================== */

  const cpShroud = document.getElementById("cp-shroud");
  const cpModal = document.getElementById("cp-modal");
  const cpSteps = Array.from(document.querySelectorAll(".cp-step"));
  const cpPane1 = document.getElementById("cp-pane-1");
  const cpPaneReview = document.getElementById("cp-pane-review");
  const cpNext = document.getElementById("cp-next");
  const cpNextWrap = document.getElementById("cp-next-wrap");
  const cpAssetsEmpty = document.getElementById("cp-assets-empty");
  const cpAssetsList = document.getElementById("cp-assets-list");
  const cpSelectAllWrap = document.getElementById("cp-selectall-wrap");
  const cpSelectAll = document.getElementById("cp-selectall");
  const cpResolveBtn = document.getElementById("cp-resolve-btn");

  let cpStep = 1;
  const cpState = { env: null, integration: null };

  // Asset groups: initial checkbox states per the Figma "Create pull - 2" frame
  const assetGroups = [
    {
      name: "Flows", count: 10, expanded: true,
      items: [
        { name: "Automated Customer Onboarding and Account Provisioning Workflow", checked: true },
        { name: "End-to-End E-commerce Order Processing and Inventory Synchronization Flow", checked: true },
        { name: "Multi-System Customer Data Synchronization and Deduplication Pipeline", checked: true },
        { name: "Real-Time Sales Order, Invoice, and Payment Reconciliation Automation", checked: true },
      ],
    },
    { name: "APIs", count: 10, expanded: false, items: [{ name: "Orders lookup API", checked: true }, { name: "Inventory sync API", checked: false }] },
    { name: "Tools", count: 10, expanded: false, items: [{ name: "JSON validator", checked: true }, { name: "Payload formatter", checked: true }] },
    { name: "MCPs", count: 10, expanded: false, items: [{ name: "Salesforce MCP server", checked: false }, { name: "Slack MCP server", checked: false }] },
    { name: "Agents", count: 10, expanded: false, items: [{ name: "Order triage agent", checked: true }, { name: "Refund review agent", checked: false }] },
    { name: "Imports", count: 10, expanded: false, items: [{ name: "Netsuite order import", checked: false }, { name: "Contact import", checked: false }] },
    { name: "Exports", count: 10, expanded: false, items: [{ name: "Salesforce lead export", checked: true }, { name: "Invoice export", checked: false }] },
  ];

  // Resources shown in Review/Merge; conflicted ones carry conflict fields
  const pullResources = [
    {
      group: "Flows", icon: "i-flow-arrow", count: 4, expanded: true,
      items: [
        {
          name: "Send errors to slack", usedBy: 4,
          conflicts: [
            { field: "schedule.cron", source: "“0 */5 ***” every 5 min", current: "“0 */15 ***” every 15 min", choice: "custom", custom: "" },
            { field: "retryPolicy.maxAttempts", source: "5", current: "3", choice: "source", custom: "" },
          ],
          resolved: false,
        },
        {
          name: "Transfer valid JSON files to Planful", usedBy: 2,
          conflicts: [
            { field: "export.pageSize", source: "100", current: "50", choice: "source", custom: "" },
          ],
          resolved: false,
        },
        { name: "Salesforce to Netsuite to Slack", usedBy: 3 },
        { name: "Data cleaner", usedBy: 1 },
      ],
    },
    { group: "APIs", icon: "i-gear-api", count: 2, expanded: false, items: [{ name: "Orders lookup API", usedBy: 2 }] },
    { group: "MCPs", icon: "i-server", count: null, expanded: false, items: [{ name: "Salesforce MCP server", usedBy: 1 }] },
    { group: "Tools", icon: "i-hammer", count: null, expanded: false, items: [{ name: "JSON validator", usedBy: 1 }] },
    { group: "Connections", icon: "i-link", count: null, expanded: false, items: [{ name: "Slack connection", usedBy: 4 }] },
  ];

  let cpSelectedResource = pullResources[0].items[0];

  function findResource(name) {
    for (const g of pullResources) {
      const hit = g.items.find((it) => it.name === name);
      if (hit) return hit;
    }
    return null;
  }

  function openPullModal() {
    closeVersionMenu();
    cpShroud.classList.add("is-open");
    cpModal.classList.add("is-open");
    setCpStep(1);
  }

  function closePullModal() {
    cpShroud.classList.remove("is-open");
    cpModal.classList.remove("is-open");
    closeIgnoreDrawer();
    closeResolveDialog();
    clearTimeout(mergeTimer);
    cpNext.disabled = false;
  }

  document.getElementById("cp-close-x").addEventListener("click", closePullModal);
  document.getElementById("cp-cancel").addEventListener("click", closePullModal);

  function setCpStep(step) {
    cpStep = step;
    cpSteps.forEach((el) => {
      const n = Number(el.dataset.step);
      el.classList.toggle("is-current", n === step);
      el.classList.toggle("is-complete", n < step);
      el.setAttribute("aria-selected", n === step ? "true" : "false");
    });
    document.querySelectorAll(".cp-step-line").forEach((line) => {
      line.classList.toggle("is-complete", Number(line.dataset.line) < step);
    });
    cpPane1.hidden = step !== 1;
    cpPaneReview.hidden = step !== 2;
    document.getElementById("cp-pane-merge").hidden = step !== 3;
    document.getElementById("cp-ignore-fields").hidden = step === 3;
    if (step === 2) {
      renderCpTree();
      renderCpCompare();
    }
    if (step === 3) renderMergeSummary();
    cpNext.textContent = step === 3 ? "Merge changes" : "Next";
    updateCpNextState();
  }

  function updateCpNextState() {
    const blocked = cpStep === 2 && hasUnresolvedConflicts();
    cpNext.disabled = blocked;
    cpNextWrap.title = blocked ? "Resolve all conflicts before continuing" : "";
  }

  // The disabled Next button ignores pointer events, so a click on it is
  // actually received by this wrapper — surface the same reason as a
  // toast, since a disabled button never gets to show its hover title
  // from a click alone.
  cpNextWrap.addEventListener("click", () => {
    if (cpNext.disabled) showToast(cpNextWrap.title || "Resolve all conflicts before continuing");
  });

  cpSteps.forEach((el) => {
    el.addEventListener("click", () => {
      const target = Number(el.dataset.step);
      if (target > 1 && !sourceChosen()) {
        showToast("Choose a source environment and integration first");
        return;
      }
      if (target > 2 && hasUnresolvedConflicts()) {
        showToast("Resolve all conflicts before continuing");
        return;
      }
      setCpStep(target);
    });
  });

  function sourceChosen() {
    return Boolean(cpState.env && cpState.integration);
  }

  cpNext.addEventListener("click", () => {
    if (cpStep === 1) {
      if (!sourceChosen()) {
        showToast("Choose a source environment and integration first");
        return;
      }
      setCpStep(2);
    } else if (cpStep === 2) {
      if (hasUnresolvedConflicts()) {
        showToast("Resolve all conflicts before continuing");
        return;
      }
      setCpStep(3);
    } else {
      startMerge();
    }
  });

  /* Step 3: merge summary + merging state */

  // Env option → the short name shown in the merge route
  function shortEnvName(env) {
    if (!env) return "";
    const tail = env.split(":").pop().trim();
    return tail || env;
  }

  function renderMergeSummary() {
    document.getElementById("cp-merge-summary").hidden = false;
    document.getElementById("cp-merge-progress").hidden = true;
    document.getElementById("cp-merge-bar").style.width = "0%";

    document.getElementById("cp-merge-desc").value = document.getElementById("cp-desc").value || "Template sync";
    document.getElementById("cp-merge-env").value = cpState.env || "";
    document.getElementById("cp-merge-int").value = cpState.integration || "";

    let totalConflicts = 0;
    let resolvedConflicts = 0;
    pullResources.forEach((g) => {
      (g.items || []).forEach((it) => {
        if (typeof it === "object" && it.conflicts) {
          totalConflicts += it.conflicts.length;
          if (it.resolved) resolvedConflicts += it.conflicts.length;
        }
      });
    });
    const ignoredCount = igFlat.filter((f) => !f.group && f.checked).length;

    const pad = (n) => String(n).padStart(2, "0");
    const rows = [
      ["i-cloud-up", "Updated resources", "21"],
      ["i-plus", "New resources", pad(9)],
      ["i-trash", "Deleted resources", pad(4)],
      ["i-check-circle", "Conflicts resolved", `${resolvedConflicts} of ${totalConflicts}`],
      ["i-skip-forward", "Ignored fields", pad(ignoredCount)],
      ["i-link", "New connections", "3 configured"],
    ];
    document.getElementById("cp-merge-list").innerHTML = rows
      .map(
        ([icon, label, value]) => `<div class="included-row">
          <span class="included-row__icon"><svg width="16" height="16"><use href="#${icon}"/></svg></span>
          <span class="included-row__name">${label}</span>
          <span class="included-row__count">${value}</span>
        </div>`
      )
      .join("");
  }

  let mergeTimer = null;

  function startMerge() {
    document.getElementById("cp-merge-summary").hidden = true;
    const progress = document.getElementById("cp-merge-progress");
    progress.hidden = false;
    document.getElementById("cp-merge-progress-desc").textContent =
      `Pulling resources from ${shortEnvName(cpState.env)} · ${cpState.integration || ""} into Production · Nishant's Integration`;
    cpNext.disabled = true;
    const bar = document.getElementById("cp-merge-bar");
    bar.style.width = "0%";
    requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = "100%"; }));
    clearTimeout(mergeTimer);
    mergeTimer = setTimeout(() => {
      cpNext.disabled = false;
      closePullModal();
      showToast("Changes merged into Production · Nishant's Integration");
    }, 2700);
  }

  /* Step 1: selects */

  document.querySelectorAll(".cp-select").forEach((sel) => {
    const trig = sel.querySelector(".cp-select__trigger");
    const menuEl = sel.querySelector(".cp-select__menu");
    const valueEl = sel.querySelector(".cp-select__value");
    trig.addEventListener("click", (e) => {
      e.stopPropagation();
      document.querySelectorAll(".cp-select__menu.is-open").forEach((m) => m !== menuEl && m.classList.remove("is-open"));
      const open = menuEl.classList.toggle("is-open");
      trig.setAttribute("aria-expanded", open);
    });
    menuEl.querySelectorAll("[role=option]").forEach((opt) => {
      opt.addEventListener("click", (e) => {
        e.stopPropagation();
        valueEl.textContent = opt.textContent;
        valueEl.classList.remove("is-placeholder");
        menuEl.classList.remove("is-open");
        trig.setAttribute("aria-expanded", "false");
        cpState[sel.id === "cp-env" ? "env" : "integration"] = opt.textContent;
        updateAssetsPanel();
      });
    });
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".cp-select__menu.is-open").forEach((m) => m.classList.remove("is-open"));
  });

  function updateAssetsPanel() {
    const ready = sourceChosen();
    cpAssetsEmpty.hidden = ready;
    cpAssetsList.hidden = !ready;
    cpSelectAllWrap.hidden = !ready;
    if (ready) renderAssetGroups();
  }

  /* Step 1: tri-state asset checkboxes */

  function cbxHtml(state, extra = "") {
    return `<span class="cbx" data-state="${state}" role="checkbox" aria-checked="${state === "checked"}" ${extra}>
      <svg class="cbx-check" width="12" height="12"><use href="#i-check"/></svg>
      <svg class="cbx-minus" width="12" height="12"><use href="#i-minus"/></svg>
    </span>`;
  }

  function groupState(g) {
    const done = g.items.filter((it) => it.checked).length;
    return done === 0 ? "unchecked" : done === g.items.length ? "checked" : "indeterminate";
  }

  function renderAssetGroups() {
    cpAssetsList.innerHTML = assetGroups
      .map((g, gi) => {
        const state = groupState(g);
        const body = g.expanded
          ? `<div class="cp-group__body">${g.items
              .map(
                (it, ii) => `<label class="cp-item" data-g="${gi}" data-i="${ii}">
                  ${cbxHtml(it.checked ? "checked" : "unchecked")}
                  ${it.name}
                </label>`
              )
              .join("")}</div>`
          : "";
        return `<div class="cp-group${g.expanded ? " is-expanded" : ""}">
          <div class="cp-group__header">
            <button class="cp-group__caret" data-toggle="${gi}" aria-label="Toggle ${g.name}" aria-expanded="${g.expanded}">
              <svg width="16" height="16"><use href="#i-caret-down"/></svg>
            </button>
            <span data-gcbx="${gi}">${cbxHtml(state)}</span>
            <span class="cp-group__label">${g.name}</span>
            <span class="cp-group__badge">${g.count}</span>
          </div>
          ${body}
        </div>`;
      })
      .join("");

    updateSelectAll();

    cpAssetsList.querySelectorAll("[data-toggle]").forEach((el) => {
      el.addEventListener("click", () => {
        assetGroups[Number(el.dataset.toggle)].expanded = !assetGroups[Number(el.dataset.toggle)].expanded;
        renderAssetGroups();
      });
    });
    cpAssetsList.querySelectorAll("[data-gcbx]").forEach((el) => {
      el.addEventListener("click", () => {
        const g = assetGroups[Number(el.dataset.gcbx)];
        const target = groupState(g) !== "checked";
        g.items.forEach((it) => (it.checked = target));
        renderAssetGroups();
      });
    });
    cpAssetsList.querySelectorAll(".cp-item").forEach((el) => {
      el.addEventListener("click", () => {
        const it = assetGroups[Number(el.dataset.g)].items[Number(el.dataset.i)];
        it.checked = !it.checked;
        renderAssetGroups();
      });
    });
  }

  function updateSelectAll() {
    const states = assetGroups.map(groupState);
    const all = states.every((s) => s === "checked");
    const none = states.every((s) => s === "unchecked");
    cpSelectAll.dataset.state = all ? "checked" : none ? "unchecked" : "indeterminate";
    cpSelectAll.setAttribute("aria-checked", all);
    cpSelectAll.innerHTML = `<svg class="cbx-check" width="12" height="12"><use href="#i-check"/></svg>
      <svg class="cbx-minus" width="12" height="12"><use href="#i-minus"/></svg>`;
  }

  cpSelectAll.addEventListener("click", () => {
    const target = cpSelectAll.dataset.state !== "checked";
    assetGroups.forEach((g) => g.items.forEach((it) => (it.checked = target)));
    renderAssetGroups();
  });

  /* Steps 2 & 3: resources tree + compare */

  function resourceHasOpenConflict(it) {
    return Boolean(it.conflicts && !it.resolved);
  }

  function hasUnresolvedConflicts() {
    return pullResources.some((g) => g.items.some((it) => resourceHasOpenConflict(it)));
  }

  function renderCpTree() {
    const tree = document.getElementById("cp-tree");
    tree.innerHTML = pullResources
      .map((g, gi) => {
        const groupBtn = `
        <button class="tree-group${g.expanded ? " is-expanded" : ""}" data-cpgroup="${gi}" aria-expanded="${g.expanded}">
          <svg class="tree-caret" width="14" height="14"><use href="#i-caret-right"/></svg>
          <svg width="16" height="16"><use href="#${g.icon}"/></svg>
          <span class="tree-group__label">${g.group}</span>
          ${g.count ? `<span class="number-badge">${g.count}</span>` : ""}
        </button>`;
        const items = g.expanded
          ? g.items
              .map(
                (it) => `<button class="tree-item${it === cpSelectedResource ? " is-selected" : ""}" data-cpres="${it.name}">
                  <span>${it.name}</span>
                  ${resourceHasOpenConflict(it) ? `<svg class="tree-item__warn" width="16" height="16"><use href="#i-warning"/></svg>` : ""}
                </button>`
              )
              .join("")
          : "";
        return groupBtn + items;
      })
      .join("");

    tree.querySelectorAll("[data-cpgroup]").forEach((el) => {
      el.addEventListener("click", () => {
        const g = pullResources[Number(el.dataset.cpgroup)];
        g.expanded = !g.expanded;
        renderCpTree();
      });
    });
    tree.querySelectorAll("[data-cpres]").forEach((el) => {
      el.addEventListener("click", () => {
        cpSelectedResource = findResource(el.dataset.cpres);
        renderCpTree();
        renderCpCompare();
      });
    });
  }

  /* Diff reviewer: GitHub-style split / unified views.
     Mock diff of the selected resource: ctx = unchanged, del = removed
     (before pull), add = added (after pull). */
  const cpDiff = [
    { t: "ctx", s: "{" },
    { t: "ctx", s: '  <k>"page_of_records"</k>: [' },
    { t: "ctx", s: "   {" },
    { t: "ctx", s: '     <k>"record"</k>: {' },
    { t: "ctx", s: '        <k>"id"</k>: <s>"1"</s>,' },
    { t: "ctx", s: '        <k>"name"</k>: <s>"Alice Johnson"</s>,' },
    { t: "del", s: '        <k>"department"</k>: <s>"Engineering"</s>,' },
    { t: "del", s: '        <k>"position"</k>: <s>"Software Engineer"</s>,' },
    { t: "add", s: '        <k>"department"</k>: <s>"Platform Engineering"</s>,' },
    { t: "add", s: '        <k>"position"</k>: <s>"Senior Software Engineer"</s>,' },
    { t: "ctx", s: '        <k>"location"</k>: <s>"San Francisco"</s>,' },
    { t: "ctx", s: '        <k>"hire_date"</k>: <s>"2020-02-12"</s>,' },
    { t: "ctx", s: '        <k>"email"</k>: <s>"alice.johnson@example.com"</s>,' },
    { t: "add", s: '        <k>"manager"</k>: <s>"Robert Chen"</s>,' },
    { t: "add", s: '        <k>"time_zone"</k>: <s>"America/Los_Angeles"</s>,' },
    { t: "del", s: '        <k>"status"</k>: <s>"Active"</s>,' },
    { t: "add", s: '        <k>"status"</k>: <s>"On leave"</s>,' },
    { t: "ctx", s: "      }" },
    { t: "ctx", s: "   }" },
    { t: "ctx", s: " ]" },
    { t: "ctx", s: "}" },
  ];

  function diffTok(s) {
    return s.replace(/<k>/g, '<span class="tk-key">').replace(/<s>/g, '<span class="tk-str">').replace(/<\/[ks]>/g, "</span>");
  }

  function diffUnifiedHtml() {
    let o = 0;
    let n = 0;
    return cpDiff
      .map((op) => {
        const cls = op.t === "add" ? " diff-line--add" : op.t === "del" ? " diff-line--del" : "";
        const oldNum = op.t === "add" ? "" : ++o;
        const newNum = op.t === "del" ? "" : ++n;
        const sign = op.t === "add" ? "+" : op.t === "del" ? "-" : "";
        return `<div class="diff-line${cls}">
          <span class="diff-num">${oldNum}</span><span class="diff-num">${newNum}</span>
          <span class="diff-sign">${sign}</span><pre class="diff-code">${diffTok(op.s)}</pre>
        </div>`;
      })
      .join("");
  }

  function diffSplitHtml() {
    // Pair removed/added runs side by side, GitHub-style.
    const rows = [];
    let o = 0;
    let n = 0;
    let i = 0;
    while (i < cpDiff.length) {
      if (cpDiff[i].t === "ctx") {
        rows.push({ l: { num: ++o, s: cpDiff[i].s, t: "ctx" }, r: { num: ++n, s: cpDiff[i].s, t: "ctx" } });
        i += 1;
        continue;
      }
      const dels = [];
      const adds = [];
      while (i < cpDiff.length && cpDiff[i].t === "del") dels.push(cpDiff[i++]);
      while (i < cpDiff.length && cpDiff[i].t === "add") adds.push(cpDiff[i++]);
      for (let k = 0; k < Math.max(dels.length, adds.length); k += 1) {
        rows.push({
          l: dels[k] ? { num: ++o, s: dels[k].s, t: "del" } : null,
          r: adds[k] ? { num: ++n, s: adds[k].s, t: "add" } : null,
        });
      }
    }

    const side = (cell, type) => {
      if (!cell) {
        return `<span class="diff-num diff-cell--empty"></span><span class="diff-sign diff-cell--empty"></span><pre class="diff-code diff-cell--empty"></pre>`;
      }
      const mod = cell.t === "ctx" ? "" : ` diff-cell--${cell.t}`;
      const sign = cell.t === "del" ? "-" : cell.t === "add" ? "+" : "";
      return `<span class="diff-num${mod}">${cell.num}</span><span class="diff-sign${mod}">${sign}</span><pre class="diff-code${mod}">${diffTok(cell.s)}</pre>`;
    };

    const head = `<div class="diff-head"><div class="diff-head__cell">Before pull</div><div class="diff-head__cell">After pull</div></div>`;
    const body = rows
      .map((row) => {
        const right = side(row.r, "add").replace('class="diff-num', 'class="diff-num diff-cell-left-border');
        return `<div class="diff-line diff-line--split">${side(row.l, "del")}${right}</div>`;
      })
      .join("");
    return head + body;
  }

  // One diff view per surface (Create pull review pane, Version history
  // resources tab); each keeps its own Split/Unified mode.
  function createDiffView(containerId, splitBtnId, unifiedBtnId) {
    const container = document.getElementById(containerId);
    const splitBtn = document.getElementById(splitBtnId);
    const unifiedBtn = document.getElementById(unifiedBtnId);
    let mode = "split";

    function render() {
      container.innerHTML = mode === "split" ? diffSplitHtml() : diffUnifiedHtml();
    }

    function setMode(next) {
      mode = next;
      splitBtn.classList.toggle("is-active", mode === "split");
      splitBtn.setAttribute("aria-pressed", mode === "split" ? "true" : "false");
      unifiedBtn.classList.toggle("is-active", mode === "unified");
      unifiedBtn.setAttribute("aria-pressed", mode === "unified" ? "true" : "false");
      render();
    }

    splitBtn.addEventListener("click", () => setMode("split"));
    unifiedBtn.addEventListener("click", () => setMode("unified"));
    return { render };
  }

  const cpDiffView = createDiffView("cp-diff", "cp-diff-split", "cp-diff-unified");
  const vhDiffView = createDiffView("vh-diff", "vh-diff-split", "vh-diff-unified");

  function renderCpCompare() {
    document.getElementById("cp-compare-title").textContent = cpSelectedResource.name;
    document.querySelector("#cp-pane-review .tag--yellow").textContent = `Used by : ${cpSelectedResource.usedBy}`;
    cpResolveBtn.hidden = !(cpStep === 2 && resourceHasOpenConflict(cpSelectedResource));
    cpDiffView.render();
    updateCpNextState();
  }

  /* Resolve conflicts dialog (step 3) */

  const rcShroud = document.getElementById("rc-shroud");
  const rcDialog = document.getElementById("rc-dialog");
  const rcContent = document.getElementById("rc-content");

  function openResolveDialog() {
    renderResolveFields();
    rcShroud.classList.add("is-open");
    rcDialog.classList.add("is-open");
  }

  function closeResolveDialog() {
    rcShroud.classList.remove("is-open");
    rcDialog.classList.remove("is-open");
  }

  cpResolveBtn.addEventListener("click", openResolveDialog);
  document.getElementById("rc-close-x").addEventListener("click", closeResolveDialog);
  document.getElementById("rc-cancel").addEventListener("click", closeResolveDialog);

  function rcCard(fi, choice, title, value, selected) {
    return `<button class="rc-card${selected ? " is-selected" : ""}" data-f="${fi}" data-choice="${choice}" role="radio" aria-checked="${selected}">
      <span class="rc-card__title">${title}</span>
      <span class="rc-card__value">${value}</span>
    </button>`;
  }

  function renderResolveFields() {
    const conflicts = cpSelectedResource.conflicts || [];
    rcContent.innerHTML = conflicts
      .map(
        (c, fi) => `<div class="rc-field">
        <span class="rc-field__label">${c.field} <span class="req">*</span></span>
        <div class="rc-field__cards" role="radiogroup" aria-label="${c.field}">
          ${rcCard(fi, "source", "Use source", c.source, c.choice === "source")}
          ${rcCard(fi, "current", "Keep current", c.current, c.choice === "current")}
          ${rcCard(fi, "custom", "Custom", "Add a custom value", c.choice === "custom")}
        </div>
        <div class="rc-custom-row" ${c.choice === "custom" ? "" : "hidden"}>
          <input class="field__input" type="text" placeholder="Enter custom value" value="${c.custom || ""}" data-custom="${fi}" aria-label="Custom value for ${c.field}" />
        </div>
      </div>`
      )
      .join("");

    rcContent.querySelectorAll(".rc-card").forEach((el) => {
      el.addEventListener("click", () => {
        const c = cpSelectedResource.conflicts[Number(el.dataset.f)];
        c.choice = el.dataset.choice;
        renderResolveFields();
        if (c.choice === "custom") {
          const input = rcContent.querySelector(`[data-custom="${el.dataset.f}"]`);
          if (input) input.focus();
        }
      });
    });
    rcContent.querySelectorAll("[data-custom]").forEach((input) => {
      input.addEventListener("input", () => {
        cpSelectedResource.conflicts[Number(input.dataset.custom)].custom = input.value;
      });
    });
  }

  document.getElementById("rc-save").addEventListener("click", () => {
    const conflicts = cpSelectedResource.conflicts || [];
    const missing = conflicts.find((c) => c.choice === "custom" && !c.custom.trim());
    if (missing) {
      const input = rcContent.querySelector(`[data-custom="${conflicts.indexOf(missing)}"]`);
      input.classList.add("is-invalid");
      input.focus();
      return;
    }
    cpSelectedResource.resolved = true;
    closeResolveDialog();
    renderCpTree();
    renderCpCompare();
    showToast(`Conflicts resolved for “${cpSelectedResource.name}”`);
  });

  /* Ignore fields drawer */

  const ignoreShroud = document.getElementById("ignore-shroud");
  const ignoreDrawer = document.getElementById("ignore-drawer");
  const ignoreCombo = document.getElementById("ignore-combo");
  const ignoreSearch = document.getElementById("ignore-search");

  const ignoreFields = [
    {
      name: "integration", depth: 0, group: true, children: [
        { name: "name", depth: 1 },
        { name: "description", depth: 1 },
      ],
    },
    {
      name: "export", depth: 0, group: true, children: [
        { name: "name", depth: 1 },
        {
          name: "http", depth: 1, group: true, children: [
            { name: "successMediaType", depth: 2 },
            { name: "errorMediaType", depth: 2 },
            { name: "relativeURI", depth: 2 },
            { name: "method", depth: 2 },
          ],
        },
      ],
    },
  ];

  // Flatten with parent references for easy rendering + filtering
  const igFlat = [];
  (function flatten(nodes, path) {
    nodes.forEach((n) => {
      const entry = { ...n, path: path ? `${path}.${n.name}` : n.name, checked: false };
      igFlat.push(entry);
      if (n.children) flatten(n.children, entry.path);
    });
  })(ignoreFields, "");

  function openIgnoreDrawer() {
    ignoreShroud.classList.add("is-open");
    ignoreDrawer.classList.add("is-open");
    renderIgnoreTree();
    setTimeout(() => ignoreSearch.focus(), 250);
  }

  function closeIgnoreDrawer() {
    ignoreShroud.classList.remove("is-open");
    ignoreDrawer.classList.remove("is-open");
  }

  document.getElementById("cp-ignore-fields").addEventListener("click", openIgnoreDrawer);
  document.getElementById("ignore-close-x").addEventListener("click", closeIgnoreDrawer);
  document.getElementById("ignore-close").addEventListener("click", closeIgnoreDrawer);
  ignoreShroud.addEventListener("click", closeIgnoreDrawer);

  document.getElementById("ignore-combo-toggle").addEventListener("click", (e) => {
    const collapsed = ignoreCombo.classList.toggle("is-collapsed");
    e.currentTarget.setAttribute("aria-expanded", !collapsed);
    if (collapsed) {
      ignoreSearch.value = "";
      updateIgnoreSummary();
    }
  });
  ignoreSearch.addEventListener("focus", () => {
    ignoreCombo.classList.remove("is-collapsed");
    if (/^\d+ fields? selected$/.test(ignoreSearch.value.trim())) {
      ignoreSearch.select();
    }
  });
  ignoreSearch.addEventListener("blur", () => setTimeout(updateIgnoreSummary, 150));
  ignoreSearch.addEventListener("input", renderIgnoreTree);

  function renderIgnoreTree() {
    const q = ignoreSearch.value.trim().toLowerCase();
    const isCount = /^\d+ fields? selected$/.test(ignoreSearch.value.trim());
    const visible = igFlat.filter((f) => !q || isCount || f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));
    document.getElementById("ignore-tree").innerHTML = visible
      .map(
        (f, i) => `<label class="ig-node${f.group ? " ig-node--group" : ""}" data-depth="${f.depth}">
          ${f.group ? `<span class="cp-group__caret" style="transform:rotate(180deg)"><svg width="14" height="14"><use href="#i-caret-down"/></svg></span>` : ""}
          ${cbxHtml(f.checked ? "checked" : "unchecked", `data-ig="${igFlat.indexOf(f)}"`)}
          <span class="ig-node__label">${f.name}</span>
        </label>`
      )
      .join("");

    document.querySelectorAll("[data-ig]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const f = igFlat[Number(el.dataset.ig)];
        f.checked = !f.checked;
        // A group checkbox toggles its descendants
        if (f.group) {
          igFlat.forEach((other) => {
            if (other.path.startsWith(f.path + ".")) other.checked = f.checked;
          });
        }
        updateIgnoreSummary();
        renderIgnoreTree();
      });
    });
  }

  function ignoredCount() {
    return igFlat.filter((f) => f.checked && !f.group).length;
  }

  function updateIgnoreSummary() {
    const v = ignoreSearch.value.trim();
    // Only overwrite the input when it isn't holding a real search query
    if (v === "" || /^\d+ fields? selected$/.test(v)) {
      const n = ignoredCount();
      ignoreSearch.value = n ? `${n} field${n === 1 ? "" : "s"} selected` : "";
    }
  }

  function saveIgnoredFields() {
    const n = ignoredCount();
    showToast(n ? `${n} field${n === 1 ? "" : "s"} will be ignored during pull` : "No ignored fields set");
  }

  document.getElementById("ignore-save").addEventListener("click", saveIgnoredFields);
  document.getElementById("ignore-save-close").addEventListener("click", () => {
    saveIgnoredFields();
    closeIgnoreDrawer();
  });

  /* "Used by" popover (Figma node 321:31891) */

  const usedByPopover = document.getElementById("usedby-popover");
  const usedByRowsEl = document.getElementById("usedby-rows");

  const usedByData = {
    "Send errors to slack": [
      { name: "export-SF leads for lookup cache", type: "Export" },
      { name: "export-SF leads to FTP import", type: "Export" },
      { name: "Flow-SF leads to gSheet", type: "Flow" },
    ],
  };
  const usedByPool = [
    { name: "export-SF leads for lookup cache", type: "Export" },
    { name: "import-Netsuite order sync", type: "Import" },
    { name: "Flow-SF leads to gSheet", type: "Flow" },
    { name: "export-SF leads to FTP import", type: "Export" },
  ];

  function openUsedByPopover(trigger, resourceName, count) {
    const rows = usedByData[resourceName] || usedByPool.slice(0, Math.min(count || 3, usedByPool.length));
    usedByRowsEl.innerHTML = rows
      .map((r) => `<div class="usedby-row"><span>${r.name}</span><span>${r.type}</span></div>`)
      .join("");
    const rect = trigger.getBoundingClientRect();
    usedByPopover.classList.add("is-open");
    const width = 415;
    // Open to the LEFT of the tag, tail pointing right at it
    const left = Math.max(16, rect.left - width - 12);
    let top = rect.top + rect.height / 2 - 26; // tail (at 20px) aligns with the tag's middle
    top = Math.max(16, Math.min(top, window.innerHeight - usedByPopover.offsetHeight - 16));
    usedByPopover.style.left = `${left}px`;
    usedByPopover.style.top = `${top}px`;
  }

  function closeUsedByPopover() {
    usedByPopover.classList.remove("is-open");
  }

  document.getElementById("vh-usedby").addEventListener("click", (e) => {
    e.stopPropagation();
    openUsedByPopover(e.currentTarget, selectedResource, 4);
  });
  document.getElementById("cp-usedby").addEventListener("click", (e) => {
    e.stopPropagation();
    openUsedByPopover(e.currentTarget, cpSelectedResource.name, cpSelectedResource.usedBy);
  });
  document.getElementById("usedby-close").addEventListener("click", closeUsedByPopover);
  usedByPopover.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", (e) => {
    if (usedByPopover.classList.contains("is-open") && !e.target.closest(".usedby-trigger")) closeUsedByPopover();
  });

  /* Collapsible Resources sidebar (version panel + pull modal) */

  document.querySelectorAll(".resources-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const aside = btn.closest(".vh-resources");
      const collapsed = aside.classList.toggle("is-collapsed");
      btn.setAttribute("aria-expanded", !collapsed);
      btn.setAttribute("aria-label", collapsed ? "Expand resources" : "Collapse resources");
    });
  });

  /* ---------- Escape handling (topmost layer wins) ---------- */

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (usedByPopover.classList.contains("is-open")) closeUsedByPopover();
    else if (rcDialog.classList.contains("is-open")) closeResolveDialog();
    else if (ignoreDrawer.classList.contains("is-open")) closeIgnoreDrawer();
    else if (cpModal.classList.contains("is-open")) closePullModal();
    else if (drawer.classList.contains("is-open")) closeDrawer();
    else if (filterMenu.classList.contains("is-open")) filterMenu.classList.remove("is-open");
    else if (revertMenu.classList.contains("is-open")) revertMenu.classList.remove("is-open");
    else if (moreMenu.classList.contains("is-open")) closeMoreMenu();
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
