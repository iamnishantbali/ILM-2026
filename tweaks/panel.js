/* ============================================================
   Prototype variants panel — tweaks build only.

   Loaded BEFORE app.js so window.ILM_VARIANTS is populated by the time
   the app reads it. State lives in three places, in priority order:
     1. the URL hash   (#v=key:value,key:value)  — shareable links
     2. localStorage   (per viewer convenience)
     3. the team defaults below
   CSS-driven variants are mirrored as data-v-<key> attributes on <html>;
   JS-driven ones are read by app.js via window.ILM_VARIANTS and re-applied
   through window.ILM_APPLY_VARIANTS / window.ILM_SET_DIFF_MODE.
   ============================================================ */
(function () {
  "use strict";

  const STORAGE_KEY = "ilm-variants-v2";

  // key, label, hint, options [{v, l}], team default, kind ("css" | "js")
  const SECTIONS = [
    {
      title: "Review step",
      items: [
        { key: "conflictColor", label: "Conflict colour", options: [{ v: "red", l: "Red" }, { v: "yellow", l: "Yellow" }], def: "red", kind: "css" },
        { key: "actionPrefix", label: "Action sub-text", hint: '"Action: Update" vs "Update"', options: [{ v: true, l: "Prefixed" }, { v: false, l: "Plain" }], def: true, kind: "js" },
        { key: "resolveStyle", label: "Resolve conflict button", options: [{ v: "primary", l: "Primary" }, { v: "outline", l: "Outline" }], def: "primary", kind: "css" },
        { key: "headerDivider", label: "Header divider", hint: "Between Resolve conflict and Used by", options: [{ v: "auto", l: "With button" }, { v: "always", l: "Always" }], def: "auto", kind: "css" },
        { key: "blockNextOnConflicts", label: "Block Next until resolved", options: [{ v: true, l: "On" }, { v: false, l: "Off" }], def: true, kind: "js", toggle: true },
        { key: "groupWarn", label: "Group-level conflict icon", options: [{ v: "on", l: "On" }, { v: "off", l: "Off" }], def: "on", kind: "css", toggle: true },
      ],
    },
    {
      title: "Diff reviewer",
      items: [
        { key: "auditView", label: "Audit view", hint: "Third button in the view switcher", options: [{ v: "on", l: "On" }, { v: "off", l: "Off" }], def: "off", kind: "css", toggle: true },
        { key: "diffToggle", label: "View switcher", options: [{ v: "icons", l: "Icons" }, { v: "text", l: "Icons + text" }], def: "icons", kind: "css" },
        { key: "defaultDiff", label: "Default view", options: [{ v: "split", l: "Split" }, { v: "unified", l: "Unified" }, { v: "audit", l: "Audit" }], def: "split", kind: "diff" },
      ],
    },
    {
      title: "Wizard & drawers",
      items: [
        { key: "stepperAnim", label: "Revolving step ring", options: [{ v: "on", l: "On" }, { v: "off", l: "Off" }], def: "on", kind: "css", toggle: true },
        { key: "gitignore", label: ".gitignore upload", hint: "In the Ignore fields drawer", options: [{ v: "on", l: "On" }, { v: "off", l: "Off" }], def: "on", kind: "css", toggle: true },
        { key: "mergeFast", label: "Fast merge animation", hint: "1s instead of 3.5s", options: [{ v: false, l: "Off" }, { v: true, l: "On" }], def: false, kind: "js", toggle: true, attr: (v) => (v ? "on" : "off") },
      ],
    },
  ];

  const ITEMS = SECTIONS.flatMap((s) => s.items);
  const defaults = Object.fromEntries(ITEMS.map((it) => [it.key, it.def]));

  /* ---------- state ---------- */

  function parseValue(item, raw) {
    const match = item.options.find((o) => String(o.v) === String(raw));
    return match ? match.v : undefined;
  }

  function readHash() {
    const m = location.hash.match(/[#&]v=([^&]*)/);
    if (!m) return null;
    const out = {};
    decodeURIComponent(m[1]).split(",").forEach((pair) => {
      const [k, raw] = pair.split(":");
      const item = ITEMS.find((it) => it.key === k);
      if (!item) return;
      const v = parseValue(item, raw);
      if (v !== undefined) out[k] = v;
    });
    return out;
  }

  function readStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      const out = {};
      ITEMS.forEach((it) => {
        if (it.key in obj) {
          const v = parseValue(it, obj[it.key]);
          if (v !== undefined) out[it.key] = v;
        }
      });
      return out;
    } catch (e) {
      return null;
    }
  }

  function writeStorage(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* private mode / blocked storage: variants still work for this load */
    }
  }

  const state = Object.assign({}, defaults, readStorage() || {}, readHash() || {});
  window.ILM_VARIANTS = state;

  /* ---------- apply ---------- */

  function attrValue(item, v) {
    if (item.attr) return item.attr(v);
    return String(v);
  }

  function applyCss() {
    ITEMS.forEach((it) => {
      document.documentElement.setAttribute("data-v-" + it.key.toLowerCase(), attrValue(it, state[it.key]));
    });
  }

  function applyAll(changedKey) {
    applyCss();
    writeStorage(state);
    if (typeof window.ILM_APPLY_VARIANTS === "function") window.ILM_APPLY_VARIANTS();
    if ((changedKey === "defaultDiff" || changedKey === "auditView") && typeof window.ILM_SET_DIFF_MODE === "function") {
      window.ILM_SET_DIFF_MODE(state.defaultDiff);
    }
  }

  function changedCount() {
    return ITEMS.filter((it) => state[it.key] !== defaults[it.key]).length;
  }

  function shareLink() {
    const pairs = ITEMS.filter((it) => state[it.key] !== defaults[it.key]).map((it) => `${it.key}:${state[it.key]}`);
    const base = location.href.replace(/#.*$/, "");
    return pairs.length ? `${base}#v=${encodeURIComponent(pairs.join(","))}` : base;
  }

  applyCss();

  /* ---------- UI ---------- */

  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v);
    });
    (children || []).forEach((c) => c && el.appendChild(c));
    return el;
  }

  const GEAR = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M6.6 2.5h2.8l.4 1.6 1.3.8 1.6-.5 1.4 2.4-1.2 1.1v1.5l1.2 1.1-1.4 2.4-1.6-.5-1.3.8-.4 1.6H6.6l-.4-1.6-1.3-.8-1.6.5-1.4-2.4 1.2-1.1V7.3L1.9 6.2l1.4-2.4 1.6.5 1.3-.8z"/><circle cx="8" cy="8" r="2"/></svg>';
  const X = '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>';

  function build() {
    const count = h("span", { class: "vp-fab__count", hidden: "" });
    const fab = h("button", { class: "vp-fab", type: "button", "aria-expanded": "false", "aria-controls": "vp-panel", title: "Prototype variants" }, [
      h("span", { html: GEAR }),
      h("span", { text: "Variants" }),
      count,
    ]);

    const body = h("div", { class: "vp-panel__body" });
    const rows = {};

    SECTIONS.forEach((section) => {
      body.appendChild(h("div", { class: "vp-section", text: section.title }));
      section.items.forEach((item) => {
        const label = h("div", { class: "vp-row__label" }, [document.createTextNode(item.label), item.hint ? h("small", { text: item.hint }) : null]);
        let control;
        if (item.toggle) {
          const onValue = item.options.find((o) => o.l === "On").v;
          control = h("button", { class: "vp-switch", type: "button", role: "switch", "aria-label": item.label });
          control.addEventListener("click", () => set(item.key, state[item.key] === onValue ? item.options.find((o) => o.v !== onValue).v : onValue));
        } else {
          control = h("div", { class: "vp-seg", role: "group", "aria-label": item.label });
          item.options.forEach((o) => {
            const b = h("button", { class: "vp-seg__btn", type: "button", text: o.l, "data-v": String(o.v) });
            b.addEventListener("click", () => set(item.key, o.v));
            control.appendChild(b);
          });
        }
        const row = h("div", { class: "vp-row" }, [label, control]);
        rows[item.key] = { row, control, item };
        body.appendChild(row);
      });
    });

    const resetBtn = h("button", { class: "btn btn--sm btn--outline", type: "button", text: "Reset to team version" });
    const linkBtn = h("button", { class: "btn btn--sm btn--primary", type: "button", text: "Copy link" });
    const closeBtn = h("button", { class: "icon-btn icon-btn--xs icon-btn--ghost", type: "button", "aria-label": "Close", html: X });

    const panel = h("div", { class: "vp-panel", id: "vp-panel", role: "dialog", "aria-label": "Prototype variants" }, [
      h("div", { class: "vp-panel__header" }, [
        h("div", {}, [h("div", { class: "vp-panel__title", text: "Prototype variants" }), h("div", { class: "vp-panel__hint", text: "Switch live while presenting. Changes stay on this device." })]),
        closeBtn,
      ]),
      body,
      h("div", { class: "vp-panel__footer" }, [resetBtn, linkBtn]),
    ]);

    function sync() {
      Object.values(rows).forEach(({ row, control, item }) => {
        const v = state[item.key];
        row.classList.toggle("vp-changed", v !== defaults[item.key]);
        if (item.toggle) {
          const onValue = item.options.find((o) => o.l === "On").v;
          control.setAttribute("aria-checked", v === onValue ? "true" : "false");
        } else {
          control.querySelectorAll(".vp-seg__btn").forEach((b) => b.classList.toggle("is-active", b.dataset.v === String(v)));
        }
      });
      const auditBtn = rows.defaultDiff.control.querySelector('[data-v="audit"]');
      auditBtn.hidden = state.auditView === "off";
      const n = changedCount();
      count.textContent = String(n);
      count.hidden = n === 0;
    }

    function set(key, value) {
      if (state[key] === value) return;
      state[key] = value;
      // Without the Audit view, the diff falls back to Split
      if (key === "auditView" && value === "off" && state.defaultDiff === "audit") state.defaultDiff = "split";
      if (key === "defaultDiff" && value === "audit" && state.auditView === "off") state.auditView = "on";
      applyAll(key);
      sync();
    }

    function open(next) {
      panel.classList.toggle("is-open", next);
      fab.setAttribute("aria-expanded", next ? "true" : "false");
    }

    fab.addEventListener("click", () => open(!panel.classList.contains("is-open")));
    closeBtn.addEventListener("click", () => open(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("is-open")) open(false);
    });
    resetBtn.addEventListener("click", () => {
      ITEMS.forEach((it) => { state[it.key] = defaults[it.key]; });
      applyAll("defaultDiff");
      sync();
      history.replaceState(null, "", location.pathname + location.search);
    });
    linkBtn.addEventListener("click", () => {
      const url = shareLink();
      history.replaceState(null, "", url);
      const done = () => {
        linkBtn.textContent = "Link copied";
        setTimeout(() => { linkBtn.textContent = "Copy link"; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, done);
      else done();
    });

    document.body.appendChild(fab);
    document.body.appendChild(panel);
    sync();
    // Apply the JS-driven variants once app.js has registered its hooks
    applyAll("defaultDiff");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
