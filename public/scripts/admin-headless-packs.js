(function () {
  "use strict";

  var form = document.getElementById("headless-pack-form");
  var statusEl = document.getElementById("headless-pack-status");
  var errorEl = document.getElementById("headless-pack-error");
  var listEl = document.getElementById("headless-pack-list");
  var createBtn = document.getElementById("headless-pack-create-btn");
  var refreshBtn = document.getElementById("headless-pack-refresh-btn");

  var keyOutputEl = document.getElementById("headless-key-output");
  var keyValueEl = document.getElementById("headless-key-value");
  var keyCopyBtn = document.getElementById("headless-key-copy-btn");

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

  function formatDateTime(value) {
    if (!value) return "never";
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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

  function hideKeyOutput() {
    if (keyOutputEl) keyOutputEl.classList.add("hidden");
    if (keyValueEl) keyValueEl.textContent = "";
  }

  function showKeyOutput(apiKey) {
    if (!keyOutputEl || !keyValueEl) return;
    keyValueEl.textContent = apiKey;
    keyOutputEl.classList.remove("hidden");
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

  function collectCreatePayload() {
    if (!form) return null;

    var fd = new FormData(form);
    var name = String(fd.get("name") || "").trim();
    var description = String(fd.get("description") || "").trim();
    var rateLimitPerMinute = Number(fd.get("rateLimitPerMinute") || 240);

    var scopeValues = [];
    var scopeInputs = form.querySelectorAll('input[name="scopes"]');
    scopeInputs.forEach(function (input) {
      if (input.checked) {
        scopeValues.push(input.value);
      }
    });

    if (!name) {
      throw new Error("Pack name is required.");
    }

    return {
      name: name,
      description: description || undefined,
      scopes: scopeValues,
      rateLimitPerMinute: Number.isFinite(rateLimitPerMinute)
        ? Math.max(10, Math.min(10000, Math.trunc(rateLimitPerMinute)))
        : 240,
    };
  }

  function renderPacks(packs) {
    if (!listEl) return;

    if (!Array.isArray(packs) || packs.length === 0) {
      listEl.innerHTML = '<p class="text-sm text-gray-400">No headless packs created yet.</p>';
      return;
    }

    listEl.innerHTML = packs
      .map(function (pack) {
        var active = pack.status === "active";
        var badgeClass = active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-rose-100 text-rose-700";

        var description = pack.description
          ? '<p class="text-xs text-gray-600 mt-0.5">' + escapeHtml(pack.description) + "</p>"
          : "";

        var revokeButton = active
          ? '<div class="mt-2"><button type="button" class="headless-pack-revoke-btn rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700" data-pack-id="' +
            escapeHtml(pack.id) +
            '">Revoke</button></div>'
          : "";

        return (
          '<article class="rounded-lg border border-gray-200 px-3 py-3" data-pack-id="' +
          escapeHtml(pack.id) +
          '">' +
          '<div class="flex items-start justify-between gap-3">' +
          "<div>" +
          '<p class="font-medium text-gray-900">' +
          escapeHtml(pack.name) +
          "</p>" +
          description +
          '<p class="text-xs text-gray-500 mt-1">Prefix ' +
          escapeHtml(pack.keyPrefix) +
          " · scopes " +
          escapeHtml(Array.isArray(pack.scopes) ? pack.scopes.join(", ") : "") +
          " · limit " +
          escapeHtml(String(pack.rateLimitPerMinute || 0)) +
          "/min</p>" +
          '<p class="text-xs text-gray-400 mt-1">Last used: ' +
          escapeHtml(formatDateTime(pack.lastUsedAt)) +
          "</p>" +
          "</div>" +
          '<span class="rounded-full px-2 py-0.5 text-xs font-semibold ' +
          badgeClass +
          '">' +
          escapeHtml(pack.status) +
          "</span>" +
          "</div>" +
          revokeButton +
          "</article>"
        );
      })
      .join("");
  }

  async function loadPacks() {
    var payload = await requestJson("/api/admin/headless/packs?limit=100", {
      method: "GET",
      credentials: "same-origin",
    });

    renderPacks(payload.packs || []);
  }

  async function createPack() {
    clearError();
    hideKeyOutput();
    setStatus("Creating API pack...", false);
    if (createBtn) createBtn.disabled = true;

    try {
      var data = collectCreatePayload();
      var payload = await requestJson("/api/admin/headless/packs", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      showKeyOutput(payload.apiKey || "");
      await loadPacks();
      setStatus("API pack created.", false);
      if (form) form.reset();
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to create API pack.";
      showError(message);
      setStatus(message, true);
    } finally {
      if (createBtn) createBtn.disabled = false;
    }
  }

  async function revokePack(packId) {
    clearError();
    setStatus("Revoking API pack...", false);

    try {
      await requestJson("/api/admin/headless/packs/" + encodeURIComponent(packId) + "/revoke", {
        method: "POST",
        credentials: "same-origin",
      });

      await loadPacks();
      setStatus("API pack revoked.", false);
    } catch (err) {
      var message = err && err.message ? err.message : "Failed to revoke API pack.";
      showError(message);
      setStatus(message, true);
    }
  }

  if (createBtn) {
    createBtn.addEventListener("click", function () {
      createPack();
    });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      clearError();
      hideKeyOutput();
      setStatus("Refreshing packs...", false);
      loadPacks()
        .then(function () {
          setStatus("", false);
        })
        .catch(function (err) {
          var message = err && err.message ? err.message : "Failed to refresh packs.";
          showError(message);
          setStatus(message, true);
        });
    });
  }

  if (listEl) {
    listEl.addEventListener("click", function (event) {
      var target = event.target;
      if (!target) return;

      var revokeBtn = target.closest(".headless-pack-revoke-btn");
      if (!revokeBtn) return;

      var packId = revokeBtn.getAttribute("data-pack-id");
      if (!packId) return;

      if (!window.confirm("Revoke this API pack? Existing integrations using this key will stop immediately.")) {
        return;
      }

      revokePack(packId);
    });
  }

  if (keyCopyBtn) {
    keyCopyBtn.addEventListener("click", async function () {
      if (!keyValueEl || !keyValueEl.textContent) return;

      try {
        await navigator.clipboard.writeText(keyValueEl.textContent);
        setStatus("API key copied to clipboard.", false);
      } catch {
        setStatus("Failed to copy API key.", true);
      }
    });
  }
})();
