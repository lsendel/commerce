(function () {
  "use strict";

  if (window.petm8Ui) return;

  var dialogId = "petm8-confirm-dialog";
  var commandPaletteId = "petm8-command-palette";
  var floatingQuickActionId = "petm8-quick-actions-fab";
  var stylesId = "petm8-ui-styles";
  var filterStoragePrefix = "petm8:filters:";
  var draftStoragePrefix = "petm8:draft:";
  var recentPagesKey = "petm8:recent-admin-pages";
  var draftSaveTimers = {};

  function notify(message, type) {
    if (!message) return;
    if (window.showToast) {
      window.showToast(message, type || "info");
      return;
    }
    console.log("[petm8-ui]", message);
  }

  function ensureStyles() {
    if (document.getElementById(stylesId)) return;
    var style = document.createElement("style");
    style.id = stylesId;
    style.textContent = [
      ".petm8-confirm{width:min(28rem,calc(100vw - 2rem));border:none;border-radius:1rem;padding:0;box-shadow:0 24px 56px rgba(0,0,0,.22);}",
      ".petm8-confirm::backdrop{background:rgba(15,23,42,.55);backdrop-filter:blur(2px);}",
      ".petm8-confirm__content{padding:1.25rem;background:#fff;color:#111827;}",
      ".petm8-confirm__title{font-size:1rem;font-weight:700;line-height:1.35;margin-bottom:.5rem;}",
      ".petm8-confirm__message{font-size:.9rem;line-height:1.45;color:#374151;margin-bottom:1rem;}",
      ".petm8-confirm__actions{display:flex;justify-content:flex-end;gap:.5rem;}",
      ".petm8-confirm__btn{border:1px solid #d1d5db;border-radius:.75rem;padding:.5rem .9rem;font-size:.85rem;font-weight:600;cursor:pointer;background:#fff;color:#374151;}",
      ".petm8-confirm__btn:hover{background:#f3f4f6;}",
      ".petm8-confirm__btn--danger{background:#dc2626;color:#fff;border-color:#dc2626;}",
      ".petm8-confirm__btn--danger:hover{background:#b91c1c;}",
      ".petm8-confirm__btn--primary{background:#4f46e5;color:#fff;border-color:#4f46e5;}",
      ".petm8-confirm__btn--primary:hover{background:#4338ca;}",
      ".dark .petm8-confirm__content{background:#111827;color:#f3f4f6;}",
      ".dark .petm8-confirm__message{color:#d1d5db;}",
      ".dark .petm8-confirm__btn{background:#1f2937;color:#e5e7eb;border-color:#374151;}",
      ".dark .petm8-confirm__btn:hover{background:#374151;}",
      ".petm8-cmd{width:min(42rem,calc(100vw - 1.5rem));border:none;border-radius:1rem;padding:0;box-shadow:0 24px 56px rgba(0,0,0,.22);}",
      ".petm8-cmd::backdrop{background:rgba(15,23,42,.55);backdrop-filter:blur(2px);}",
      ".petm8-cmd__shell{background:#fff;color:#111827;border:1px solid #e5e7eb;border-radius:1rem;overflow:hidden;}",
      ".petm8-cmd__header{padding:.9rem 1rem;border-bottom:1px solid #e5e7eb;}",
      ".petm8-cmd__input{width:100%;border:1px solid #d1d5db;border-radius:.75rem;padding:.65rem .8rem;font-size:.9rem;outline:none;}",
      ".petm8-cmd__input:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2);}",
      ".petm8-cmd__list{max-height:20rem;overflow:auto;padding:.35rem;}",
      ".petm8-cmd__item{display:flex;align-items:center;justify-content:space-between;gap:.8rem;border-radius:.65rem;padding:.55rem .65rem;color:#111827;}",
      ".petm8-cmd__item:hover,.petm8-cmd__item[data-active='true']{background:#eef2ff;}",
      ".petm8-cmd__meta{font-size:.72rem;color:#6b7280;}",
      ".petm8-cmd__empty{padding:1rem;color:#6b7280;font-size:.85rem;}",
      ".petm8-fab{position:fixed;right:1rem;bottom:1rem;z-index:45;border:none;border-radius:999px;padding:.65rem 1rem;background:#4f46e5;color:#fff;font-size:.82rem;font-weight:700;box-shadow:0 12px 28px rgba(79,70,229,.35);cursor:pointer;}",
      ".petm8-fab:hover{background:#4338ca;}",
      ".dark .petm8-cmd__shell{background:#111827;color:#f3f4f6;border-color:#374151;}",
      ".dark .petm8-cmd__header{border-color:#374151;}",
      ".dark .petm8-cmd__input{background:#0f172a;color:#f3f4f6;border-color:#374151;}",
      ".dark .petm8-cmd__item{color:#e5e7eb;}",
      ".dark .petm8-cmd__item:hover,.dark .petm8-cmd__item[data-active='true']{background:#1f2937;}",
      ".dark .petm8-cmd__meta,.dark .petm8-cmd__empty{color:#9ca3af;}",
    ].join("\n");
    document.head.appendChild(style);
  }

  function ensureDialog() {
    var dialog = document.getElementById(dialogId);
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = dialogId;
    dialog.className = "petm8-confirm";
    dialog.innerHTML = [
      '<div class="petm8-confirm__content">',
      '<h2 class="petm8-confirm__title" data-confirm-title></h2>',
      '<p class="petm8-confirm__message" data-confirm-message></p>',
      '<div class="petm8-confirm__actions">',
      '<button type="button" class="petm8-confirm__btn" data-confirm-cancel>Cancel</button>',
      '<button type="button" class="petm8-confirm__btn petm8-confirm__btn--primary" data-confirm-accept>Confirm</button>',
      "</div>",
      "</div>",
    ].join("");

    var cancelBtn = dialog.querySelector("[data-confirm-cancel]");
    var acceptBtn = dialog.querySelector("[data-confirm-accept]");

    function resolveAndClose(accepted) {
      if (!dialog.__resolver) return;
      var resolver = dialog.__resolver;
      dialog.__resolver = null;
      dialog.returnValue = accepted ? "confirm" : "cancel";
      dialog.close();
      resolver(accepted);
    }

    cancelBtn.addEventListener("click", function () {
      resolveAndClose(false);
    });

    acceptBtn.addEventListener("click", function () {
      resolveAndClose(true);
    });

    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      resolveAndClose(false);
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  function confirmAction(message, options) {
    var text = typeof message === "string" ? message : "";
    var config = options || {};
    var title = typeof config.title === "string" && config.title.trim() ? config.title.trim() : "Confirm action";
    var cancelText =
      typeof config.cancelText === "string" && config.cancelText.trim() ? config.cancelText.trim() : "Cancel";
    var confirmText =
      typeof config.confirmText === "string" && config.confirmText.trim() ? config.confirmText.trim() : "Confirm";
    var danger = !!config.danger;

    if (typeof HTMLDialogElement === "undefined") {
      return Promise.resolve(window.confirm(text || title));
    }

    ensureStyles();
    var dialog = ensureDialog();
    var titleEl = dialog.querySelector("[data-confirm-title]");
    var messageEl = dialog.querySelector("[data-confirm-message]");
    var cancelBtn = dialog.querySelector("[data-confirm-cancel]");
    var acceptBtn = dialog.querySelector("[data-confirm-accept]");

    titleEl.textContent = title;
    messageEl.textContent = text || title;
    cancelBtn.textContent = cancelText;
    acceptBtn.textContent = confirmText;

    acceptBtn.classList.remove("petm8-confirm__btn--danger", "petm8-confirm__btn--primary");
    acceptBtn.classList.add(danger ? "petm8-confirm__btn--danger" : "petm8-confirm__btn--primary");

    return new Promise(function (resolve) {
      dialog.__resolver = resolve;
      dialog.showModal();
      window.requestAnimationFrame(function () {
        acceptBtn.focus();
      });
    });
  }

  function safeStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (_) {
      return false;
    }
  }

  function safeStorageRemove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function parseJson(value) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch (_) {
      return null;
    }
  }

  function isAdminPath() {
    var path = window.location.pathname || "";
    return /^\/(admin|platform|affiliates)(\/|$)/.test(path);
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function resolveFormScope(form, prefix) {
    if (!form) return prefix + "default";
    var custom = form.getAttribute("data-persist-key") || form.getAttribute("data-auto-draft-key");
    if (custom && custom.trim()) return prefix + custom.trim();
    var path = window.location.pathname || "/";
    var action = (form.getAttribute("action") || path).trim();
    var marker = form.id || form.getAttribute("name") || slugify(form.className) || "form";
    return prefix + action + "::" + marker;
  }

  function getFormFields(form) {
    if (!form) return [];
    return Array.prototype.slice.call(
      form.querySelectorAll("input[name], select[name], textarea[name]"),
    );
  }

  function captureFormValues(form, includeEmptyValues) {
    var state = {};
    var fields = getFormFields(form);
    fields.forEach(function (field) {
      if (!field || field.disabled || !field.name) return;
      var type = (field.type || "").toLowerCase();
      if (type === "submit" || type === "button" || type === "image" || type === "reset" || type === "file") return;
      if (type === "password") return;
      var key = field.name;
      if (type === "checkbox") {
        if (!state[key]) state[key] = [];
        if (field.checked) state[key].push(field.value || "on");
        return;
      }
      if (type === "radio") {
        if (field.checked) state[key] = field.value;
        return;
      }
      var value = field.value == null ? "" : String(field.value);
      if (!includeEmptyValues && !value) return;
      state[key] = value;
    });
    return state;
  }

  function applyFormValues(form, state, options) {
    if (!form || !state || typeof state !== "object") return false;
    var config = options || {};
    var didApply = false;
    var fields = getFormFields(form);

    fields.forEach(function (field) {
      if (!field || field.disabled || !field.name) return;
      var key = field.name;
      if (!Object.prototype.hasOwnProperty.call(state, key)) return;

      var type = (field.type || "").toLowerCase();
      var currentValue = field.value == null ? "" : String(field.value);
      var canOverwrite = config.force || !currentValue;

      if (type === "checkbox") {
        var checkedValues = Array.isArray(state[key]) ? state[key] : [state[key]];
        var shouldCheck = checkedValues.indexOf(field.value || "on") >= 0;
        if (field.checked !== shouldCheck) {
          field.checked = shouldCheck;
          didApply = true;
        }
        return;
      }

      if (type === "radio") {
        var shouldRadioCheck = String(state[key]) === String(field.value);
        if (field.checked !== shouldRadioCheck) {
          field.checked = shouldRadioCheck;
          didApply = true;
        }
        return;
      }

      if (!canOverwrite && !config.fillOnlyEmpty) return;
      var nextValue = state[key] == null ? "" : String(state[key]);
      if (currentValue !== nextValue) {
        field.value = nextValue;
        didApply = true;
      }
    });

    return didApply;
  }

  function shouldRestoreFilterState(form) {
    if (!form) return false;
    if (form.hasAttribute("data-restore-with-query")) return true;
    return !window.location.search;
  }

  function setupPersistentFilters() {
    var forms = document.querySelectorAll("form[data-persist-filters]");
    if (!forms.length) return;

    forms.forEach(function (form) {
      var method = (form.getAttribute("method") || "get").toLowerCase();
      if (method !== "get") return;

      var key = resolveFormScope(form, filterStoragePrefix);
      var savedState = parseJson(safeStorageGet(key));
      if (savedState && shouldRestoreFilterState(form)) {
        var restored = applyFormValues(form, savedState, { fillOnlyEmpty: true });
        if (restored && form.hasAttribute("data-filter-restore-notice")) {
          notify("Saved filters restored.", "info");
        }
      }

      form.addEventListener("submit", function () {
        var state = captureFormValues(form, true);
        safeStorageSet(key, JSON.stringify(state));
      });

      var clearSelector = form.getAttribute("data-persist-clear-selector");
      if (clearSelector) {
        var clearButtons = document.querySelectorAll(clearSelector);
        clearButtons.forEach(function (el) {
          el.addEventListener("click", function () {
            safeStorageRemove(key);
          });
        });
      }

      var autoSubmitControls = form.querySelectorAll("[data-auto-submit]");
      autoSubmitControls.forEach(function (control) {
        var mode = (control.getAttribute("data-auto-submit") || "change").toLowerCase();
        var eventName = mode === "input" ? "input" : "change";
        control.addEventListener(eventName, function () {
          var state = captureFormValues(form, true);
          safeStorageSet(key, JSON.stringify(state));
          if (typeof form.requestSubmit === "function") {
            form.requestSubmit();
          } else {
            form.submit();
          }
        });
      });
    });
  }

  function formLooksPrefilled(form) {
    var fields = getFormFields(form);
    for (var i = 0; i < fields.length; i += 1) {
      var field = fields[i];
      if (!field || field.disabled || !field.name) continue;
      var type = (field.type || "").toLowerCase();
      if (type === "submit" || type === "button" || type === "hidden" || type === "image" || type === "reset") continue;
      if (type === "checkbox" || type === "radio") {
        if (field.checked) return true;
        continue;
      }
      if (field.value && String(field.value).trim()) return true;
    }
    return false;
  }

  function setupDraftForms() {
    var forms = document.querySelectorAll("form[data-auto-draft]");
    if (!forms.length) return;

    forms.forEach(function (form) {
      var method = (form.getAttribute("method") || "post").toLowerCase();
      if (method === "get") return;

      var key = resolveFormScope(form, draftStoragePrefix);
      var saved = parseJson(safeStorageGet(key));
      if (saved && !formLooksPrefilled(form)) {
        var restored = applyFormValues(form, saved, { fillOnlyEmpty: true });
        if (restored) {
          notify("Recovered your unsaved draft.", "info");
        }
      }

      function persistDraftSoon() {
        var timerId = draftSaveTimers[key];
        if (timerId) window.clearTimeout(timerId);
        draftSaveTimers[key] = window.setTimeout(function () {
          var state = captureFormValues(form, false);
          if (!state || Object.keys(state).length === 0) {
            safeStorageRemove(key);
            return;
          }
          safeStorageSet(key, JSON.stringify(state));
        }, 300);
      }

      form.addEventListener("input", persistDraftSoon);
      form.addEventListener("change", persistDraftSoon);
      form.addEventListener("submit", function () {
        safeStorageRemove(key);
      });
    });
  }

  function readRecentPages() {
    var parsed = parseJson(safeStorageGet(recentPagesKey));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(function (item) {
      return item && typeof item.path === "string" && typeof item.label === "string";
    });
  }

  function rememberRecentPage() {
    if (!isAdminPath()) return;
    var path = window.location.pathname || "/";
    if (!path || path === "/") return;
    var label = (document.title || path).replace(/\s+\|\s+.*$/, "").trim();
    var entries = readRecentPages().filter(function (item) {
      return item.path !== path;
    });
    entries.unshift({
      path: path,
      label: label,
      visitedAt: Date.now(),
    });
    safeStorageSet(recentPagesKey, JSON.stringify(entries.slice(0, 8)));
  }

  function getDefaultQuickActions() {
    return [
      { label: "Analytics Dashboard", href: "/admin/analytics", group: "Insights", keywords: "analytics revenue funnel traffic marketing" },
      { label: "Promotions", href: "/admin/promotions", group: "Marketing", keywords: "coupon campaign discount conversion" },
      { label: "Products", href: "/admin/products", group: "Commerce", keywords: "catalog product seo" },
      { label: "Create Product", href: "/admin/products/new", group: "Commerce", keywords: "new product launch listing" },
      { label: "Orders", href: "/admin/orders", group: "Operations", keywords: "orders status fulfillment" },
      { label: "Bookings", href: "/admin/bookings", group: "Operations", keywords: "calendar appointments events" },
      { label: "Reviews", href: "/admin/reviews", group: "Marketing", keywords: "ugc moderation trust" },
      { label: "Affiliates", href: "/admin/affiliates", group: "Growth", keywords: "partners referral creators" },
      { label: "Control Tower", href: "/admin/control-tower", group: "Operations", keywords: "risk alerts reliability" },
      { label: "Policies", href: "/admin/policies", group: "Settings", keywords: "policy guardrails automation" },
      { label: "Store Settings", href: "/platform/settings", group: "Settings", keywords: "store settings branding" },
      { label: "View Storefront", href: "/", group: "Storefront", keywords: "preview storefront site" },
    ];
  }

  function collectQuickActions() {
    var known = {};
    var actions = [];

    function register(action) {
      if (!action || !action.href || !action.label) return;
      var href = String(action.href).trim();
      if (!href || href.charAt(0) !== "/") return;
      var key = href + "::" + action.label;
      if (known[key]) return;
      known[key] = true;
      actions.push({
        label: action.label,
        href: href,
        group: action.group || "Quick Actions",
        keywords: action.keywords || "",
      });
    }

    getDefaultQuickActions().forEach(register);

    var navLinks = document.querySelectorAll('a[href^="/admin"], a[href^="/platform"], a[href^="/affiliates"]');
    navLinks.forEach(function (link) {
      var text = (link.textContent || "").trim().replace(/\s+/g, " ");
      if (!text) return;
      register({
        label: text,
        href: link.getAttribute("href"),
        group: "Navigation",
        keywords: text.toLowerCase(),
      });
    });

    readRecentPages().forEach(function (item) {
      register({
        label: "Recent: " + item.label,
        href: item.path,
        group: "Recent",
        keywords: "recent",
      });
    });

    return actions;
  }

  function ensureCommandPalette() {
    var palette = document.getElementById(commandPaletteId);
    if (palette) return palette;

    ensureStyles();
    palette = document.createElement("dialog");
    palette.id = commandPaletteId;
    palette.className = "petm8-cmd";
    palette.innerHTML = [
      '<div class="petm8-cmd__shell">',
      '<div class="petm8-cmd__header">',
      '<input type="search" class="petm8-cmd__input" placeholder="Jump to pages, tools, and workflows..." aria-label="Quick actions search" data-cmd-search />',
      "</div>",
      '<div class="petm8-cmd__list" data-cmd-list></div>',
      "</div>",
    ].join("");

    palette.addEventListener("cancel", function (event) {
      event.preventDefault();
      palette.close();
    });

    document.body.appendChild(palette);
    return palette;
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderCommandList(listEl, items) {
    if (!listEl) return;
    if (!items.length) {
      listEl.innerHTML = '<div class="petm8-cmd__empty">No matches. Try another keyword.</div>';
      return;
    }
    listEl.innerHTML = items.map(function (item, index) {
      return [
        '<a class="petm8-cmd__item" data-cmd-item href="',
        escapeHtml(item.href),
        '" data-index="',
        String(index),
        '">',
        "<span>",
        escapeHtml(item.label),
        "</span>",
        '<span class="petm8-cmd__meta">',
        escapeHtml(item.group || "Quick"),
        "</span>",
        "</a>",
      ].join("");
    }).join("");
  }

  function filterQuickActions(actions, query) {
    var trimmed = String(query || "").trim().toLowerCase();
    if (!trimmed) return actions.slice(0, 12);
    return actions.filter(function (action) {
      var haystack = [
        action.label || "",
        action.href || "",
        action.group || "",
        action.keywords || "",
      ].join(" ").toLowerCase();
      return haystack.indexOf(trimmed) >= 0;
    }).slice(0, 12);
  }

  function openQuickActions(initialQuery) {
    if (!isAdminPath()) return;
    var palette = ensureCommandPalette();
    var input = palette.querySelector("[data-cmd-search]");
    var listEl = palette.querySelector("[data-cmd-list]");
    var actions = collectQuickActions();

    function refreshList() {
      var visible = filterQuickActions(actions, input.value || "");
      renderCommandList(listEl, visible);
    }

    if (!palette.__bound) {
      palette.__bound = true;
      input.addEventListener("input", refreshList);
      listEl.addEventListener("click", function (event) {
        var target = event.target.closest("[data-cmd-item]");
        if (!target) return;
        palette.close();
      });
      input.addEventListener("keydown", function (event) {
        if (event.key !== "Enter") return;
        var first = listEl.querySelector("[data-cmd-item]");
        if (first) {
          event.preventDefault();
          window.location.href = first.getAttribute("href");
        }
      });
    }

    input.value = initialQuery || "";
    refreshList();

    if (!palette.open) {
      palette.showModal();
    }
    window.requestAnimationFrame(function () {
      input.focus();
      if (input.value) input.select();
    });
  }

  function ensureFloatingQuickActionsButton() {
    if (!isAdminPath()) return;
    if (document.querySelector("[data-admin-quick-actions-btn]")) return;
    if (document.getElementById(floatingQuickActionId)) return;

    ensureStyles();
    var button = document.createElement("button");
    button.type = "button";
    button.id = floatingQuickActionId;
    button.className = "petm8-fab";
    button.setAttribute("aria-label", "Open quick actions");
    button.textContent = "Quick Actions";
    button.addEventListener("click", function () {
      openQuickActions("");
    });
    document.body.appendChild(button);
  }

  function setupQuickActionsBindings() {
    var triggers = document.querySelectorAll("[data-admin-quick-actions-btn]");
    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        openQuickActions("");
      });
    });

    document.addEventListener("keydown", function (event) {
      var key = String(event.key || "").toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        openQuickActions("");
      }
    });

    ensureFloatingQuickActionsButton();
  }

  function parseDatasetObject(node, attributeName) {
    if (!node) return {};
    var raw = node.getAttribute(attributeName);
    if (!raw) return {};
    var parsed = parseJson(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  }

  function formatRelativeDateTime(value) {
    var parsed = new Date(value || "");
    if (Number.isNaN(parsed.getTime())) return "just now";
    var deltaMs = Date.now() - parsed.getTime();
    if (deltaMs < 45 * 1000) return "just now";
    var deltaMinutes = Math.floor(deltaMs / 60000);
    if (deltaMinutes < 60) return deltaMinutes + "m ago";
    var deltaHours = Math.floor(deltaMinutes / 60);
    if (deltaHours < 24) return deltaHours + "h ago";
    var deltaDays = Math.floor(deltaHours / 24);
    if (deltaDays < 7) return deltaDays + "d ago";
    return parsed.toISOString().slice(0, 10);
  }

  function normalizeAutomationHistoryItem(raw) {
    if (!raw || typeof raw !== "object") return null;
    var title = typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim()
      : "Applied recommendation";
    var detail = typeof raw.detail === "string" && raw.detail.trim() ? raw.detail.trim() : null;
    var href = typeof raw.href === "string" && raw.href.trim().charAt(0) === "/"
      ? raw.href.trim()
      : "/admin/analytics";
    var appliedAt = typeof raw.appliedAt === "string" && raw.appliedAt.trim()
      ? raw.appliedAt.trim()
      : new Date().toISOString();
    var actionId = typeof raw.actionId === "string" && raw.actionId.trim()
      ? raw.actionId.trim()
      : "recommended-action";

    return {
      title: title,
      detail: detail,
      href: href,
      appliedAt: appliedAt,
      actionId: actionId,
    };
  }

  function buildAutomationHistoryNode(item) {
    var wrapper = document.createElement("a");
    wrapper.href = item.href;
    wrapper.className = "block rounded-lg border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/70 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70";

    var top = document.createElement("div");
    top.className = "flex items-center justify-between gap-2";

    var title = document.createElement("p");
    title.className = "text-sm font-medium text-slate-800 dark:text-slate-200";
    title.textContent = item.title;

    var time = document.createElement("span");
    time.className = "text-[11px] font-semibold text-teal-700 dark:text-teal-300";
    time.textContent = formatRelativeDateTime(item.appliedAt);

    top.appendChild(title);
    top.appendChild(time);
    wrapper.appendChild(top);

    if (item.detail) {
      var detail = document.createElement("p");
      detail.className = "mt-1 text-xs text-slate-500 dark:text-slate-400";
      detail.textContent = item.detail;
      wrapper.appendChild(detail);
    }

    var meta = document.createElement("p");
    meta.className = "mt-1 text-[11px] text-slate-400 dark:text-slate-500";
    meta.textContent = "Action: " + item.actionId;
    wrapper.appendChild(meta);

    return wrapper;
  }

  function renderAutomationHistory(listRoot, items) {
    if (!listRoot) return;
    listRoot.innerHTML = "";

    if (!Array.isArray(items) || items.length === 0) {
      var empty = document.createElement("p");
      empty.className = "text-sm text-slate-500 dark:text-slate-400";
      empty.textContent = "No automation activity yet. Use \"Apply Default\" on any recommendation.";
      empty.setAttribute("data-automation-history-empty", "");
      listRoot.appendChild(empty);
      return;
    }

    items.forEach(function (item) {
      listRoot.appendChild(buildAutomationHistoryNode(item));
    });
  }

  function fetchAutomationHistory(historyUrl) {
    return fetch(historyUrl, {
      method: "GET",
      headers: {
        accept: "application/json",
      },
    })
      .then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (payload) {
            if (!response.ok) {
              throw new Error((payload && payload.error) || "Failed to load automation activity.");
            }
            return payload;
          });
      })
      .then(function (payload) {
        var rows = payload && Array.isArray(payload.history) ? payload.history : [];
        return rows
          .map(function (row) {
            return normalizeAutomationHistoryItem(row);
          })
          .filter(function (row) {
            return row !== null;
          });
      });
  }

  function setupRecommendationAutomationCenter() {
    var center = document.querySelector("[data-analytics-automation-center]");
    var applyButtons = document.querySelectorAll("[data-recommendation-apply]");
    if (!center && !applyButtons.length) return;

    var historyUrl = center
      ? center.getAttribute("data-automation-history-url") || "/api/analytics/recommendations/history?limit=8"
      : "/api/analytics/recommendations/history?limit=8";
    var historyList = center ? center.querySelector("[data-automation-history-list]") : null;
    var refreshBtn = center ? center.querySelector("[data-automation-history-refresh]") : null;

    function setHistory(items) {
      if (!center) return;
      center.__automationHistory = items.slice(0, 8);
      renderAutomationHistory(historyList, center.__automationHistory);
    }

    function prependHistory(item) {
      if (!center || !item) return;
      var current = Array.isArray(center.__automationHistory) ? center.__automationHistory.slice() : [];
      current = current.filter(function (row) {
        return row.actionId !== item.actionId || row.appliedAt !== item.appliedAt;
      });
      current.unshift(item);
      setHistory(current.slice(0, 8));
    }

    function loadHistory() {
      if (!center) return Promise.resolve();
      if (refreshBtn) refreshBtn.disabled = true;
      return fetchAutomationHistory(historyUrl)
        .then(function (items) {
          setHistory(items);
        })
        .catch(function (error) {
          notify(error && error.message ? error.message : "Failed to load automation activity.", "warning");
        })
        .finally(function () {
          if (refreshBtn) refreshBtn.disabled = false;
        });
    }

    if (refreshBtn && !refreshBtn.__bound) {
      refreshBtn.__bound = true;
      refreshBtn.addEventListener("click", function () {
        loadHistory();
      });
    }

    if (center) {
      loadHistory();
    }

    applyButtons.forEach(function (button) {
      if (button.__bound) return;
      button.__bound = true;

      button.addEventListener("click", function () {
        var actionId = (button.getAttribute("data-recommendation-id") || "").trim();
        var title = (button.getAttribute("data-recommendation-title") || "").trim();
        var detail = (button.getAttribute("data-recommendation-detail") || "").trim();
        var href = (button.getAttribute("data-recommendation-href") || "").trim() || "/admin/analytics";
        var dateFrom = (button.getAttribute("data-recommendation-from") || "").trim();
        var dateTo = (button.getAttribute("data-recommendation-to") || "").trim();
        if (!actionId || !title || href.charAt(0) !== "/") {
          notify("Recommendation metadata is incomplete.", "error");
          return;
        }

        var payload = parseDatasetObject(button, "data-recommendation-payload");
        var body = {
          actionId: actionId,
          title: title,
          detail: detail || undefined,
          href: href,
          payload: payload,
          context: {
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          },
        };

        var previousLabel = button.textContent;
        button.disabled = true;
        button.textContent = "Applying...";

        fetch("/api/analytics/recommendations/apply", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(body),
        })
          .then(function (response) {
            return response
              .json()
              .catch(function () {
                return {};
              })
              .then(function (result) {
                if (!response.ok) {
                  throw new Error((result && result.error) || "Failed to apply recommendation.");
                }
                return result;
              });
          })
          .then(function (result) {
            var row = normalizeAutomationHistoryItem({
              title: title,
              detail: detail || null,
              href: href,
              actionId: actionId,
              appliedAt: result && result.appliedAt ? result.appliedAt : new Date().toISOString(),
            });
            if (row) prependHistory(row);
            notify("Default automation applied.", "success");
          })
          .catch(function (error) {
            notify(error && error.message ? error.message : "Failed to apply recommendation.", "error");
          })
          .finally(function () {
            button.disabled = false;
            button.textContent = previousLabel || "Apply Default";
          });
      });
    });
  }

  function initUiEnhancements() {
    setupPersistentFilters();
    setupDraftForms();
    rememberRecentPage();
    setupQuickActionsBindings();
    setupRecommendationAutomationCenter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initUiEnhancements);
  } else {
    initUiEnhancements();
  }

  window.petm8Ui = {
    notify: notify,
    confirm: confirmAction,
    openQuickActions: openQuickActions,
  };
})();
