(function () {
  "use strict";

  var form = document.getElementById("store-template-form");
  var statusEl = document.getElementById("store-template-status");
  var errorEl = document.getElementById("store-template-error");
  var listEl = document.getElementById("store-template-list");
  var createBtn = document.getElementById("store-template-create-btn");
  var refreshBtn = document.getElementById("store-template-refresh-btn");

  function parseError(payload, fallback) {
    if (window.petm8GetApiErrorMessage) {
      return window.petm8GetApiErrorMessage(payload, fallback);
    }
    return (payload && (payload.error || payload.message)) || fallback;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(message, isError) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.className = isError ? "text-xs text-red-600" : "text-xs text-gray-500";
  }

  function clearError() {
    if (!errorEl) return;
    errorEl.textContent = "";
    errorEl.classList.add("hidden");
  }

  function showError(message) {
    if (!errorEl) return;
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }

  async function requestJson(url, options) {
    var response = await fetch(url, options);
    var payload = await response.json().catch(function () {
      return {};
    });

    if (!response.ok) {
      throw new Error(parseError(payload, "Request failed."));
    }

    return payload;
  }

  function renderTemplates(templates) {
    if (!listEl) return;

    if (!Array.isArray(templates) || templates.length === 0) {
      listEl.innerHTML = '<p class="text-sm text-gray-400">No templates saved yet.</p>';
      return;
    }

    listEl.innerHTML = templates
      .map(function (template) {
        return (
          '<article class="rounded-lg border border-gray-200 px-4 py-3" data-template-id="' +
          escapeHtml(template.id) +
          '">' +
          '<div class="flex items-start justify-between gap-3">' +
          "<div>" +
          '<p class="font-medium text-gray-900">' +
          escapeHtml(template.name) +
          "</p>" +
          (template.description
            ? '<p class="text-xs text-gray-600 mt-0.5">' + escapeHtml(template.description) + "</p>"
            : "") +
          '<p class="text-xs text-gray-500 mt-1">Snapshot v' +
          escapeHtml(String(template.snapshotVersion || 1)) +
          " · " +
          escapeHtml(String(template.productCount || 0)) +
          " products · " +
          escapeHtml(String(template.collectionCount || 0)) +
          " collections · " +
          escapeHtml(String(template.settingCount || 0)) +
          " settings</p>" +
          "</div>" +
          '<button type="button" class="store-template-delete-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" data-template-id="' +
          escapeHtml(template.id) +
          '">Delete</button>' +
          "</div>" +
          '<div class="mt-3 grid lg:grid-cols-4 gap-2 items-end">' +
          '<div><label class="block text-[11px] font-medium text-gray-500 mb-1">Store Name</label><input type="text" class="store-template-clone-name w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs" placeholder="Acme Clone" /></div>' +
          '<div><label class="block text-[11px] font-medium text-gray-500 mb-1">Store Slug</label><input type="text" class="store-template-clone-slug w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs" placeholder="acme-clone" /></div>' +
          '<div><label class="block text-[11px] font-medium text-gray-500 mb-1">Subdomain (optional)</label><input type="text" class="store-template-clone-subdomain w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs" placeholder="acme-clone" /></div>' +
          '<div class="flex items-center gap-2"><button type="button" class="store-template-clone-btn rounded-md border border-cyan-300 bg-cyan-50 px-2 py-1.5 text-xs font-semibold text-cyan-700" data-template-id="' +
          escapeHtml(template.id) +
          '">Clone Store</button></div>' +
          "</div>" +
          '<div class="mt-2 flex items-center gap-3 text-[11px] text-gray-600">' +
          '<label class="inline-flex items-center gap-1"><input type="checkbox" class="store-template-copy-settings" checked /><span>copy settings</span></label>' +
          '<label class="inline-flex items-center gap-1"><input type="checkbox" class="store-template-copy-products" checked /><span>copy products</span></label>' +
          '<label class="inline-flex items-center gap-1"><input type="checkbox" class="store-template-copy-collections" checked /><span>copy collections</span></label>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  async function loadTemplates() {
    var payload = await requestJson("/api/admin/store-templates?limit=100", {
      method: "GET",
      credentials: "same-origin",
    });

    renderTemplates(payload.templates || []);
  }

  function collectCreatePayload() {
    if (!form) return null;

    var fd = new FormData(form);
    var name = String(fd.get("name") || "").trim();
    var description = String(fd.get("description") || "").trim();

    if (!name) {
      throw new Error("Template name is required.");
    }

    return {
      name: name,
      description: description || undefined,
    };
  }

  async function createTemplate() {
    clearError();
    setStatus("Creating template...", false);
    if (createBtn) createBtn.disabled = true;

    try {
      var payload = collectCreatePayload();
      await requestJson("/api/admin/store-templates", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await loadTemplates();
      if (form) form.reset();
      setStatus("Template created.", false);
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to create template.";
      showError(message);
      setStatus(message, true);
    } finally {
      if (createBtn) createBtn.disabled = false;
    }
  }

  function sanitizeSlug(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function cloneTemplate(templateId, container) {
    var nameInput = container.querySelector(".store-template-clone-name");
    var slugInput = container.querySelector(".store-template-clone-slug");
    var subdomainInput = container.querySelector(".store-template-clone-subdomain");
    var copySettingsInput = container.querySelector(".store-template-copy-settings");
    var copyProductsInput = container.querySelector(".store-template-copy-products");
    var copyCollectionsInput = container.querySelector(".store-template-copy-collections");

    var name = String(nameInput && nameInput.value ? nameInput.value : "").trim();
    var slug = sanitizeSlug(slugInput && slugInput.value ? slugInput.value : "");
    var subdomain = sanitizeSlug(subdomainInput && subdomainInput.value ? subdomainInput.value : "");

    if (!name) {
      throw new Error("Clone store name is required.");
    }
    if (!slug) {
      throw new Error("Clone store slug is required.");
    }

    clearError();
    setStatus("Cloning store...", false);

    var payload = await requestJson(
      "/api/admin/store-templates/" + encodeURIComponent(templateId) + "/clone",
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          slug: slug,
          subdomain: subdomain || undefined,
          copySettings: copySettingsInput ? copySettingsInput.checked : true,
          copyProducts: copyProductsInput ? copyProductsInput.checked : true,
          copyCollections: copyCollectionsInput ? copyCollectionsInput.checked : true,
        }),
      }
    );

    var clone = payload.clone || {};
    var cloneStore = clone.store || {};

    setStatus(
      "Cloned store " +
        (cloneStore.slug || "") +
        " (products " +
        String(clone.copied && clone.copied.products != null ? clone.copied.products : 0) +
        ", collections " +
        String(clone.copied && clone.copied.collections != null ? clone.copied.collections : 0) +
        ").",
      false
    );
  }

  async function deleteTemplate(templateId) {
    clearError();
    setStatus("Deleting template...", false);

    await requestJson("/api/admin/store-templates/" + encodeURIComponent(templateId), {
      method: "DELETE",
      credentials: "same-origin",
    });

    await loadTemplates();
    setStatus("Template deleted.", false);
  }

  if (createBtn) {
    createBtn.addEventListener("click", function () {
      createTemplate();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      clearError();
      setStatus("Refreshing templates...", false);
      loadTemplates()
        .then(function () {
          setStatus("", false);
        })
        .catch(function (err) {
          var message = err && err.message ? err.message : "Failed to refresh templates.";
          showError(message);
          setStatus(message, true);
        });
    });
  }

  if (listEl) {
    listEl.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      var cloneBtn = target.closest(".store-template-clone-btn");
      if (cloneBtn) {
        var cloneTemplateId = cloneBtn.getAttribute("data-template-id");
        var cloneContainer = cloneBtn.closest("article[data-template-id]");
        if (!cloneTemplateId || !cloneContainer) return;

        cloneTemplate(cloneTemplateId, cloneContainer).catch(function (err) {
          var message = err && err.message ? err.message : "Failed to clone store.";
          showError(message);
          setStatus(message, true);
        });
        return;
      }

      var deleteBtn = target.closest(".store-template-delete-btn");
      if (deleteBtn) {
        var deleteTemplateId = deleteBtn.getAttribute("data-template-id");
        if (!deleteTemplateId) return;

        if (!window.confirm("Delete this template?")) {
          return;
        }

        deleteTemplate(deleteTemplateId).catch(function (err) {
          var message = err && err.message ? err.message : "Failed to delete template.";
          showError(message);
          setStatus(message, true);
        });
      }
    });
  }
})();
