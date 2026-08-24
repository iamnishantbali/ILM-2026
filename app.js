/* ============================================================
   ILM-2026 — Snapshot creation journey (screens 1–5)
   Screen map (Figma "ILM" section, node 79:20122):
     S1  Account 332 — My integrations grid
     S2  Account 337 — Salesforce Integration › Flows
     S3  Account 330 — Version history dropdown (empty state)
     S4  Account 333 — Version history dropdown (with versions)
     S5  Account 334 — Create snapshot drawer
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

  // Created snapshots / pulls (empty at start — screen 3 state)
  const versions = [];

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

  /* ---------- Create snapshot drawer (screen 5) ---------- */

  const shroud = document.getElementById("shroud");
  const drawer = document.getElementById("snapshot-drawer");
  const nameInput = document.getElementById("snapshot-name");
  const descInput = document.getElementById("snapshot-desc");

  function openDrawer() {
    closeVersionMenu();
    shroud.classList.add("is-open");
    drawer.classList.add("is-open");
    nameInput.classList.remove("is-invalid");
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

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (drawer.classList.contains("is-open")) closeDrawer();
      else closeVersionMenu();
    }
  });

  document.getElementById("menu-pull-changes").addEventListener("click", () => {
    showToast("Pull changes is part of the next journey — not in this prototype");
  });

  document.getElementById("drawer-create").addEventListener("click", () => {
    const name = nameInput.value.trim();
    if (!name) {
      nameInput.classList.add("is-invalid");
      nameInput.focus();
      return;
    }
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    let h = now.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const ts = `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${now.getFullYear()} ${h}:${pad(now.getMinutes())}:${pad(now.getSeconds())} ${ampm}`;

    versions.unshift({ name, type: "Snapshot", timestamp: ts });

    closeDrawer();
    showToast("Snapshot created");

    // Suggest the next version name for repeat runs
    const m = name.match(/^(.*?)(\d+)\s*$/);
    if (m) nameInput.value = `${m[1]}${Number(m[2]) + 1}`;
    descInput.value = "";

    // Reopen the dropdown to show the new version (screen 4 state)
    setTimeout(openVersionMenu, 350);
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
